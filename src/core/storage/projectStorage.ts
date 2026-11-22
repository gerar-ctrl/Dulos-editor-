// ============================================================================
// projectStorage - IndexedDB Persistence for Project, Clips & Media Blobs
// ============================================================================

import { get, set, del, keys } from 'idb-keyval';
import { Project, VideoClip, AudioClip } from '../../types/editor';

const PROJECT_PREFIX = 'editordevideos_project_v3_';
const LAST_PROJECT_KEY = 'editordevideos_last_active_project_v3';
const MEDIA_BLOB_PREFIX = 'editordevideos_blob_v3_';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  aspectRatio: string;
  duration: number;
  clipCount: number;
}

// Runtime map from blob URL -> original Blob so separated audio / duplicated clips also persist
const runtimeBlobUrlMap = new Map<string, Blob>();
const runtimeFilePathMap = new Map<string, string>();
// Deduplicate IndexedDB blobs when clips are split or duplicated (URL -> owner clipId)
const savedBlobUrlToOwnerClipId = new Map<string, string>();
// Track clip IDs whose blobs are already persisted (or currently being persisted) in IndexedDB
const savedBlobClipIds = new Set<string>();
const inFlightBlobSaves = new Map<string, Promise<void>>();
let saveProjectTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSaveProject: Project | null = null;
let pendingSaveResolvers: Array<() => void> = [];
let inFlightProjectSave: Promise<void> | null = null;

interface BlobRefPointer {
  __refClipId: string;
}

const ELECTRON_MAX_IDB_BLOB_BYTES = 30 * 1024 * 1024; // 30 MB cap for non-disk blobs in Electron

function getElectronMediaAPI(): {
  isElectron?: boolean;
  getLocalMediaUrl?: (filePath: string) => Promise<string | null>;
} | null {
  if (typeof window === 'undefined') return null;
  const api = (
    window as unknown as {
      electronAPI?: {
        isElectron?: boolean;
        getLocalMediaUrl?: (filePath: string) => Promise<string | null>;
      };
    }
  ).electronAPI;
  return api?.isElectron ? api : null;
}

function isBlobRefPointer(val: unknown): val is BlobRefPointer {
  return (
    typeof val === 'object' &&
    val !== null &&
    '__refClipId' in val &&
    typeof (val as BlobRefPointer).__refClipId === 'string'
  );
}

async function flushPendingProjectSave(): Promise<void> {
  if (saveProjectTimer) {
    clearTimeout(saveProjectTimer);
    saveProjectTimer = null;
  }
  const project = pendingSaveProject;
  const resolvers = pendingSaveResolvers;
  pendingSaveProject = null;
  pendingSaveResolvers = [];

  if (project) {
    const saveOp = (async () => {
      try {
        const key = `${PROJECT_PREFIX}${project.id}`;
        await set(key, { ...project, version: 3, updatedAt: Date.now() });
        await set(LAST_PROJECT_KEY, project.id);
      } catch (err) {
        console.error('Error saving project to IndexedDB:', err);
      }
    })();
    inFlightProjectSave = saveOp;
    try {
      await saveOp;
    } finally {
      if (inFlightProjectSave === saveOp) {
        inFlightProjectSave = null;
      }
    }
  }
  for (const resolve of resolvers) {
    resolve();
  }
}

export class ProjectStorage {
  public static registerRuntimeBlob(blobUrl: string, blob: Blob) {
    runtimeBlobUrlMap.set(blobUrl, blob);
  }

  public static getRuntimeBlob(blobUrl: string): Blob | undefined {
    return runtimeBlobUrlMap.get(blobUrl);
  }

  public static registerRuntimeFilePath(blobUrl: string, filePath: string) {
    if (blobUrl && filePath) {
      runtimeFilePathMap.set(blobUrl, filePath);
    }
  }

  public static getRuntimeFilePath(blobUrl: string): string | undefined {
    return runtimeFilePathMap.get(blobUrl);
  }

  public static async saveMediaBlob(
    clipId: string,
    blob: Blob,
    blobUrl?: string,
    sourceFilePath?: string
  ): Promise<void> {
    if (blobUrl) {
      runtimeBlobUrlMap.set(blobUrl, blob);
      if (sourceFilePath) {
        runtimeFilePathMap.set(blobUrl, sourceFilePath);
      }
    }
    if (savedBlobClipIds.has(clipId)) {
      return;
    }

    // On Electron PC, never duplicate local disk files or huge (>30 MB) blobs into
    // IndexedDB on drive C: — files with sourceFilePath stream directly from disk.
    const electronApi = getElectronMediaAPI();
    if (electronApi) {
      const hasDiskPath = Boolean(
        sourceFilePath || (blobUrl && runtimeFilePathMap.get(blobUrl))
      );
      if (hasDiskPath || blob.size > ELECTRON_MAX_IDB_BLOB_BYTES) {
        savedBlobClipIds.add(clipId);
        return;
      }
    }

    const existing = inFlightBlobSaves.get(clipId);
    if (existing) {
      return existing;
    }

    // Deduplicate: if another clip already persisted this exact blobUrl (e.g. split/duplicate),
    // store a lightweight reference instead of duplicating hundreds of MB in IndexedDB.
    const ownerClipId = blobUrl ? savedBlobUrlToOwnerClipId.get(blobUrl) : undefined;

    const savePromise = (async () => {
      try {
        if (ownerClipId && ownerClipId !== clipId) {
          const ptr: BlobRefPointer = { __refClipId: ownerClipId };
          await set(`${MEDIA_BLOB_PREFIX}${clipId}`, ptr);
        } else {
          await set(`${MEDIA_BLOB_PREFIX}${clipId}`, blob);
          if (blobUrl) {
            savedBlobUrlToOwnerClipId.set(blobUrl, clipId);
          }
        }
        savedBlobClipIds.add(clipId);
      } catch (err) {
        console.warn('Error saving media blob to IndexedDB:', err);
      } finally {
        inFlightBlobSaves.delete(clipId);
      }
    })();

    inFlightBlobSaves.set(clipId, savePromise);
    return savePromise;
  }

  public static async getMediaBlob(clipId: string): Promise<Blob | null> {
    try {
      const stored = await get<Blob | BlobRefPointer>(`${MEDIA_BLOB_PREFIX}${clipId}`);
      if (!stored) return null;
      if (isBlobRefPointer(stored)) {
        const target = await get<Blob>(`${MEDIA_BLOB_PREFIX}${stored.__refClipId}`);
        return target instanceof Blob ? target : null;
      }
      return stored instanceof Blob ? stored : null;
    } catch {
      return null;
    }
  }

  public static async saveProject(project: Project): Promise<void> {
    try {
      const electronApi = getElectronMediaAPI();
      // Persist any newly created/duplicated clips' blobs in the background without re-writing already saved blobs
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if ('sourceUrl' in clip && clip.sourceUrl && !savedBlobClipIds.has(clip.id)) {
            const diskPath =
              ('sourceFilePath' in clip && clip.sourceFilePath) ||
              runtimeFilePathMap.get(clip.sourceUrl);
            if (electronApi && diskPath) {
              savedBlobClipIds.add(clip.id);
              continue;
            }
            const memBlob = runtimeBlobUrlMap.get(clip.sourceUrl);
            if (memBlob) {
              void ProjectStorage.saveMediaBlob(clip.id, memBlob, clip.sourceUrl, diskPath);
            }
          }
        }
      }

      if (pendingSaveProject && pendingSaveProject.id !== project.id) {
        await flushPendingProjectSave();
      }
      pendingSaveProject = project;
      if (saveProjectTimer) {
        clearTimeout(saveProjectTimer);
      }
      return await new Promise<void>((resolve) => {
        pendingSaveResolvers.push(resolve);
        saveProjectTimer = setTimeout(() => {
          void flushPendingProjectSave();
        }, 350);
      });
    } catch (err) {
      console.error('Error saving project to IndexedDB:', err);
    }
  }

  public static async loadProject(id: string): Promise<Project | null> {
    try {
      if (pendingSaveProject?.id === id) {
        await flushPendingProjectSave();
      }
      const key = `${PROJECT_PREFIX}${id}`;
      const project = await get<Project>(key);
      if (!project || project.version < 3) return null;

      // Rehydrate blob: URLs from stored IndexedDB Blobs in parallel per track
      const rehydratedTracks = await Promise.all(
        project.tracks.map(async (track) => {
          const resolvedClips = await Promise.all(
            track.clips.map(async (clip) => {
              if (clip.id.startsWith('sample_') || clip.id.startsWith('demo_')) {
                return null;
              }
              if ('sourceUrl' in clip) {
                const mediaClip = clip as VideoClip | AudioClip;
                if (
                  mediaClip.sourceUrl &&
                  mediaClip.sourceUrl.startsWith('procedural://')
                ) {
                  return null;
                }
                const electronApi = getElectronMediaAPI();
                if (electronApi?.getLocalMediaUrl && mediaClip.sourceFilePath) {
                  try {
                    const streamUrl = await electronApi.getLocalMediaUrl(
                      mediaClip.sourceFilePath
                    );
                    if (streamUrl) {
                      runtimeFilePathMap.set(streamUrl, mediaClip.sourceFilePath);
                      savedBlobClipIds.add(clip.id);
                      return { ...mediaClip, sourceUrl: streamUrl };
                    }
                  } catch {
                    // Fallback to IndexedDB below if disk file was moved
                  }
                }
                if (
                  mediaClip.sourceUrl &&
                  (mediaClip.sourceUrl.startsWith('blob:') ||
                    mediaClip.sourceUrl.includes('/local-media/'))
                ) {
                  const storedBlob = await ProjectStorage.getMediaBlob(clip.id);
                  if (storedBlob) {
                    const freshUrl = URL.createObjectURL(storedBlob);
                    runtimeBlobUrlMap.set(freshUrl, storedBlob);
                    if (mediaClip.sourceFilePath) {
                      runtimeFilePathMap.set(freshUrl, mediaClip.sourceFilePath);
                    }
                    savedBlobClipIds.add(clip.id);
                    return { ...mediaClip, sourceUrl: freshUrl };
                  }
                  // Dead blob/local-media URLs without a stored blob or file on disk are skipped
                  return null;
                }
              }
              return clip;
            })
          );
          const validClips = resolvedClips.filter(
            (c): c is NonNullable<typeof c> => c !== null
          );
          return { ...track, clips: validClips };
        })
      );

      const filteredTracks = rehydratedTracks.filter(
        (track) => !(track.id === 'track_overlay' && track.clips.length === 0)
      );

      // Ensure audio track(s) appear directly after the main video track
      const mainTrackIndex = filteredTracks.findIndex(
        (track) => track.id === 'track_main' || track.type === 'main-video'
      );
      const audioTracks = filteredTracks.filter(
        (track) => track.id === 'track_audio' || track.type === 'audio'
      );
      const nonAudioTracks = filteredTracks.filter(
        (track) => track.id !== 'track_audio' && track.type !== 'audio'
      );
      const orderedTracks =
        mainTrackIndex >= 0 && audioTracks.length > 0
          ? (() => {
              const mainIdxInNonAudio = nonAudioTracks.findIndex(
                (track) => track.id === 'track_main' || track.type === 'main-video'
              );
              const result = [...nonAudioTracks];
              result.splice(mainIdxInNonAudio + 1, 0, ...audioTracks);
              return result;
            })()
          : filteredTracks;

      return {
        ...project,
        settings: {
          ...project.settings,
          name: project.settings.name || 'Dulos editor',
        },
        tracks: orderedTracks,
      };
    } catch (err) {
      console.error('Error loading project from IndexedDB:', err);
      return null;
    }
  }

  public static async loadLastProject(): Promise<Project | null> {
    try {
      const lastId = await get<string>(LAST_PROJECT_KEY);
      if (lastId) {
        return await this.loadProject(lastId);
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async listProjects(): Promise<string[]> {
    try {
      const allKeys = await keys();
      return (allKeys as string[])
        .filter((k) => typeof k === 'string' && k.startsWith(PROJECT_PREFIX))
        .map((k) => k.replace(PROJECT_PREFIX, ''));
    } catch {
      return [];
    }
  }

  public static async listProjectSummaries(): Promise<ProjectSummary[]> {
    try {
      await flushPendingProjectSave();
      const ids = await this.listProjects();
      const summaries: ProjectSummary[] = [];

      await Promise.all(
        ids.map(async (id) => {
          const project = await get<Project>(`${PROJECT_PREFIX}${id}`);
          if (!project || project.version < 3) return;
          const clipCount = project.tracks.reduce(
            (sum, t) =>
              sum +
              t.clips.filter(
                (c) => !c.id.startsWith('sample_') && !c.id.startsWith('demo_')
              ).length,
            0
          );
          summaries.push({
            id: project.id,
            name: project.settings.name || 'Dulos editor',
            updatedAt: project.updatedAt || project.createdAt || Date.now(),
            createdAt: project.createdAt || Date.now(),
            aspectRatio: project.settings.aspectRatio,
            duration: project.settings.duration,
            clipCount,
          });
        })
      );

      return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error('Error listing project summaries:', err);
      return [];
    }
  }

  public static async setLastActiveProject(id: string): Promise<void> {
    try {
      await set(LAST_PROJECT_KEY, id);
    } catch (err) {
      console.error('Error setting last active project:', err);
    }
  }

  public static async deleteProject(id: string, extraClipIds?: string[]): Promise<void> {
    try {
      if (pendingSaveProject?.id === id) {
        if (saveProjectTimer) {
          clearTimeout(saveProjectTimer);
          saveProjectTimer = null;
        }
        pendingSaveProject = null;
        const resolvers = pendingSaveResolvers;
        pendingSaveResolvers = [];
        for (const resolve of resolvers) {
          resolve();
        }
      }
      if (inFlightProjectSave) {
        await inFlightProjectSave.catch(() => {});
      }

      const clipIds = new Set<string>(extraClipIds || []);
      const storedProject = await get<Project>(`${PROJECT_PREFIX}${id}`);
      if (storedProject?.tracks) {
        for (const track of storedProject.tracks) {
          for (const clip of track.clips) {
            clipIds.add(clip.id);
          }
        }
      }

      await del(`${PROJECT_PREFIX}${id}`);
      const lastId = await get<string>(LAST_PROJECT_KEY);
      if (lastId === id) {
        await del(LAST_PROJECT_KEY);
      }

      for (const clipId of clipIds) {
        const inFlight = inFlightBlobSaves.get(clipId);
        if (inFlight) {
          await inFlight.catch(() => {});
        }
        savedBlobClipIds.delete(clipId);
        await del(`${MEDIA_BLOB_PREFIX}${clipId}`);
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  }
}
