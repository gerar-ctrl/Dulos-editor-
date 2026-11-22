// ============================================================================
// importMediaFiles - Shared helper to load local Video, Image & Audio files
// Used by MediaDrawer (file picker) and Timeline (drag & drop from OS)
// ============================================================================

import { useEditorStore } from '../../store/useEditorStore';
import { globalAudioEngine } from '../audio/AudioEngine';
import { ProjectStorage } from '../storage/projectStorage';
import { AudioClip, VideoClip } from '../../types/editor';
import { createDefaultVisualProperties } from './clipDefaults';

export { createDefaultVisualProperties };

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi', 'ogv', '3gp', 'mpeg', 'mpg', 'ts', 'flv', 'wmv'];
const AUDIO_EXTS = [
  'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus', 'wma',
  'amr', 'aiff', 'aif', 'caf', 'mp2', 'ac3', 'mka', 'oga',
  'weba', 'alac', 'ape', 'wv', 'm4b', 'm4r', '3ga', 'mid', 'midi',
];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif'];

export interface ImportMediaOptions {
  /** Preferred track when dropping directly onto a track row */
  targetTrackId?: string;
  /** Explicit timeline start time (seconds) from a drop position */
  dropTime?: number;
  /** Treat any selected file as audio (used by "Añadir audio" file picker) */
  forceAudio?: boolean;
}

export function getNextMainTrackTime(): number {
  const { project } = useEditorStore.getState();
  const mainTrack = project.tracks.find((t) => t.id === 'track_main');
  if (!mainTrack || mainTrack.clips.length === 0) return 0;
  const realClips = mainTrack.clips.filter(
    (c) => !c.id.startsWith('sample_vid_initial_')
  );
  if (realClips.length === 0) return 0;
  return Math.max(
    ...realClips.map((c) => Number((c.startTime + c.duration).toFixed(2)))
  );
}

export async function importMediaFiles(
  files: File[],
  options: ImportMediaOptions = {}
): Promise<void> {
  if (files.length === 0) return;

  const { currentTime, addClip, registerMediaElement, showToast } =
    useEditorStore.getState();

  // Prepare media metadata in parallel so multi-file drops/uploads don't block sequentially
  const prepared = await Promise.all(
    files.map(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideo =
        !options.forceAudio &&
        (file.type.startsWith('video/') || VIDEO_EXTS.includes(ext));
      const isAudio =
        options.forceAudio ||
        file.type.startsWith('audio/') ||
        AUDIO_EXTS.includes(ext);
      const isImage =
        !options.forceAudio &&
        (file.type.startsWith('image/') || IMAGE_EXTS.includes(ext));

      if (!isVideo && !isAudio && !isImage) {
        return { kind: 'unsupported' as const, file };
      }

      const url = URL.createObjectURL(file);
      ProjectStorage.registerRuntimeBlob(url, file);
      let diskPath: string | undefined;
      try {
        const eApi = (
          window as unknown as {
            electronAPI?: { getPathForFile?: (f: File) => string | null };
          }
        ).electronAPI;
        const resolved =
          eApi?.getPathForFile?.(file) ||
          (file as File & { path?: string }).path ||
          null;
        if (resolved) {
          diskPath = resolved;
          ProjectStorage.registerRuntimeFilePath(url, resolved);
        }
      } catch {}

      if (isVideo) {
        const video = document.createElement('video');
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.preload = 'metadata';

        await new Promise((res) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            res(true);
          };
          video.addEventListener('loadedmetadata', finish, { once: true });
          video.addEventListener('loadeddata', finish, { once: true });
          video.addEventListener('error', finish, { once: true });
          setTimeout(finish, 1500);
          video.src = url;
        });

        // Decode first frame in background without saturating mobile decoders on multi-file imports
        if (files.length === 1) {
          video.preload = 'auto';
        }
        try {
          if (video.currentTime === 0) video.currentTime = 0.001;
        } catch {}
        video.muted = false;

        const duration = Number(
          Math.max(
            1,
            Number.isFinite(video.duration) && video.duration > 0
              ? video.duration
              : 5
          ).toFixed(2)
        );
        const clipId = 'vid_' + Math.random().toString(36).substring(2, 9);
        void ProjectStorage.saveMediaBlob(clipId, file, url);
        registerMediaElement(clipId, video);

        return { kind: 'video' as const, file, url, diskPath, clipId, video, duration };
      }

      if (isImage) {
        const img = new Image();
        img.decoding = 'async';
        await new Promise((res) => {
          img.onload = () => res(true);
          img.onerror = () => res(false);
          setTimeout(() => res(true), 1500);
          img.src = url;
        });

        const clipId = 'img_' + Math.random().toString(36).substring(2, 9);
        void ProjectStorage.saveMediaBlob(clipId, file, url);
        registerMediaElement(clipId, img);

        return { kind: 'image' as const, file, url, diskPath, clipId, img, duration: 4.0 };
      }

      const clipId = 'aud_' + Math.random().toString(36).substring(2, 9);
      void ProjectStorage.saveMediaBlob(clipId, file, url);
      const audio = new Audio();
      audio.preload = 'metadata';
      const metaPromise = new Promise((res) => {
        audio.onloadedmetadata = () => res(true);
        audio.onerror = () => res(false);
        setTimeout(() => res(true), 1500);
        audio.src = url;
      });
      const [waveform] = await Promise.all([
        globalAudioEngine.generateWaveform(url, 80),
        metaPromise,
      ]);
      let rawDuration =
        Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      if (rawDuration <= 0) {
        try {
          const decoded = await globalAudioEngine.loadAudioBuffer(url);
          if (Number.isFinite(decoded.duration) && decoded.duration > 0) {
            rawDuration = decoded.duration;
          }
        } catch {}
      }
      const duration = Number(Math.max(1, rawDuration || 5).toFixed(2));
      return { kind: 'audio' as const, file, url, diskPath, clipId, duration, waveform };
    })
  );

  const visualTrackId =
    options.targetTrackId === 'track_overlay' ? 'track_overlay' : 'track_main';
  const isOverlayTrack = visualTrackId === 'track_overlay';

  let nextVisualStart =
    options.dropTime !== undefined
      ? Math.max(0, Number(options.dropTime.toFixed(2)))
      : isOverlayTrack
      ? Number(Math.max(0, currentTime).toFixed(2))
      : getNextMainTrackTime();

  let nextAudioStart =
    options.dropTime !== undefined
      ? Math.max(0, Number(options.dropTime.toFixed(2)))
      : currentTime;

  for (const item of prepared) {
    if (item.kind === 'unsupported') {
      showToast(`⚠️ Formato no compatible: "${item.file.name}"`);
      continue;
    }

    if (item.kind === 'video') {
      const defaults = createDefaultVisualProperties();
      const newClip: VideoClip = {
        id: item.clipId,
        trackId: visualTrackId,
        type: 'video',
        name: item.file.name,
        sourceUrl: item.url,
        sourceFilePath: item.diskPath,
        startTime: nextVisualStart,
        duration: item.duration,
        sourceStartTime: 0,
        sourceDuration: item.duration,
        naturalWidth: item.video.videoWidth || 1080,
        naturalHeight: item.video.videoHeight || 1920,
        speed: 1,
        ...defaults,
        transform: isOverlayTrack
          ? {
              ...defaults.transform,
              scale: 0.5,
              scaleX: 1,
              scaleY: 1,
              freeResize: false,
            }
          : defaults.transform,
      };
      nextVisualStart = Number((nextVisualStart + item.duration).toFixed(2));
      addClip(visualTrackId, newClip);
      showToast(
        isOverlayTrack
          ? `🎬 PIP "${item.file.name}" superpuesto`
          : `🎬 Video "${item.file.name}" cargado`
      );
    } else if (item.kind === 'image') {
      const defaults = createDefaultVisualProperties();
      const newImgClip: VideoClip = {
        id: item.clipId,
        trackId: visualTrackId,
        type: 'image',
        name: item.file.name,
        sourceUrl: item.url,
        sourceFilePath: item.diskPath,
        startTime: nextVisualStart,
        duration: item.duration,
        sourceStartTime: 0,
        sourceDuration: item.duration,
        naturalWidth: item.img.naturalWidth || 1080,
        naturalHeight: item.img.naturalHeight || 1080,
        speed: 1,
        ...defaults,
        transform: isOverlayTrack
          ? {
              ...defaults.transform,
              scale: 0.5,
              scaleX: 1,
              scaleY: 1,
              freeResize: false,
            }
          : defaults.transform,
        audio: { ...defaults.audio, isMuted: true },
      };
      nextVisualStart = Number((nextVisualStart + item.duration).toFixed(2));
      addClip(visualTrackId, newImgClip);
      showToast(
        isOverlayTrack
          ? `🖼️ PIP "${item.file.name}" superpuesta`
          : `🖼️ Imagen "${item.file.name}" añadida`
      );
    } else if (item.kind === 'audio') {
      const newAudioClip: AudioClip = {
        id: item.clipId,
        trackId: 'track_audio',
        type: 'audio',
        name: item.file.name,
        sourceUrl: item.url,
        sourceFilePath: item.diskPath,
        startTime: nextAudioStart,
        duration: item.duration,
        sourceStartTime: 0,
        sourceDuration: item.duration,
        speed: 1,
        waveform: item.waveform,
        audio: {
          volume: 100,
          fadeInDuration: 0.3,
          fadeOutDuration: 0.3,
          voiceFilter: 'none',
          noiseReduction: false,
          isMuted: false,
          preservesPitch: true,
        },
      };
      nextAudioStart = Number((nextAudioStart + item.duration).toFixed(2));
      addClip('track_audio', newAudioClip);
      useEditorStore.getState().selectClip(newAudioClip.id);
      showToast(`🎵 Audio "${item.file.name}" añadido`);
    }
  }
}

/**
 * Extracts the audio track from one or more local video files and adds each
 * extracted audio clip directly onto the audio track.
 */
export async function extractAudioFromVideoFiles(
  files: File[],
  options: { dropTime?: number } = {}
): Promise<void> {
  if (files.length === 0) return;

  const { currentTime, addClip, selectClip, showToast } =
    useEditorStore.getState();

  let nextAudioStart =
    options.dropTime !== undefined
      ? Math.max(0, Number(options.dropTime.toFixed(2)))
      : currentTime;

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo = file.type.startsWith('video/') || VIDEO_EXTS.includes(ext);
    const isAudio = file.type.startsWith('audio/') || AUDIO_EXTS.includes(ext);
    if (!isVideo && !isAudio) {
      showToast(`⚠️ Selecciona un archivo de video válido ("${file.name}")`);
      continue;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const clipId = 'aud_ext_' + Math.random().toString(36).substring(2, 9);

    try {
      const { url, blob, duration, waveform } =
        await globalAudioEngine.extractAudioFromVideoFile(file);
      ProjectStorage.registerRuntimeBlob(url, blob);
      void ProjectStorage.saveMediaBlob(clipId, blob, url);

      const extractedClip: AudioClip = {
        id: clipId,
        trackId: 'track_audio',
        type: 'audio',
        name: `🔊 Audio: ${baseName}`,
        sourceUrl: url,
        startTime: nextAudioStart,
        duration,
        sourceStartTime: 0,
        sourceDuration: duration,
        speed: 1,
        waveform,
        audio: {
          volume: 100,
          fadeInDuration: 0.1,
          fadeOutDuration: 0.2,
          voiceFilter: 'none',
          noiseReduction: false,
          isMuted: false,
          preservesPitch: true,
        },
      };

      nextAudioStart = Number((nextAudioStart + duration).toFixed(2));
      addClip('track_audio', extractedClip);
      selectClip(clipId);
      showToast(`🔊 Audio extraído de "${file.name}"`);
    } catch {
      // Fallback: let HTMLAudioElement play the video's audio stream directly
      const url = URL.createObjectURL(file);
      ProjectStorage.registerRuntimeBlob(url, file);
      let diskPath: string | undefined;
      try {
        const eApi = (
          window as unknown as {
            electronAPI?: { getPathForFile?: (f: File) => string | null };
          }
        ).electronAPI;
        const resolved =
          eApi?.getPathForFile?.(file) ||
          (file as File & { path?: string }).path ||
          null;
        if (resolved) {
          diskPath = resolved;
          ProjectStorage.registerRuntimeFilePath(url, resolved);
        }
      } catch {}
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      await new Promise((res) => {
        video.onloadedmetadata = () => res(true);
        video.onerror = () => res(false);
        setTimeout(() => res(true), 1500);
        video.src = url;
      });

      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? Number(video.duration.toFixed(2))
          : 0;

      if (duration <= 0) {
        URL.revokeObjectURL(url);
        showToast(`⚠️ No se pudo extraer audio de "${file.name}"`);
        continue;
      }

      void ProjectStorage.saveMediaBlob(clipId, file, url);
      const fallbackWaveform = Array.from({ length: 80 }, (_, i) =>
        Number((0.25 + 0.55 * Math.abs(Math.sin(i * 0.35))).toFixed(2))
      );

      const extractedClip: AudioClip = {
        id: clipId,
        trackId: 'track_audio',
        type: 'audio',
        name: `🔊 Audio: ${baseName}`,
        sourceUrl: url,
        startTime: nextAudioStart,
        duration,
        sourceStartTime: 0,
        sourceDuration: duration,
        speed: 1,
        waveform: fallbackWaveform,
        audio: {
          volume: 100,
          fadeInDuration: 0.1,
          fadeOutDuration: 0.2,
          voiceFilter: 'none',
          noiseReduction: false,
          isMuted: false,
          preservesPitch: true,
        },
      };

      nextAudioStart = Number((nextAudioStart + duration).toFixed(2));
      addClip('track_audio', extractedClip);
      selectClip(clipId);
      showToast(`🔊 Audio extraído de "${file.name}"`);
    }
  }
}

/**
 * Generates a solid-color PNG image clip and adds it to the main track
 * (or overlay track if specified) so it can be used as a background for text,
 * transitions, animations, or overlays.
 */
export async function importColorMaterial(
  colorHex: string,
  label: string,
  duration = 4.0,
  targetTrackId: 'track_main' | 'track_overlay' = 'track_main'
): Promise<void> {
  const { currentTime, addClip, registerMediaElement, showToast } =
    useEditorStore.getState();

  const width = 1080;
  const height = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, width, height);
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  if (!blob) {
    showToast('⚠️ No se pudo crear el bloque de color');
    return;
  }

  const url = URL.createObjectURL(blob);
  ProjectStorage.registerRuntimeBlob(url, blob);

  const img = new Image();
  img.decoding = 'async';
  await new Promise((res) => {
    img.onload = () => res(true);
    img.onerror = () => res(false);
    setTimeout(() => res(true), 1000);
    img.src = url;
  });

  const clipId = 'mat_' + Math.random().toString(36).substring(2, 9);
  void ProjectStorage.saveMediaBlob(clipId, blob, url);
  registerMediaElement(clipId, img);

  const defaults = createDefaultVisualProperties();
  const isOverlayTrack = targetTrackId === 'track_overlay';
  const startTime = isOverlayTrack
    ? Number(Math.max(0, currentTime).toFixed(2))
    : getNextMainTrackTime();

  const materialClip: VideoClip = {
    id: clipId,
    trackId: targetTrackId,
    type: 'image',
    name: `Material: ${label}`,
    sourceUrl: url,
    startTime,
    duration,
    sourceStartTime: 0,
    sourceDuration: duration,
    naturalWidth: width,
    naturalHeight: height,
    speed: 1,
    ...defaults,
    transform: isOverlayTrack
      ? {
          ...defaults.transform,
          scale: 0.5,
          scaleX: 1,
          scaleY: 1,
          fitMode: 'cover',
          freeResize: false,
        }
      : { ...defaults.transform, fitMode: 'cover' },
    audio: { ...defaults.audio, isMuted: true },
  };

  addClip(targetTrackId, materialClip);
  showToast(
    isOverlayTrack
      ? `🎨 PIP Material "${label}" superpuesto`
      : `🎨 Material "${label}" añadido`
  );
}
