// ============================================================================
// useEditorStore - Central High-Frequency Reactive Store (Zustand)
// ============================================================================

import { create } from 'zustand';
import {
  Project,
  TimelineClip,
  VideoClip,
  TextClip,
  AudioClip,
  AspectRatio,
  Keyframe,
  TrackVolumeKeyframe,
} from '../types/editor';
import { CommandHistory } from '../core/storage/commandHistory';
import { ProjectStorage } from '../core/storage/projectStorage';
import { globalAudioEngine } from '../core/audio/AudioEngine';
import {
  evaluateTrackVolumeAtTime,
  sortVolumeKeyframes,
} from '../core/audio/trackVolumeEnvelope';
import {
  extractKeyframeProperties,
  interpolateClipTransform,
} from '../core/keyframes/interpolateKeyframes';
import { createDefaultVisualProperties } from '../core/media/clipDefaults';

/**
 * Builds a derived clip (used when splitting or freezing) that inherits ALL
 * characteristics of the source clip (transform/zoom, volume/audio, filters,
 * color grading, chroma key, mask, visual effects, speed, etc.) EXCEPT
 * entrance/exit/combo animations.
 */
function createCleanDerivedClip(
  clip: TimelineClip,
  overrides: {
    id: string;
    startTime: number;
    duration: number;
    sourceStartTime: number;
    name?: string;
    isFrozen?: boolean;
    muteAudio?: boolean;
    splitLocalTime?: number;
  }
): TimelineClip {
  const defaults = createDefaultVisualProperties();
  const isFrozen = overrides.isFrozen ?? false;
  const base = {
    id: overrides.id,
    trackId: clip.trackId,
    type: clip.type,
    name: overrides.name ?? clip.name,
    startTime: overrides.startTime,
    duration: overrides.duration,
    sourceStartTime: overrides.sourceStartTime,
    sourceDuration: clip.sourceDuration,
    isFrozen,
    isReversed: isFrozen ? false : Boolean(clip.isReversed),
    hasSeparatedAudio: clip.hasSeparatedAudio,
    speed: isFrozen ? 1 : clip.speed ?? 1,
    speedCurve:
      isFrozen || !clip.speedCurve
        ? undefined
        : {
            ...clip.speedCurve,
            points: clip.speedCurve.points.map((p) => ({ ...p })),
          },
  };

  if (clip.type === 'video' || clip.type === 'image') {
    const vClip = clip as VideoClip;
    const hasKeyframes = Array.isArray(vClip.keyframes) && vClip.keyframes.length > 0;
    const localT = overrides.splitLocalTime;

    const derivedTransform =
      hasKeyframes && localT !== undefined
        ? { ...interpolateClipTransform(vClip, localT) }
        : { ...vClip.transform };

    let derivedKeyframes: Keyframe[] = [];
    if (!isFrozen && hasKeyframes) {
      if (localT !== undefined) {
        derivedKeyframes = vClip.keyframes
          .filter((kf) => kf.time >= localT - 0.01)
          .map((kf) => ({
            ...kf,
            id: 'kf_' + Math.random().toString(36).substring(2, 9),
            time: Number(Math.max(0, kf.time - localT).toFixed(2)),
            properties: { ...kf.properties },
          }));
      } else {
        derivedKeyframes = vClip.keyframes.map((kf) => ({
          ...kf,
          id: 'kf_' + Math.random().toString(36).substring(2, 9),
          properties: { ...kf.properties },
        }));
      }
    }

    return {
      ...base,
      type: vClip.type,
      sourceUrl: vClip.sourceUrl,
      sourceFilePath: vClip.sourceFilePath,
      thumbnailUrl: vClip.thumbnailUrl,
      naturalWidth: vClip.naturalWidth,
      naturalHeight: vClip.naturalHeight,
      transform: derivedTransform,
      colorGrading: {
        ...vClip.colorGrading,
        hslRed: { ...vClip.colorGrading.hslRed },
        hslGreen: { ...vClip.colorGrading.hslGreen },
        hslBlue: { ...vClip.colorGrading.hslBlue },
        hslYellow: { ...vClip.colorGrading.hslYellow },
      },
      filterPreset: vClip.filterPreset,
      filterIntensity: vClip.filterIntensity,
      chromaKey: { ...vClip.chromaKey },
      mask: { ...vClip.mask },
      effect: { ...vClip.effect },
      transition: { ...vClip.transition },
      animations: { ...defaults.animations },
      keyframes: derivedKeyframes,
      audio: {
        ...vClip.audio,
        isMuted: overrides.muteAudio ? true : vClip.audio.isMuted,
      },
    };
  }

  if (clip.type === 'audio') {
    const aClip = clip as AudioClip;
    return {
      ...base,
      type: 'audio',
      sourceUrl: aClip.sourceUrl,
      sourceFilePath: aClip.sourceFilePath,
      waveform: aClip.waveform ? [...aClip.waveform] : undefined,
      beatMarkers: aClip.beatMarkers ? [...aClip.beatMarkers] : undefined,
      audio: {
        ...aClip.audio,
        isMuted: overrides.muteAudio ? true : aClip.audio.isMuted,
      },
    };
  }

  // Text or subtitle clip
  const tClip = clip as import('../types/editor').TextClip;
  return {
    ...base,
    type: tClip.type,
    textConfig: {
      ...tClip.textConfig,
      ...(tClip.textConfig.gradientFill
        ? { gradientFill: { ...tClip.textConfig.gradientFill } }
        : {}),
      animIn: 'none',
      animOut: 'none',
      animLoop: 'none',
    },
    transform: { ...tClip.transform },
    animations: { ...defaults.animations },
    wordHighlights: tClip.wordHighlights
      ? tClip.wordHighlights.map((w) => ({ ...w }))
      : undefined,
  };
}

const history = new CommandHistory(100);

// Default initial state with an empty timeline (no built-in demo clips)
const createInitialProject = (): Project => ({
  id: 'proj_' + Math.random().toString(36).substring(2, 9),
  version: 3,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  settings: {
    name: 'Dulos editor',
    aspectRatio: 'auto',
    fps: 30,
    duration: 8,
    background: {
      type: 'color',
      color: '#0d0e15',
      blurIntensity: 10,
    },
  },
  tracks: [
    {
      id: 'track_main',
      name: 'Pista Principal',
      type: 'main-video',
      isLocked: false,
      isMuted: false,
      isVisible: true,
      clips: [],
    },
    {
      id: 'track_audio',
      name: 'Música y Efectos',
      type: 'audio',
      isLocked: false,
      isMuted: false,
      isVisible: true,
      clips: [],
    },
    {
      id: 'track_text',
      name: 'Textos',
      type: 'text',
      isLocked: false,
      isMuted: false,
      isVisible: true,
      clips: [],
    },
  ],
});

function computeProjectDuration(tracks: Project['tracks']): number {
  let maxEnd = 0;
  for (const t of tracks) {
    for (const c of t.clips) {
      const end = c.startTime + c.duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  if (maxEnd <= 0) return 8;
  return Math.max(1, Number(maxEnd.toFixed(2)));
}

function getPrimaryMediaDimensions(
  tracks: Project['tracks']
): { width: number; height: number } | null {
  const findFirstVisual = (clips: TimelineClip[]): VideoClip | undefined => {
    const visuals = clips
      .filter((c): c is VideoClip => c.type === 'video' || c.type === 'image')
      .sort((a, b) => a.startTime - b.startTime);
    return visuals[0];
  };

  const mainTrack = tracks.find(
    (t) => t.id === 'track_main' || t.type === 'main-video'
  );
  let primary = mainTrack ? findFirstVisual(mainTrack.clips) : undefined;
  if (!primary) {
    for (const t of tracks) {
      if (t.type === 'audio' || t.type === 'text') continue;
      primary = findFirstVisual(t.clips);
      if (primary) break;
    }
  }
  if (!primary) return null;

  const rawW = primary.naturalWidth || 1080;
  const rawH = primary.naturalHeight || 1920;
  const width = Math.max(120, Math.min(3840, Math.round(rawW / 2) * 2));
  const height = Math.max(120, Math.min(3840, Math.round(rawH / 2) * 2));
  return { width, height };
}

const MAGNETIC_TRACK_TYPES = new Set<Project['tracks'][number]['type']>([
  'main-video',
]);

function packTrackClipsLeft(clips: TimelineClip[]): TimelineClip[] {
  if (clips.length === 0) return clips;
  const sorted = [...clips].sort((a, b) => a.startTime - b.startTime);
  let cursor = 0;
  return sorted.map((clip) => {
    const startTime = Number(cursor.toFixed(2));
    cursor += clip.duration;
    return clip.startTime === startTime ? clip : { ...clip, startTime };
  });
}

function placeAudioClipAtTime(
  projectTracks: Project['tracks'],
  clip: AudioClip,
  trackIdPrefix: string,
  trackNamePrefix: string
): { tracks: Project['tracks']; finalClip: AudioClip } {
  const clipStart = Number(Math.max(0, clip.startTime).toFixed(2));
  const clipEnd = clipStart + clip.duration;
  const hasOverlap = (track: Project['tracks'][number]) =>
    track.clips.some(
      (c) => c.startTime < clipEnd - 0.02 && c.startTime + c.duration > clipStart + 0.02
    );

  const audioTracks = projectTracks.filter((t) => t.type === 'audio' && !t.isLocked);
  const freeTrack = audioTracks.find((t) => !hasOverlap(t));

  if (freeTrack) {
    const finalClip: AudioClip = { ...clip, trackId: freeTrack.id, startTime: clipStart };
    const tracks = projectTracks.map((t) =>
      t.id === freeTrack.id ? { ...t, clips: [...t.clips, finalClip] } : t
    );
    return { tracks, finalClip };
  }

  const newTrackId = trackIdPrefix + Math.random().toString(36).substring(2, 7);
  const audioTrackNum =
    projectTracks.filter((t) => t.type === 'audio').length + 1;
  const finalClip: AudioClip = { ...clip, trackId: newTrackId, startTime: clipStart };
  const newTrack: Project['tracks'][number] = {
    id: newTrackId,
    name: `${trackNamePrefix} ${audioTrackNum}`,
    type: 'audio',
    isLocked: false,
    isMuted: false,
    isVisible: true,
    clips: [finalClip],
  };
  return { tracks: [...projectTracks, newTrack], finalClip };
}

function packMagneticProjectTracks(
  tracks: Project['tracks']
): Project['tracks'] {
  return tracks.map((track) => {
    if (track.isLocked || !MAGNETIC_TRACK_TYPES.has(track.type)) {
      return track;
    }
    return {
      ...track,
      clips: packTrackClipsLeft(track.clips),
    };
  });
}

interface EditorState {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  timelineZoom: number; // Pixels per second (e.g. 60)
  trackHeight: number; // Vertical height of each timeline track in px (36 to 140)
  isMagnetEnabled: boolean; // Magnetic timeline (pack left & close gaps)
  playheadMode: 'free' | 'fixed'; // 'free' = movable red playhead, 'fixed' = fixed center guide line
  canvasZoom: number; // Preview zoom multiplier (0.5 to 2.0, 1.0 = Fit)
  canvasHeightVh: number; // Draggable viewport height percentage (28 to 72)
  selectedClipId: string | null;
  selectedTrackId: string | null;
  visibleVolumeTracks: Record<string, boolean>;
  selectedVolumeNode: { trackId: string; nodeId: string } | null;
  reorderTrackId: string | null;
  activeInspectorTab: string;
  isExportModalOpen: boolean;
  isMediaDrawerOpen: boolean;
  mediaDrawerMode: 'main' | 'pip' | 'audio';
  isProjectModalOpen: boolean;
  isScreenCropMode: boolean;
  inlineEditingTextClipId: string | null;
  eyedropperRequest: {
    label: string;
    onPick: (hex: string) => void;
    reopenMediaDrawer?: boolean;
  } | null;
  toastMessage: string | null;
  isRecordingDub: boolean;
  dubRecordingStartTime: number | null;
  hasUnsavedChanges: boolean;

  // Media DOM Element Cache
  mediaElements: Map<
    string,
    HTMLVideoElement | HTMLAudioElement | HTMLImageElement | HTMLCanvasElement
  >;

  // Playback & UI Actions
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlayPause: () => void;
  setTimelineZoom: (zoom: number) => void;
  setTrackHeight: (height: number) => void;
  toggleMagnet: () => void;
  setPlayheadMode: (mode: 'free' | 'fixed') => void;
  togglePlayheadMode: () => void;
  packMagneticTracks: () => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasHeightVh: (vh: number) => void;
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  toggleTrackVolumeLine: (trackId?: string) => void;
  setSelectedVolumeNode: (node: { trackId: string; nodeId: string } | null) => void;
  addTrackVolumeNodeAtPlayhead: (trackId?: string) => void;
  removeSelectedTrackVolumeNode: (trackId?: string) => void;
  setTrackVolume: (trackId: string, volume: number, recordHistory?: boolean) => void;
  setTrackVolumeKeyframes: (
    trackId: string,
    keyframes: TrackVolumeKeyframe[],
    recordHistory?: boolean
  ) => void;
  setReorderTrackId: (trackId: string | null) => void;
  setActiveInspectorTab: (tab: string) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsMediaDrawerOpen: (open: boolean, mode?: 'main' | 'pip' | 'audio') => void;
  setIsProjectModalOpen: (open: boolean) => void;
  setScreenCropMode: (active: boolean) => void;
  setInlineEditingTextClipId: (clipId: string | null) => void;
  startEyedropper: (
    label: string,
    onPick: (hex: string) => void,
    reopenMediaDrawer?: boolean
  ) => void;
  cancelEyedropper: () => void;
  completeEyedropper: (hex: string) => void;
  showToast: (msg: string) => void;
  setDubRecordingState: (isRecording: boolean, startTime?: number | null) => void;

  // Project Settings Actions
  setProjectName: (name: string) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setCustomCanvasDimensions: (width: number, height: number) => void;
  applyScreenCrop: (crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  setProjectFps: (fps: number) => void;
  setProjectDuration: (duration: number) => void;
  setCanvasBackground: (bg: Project['settings']['background']) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;

  // Clip & Timeline Actions
  addClip: (trackId: string, clip: TimelineClip) => void;
  addDubbingClip: (clip: AudioClip) => void;
  addAudioEffectClip: (clip: AudioClip) => void;
  splitClip: (clipId?: string, atTime?: number) => void;
  trimLeftClip: (clipId?: string, atTime?: number) => void;
  trimRightClip: (clipId?: string, atTime?: number) => void;
  trimClip: (clipId: string, newStartTime: number, newDuration: number) => void;
  moveClip: (clipId: string, newStartTime: number) => void;
  reorderTrackClips: (trackId: string, orderedClipIds: string[]) => void;
  deleteClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  freezeFrame: (clipId: string, duration?: number) => void;
  reverseClip: (clipId: string) => void;
  updateClip: <T extends TimelineClip>(clipId: string, updates: Partial<T>) => void;
  updateAllVisualClips: (
    updates: Partial<VideoClip>,
    options?: { includeText?: boolean }
  ) => void;
  separateAudio: (clipId?: string) => void;

  // Keyframes
  addKeyframe: (clipId: string, keyframe: Keyframe) => void;
  removeKeyframe: (clipId: string, keyframeId: string) => void;

  // Media Caching
  registerMediaElement: (
    clipId: string,
    el: HTMLVideoElement | HTMLAudioElement | HTMLImageElement | HTMLCanvasElement
  ) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistorySnapshot: () => { undoStack: string[]; redoStack: string[] };
  restoreHistorySnapshot: (snapshot: { undoStack: string[]; redoStack: string[] }) => void;
  restoreProjectSnapshot: (
    project: Project,
    options?: {
      selectedClipId?: string | null;
      selectedTrackId?: string | null;
      canvasHeightVh?: number;
      currentTime?: number;
    }
  ) => void;
  commitToolSession: (
    initialProjectSnapshot: Project,
    historySnapshot?: { undoStack: string[]; redoStack: string[] }
  ) => void;

  // Persistence
  saveProjectToDisk: () => Promise<void>;
  loadProjectFromDisk: (id: string) => Promise<void>;
  deleteProjectFromDisk: (id: string) => Promise<void>;
  newProject: (options?: { name?: string; discardCurrent?: boolean }) => Promise<void>;
  markProjectExported: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncProject: Project | null = null;
let lastExportedProjectRef: Project | null = null;

export const useEditorStore = create<EditorState>((set, get) => {
  const initial = createInitialProject();
  history.recordState(initial);

  const flushPendingSync = () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    if (pendingSyncProject) {
      const p = pendingSyncProject;
      pendingSyncProject = null;
      history.recordState(p);
      void ProjectStorage.saveProject(p);
    }
  };

  const cancelPendingSync = () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    pendingSyncProject = null;
  };

  const recordAndSync = (newProject: Project) => {
    cancelPendingSync();
    history.recordState(newProject);
    void ProjectStorage.saveProject(newProject);
  };

  const scheduleRecordAndSync = (newProject: Project) => {
    pendingSyncProject = newProject;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      if (pendingSyncProject) {
        const p = pendingSyncProject;
        pendingSyncProject = null;
        history.recordState(p);
        void ProjectStorage.saveProject(p);
      }
    }, 280);
  };

  return {
    project: initial,
    currentTime: 0,
    isPlaying: false,
    timelineZoom: 65,
    trackHeight: 48,
    isMagnetEnabled: true,
    playheadMode: (() => {
      try {
        return localStorage.getItem('editordevideos_playhead_mode_v2') === 'free'
          ? 'free'
          : 'fixed';
      } catch {
        return 'fixed';
      }
    })(),
    canvasZoom: 1.0,
    canvasHeightVh: 46,
    selectedClipId: null,
    selectedTrackId: null,
    visibleVolumeTracks: {},
    selectedVolumeNode: null,
    reorderTrackId: null,
    activeInspectorTab: 'transform',
    isExportModalOpen: false,
    isMediaDrawerOpen: false,
    mediaDrawerMode: 'main',
    isProjectModalOpen: false,
    isScreenCropMode: false,
    inlineEditingTextClipId: null,
    eyedropperRequest: null,
    toastMessage: null,
    isRecordingDub: false,
    dubRecordingStartTime: null,
    hasUnsavedChanges: false,
    mediaElements: new Map(),

    setDubRecordingState: (isRecording, startTime = null) => {
      set({
        isRecordingDub: isRecording,
        dubRecordingStartTime: isRecording ? startTime : null,
      });
    },

    showToast: (msg: string) => {
      if (toastTimer) clearTimeout(toastTimer);
      set({ toastMessage: msg });
      toastTimer = setTimeout(() => {
        set({ toastMessage: null });
      }, 2600);
    },

    setCurrentTime: (time) => {
      const duration = get().project.settings.duration;
      const bounded = Math.max(0, Math.min(time, duration));
      set({ currentTime: bounded });
    },

    setIsPlaying: (playing) => {
      if (playing) {
        globalAudioEngine.init();
        const state = get();
        // Trigger play synchronously inside user gesture for active media elements
        for (const track of state.project.tracks) {
          if (track.isMuted) continue;
          for (const clip of track.clips) {
            if (
              state.currentTime >= clip.startTime &&
              state.currentTime < clip.startTime + clip.duration
            ) {
              const el = state.mediaElements.get(clip.id);
              if (
                el instanceof HTMLMediaElement &&
                el.paused &&
                !clip.isFrozen &&
                !clip.isReversed
              ) {
                el.play().catch((err) => {
                  if (err?.name === 'NotAllowedError') {
                    el.muted = true;
                    el.play().catch(() => {});
                  }
                });
              }
            }
          }
        }
      }
      set({
        isPlaying: playing,
        ...(playing ? { inlineEditingTextClipId: null } : {}),
      });
    },

    togglePlayPause: () => {
      const state = get();
      const playing = !state.isPlaying;
      if (playing) {
        globalAudioEngine.init();
        let nextTime = state.currentTime;
        // If at the very end of the timeline, restart from 0
        if (state.currentTime >= state.project.settings.duration - 0.05) {
          nextTime = 0;
        }
        // Trigger play synchronously inside user gesture for active media elements
        for (const track of state.project.tracks) {
          for (const clip of track.clips) {
            if (
              nextTime >= clip.startTime &&
              nextTime < clip.startTime + clip.duration
            ) {
              const el = state.mediaElements.get(clip.id);
              if (
                el instanceof HTMLMediaElement &&
                !clip.isFrozen &&
                !clip.isReversed
              ) {
                const targetMediaTime =
                  clip.sourceStartTime +
                  (nextTime - clip.startTime) * (clip.speed || 1);
                if (
                  !el.seeking &&
                  Math.abs(el.currentTime - targetMediaTime) > 0.5
                ) {
                  try {
                    el.currentTime = Math.max(0, targetMediaTime);
                  } catch {}
                }
                if (el.paused) {
                  el.play().catch((err) => {
                    if (err?.name === 'NotAllowedError') {
                      el.muted = true;
                      el.play().catch(() => {});
                    }
                  });
                }
              }
            }
          }
        }
        set({ currentTime: nextTime, isPlaying: true });
        return;
      }
      set({ isPlaying: false });
    },

    setTimelineZoom: (zoom) => {
      set({ timelineZoom: Math.max(5, Math.min(350, zoom)) });
    },

    toggleMagnet: () => {
      const state = get();
      const next = !state.isMagnetEnabled;
      if (next) {
        const packedTracks = packMagneticProjectTracks(state.project.tracks);
        const newDuration = computeProjectDuration(packedTracks);
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, duration: newDuration },
          tracks: packedTracks,
        };
        recordAndSync(updated);
        set({
          isMagnetEnabled: true,
          project: updated,
          currentTime: Math.min(state.currentTime, newDuration),
        });
        state.showToast('🧲 Imán activado');
      } else {
        set({ isMagnetEnabled: false });
        state.showToast('🧲 Imán desactivado — movimiento libre');
      }
    },

    setPlayheadMode: (mode) => {
      try {
        localStorage.setItem('editordevideos_playhead_mode_v2', mode);
      } catch {
        // Ignore storage errors
      }
      set({ playheadMode: mode });
      get().showToast(
        mode === 'fixed'
          ? '📌 Guía fija activada: desliza la pista bajo la línea central'
          : '🔴 Línea libre activada: mueve el cabezal rojo a tu gusto'
      );
    },

    togglePlayheadMode: () => {
      const next = get().playheadMode === 'fixed' ? 'free' : 'fixed';
      get().setPlayheadMode(next);
    },

    packMagneticTracks: () => {
      const state = get();
      if (!state.isMagnetEnabled) return;
      const packedTracks = packMagneticProjectTracks(state.project.tracks);
      const newDuration = computeProjectDuration(packedTracks);
      const updated: Project = {
        ...state.project,
        settings: { ...state.project.settings, duration: newDuration },
        tracks: packedTracks,
      };
      recordAndSync(updated);
      set({
        project: updated,
        currentTime: Math.min(state.currentTime, newDuration),
      });
    },

    setCanvasZoom: (zoom) => {
      set({ canvasZoom: Math.max(0.4, Math.min(2.5, Number(zoom.toFixed(2)))) });
    },

    setCanvasHeightVh: (vh) => {
      set({ canvasHeightVh: Math.max(26, Math.min(72, Math.round(vh))) });
    },

    setTrackHeight: (height) => {
      set({ trackHeight: Math.max(36, Math.min(140, Math.round(height))) });
    },

    selectClip: (clipId) => {
      if (!clipId) {
        set({ selectedClipId: null, inlineEditingTextClipId: null });
        return;
      }
      const state = get();
      const keepInline =
        state.inlineEditingTextClipId === clipId
          ? state.inlineEditingTextClipId
          : null;
      const found = state.project.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (
        found &&
        !state.isPlaying &&
        (state.currentTime < found.startTime ||
          state.currentTime >= found.startTime + found.duration)
      ) {
        set({
          selectedClipId: clipId,
          selectedTrackId: found.trackId,
          currentTime: Number(found.startTime.toFixed(2)),
          inlineEditingTextClipId: keepInline,
        });
      } else {
        set({
          selectedClipId: clipId,
          selectedTrackId: found ? found.trackId : state.selectedTrackId,
          inlineEditingTextClipId: keepInline,
        });
      }
    },

    setInlineEditingTextClipId: (clipId) => {
      if (!clipId) {
        set({ inlineEditingTextClipId: null });
        return;
      }
      const state = get();
      const found = state.project.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (!found || (found.type !== 'text' && found.type !== 'subtitle')) {
        set({ inlineEditingTextClipId: null });
        return;
      }
      const needsJump =
        state.currentTime < found.startTime ||
        state.currentTime > found.startTime + found.duration;
      const safeMid = Number(
        (found.startTime + found.duration * 0.5).toFixed(2)
      );
      set({
        isPlaying: false,
        selectedClipId: clipId,
        selectedTrackId: found.trackId,
        inlineEditingTextClipId: clipId,
        ...(needsJump ? { currentTime: safeMid } : {}),
      });
    },

    selectTrack: (trackId) => {
      set({ selectedTrackId: trackId });
    },

    toggleTrackVolumeLine: (trackId) => {
      const state = get();
      let targetTrackId = trackId || state.selectedTrackId;
      if (!targetTrackId && state.selectedClipId) {
        const clipTrack = state.project.tracks.find((t) =>
          t.clips.some((c) => c.id === state.selectedClipId)
        );
        if (clipTrack && clipTrack.type !== 'text') {
          targetTrackId = clipTrack.id;
        }
      }

      // If the currently resolved track is a text track and no explicit trackId was given,
      // fall back to a track that supports volume.
      if (!trackId && targetTrackId) {
        const resolved = state.project.tracks.find((t) => t.id === targetTrackId);
        if (resolved && resolved.type === 'text') {
          targetTrackId = null;
        }
      }

      // Smart fallback (especially helpful on mobile): toggle off any visible volume line,
      // or pick the first audio/video track with clips, or the first non-text track.
      if (!targetTrackId) {
        const visibleTrack = state.project.tracks.find(
          (t) => t.type !== 'text' && Boolean(state.visibleVolumeTracks[t.id])
        );
        const trackWithClips = state.project.tracks.find(
          (t) => t.type !== 'text' && t.clips.length > 0
        );
        const firstAudioCapable = state.project.tracks.find(
          (t) => t.type !== 'text'
        );
        targetTrackId =
          visibleTrack?.id || trackWithClips?.id || firstAudioCapable?.id || null;
      }

      if (!targetTrackId) {
        state.showToast('No hay pistas con audio disponibles');
        return;
      }

      const targetTrack = state.project.tracks.find((t) => t.id === targetTrackId);
      if (!targetTrack) return;

      if (targetTrack.type === 'text') {
        state.showToast('Las pistas de texto no tienen volumen');
        return;
      }

      const nextVisible = !state.visibleVolumeTracks[targetTrackId];
      set({
        selectedTrackId: targetTrackId,
        visibleVolumeTracks: {
          ...state.visibleVolumeTracks,
          [targetTrackId]: nextVisible,
        },
        ...(nextVisible
          ? {}
          : state.selectedVolumeNode?.trackId === targetTrackId
            ? { selectedVolumeNode: null }
            : {}),
      });
      state.showToast(
        nextVisible
          ? `Línea de volumen (V) visible en "${targetTrack.name}"`
          : `Línea de volumen (V) oculta en "${targetTrack.name}"`
      );
    },

    setSelectedVolumeNode: (node) => {
      set({ selectedVolumeNode: node });
    },

    addTrackVolumeNodeAtPlayhead: (trackId) => {
      const state = get();
      let targetTrack = trackId
        ? state.project.tracks.find((t) => t.id === trackId && t.type !== 'text')
        : undefined;

      if (!targetTrack && state.selectedTrackId && state.visibleVolumeTracks[state.selectedTrackId]) {
        targetTrack = state.project.tracks.find(
          (t) => t.id === state.selectedTrackId && t.type !== 'text'
        );
      }
      if (!targetTrack) {
        targetTrack = state.project.tracks.find(
          (t) => t.type !== 'text' && Boolean(state.visibleVolumeTracks[t.id])
        );
      }
      if (!targetTrack && state.selectedClipId) {
        targetTrack = state.project.tracks.find(
          (t) => t.type !== 'text' && t.clips.some((c) => c.id === state.selectedClipId)
        );
      }
      if (!targetTrack) {
        targetTrack =
          state.project.tracks.find((t) => t.type !== 'text' && t.clips.length > 0) ||
          state.project.tracks.find((t) => t.type !== 'text');
      }

      if (!targetTrack) {
        state.showToast('No hay pistas con audio disponibles');
        return;
      }
      if (targetTrack.isLocked) {
        state.showToast('🔒 La pista está bloqueada');
        return;
      }

      const time = Number(Math.max(0, state.currentTime).toFixed(3));
      const current = sortVolumeKeyframes(targetTrack.volumeKeyframes ?? []);
      const existing = current.find((k) => Math.abs(k.time - time) < 0.03);

      if (existing) {
        set({
          selectedTrackId: targetTrack.id,
          selectedVolumeNode: { trackId: targetTrack.id, nodeId: existing.id },
          visibleVolumeTracks: {
            ...state.visibleVolumeTracks,
            [targetTrack.id]: true,
          },
        });
        state.showToast('Nodo de volumen seleccionado');
        return;
      }

      const currentVol = Math.round(evaluateTrackVolumeAtTime(targetTrack, time));
      const newNode: TrackVolumeKeyframe = {
        id: `tvk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        time,
        volume: currentVol,
      };
      const nextKeyframes = sortVolumeKeyframes([...current, newNode]);

      state.setTrackVolumeKeyframes(targetTrack.id, nextKeyframes, true);
      set({
        selectedTrackId: targetTrack.id,
        selectedVolumeNode: { trackId: targetTrack.id, nodeId: newNode.id },
        visibleVolumeTracks: {
          ...get().visibleVolumeTracks,
          [targetTrack.id]: true,
        },
      });
      state.showToast(
        `+ Nodo añadido en ${time.toFixed(1)}s (${currentVol}%)`
      );
    },

    removeSelectedTrackVolumeNode: (trackId) => {
      const state = get();
      const sel = state.selectedVolumeNode;
      let targetTrackId = trackId || sel?.trackId || state.selectedTrackId;

      if (!targetTrackId) {
        const visible = state.project.tracks.find(
          (t) => t.type !== 'text' && Boolean(state.visibleVolumeTracks[t.id])
        );
        targetTrackId = visible?.id || null;
      }

      if (!targetTrackId) {
        state.showToast('Selecciona un nodo en la línea de volumen para quitarlo');
        return;
      }

      const targetTrack = state.project.tracks.find((t) => t.id === targetTrackId);
      if (!targetTrack || targetTrack.type === 'text') return;
      if (targetTrack.isLocked) {
        state.showToast('🔒 La pista está bloqueada');
        return;
      }

      const current = sortVolumeKeyframes(targetTrack.volumeKeyframes ?? []);
      if (current.length === 0) {
        state.showToast('No hay nodos en esta pista para quitar');
        return;
      }

      let targetNode =
        sel && sel.trackId === targetTrack.id
          ? current.find((k) => k.id === sel.nodeId)
          : undefined;

      // Fallback: if user placed the playhead right on a node without tapping it
      if (!targetNode) {
        const t = state.currentTime;
        let closest: TrackVolumeKeyframe | null = null;
        let minDist = 0.18;
        for (const k of current) {
          const d = Math.abs(k.time - t);
          if (d <= minDist) {
            minDist = d;
            closest = k;
          }
        }
        if (closest) targetNode = closest;
      }

      if (!targetNode) {
        state.showToast('Toca un nodo en la línea para seleccionarlo y quitarlo');
        return;
      }

      const next = current.filter((k) => k.id !== targetNode!.id);
      if (next.length === 0) {
        state.setTrackVolume(targetTrack.id, targetNode.volume, false);
      }
      state.setTrackVolumeKeyframes(targetTrack.id, next, true);
      set({ selectedVolumeNode: null });
      state.showToast('− Nodo de volumen eliminado');
    },

    setTrackVolume: (trackId, volume, recordHistory = true) => {
      const clamped = Math.max(0, Math.min(200, Math.round(volume)));
      set((state) => {
        const tracks = state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, volume: clamped } : t
        );
        const updated = { ...state.project, tracks };
        if (recordHistory) {
          recordAndSync(updated);
        }
        return { project: updated };
      });
    },

    setTrackVolumeKeyframes: (trackId, keyframes, recordHistory = true) => {
      const sorted = sortVolumeKeyframes(keyframes);
      set((state) => {
        const tracks = state.project.tracks.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            volumeKeyframes: sorted,
            ...(sorted.length === 1
              ? { volume: Math.round(sorted[0].volume) }
              : {}),
          };
        });
        const updated = { ...state.project, tracks };
        if (recordHistory) {
          recordAndSync(updated);
        }
        return { project: updated };
      });
    },

    setActiveInspectorTab: (tab) => {
      set({ activeInspectorTab: tab });
    },

    setIsExportModalOpen: (open) => {
      set({ isExportModalOpen: open });
    },

    setIsMediaDrawerOpen: (open, mode) => {
      set({
        isMediaDrawerOpen: open,
        mediaDrawerMode: open ? mode ?? 'main' : 'main',
      });
    },

    setIsProjectModalOpen: (open) => {
      set({ isProjectModalOpen: open });
    },

    setProjectName: (name) => {
      set((state) => {
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, name },
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    setAspectRatio: (aspectRatio) => {
      set((state) => {
        const prevAr = state.project.settings.aspectRatio;
        let defaultW = state.project.settings.customWidth || 1080;
        let defaultH = state.project.settings.customHeight || 1920;
        if (prevAr === '16:9') { defaultW = 1920; defaultH = 1080; }
        else if (prevAr === '1:1') { defaultW = 1080; defaultH = 1080; }
        else if (prevAr === '4:5') { defaultW = 1080; defaultH = 1350; }
        else if (prevAr === '21:9') { defaultW = 2560; defaultH = 1080; }
        else if (prevAr === '4:3') { defaultW = 1440; defaultH = 1080; }
        else if (prevAr === '9:16') { defaultW = 1080; defaultH = 1920; }

        const tracks =
          aspectRatio === 'free'
            ? state.project.tracks.map((tr) => ({
                ...tr,
                clips: tr.clips.map((c) => {
                  if (c.type === 'video' || c.type === 'image' || c.type === 'text' || c.type === 'subtitle') {
                    return {
                      ...c,
                      transform: {
                        ...c.transform,
                        freeResize: true,
                      },
                    };
                  }
                  return c;
                }),
              }))
            : state.project.tracks;

        let nextSelectedId = state.selectedClipId;
        if (!nextSelectedId) {
          const t = state.currentTime;
          const activeVisual = tracks
            .filter((tr) => tr.isVisible && tr.type !== 'audio')
            .flatMap((tr) => tr.clips)
            .find((c) => t >= c.startTime && t < c.startTime + c.duration);
          if (activeVisual) nextSelectedId = activeVisual.id;
        }

        const mediaDims =
          aspectRatio === 'auto' ? getPrimaryMediaDimensions(tracks) : null;

        const updated: Project = {
          ...state.project,
          tracks,
          settings: {
            ...state.project.settings,
            aspectRatio,
            customWidth:
              aspectRatio === 'auto'
                ? mediaDims?.width
                : state.project.settings.customWidth || defaultW,
            customHeight:
              aspectRatio === 'auto'
                ? mediaDims?.height
                : state.project.settings.customHeight || defaultH,
          },
        };
        recordAndSync(updated);
        return { project: updated, selectedClipId: nextSelectedId };
      });
      get().showToast(
        aspectRatio === 'free'
          ? '🖐️ Modo Libre: Toca con 1 o 2 dedos la imagen para cambiar su tamaño a tu gusto'
          : aspectRatio === 'auto'
          ? '📐 Pantalla ajustada a la medida original del video/imagen'
          : `📐 Formato de pantalla cambiado a ${aspectRatio}`
      );
    },

    setScreenCropMode: (active) => {
      set((state) => ({
        isScreenCropMode: active,
        ...(active && state.isPlaying ? { isPlaying: false } : {}),
      }));
    },

    startEyedropper: (label, onPick, reopenMediaDrawer = false) => {
      set((state) => ({
        eyedropperRequest: { label, onPick, reopenMediaDrawer },
        isScreenCropMode: false,
        ...(state.isPlaying ? { isPlaying: false } : {}),
      }));
      get().showToast(`💧 Toca o arrastra sobre la pantalla para elegir ${label}`);
    },

    cancelEyedropper: () => {
      set({
        eyedropperRequest: null,
      });
    },

    completeEyedropper: (hex) => {
      const req = get().eyedropperRequest;
      if (req) {
        req.onPick(hex);
        set({
          eyedropperRequest: null,
        });
        get().showToast(`💧 Color capturado: ${hex.toUpperCase()}`);
      }
    },

    setCustomCanvasDimensions: (width, height) => {
      const safeW = Math.max(120, Math.min(3840, Math.round(width / 2) * 2));
      const safeH = Math.max(120, Math.min(3840, Math.round(height / 2) * 2));
      set((state) => {
        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            aspectRatio: 'free',
            customWidth: safeW,
            customHeight: safeH,
          },
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    applyScreenCrop: (crop) => {
      const state = get();
      const ar = state.project.settings.aspectRatio;
      let oldW = 1080;
      let oldH = 1920;
      if (ar === '16:9') { oldW = 1920; oldH = 1080; }
      else if (ar === '1:1') { oldW = 1080; oldH = 1080; }
      else if (ar === '4:5') { oldW = 1080; oldH = 1350; }
      else if (ar === '21:9') { oldW = 2560; oldH = 1080; }
      else if (ar === '4:3') { oldW = 1440; oldH = 1080; }
      else if (ar === 'free' || ar === 'auto') {
        oldW = Math.max(120, state.project.settings.customWidth || 1080);
        oldH = Math.max(120, state.project.settings.customHeight || 1920);
      }

      const cx = Math.max(0, Math.min(0.95, crop.x));
      const cy = Math.max(0, Math.min(0.95, crop.y));
      const cw = Math.max(0.05, Math.min(1 - cx, crop.width));
      const ch = Math.max(0.05, Math.min(1 - cy, crop.height));

      const newW = Math.max(120, Math.min(3840, Math.round((oldW * cw) / 2) * 2));
      const newH = Math.max(120, Math.min(3840, Math.round((oldH * ch) / 2) * 2));

      const cropCenterX = (cx + cw / 2) * oldW;
      const cropCenterY = (cy + ch / 2) * oldH;

      const computeBaseDims = (
        srcW: number,
        srcH: number,
        canvasW: number,
        canvasH: number,
        fitMode: 'contain' | 'cover' | 'fill'
      ) => {
        if (fitMode === 'fill') return { baseW: canvasW, baseH: canvasH };
        const factor =
          fitMode === 'cover'
            ? Math.max(canvasW / srcW, canvasH / srcH)
            : Math.min(canvasW / srcW, canvasH / srcH);
        return { baseW: srcW * factor, baseH: srcH * factor };
      };

      const tracks = state.project.tracks.map((tr) => ({
        ...tr,
        clips: tr.clips.map((c) => {
          if (c.type === 'video' || c.type === 'image') {
            const vc = c as VideoClip;
            const srcW = vc.naturalWidth || 1080;
            const srcH = vc.naturalHeight || 1920;
            const fitMode = vc.transform.fitMode || 'contain';

            const oldBase = computeBaseDims(srcW, srcH, oldW, oldH, fitMode);
            const newBase = computeBaseDims(srcW, srcH, newW, newH, fitMode);

            const ratioX = newBase.baseW > 0 ? oldBase.baseW / newBase.baseW : 1;
            const ratioY = newBase.baseH > 0 ? oldBase.baseH / newBase.baseH : 1;

            const mapTransform = (t: typeof vc.transform) => {
              const oldCenterX = oldW / 2 + (t.x / 100) * oldW;
              const oldCenterY = oldH / 2 + (t.y / 100) * oldH;
              const newX = Number((((oldCenterX - cropCenterX) / newW) * 100).toFixed(2));
              const newY = Number((((oldCenterY - cropCenterY) / newH) * 100).toFixed(2));

              if (fitMode === 'fill') {
                return {
                  ...t,
                  x: newX,
                  y: newY,
                  scaleX: Number(Math.max(0.05, Math.min(10, (t.scaleX ?? 1) * ratioX)).toFixed(4)),
                  scaleY: Number(Math.max(0.05, Math.min(10, (t.scaleY ?? 1) * ratioY)).toFixed(4)),
                };
              }
              return {
                ...t,
                x: newX,
                y: newY,
                scale: Number(Math.max(0.05, Math.min(10, t.scale * ratioX)).toFixed(4)),
              };
            };

            const nextTransform = mapTransform(vc.transform);
            const nextKeyframes = vc.keyframes?.length
              ? vc.keyframes.map((kf) => {
                  const merged = {
                    ...vc.transform,
                    ...kf.properties,
                  };
                  const mapped = mapTransform(merged);
                  const nextProps = { ...kf.properties };
                  if (kf.properties.x !== undefined) nextProps.x = mapped.x;
                  if (kf.properties.y !== undefined) nextProps.y = mapped.y;
                  if (fitMode === 'fill') {
                    if (kf.properties.scaleX !== undefined) nextProps.scaleX = mapped.scaleX;
                    if (kf.properties.scaleY !== undefined) nextProps.scaleY = mapped.scaleY;
                  } else if (kf.properties.scale !== undefined) {
                    nextProps.scale = mapped.scale;
                  }
                  return { ...kf, properties: nextProps };
                })
              : vc.keyframes;

            return {
              ...vc,
              transform: nextTransform,
              keyframes: nextKeyframes,
            };
          }

          if (c.type === 'text' || c.type === 'subtitle') {
            const oldCenterX = oldW / 2 + (c.transform.x / 100) * oldW;
            const oldCenterY = oldH / 2 + (c.transform.y / 100) * oldH;
            const newX = Number((((oldCenterX - cropCenterX) / newW) * 100).toFixed(2));
            const newY = Number((((oldCenterY - cropCenterY) / newH) * 100).toFixed(2));
            return {
              ...c,
              transform: {
                ...c.transform,
                x: newX,
                y: newY,
              },
            };
          }

          return c;
        }),
      }));

      const updated: Project = {
        ...state.project,
        tracks,
        settings: {
          ...state.project.settings,
          aspectRatio: 'free',
          customWidth: newW,
          customHeight: newH,
        },
      };
      recordAndSync(updated);
      set({ project: updated, isScreenCropMode: false });
      get().showToast(`✂️ Pantalla recortada a ${newW}×${newH}px`);
    },

    setProjectFps: (fps) => {
      set((state) => {
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, fps },
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    setProjectDuration: (duration) => {
      set((state) => {
        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: Math.max(1, duration),
          },
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    setCanvasBackground: (background) => {
      set((state) => {
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, background },
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    toggleTrackMute: (trackId) => {
      set((state) => {
        const tracks = state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, isMuted: !t.isMuted } : t
        );
        const updated = { ...state.project, tracks };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    toggleTrackVisibility: (trackId) => {
      set((state) => {
        const tracks = state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, isVisible: !t.isVisible } : t
        );
        const updated = { ...state.project, tracks };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    toggleTrackLock: (trackId) => {
      set((state) => {
        const tracks = state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, isLocked: !t.isLocked } : t
        );
        const updated = { ...state.project, tracks };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    addClip: (trackId, clip) => {
      set((state) => {
        let finalClip = clip;
        let baseTracks = state.project.tracks;
        if (
          trackId === 'track_overlay' &&
          !baseTracks.some((t) => t.id === 'track_overlay')
        ) {
          const overlayTrack: Project['tracks'][number] = {
            id: 'track_overlay',
            name: 'Superposición (PIP)',
            type: 'overlay-video',
            isLocked: false,
            isMuted: false,
            isVisible: true,
            clips: [],
          };
          const textIdx = baseTracks.findIndex(
            (t) => t.type === 'text' || t.id === 'track_text'
          );
          baseTracks =
            textIdx >= 0
              ? [
                  ...baseTracks.slice(0, textIdx),
                  overlayTrack,
                  ...baseTracks.slice(textIdx),
                ]
              : [...baseTracks, overlayTrack];
        }

        let tracks = baseTracks.map((t) => {
          if (t.id === trackId) {
            const hasOnlyInitialDemoClips =
              t.clips.length > 0 &&
              t.clips.every((c) => c.id.startsWith('sample_vid_initial_'));
            if (hasOnlyInitialDemoClips && !clip.id.startsWith('sample_')) {
              finalClip = { ...clip, startTime: 0 };
              return { ...t, clips: [finalClip] };
            }
            return { ...t, clips: [...t.clips, finalClip] };
          }
          return t;
        });

        if (state.isMagnetEnabled) {
          tracks = packMagneticProjectTracks(tracks);
          const packed = tracks
            .find((t) => t.id === trackId)
            ?.clips.find((c) => c.id === finalClip.id);
          if (packed) finalClip = packed;
        }

        const newDuration = computeProjectDuration(tracks);
        const autoDims =
          state.project.settings.aspectRatio === 'auto'
            ? getPrimaryMediaDimensions(tracks)
            : null;

        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: newDuration,
            ...(state.project.settings.aspectRatio === 'auto'
              ? {
                  customWidth: autoDims?.width,
                  customHeight: autoDims?.height,
                }
              : {}),
          },
          tracks,
        };
        recordAndSync(updated);
        return {
          project: updated,
          selectedClipId: finalClip.id,
          currentTime: Number(finalClip.startTime.toFixed(2)),
        };
      });
    },

    addDubbingClip: (clip) => {
      set((state) => {
        const { tracks, finalClip } = placeAudioClipAtTime(
          state.project.tracks,
          clip,
          'track_audio_dub_',
          'Doblaje / Voz'
        );
        const newDuration = computeProjectDuration(tracks);
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, duration: newDuration },
          tracks,
        };
        recordAndSync(updated);
        return {
          project: updated,
          selectedClipId: finalClip.id,
        };
      });
    },

    addAudioEffectClip: (clip) => {
      set((state) => {
        const targetStart = Number(Math.max(0, state.currentTime).toFixed(2));
        const { tracks, finalClip } = placeAudioClipAtTime(
          state.project.tracks,
          { ...clip, startTime: targetStart },
          'track_audio_fx_',
          'Efectos de Audio'
        );
        const newDuration = computeProjectDuration(tracks);
        const updated: Project = {
          ...state.project,
          settings: { ...state.project.settings, duration: newDuration },
          tracks,
        };
        recordAndSync(updated);
        return {
          project: updated,
          selectedClipId: finalClip.id,
          currentTime: targetStart,
        };
      });
    },

    splitClip: (clipId, atTime) => {
      const state = get();
      const splitTime = atTime ?? state.currentTime;
      const allClips = state.project.tracks.flatMap((t) => t.clips);
      const clipUnderPlayhead = allClips.find(
        (c) =>
          splitTime > c.startTime + 0.05 &&
          splitTime < c.startTime + c.duration - 0.05
      );
      const targetId =
        clipId ||
        state.selectedClipId ||
        clipUnderPlayhead?.id ||
        allClips[0]?.id;

      if (!targetId) {
        state.showToast('⚠️ Agrega un clip primero para poder dividirlo');
        return;
      }

      let found = false;
      let actualSplitTime = Number((atTime ?? state.currentTime).toFixed(2));
      let newRightClipId: string | null = null;

      const tracks = state.project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === targetId);
        if (clipIdx === -1) return track;

        const clip = track.clips[clipIdx];
        if (clip.duration < 0.4) {
          state.showToast('⚠️ El clip es demasiado corto para dividirlo');
          return track;
        }

        // If playhead is outside the clip bounds, split right at the center of the clip
        if (
          actualSplitTime <= clip.startTime + 0.1 ||
          actualSplitTime >= clip.startTime + clip.duration - 0.1
        ) {
          actualSplitTime = Number(
            (clip.startTime + clip.duration / 2).toFixed(2)
          );
        }

        found = true;
        const leftDuration = Number(
          (actualSplitTime - clip.startTime).toFixed(2)
        );
        const rightStartTime = Number(
          (clip.startTime + leftDuration).toFixed(2)
        );
        const rightDuration = Number(
          (clip.duration - leftDuration).toFixed(2)
        );

        const leftClip: TimelineClip =
          clip.type === 'video' || clip.type === 'image'
            ? {
                ...clip,
                duration: leftDuration,
                keyframes: clip.keyframes?.length
                  ? clip.keyframes.filter((kf) => kf.time <= leftDuration + 0.01)
                  : clip.keyframes,
              }
            : {
                ...clip,
                duration: leftDuration,
              };

        const rightId = 'clip_' + Math.random().toString(36).substring(2, 9);
        newRightClipId = rightId;

        const rightClip: TimelineClip = createCleanDerivedClip(clip, {
          id: rightId,
          startTime: rightStartTime,
          duration: rightDuration,
          sourceStartTime: Number(
            (clip.sourceStartTime + leftDuration * (clip.speed || 1)).toFixed(4)
          ),
          isFrozen: Boolean(clip.isFrozen),
          splitLocalTime: leftDuration,
        });

        const newClips = [...track.clips];
        newClips.splice(clipIdx, 1, leftClip, rightClip);
        return { ...track, clips: newClips };
      });

      if (found) {
        const updated: Project = { ...state.project, tracks };
        recordAndSync(updated);
        set({
          project: updated,
          currentTime: actualSplitTime,
          selectedClipId: newRightClipId || targetId,
        });
        state.showToast('✂️ Clip dividido en 2 partes');
      }
    },

    trimLeftClip: (clipId, atTime) => {
      const state = get();
      const cutTime = Number((atTime ?? state.currentTime).toFixed(2));
      const allClips = state.project.tracks.flatMap((t) => t.clips);
      const clipUnderPlayhead = allClips.find(
        (c) =>
          cutTime > c.startTime + 0.05 &&
          cutTime < c.startTime + c.duration - 0.05
      );
      const targetId =
        clipId || state.selectedClipId || clipUnderPlayhead?.id || allClips[0]?.id;

      if (!targetId) {
        state.showToast('⚠️ Agrega un clip primero para poder recortarlo');
        return;
      }

      const ownerTrack = state.project.tracks.find((t) =>
        t.clips.some((c) => c.id === targetId)
      );
      if (!ownerTrack) return;
      if (ownerTrack.isLocked) {
        state.showToast('🔒 La pista está bloqueada');
        return;
      }

      const clip = ownerTrack.clips.find((c) => c.id === targetId)!;
      if (cutTime <= clip.startTime + 0.05) {
        state.showToast(
          '⚠️ Coloca el cabezal dentro del clip para recortar la izquierda'
        );
        return;
      }
      if (cutTime >= clip.startTime + clip.duration - 0.1) {
        state.showToast('⚠️ El corte dejaría el clip demasiado corto');
        return;
      }

      const cutDelta = Number((cutTime - clip.startTime).toFixed(2));
      const newDuration = Number((clip.duration - cutDelta).toFixed(2));
      const newSourceStartTime = Number(
        (clip.sourceStartTime + cutDelta * (clip.speed || 1)).toFixed(2)
      );

      let tracks = state.project.tracks.map((track) => {
        if (track.id !== ownerTrack.id) return track;
        return {
          ...track,
          clips: track.clips.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  startTime: cutTime,
                  duration: newDuration,
                  sourceStartTime: newSourceStartTime,
                }
              : c
          ),
        };
      });

      if (state.isMagnetEnabled) {
        tracks = packMagneticProjectTracks(tracks);
      }

      const updated: Project = {
        ...state.project,
        settings: {
          ...state.project.settings,
          duration: computeProjectDuration(tracks),
        },
        tracks,
      };

      const packedClip = tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === targetId);
      const nextTime = packedClip ? packedClip.startTime : cutTime;

      recordAndSync(updated);
      set({
        project: updated,
        currentTime: nextTime,
        selectedClipId: targetId,
      });
      state.showToast('✂️ Parte izquierda recortada');
    },

    trimRightClip: (clipId, atTime) => {
      const state = get();
      const cutTime = Number((atTime ?? state.currentTime).toFixed(2));
      const allClips = state.project.tracks.flatMap((t) => t.clips);
      const clipUnderPlayhead = allClips.find(
        (c) =>
          cutTime > c.startTime + 0.05 &&
          cutTime < c.startTime + c.duration - 0.05
      );
      const targetId =
        clipId || state.selectedClipId || clipUnderPlayhead?.id || allClips[0]?.id;

      if (!targetId) {
        state.showToast('⚠️ Agrega un clip primero para poder recortarlo');
        return;
      }

      const ownerTrack = state.project.tracks.find((t) =>
        t.clips.some((c) => c.id === targetId)
      );
      if (!ownerTrack) return;
      if (ownerTrack.isLocked) {
        state.showToast('🔒 La pista está bloqueada');
        return;
      }

      const clip = ownerTrack.clips.find((c) => c.id === targetId)!;
      if (cutTime >= clip.startTime + clip.duration - 0.05) {
        state.showToast(
          '⚠️ Coloca el cabezal dentro del clip para recortar la derecha'
        );
        return;
      }
      if (cutTime <= clip.startTime + 0.1) {
        state.showToast('⚠️ El corte dejaría el clip demasiado corto');
        return;
      }

      const newDuration = Number((cutTime - clip.startTime).toFixed(2));

      let tracks = state.project.tracks.map((track) => {
        if (track.id !== ownerTrack.id) return track;
        return {
          ...track,
          clips: track.clips.map((c) =>
            c.id === targetId ? { ...c, duration: newDuration } : c
          ),
        };
      });

      if (state.isMagnetEnabled) {
        tracks = packMagneticProjectTracks(tracks);
      }

      const newDurationTotal = computeProjectDuration(tracks);
      const updated: Project = {
        ...state.project,
        settings: {
          ...state.project.settings,
          duration: newDurationTotal,
        },
        tracks,
      };

      recordAndSync(updated);
      set({
        project: updated,
        currentTime: Number(Math.min(cutTime, newDurationTotal).toFixed(2)),
        selectedClipId: targetId,
      });
      state.showToast('✂️ Parte derecha recortada');
    },

    trimClip: (clipId, newStartTime, newDuration) => {
      set((state) => {
        const tracks = state.project.tracks.map((track) => {
          if (track.isLocked) return track;
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id === clipId) {
                const clampedStart = Math.max(0, Number(newStartTime.toFixed(2)));
                const deltaStart = clampedStart - clip.startTime;
                const clampedDuration = Math.max(
                  0.2,
                  Number(newDuration.toFixed(2))
                );
                return {
                  ...clip,
                  startTime: clampedStart,
                  duration: clampedDuration,
                  sourceStartTime: Math.max(
                    0,
                    clip.sourceStartTime + deltaStart * (clip.speed || 1)
                  ),
                };
              }
              return clip;
            }),
          };
        });

        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: computeProjectDuration(tracks),
          },
          tracks,
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    setReorderTrackId: (trackId) => {
      set({ reorderTrackId: trackId });
    },

    reorderTrackClips: (trackId, orderedClipIds) => {
      const state = get();
      let changed = false;

      const tracks = state.project.tracks.map((track) => {
        if (track.id !== trackId || track.isLocked || track.clips.length < 2) {
          return track;
        }

        const clipMap = new Map(track.clips.map((c) => [c.id, c]));
        const reordered: TimelineClip[] = [];
        for (const id of orderedClipIds) {
          const found = clipMap.get(id);
          if (found) {
            reordered.push(found);
            clipMap.delete(id);
          }
        }
        for (const leftover of clipMap.values()) {
          reordered.push(leftover);
        }

        const startAnchor = state.isMagnetEnabled
          ? 0
          : Math.min(...track.clips.map((c) => c.startTime));

        let cursor = Math.max(0, startAnchor);
        const packed = reordered.map((clip) => {
          const startTime = Number(cursor.toFixed(2));
          cursor += clip.duration;
          return clip.startTime === startTime ? clip : { ...clip, startTime };
        });

        changed = true;
        return { ...track, clips: packed };
      });

      if (!changed) return;

      const newDuration = computeProjectDuration(tracks);
      const autoDims =
        state.project.settings.aspectRatio === 'auto'
          ? getPrimaryMediaDimensions(tracks)
          : null;
      const updated: Project = {
        ...state.project,
        settings: {
          ...state.project.settings,
          duration: newDuration,
          ...(state.project.settings.aspectRatio === 'auto'
            ? {
                customWidth: autoDims?.width,
                customHeight: autoDims?.height,
              }
            : {}),
        },
        tracks,
      };
      recordAndSync(updated);
      set({
        project: updated,
        currentTime: Math.min(state.currentTime, newDuration),
      });
    },

    moveClip: (clipId, newStartTime) => {
      set((state) => {
        const tracks = state.project.tracks.map((track) => {
          if (track.isLocked) return track;
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  startTime: Math.max(0, Number(newStartTime.toFixed(2))),
                };
              }
              return clip;
            }),
          };
        });

        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: computeProjectDuration(tracks),
          },
          tracks,
        };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    deleteClip: (clipId) => {
      const state = get();
      let tracks = state.project.tracks
        .map((track) => ({
          ...track,
          clips: track.clips.filter((c) => c.id !== clipId),
        }))
        .filter(
          (track) => !(track.id === 'track_overlay' && track.clips.length === 0)
        );

      if (state.isMagnetEnabled) {
        tracks = packMagneticProjectTracks(tracks);
      }

      const newDuration = computeProjectDuration(tracks);
      const autoDims =
        state.project.settings.aspectRatio === 'auto'
          ? getPrimaryMediaDimensions(tracks)
          : null;
      const updated: Project = {
        ...state.project,
        settings: {
          ...state.project.settings,
          duration: newDuration,
          ...(state.project.settings.aspectRatio === 'auto'
            ? {
                customWidth: autoDims?.width,
                customHeight: autoDims?.height,
              }
            : {}),
        },
        tracks,
      };
      recordAndSync(updated);
      set({
        project: updated,
        currentTime: Math.min(state.currentTime, newDuration),
        selectedClipId:
          state.selectedClipId === clipId ? null : state.selectedClipId,
      });
      state.showToast('🗑️ Clip eliminado');
    },

    duplicateClip: (clipId) => {
      const state = get();
      let duplicatedClip: TimelineClip | null = null;
      const tracks = state.project.tracks.map((track) => {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) {
          const dupId = 'clip_' + Math.random().toString(36).substring(2, 9);
          duplicatedClip = {
            ...clip,
            id: dupId,
            startTime: Number((clip.startTime + clip.duration).toFixed(2)),
            name: `${clip.name} (Copia)`,
          };
          const existingEl = state.mediaElements.get(clip.id);
          if (existingEl instanceof HTMLCanvasElement || existingEl instanceof HTMLImageElement) {
            state.mediaElements.set(dupId, existingEl);
          }
          return { ...track, clips: [...track.clips, duplicatedClip] };
        }
        return track;
      });

      if (duplicatedClip) {
        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: computeProjectDuration(tracks),
          },
          tracks,
        };
        recordAndSync(updated);
        set({
          project: updated,
          selectedClipId: (duplicatedClip as TimelineClip).id,
        });
        state.showToast('📄 Clip duplicado');
      }
    },

    freezeFrame: (clipId, duration = 2.5) => {
      const state = get();
      let createdFreezeId: string | null = null;
      let nextPlayheadTime: number | null = null;

      const tracks = state.project.tracks.map((track) => {
        const clipIdx = track.clips.findIndex((c) => c.id === clipId);
        if (clipIdx === -1) return track;
        const clip = track.clips[clipIdx];
        if (clip.type !== 'video' && clip.type !== 'image') return track;

        const vClip = clip as VideoClip;
        const speed = vClip.speed || 1;
        const freezeId =
          'clip_freeze_' + Math.random().toString(36).substring(2, 9);
        createdFreezeId = freezeId;

        const isInsideClip =
          state.currentTime > clip.startTime + 0.05 &&
          state.currentTime < clip.startTime + clip.duration - 0.05;
        const isAtClipStart =
          state.currentTime >= clip.startTime - 0.05 &&
          state.currentTime <= clip.startTime + 0.05;

        const buildFrozenClip = (
          startTime: number,
          sourceStartTime: number,
          splitLocalTime: number
        ): VideoClip =>
          createCleanDerivedClip(vClip, {
            id: freezeId,
            name: `❄️ ${vClip.name} [Congelado]`,
            startTime,
            duration,
            sourceStartTime,
            isFrozen: true,
            muteAudio: true,
            splitLocalTime,
          }) as VideoClip;

        let newClips: TimelineClip[];
        let capturedFreezeMediaTime = vClip.sourceStartTime;

        if (isInsideClip) {
          const freezeAt = Number(state.currentTime.toFixed(2));
          const leftDuration = Number((freezeAt - clip.startTime).toFixed(2));
          const rightDuration = Number((clip.duration - leftDuration).toFixed(2));

          const freezeMediaTime = vClip.isFrozen
            ? vClip.sourceStartTime
            : vClip.isReversed
            ? Math.max(0, vClip.sourceStartTime + rightDuration * speed)
            : vClip.sourceStartTime + leftDuration * speed;
          capturedFreezeMediaTime = freezeMediaTime;

          const leftClip: VideoClip = {
            ...vClip,
            duration: leftDuration,
            sourceStartTime: vClip.isReversed ? freezeMediaTime : vClip.sourceStartTime,
            keyframes: vClip.keyframes?.length
              ? vClip.keyframes.filter((kf) => kf.time <= leftDuration + 0.01)
              : vClip.keyframes,
          };

          const frozenClip = buildFrozenClip(freezeAt, freezeMediaTime, leftDuration);

          const rightId = 'clip_' + Math.random().toString(36).substring(2, 9);
          const rightClip: VideoClip = createCleanDerivedClip(vClip, {
            id: rightId,
            startTime: Number((freezeAt + duration).toFixed(2)),
            duration: rightDuration,
            sourceStartTime: vClip.isReversed ? vClip.sourceStartTime : freezeMediaTime,
            isFrozen: Boolean(vClip.isFrozen),
            splitLocalTime: leftDuration,
          }) as VideoClip;

          nextPlayheadTime = freezeAt;

          const otherClips = track.clips
            .filter((c) => c.id !== clip.id)
            .map((c) =>
              c.startTime >= freezeAt - 0.05
                ? { ...c, startTime: Number((c.startTime + duration).toFixed(2)) }
                : c
            );

          newClips = [...otherClips, leftClip, frozenClip, rightClip];
        } else if (isAtClipStart) {
          const freezeAt = Number(clip.startTime.toFixed(2));
          const freezeMediaTime = vClip.isFrozen
            ? vClip.sourceStartTime
            : vClip.isReversed
            ? Math.max(0, vClip.sourceStartTime + clip.duration * speed)
            : vClip.sourceStartTime;
          capturedFreezeMediaTime = freezeMediaTime;

          const frozenClip = buildFrozenClip(freezeAt, freezeMediaTime, 0);

          nextPlayheadTime = freezeAt;

          const shiftedClips = track.clips.map((c) => {
            if (c.id === clip.id || c.startTime >= freezeAt - 0.05) {
              return { ...c, startTime: Number((c.startTime + duration).toFixed(2)) };
            }
            return c;
          });

          newClips = [...shiftedClips, frozenClip];
        } else {
          const localOffset = Math.max(0, clip.duration - 0.02);
          const freezeMediaTime = vClip.isFrozen
            ? vClip.sourceStartTime
            : vClip.isReversed
            ? vClip.sourceStartTime
            : vClip.sourceStartTime + localOffset * speed;
          capturedFreezeMediaTime = freezeMediaTime;

          const freezeAt = Number((clip.startTime + clip.duration).toFixed(2));
          const frozenClip = buildFrozenClip(freezeAt, freezeMediaTime, localOffset);

          nextPlayheadTime = freezeAt;

          const shiftedClips = track.clips.map((c) => {
            if (c.id !== clip.id && c.startTime >= freezeAt - 0.05) {
              return { ...c, startTime: Number((c.startTime + duration).toFixed(2)) };
            }
            return c;
          });

          newClips = [...shiftedClips, frozenClip];
        }

        newClips.sort((a, b) => a.startTime - b.startTime);

        const existingEl = state.mediaElements.get(clip.id);
        if (existingEl instanceof HTMLCanvasElement || existingEl instanceof HTMLImageElement) {
          state.mediaElements.set(freezeId, existingEl);
        } else if (
          typeof document !== 'undefined' &&
          existingEl instanceof HTMLVideoElement &&
          existingEl.readyState >= 2 &&
          existingEl.videoWidth > 0 &&
          existingEl.videoHeight > 0 &&
          Math.abs(existingEl.currentTime - capturedFreezeMediaTime) < 0.5
        ) {
          try {
            const maxDim = 1920;
            let w = existingEl.videoWidth;
            let h = existingEl.videoHeight;
            if (w > maxDim || h > maxDim) {
              const sc = maxDim / Math.max(w, h);
              w = Math.max(2, Math.round(w * sc));
              h = Math.max(2, Math.round(h * sc));
            }
            const snapCanvas = document.createElement('canvas');
            snapCanvas.width = w;
            snapCanvas.height = h;
            const ctx = snapCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(existingEl, 0, 0, w, h);
              (snapCanvas as unknown as { __renderStamp?: number }).__renderStamp =
                capturedFreezeMediaTime;
              state.mediaElements.set(freezeId, snapCanvas);
            }
          } catch {
            // VideoCanvas will lazily capture the frozen frame if synchronous snapshot fails
          }
        }

        return { ...track, clips: newClips };
      });

      if (createdFreezeId) {
        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: computeProjectDuration(tracks),
          },
          tracks,
        };
        recordAndSync(updated);
        set({
          project: updated,
          isPlaying: false,
          selectedClipId: createdFreezeId,
          ...(nextPlayheadTime !== null ? { currentTime: nextPlayheadTime } : {}),
        });
        state.showToast('❄️ Fotograma congelado añadido (2.5s)');
      }
    },

    reverseClip: (clipId) => {
      const state = get();
      let nowReversed = false;
      const tracks = state.project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            nowReversed = !clip.isReversed;
            return {
              ...clip,
              isReversed: nowReversed,
              name: clip.isReversed
                ? clip.name.replace(' [Invertido]', '')
                : `${clip.name} [Invertido]`,
            };
          }
          return clip;
        }),
      }));

      const updated: Project = { ...state.project, tracks };
      recordAndSync(updated);
      set({ project: updated });
      state.showToast(
        nowReversed
          ? '⏪ Clip invertido (reproducción en reversa)'
          : '▶️ Clip restaurado a dirección normal'
      );
    },

    updateClip: (clipId, updates) => {
      set((state) => {
        const hasDurationChange =
          typeof (updates as Partial<TimelineClip>).duration === 'number';
        const tracks = state.project.tracks.map((track) => {
          let clipUpdated = false;
          const mappedClips = track.clips.map((clip) => {
            if (clip.id === clipId) {
              clipUpdated = true;
              const nextTransform = (updates as Partial<VideoClip>).transform;
              if (
                nextTransform &&
                (clip.type === 'video' ||
                  clip.type === 'image' ||
                  clip.type === 'text' ||
                  clip.type === 'subtitle')
              ) {
                const animClip = clip as VideoClip | TextClip;
                const existingKfs = animClip.keyframes || [];
                if (existingKfs.length > 0 && !(updates as Partial<VideoClip>).keyframes) {
                  const localTime = Number(
                    Math.max(
                      0,
                      Math.min(animClip.duration, state.currentTime - animClip.startTime)
                    ).toFixed(2)
                  );
                  const kfProps = extractKeyframeProperties(nextTransform);
                  const matchIdx = existingKfs.findIndex(
                    (k) => Math.abs(k.time - localTime) <= 0.05
                  );
                  const nextKeyframes =
                    matchIdx >= 0
                      ? existingKfs.map((k, idx) =>
                          idx === matchIdx ? { ...k, properties: kfProps } : k
                        )
                      : [
                          ...existingKfs,
                          {
                            id: 'kf_' + Math.random().toString(36).substring(2, 9),
                            time: localTime,
                            properties: kfProps,
                            easing: 'easeInOut' as const,
                          },
                        ].sort((a, b) => a.time - b.time);

                  return {
                    ...animClip,
                    ...updates,
                    keyframes: nextKeyframes,
                  } as TimelineClip;
                }
              }
              return { ...clip, ...updates } as TimelineClip;
            }
            return clip;
          });

          if (!clipUpdated) return track;

          const finalClips =
            hasDurationChange && MAGNETIC_TRACK_TYPES.has(track.type)
              ? packTrackClipsLeft(mappedClips)
              : mappedClips;

          return {
            ...track,
            clips: finalClips,
          };
        });

        const computedDuration = computeProjectDuration(tracks);
        const updated: Project = {
          ...state.project,
          settings: {
            ...state.project.settings,
            duration: hasDurationChange
              ? computedDuration
              : Math.max(state.project.settings.duration, computedDuration),
          },
          tracks,
        };
        scheduleRecordAndSync(updated);
        return { project: updated };
      });
    },

    updateAllVisualClips: (updates, options) => {
      set((state) => {
        const includeText = Boolean(options?.includeText);
        const tracks = state.project.tracks.map((track) => {
          if (track.type === 'audio') return track;
          if (!includeText && track.type !== 'main-video' && track.type !== 'overlay-video') {
            return track;
          }
          return {
            ...track,
            clips: track.clips.map((clip) => {
              const isMatch = includeText
                ? clip.type !== 'audio'
                : clip.type === 'video' || clip.type === 'image';
              if (!isMatch) return clip;
              return { ...clip, ...updates } as TimelineClip;
            }),
          };
        });

        const updated: Project = {
          ...state.project,
          tracks,
        };
        scheduleRecordAndSync(updated);
        return { project: updated };
      });
    },

    separateAudio: (clipId) => {
      const state = get();
      const targetId =
        clipId ||
        state.selectedClipId ||
        state.project.tracks
          .flatMap((t) => t.clips)
          .find((c) => c.type === 'video')?.id;

      if (!targetId) {
        state.showToast('⚠️ Selecciona o sube un video para separar su audio');
        return;
      }

      let extractedAudio: AudioClip | null = null;
      let sourceVideoClip: VideoClip | null = null;

      let modifiedTracks = state.project.tracks.map((track) => {
        const clip = track.clips.find((c) => c.id === targetId);
        if (clip && clip.type === 'video') {
          const vClip = clip as VideoClip;
          sourceVideoClip = vClip;

          // Mute original video clip
          const mutedVideo: VideoClip = {
            ...vClip,
            hasSeparatedAudio: true,
            audio: { ...vClip.audio, isMuted: true },
          };

          // Also immediately mute its DOM video element if cached
          const cachedVideo = state.mediaElements.get(vClip.id);
          if (cachedVideo instanceof HTMLVideoElement) {
            cachedVideo.muted = true;
          }

          const newAudioId =
            'audio_sep_' + Math.random().toString(36).substring(2, 9);

          extractedAudio = {
            id: newAudioId,
            trackId: 'track_audio',
            type: 'audio',
            name: `🔊 Audio: ${vClip.name.replace(' [Sin Audio]', '')}`,
            sourceUrl: vClip.sourceUrl,
            startTime: vClip.startTime,
            duration: vClip.duration,
            sourceStartTime: vClip.sourceStartTime,
            sourceDuration: vClip.sourceDuration,
            speed: vClip.speed,
            waveform: Array.from({ length: 60 }, (_, i) =>
              Number((0.25 + 0.55 * Math.abs(Math.sin(i * 0.4))).toFixed(2))
            ),
            audio: {
              ...vClip.audio,
              isMuted: false,
              volume: vClip.audio.volume || 100,
            },
          };

          return {
            ...track,
            clips: track.clips.map((c) => (c.id === targetId ? mutedVideo : c)),
          };
        }
        return track;
      });

      if (extractedAudio && sourceVideoClip) {
        const finalAudio = extractedAudio as AudioClip;
        const finalSourceUrl = (sourceVideoClip as VideoClip).sourceUrl;

        modifiedTracks = modifiedTracks.map((track) => {
          if (track.type === 'audio') {
            return {
              ...track,
              clips: [...track.clips, finalAudio],
            };
          }
          return track;
        });

        const updated: Project = {
          ...state.project,
          tracks: modifiedTracks,
        };
        recordAndSync(updated);
        set({
          project: updated,
          selectedClipId: finalAudio.id,
        });
        state.showToast('🔊 Audio extraído a la pista de Música y Efectos');

        // Asynchronously extract clean WAV audio & compute real waveform from the video source
        if (finalSourceUrl && !finalSourceUrl.startsWith('procedural://')) {
          globalAudioEngine
            .extractAudioFromUrl(finalSourceUrl)
            .then(({ url, blob, waveform }) => {
              ProjectStorage.registerRuntimeBlob(url, blob);
              void ProjectStorage.saveMediaBlob(finalAudio.id, blob, url);
              get().updateClip(finalAudio.id, { sourceUrl: url, waveform });
            })
            .catch(() => {
              globalAudioEngine
                .generateWaveform(finalSourceUrl, 80)
                .then((waveform) => {
                  get().updateClip(finalAudio.id, { waveform });
                })
                .catch(() => {});
            });
        } else {
          // If procedural demo clip without real audio file, synthesize a real audio track so it plays sound!
          globalAudioEngine
            .generateSynthesizedSFX('beat')
            .then(({ url, blob, waveform }) => {
              ProjectStorage.saveMediaBlob(finalAudio.id, blob, url);
              get().updateClip(finalAudio.id, {
                sourceUrl: url,
                waveform,
              });
            })
            .catch(() => {});
        }
      } else {
        state.showToast('⚠️ El clip seleccionado no es un video con audio');
      }
    },

    addKeyframe: (clipId, keyframe) => {
      set((state) => {
        const tracks = state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            if (
              clip.id === clipId &&
              (clip.type === 'video' ||
                clip.type === 'image' ||
                clip.type === 'text' ||
                clip.type === 'subtitle')
            ) {
              const animClip = clip as VideoClip | TextClip;
              const filtered = (animClip.keyframes || []).filter(
                (k) => Math.abs(k.time - keyframe.time) > 0.05
              );
              return {
                ...animClip,
                keyframes: [...filtered, keyframe].sort(
                  (a, b) => a.time - b.time
                ),
              };
            }
            return clip;
          }),
        }));

        const updated: Project = { ...state.project, tracks };
        recordAndSync(updated);
        return { project: updated };
      });
      get().showToast('💎 Keyframe añadido en el tiempo actual');
    },

    removeKeyframe: (clipId, keyframeId) => {
      set((state) => {
        const tracks = state.project.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            if (
              clip.id === clipId &&
              (clip.type === 'video' ||
                clip.type === 'image' ||
                clip.type === 'text' ||
                clip.type === 'subtitle')
            ) {
              const animClip = clip as VideoClip | TextClip;
              return {
                ...animClip,
                keyframes: (animClip.keyframes || []).filter(
                  (k) => k.id !== keyframeId
                ),
              };
            }
            return clip;
          }),
        }));

        const updated: Project = { ...state.project, tracks };
        recordAndSync(updated);
        return { project: updated };
      });
    },

    registerMediaElement: (clipId, el) => {
      get().mediaElements.set(clipId, el);
    },

    undo: () => {
      flushPendingSync();
      const previous = history.undo(get().project);
      if (previous) {
        void ProjectStorage.saveProject(previous);
        set({ project: previous });
        get().showToast('↩️ Deshacer');
      }
    },

    redo: () => {
      flushPendingSync();
      const next = history.redo();
      if (next) {
        void ProjectStorage.saveProject(next);
        set({ project: next });
        get().showToast('↪️ Rehacer');
      }
    },

    canUndo: () => history.canUndo() || pendingSyncProject !== null,
    canRedo: () => history.canRedo(),

    getHistorySnapshot: () => {
      flushPendingSync();
      return history.getSnapshot();
    },

    restoreHistorySnapshot: (snapshot) => {
      cancelPendingSync();
      history.restoreSnapshot(snapshot);
    },

    restoreProjectSnapshot: (snapshotProject, options) => {
      cancelPendingSync();
      const st = get();
      for (const el of st.mediaElements.values()) {
        if (el instanceof HTMLMediaElement) {
          el.pause();
        }
      }

      const restored = JSON.parse(JSON.stringify(snapshotProject)) as Project;
      void ProjectStorage.saveProject(restored);

      // Find main video track
      const mainVideoTrack =
        restored.tracks.find((t) => t.type === 'main-video' || t.id === 'track_main') ||
        restored.tracks.find((t) =>
          t.clips.some((c) => c.type === 'video' || c.type === 'image')
        ) ||
        restored.tracks[0];

      let nextSelectedClipId: string | null = null;
      if (options?.selectedClipId) {
        const stillExists = restored.tracks.some((t) =>
          t.clips.some((c) => c.id === options.selectedClipId)
        );
        if (stillExists) {
          nextSelectedClipId = options.selectedClipId;
        }
      }

      // If no valid clip selected yet, select the video clip on the video track
      if (!nextSelectedClipId && mainVideoTrack) {
        const videoClip = mainVideoTrack.clips.find(
          (c) => c.type === 'video' || c.type === 'image'
        );
        if (videoClip) {
          nextSelectedClipId = videoClip.id;
        } else if (mainVideoTrack.clips.length > 0) {
          nextSelectedClipId = mainVideoTrack.clips[0].id;
        }
      }

      set({
        project: restored,
        selectedClipId: nextSelectedClipId,
        selectedTrackId: mainVideoTrack?.id || options?.selectedTrackId || 'track_main',
        isPlaying: false,
        ...(options?.canvasHeightVh !== undefined ? { canvasHeightVh: options.canvasHeightVh } : {}),
        ...(options?.currentTime !== undefined ? { currentTime: options.currentTime } : {}),
      });
    },

    commitToolSession: (initialProjectSnapshot, historySnapshot) => {
      cancelPendingSync();
      const current = get().project;
      const initialStr = JSON.stringify(initialProjectSnapshot);
      const currentStr = JSON.stringify(current);

      if (historySnapshot && initialStr !== currentStr) {
        history.restoreSnapshot(historySnapshot);
        history.recordState(current);
      }
      void ProjectStorage.saveProject(current);
      set({ isPlaying: false });
    },

    saveProjectToDisk: async () => {
      await ProjectStorage.saveProject(get().project);
    },

    loadProjectFromDisk: async (id: string) => {
      const loaded = await ProjectStorage.loadProject(id);
      if (loaded) {
        for (const el of get().mediaElements.values()) {
          if (el instanceof HTMLMediaElement) {
            el.pause();
          }
        }
        history.clear();
        history.recordState(loaded);
        lastExportedProjectRef = null;
        await ProjectStorage.setLastActiveProject(loaded.id);
        set({
          project: loaded,
          currentTime: 0,
          isPlaying: false,
          selectedClipId: null,
          selectedTrackId: null,
          isExportModalOpen: false,
          isMediaDrawerOpen: false,
          mediaDrawerMode: 'main',
          isProjectModalOpen: false,
          mediaElements: new Map(),
        });
        get().showToast(`📂 Proyecto "${loaded.settings.name}" abierto`);
      } else {
        get().showToast('⚠️ No se pudo abrir el proyecto');
      }
    },

    deleteProjectFromDisk: async (id: string) => {
      const isCurrent = get().project.id === id;
      await ProjectStorage.deleteProject(id);
      if (isCurrent) {
        await get().newProject();
      } else {
        get().showToast('🗑️ Proyecto eliminado');
      }
    },

    newProject: async (options?: { name?: string; discardCurrent?: boolean }) => {
      const prevId = get().project.id;
      for (const el of get().mediaElements.values()) {
        if (el instanceof HTMLMediaElement) {
          el.pause();
        }
      }
      if (options?.discardCurrent) {
        await ProjectStorage.deleteProject(prevId);
      }
      const fresh = createInitialProject();
      if (options?.name?.trim()) {
        fresh.settings.name = options.name.trim();
      }
      history.clear();
      history.recordState(fresh);
      lastExportedProjectRef = null;
      await ProjectStorage.saveProject(fresh);
      set({
        project: fresh,
        currentTime: 0,
        isPlaying: false,
        selectedClipId: null,
        selectedTrackId: null,
        isExportModalOpen: false,
        isMediaDrawerOpen: false,
        mediaDrawerMode: 'main',
        isProjectModalOpen: false,
        hasUnsavedChanges: false,
        mediaElements: new Map(),
      });
      get().showToast('✨ Nuevo proyecto creado');
    },

    markProjectExported: () => {
      lastExportedProjectRef = get().project;
      set({ hasUnsavedChanges: false });
    },
  };
});

useEditorStore.subscribe((state, prevState) => {
  if (state.project !== prevState.project) {
    const hasClips = state.project.tracks.some((t) => t.clips.length > 0);
    const nextUnsaved = hasClips && state.project !== lastExportedProjectRef;
    if (state.hasUnsavedChanges !== nextUnsaved) {
      useEditorStore.setState({ hasUnsavedChanges: nextUnsaved });
    }
  }
});
