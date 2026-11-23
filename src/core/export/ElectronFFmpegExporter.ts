// ============================================================================
// ElectronFFmpegExporter - Native Hardware-Accelerated FFmpeg Fast Path
// Provides sub-second stream-copy and GPU-accelerated (NVENC/AMF/QSV) export
// inside Electron when clips don't require custom WebGL shaders or 2D text.
// ============================================================================

import {
  Project,
  ExportSettings,
  VideoClip,
  AudioClip,
  TextClip,
} from '../../types/editor';
import {
  getResolutionDimensions,
  getRecommendedBitrateMbps,
} from './estimateSize';
import { ProjectStorage } from '../storage/projectStorage';
import { hasTrackAudibleVolume } from '../audio/trackVolumeEnvelope';
import { WebGLRenderer } from '../webgl/WebGLRenderer';
import {
  clipNeedsColorFit,
  getClipColorFitKey,
  fitClipToFastYuvFilters,
} from './WebGLLutBaker';
import type { RenderProgress } from './WebCodecsExporter';

export interface FFmpegProbeResult {
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export type FFmpegRunResult =
  | Uint8Array
  | { directPath: string; sizeBytes: number };

export interface ElectronFFmpegAPI {
  isElectron?: boolean;
  ffmpegInfo?: () => Promise<{
    available: boolean;
    encoder: string | null;
    hasFFprobe: boolean;
  }>;
  createExportSession?: () => Promise<string>;
  writeExportFile?: (
    sessionId: string,
    fileName: string,
    data: Uint8Array
  ) => Promise<string>;
  appendExportFileChunk?: (
    sessionId: string,
    fileName: string,
    data: Uint8Array,
    isFirst: boolean
  ) => Promise<string>;
  writeTextFile?: (
    sessionId: string,
    fileName: string,
    content: string
  ) => Promise<string>;
  writeConcatFile?: (
    sessionId: string,
    fileName: string,
    content: string
  ) => Promise<string>;
  probeExportFile?: (
    sessionId: string,
    fileName: string
  ) => Promise<FFmpegProbeResult | null>;
  probeDirectPath?: (filePath: string) => Promise<FFmpegProbeResult | null>;
  getFFmpegEncoderArgs?: (
    encoder: string,
    bitrateMbps: number
  ) => Promise<string[]>;
  runFFmpegExport?: (payload: {
    jobId: string;
    sessionId: string;
    args: string[];
    totalDurationSec: number;
    outputFileName: string;
    directOutputPath?: string;
    saveToDownloadsName?: string;
  }) => Promise<FFmpegRunResult>;
  pickSaveFilePath?: (defaultName: string) => Promise<string | null>;
  showItemInFolder?: (filePath: string) => Promise<boolean>;
  transcodeToFastMp4?: (
    data: Uint8Array,
    ext: string
  ) => Promise<Uint8Array | null>;
  transcodePathToFastMp4?: (filePath: string) => Promise<Uint8Array | null>;
  cancelFFmpegExport?: (jobId: string) => Promise<boolean>;
  cleanupExportSession?: (sessionId: string) => Promise<boolean>;
  onFFmpegProgress?: (
    cb: (data: {
      jobId: string;
      percentage: number;
      outTimeSec: number;
      frame?: number;
      speed?: string;
    }) => void
  ) => () => void;
}

function getElectronAPI(): ElectronFFmpegAPI | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { electronAPI?: ElectronFFmpegAPI })
    .electronAPI;
  if (!api || !api.isElectron || !api.ffmpegInfo) return null;
  return api;
}

function hasCustomVisualEffects(
  clip: VideoClip,
  allowSimpleTransform = true
): boolean {
  if (clip.keyframes && clip.keyframes.length > 0) return true;
  if (clip.isReversed || clip.isFrozen) return true;
  const t = clip.transform;
  if (t.blendMode && t.blendMode !== 'normal') {
    return true;
  }
  if (!allowSimpleTransform) {
    if (
      t.rotation !== 0 ||
      t.x !== 0 ||
      t.y !== 0 ||
      t.scale !== 1 ||
      (t.scaleX ?? 1) !== 1 ||
      (t.scaleY ?? 1) !== 1 ||
      t.opacity < 0.999
    ) {
      return true;
    }
  }
  const cg = clip.colorGrading;
  if (
    cg &&
    (cg.highlights ||
      cg.shadows ||
      cg.hslRed?.hue ||
      cg.hslRed?.sat ||
      cg.hslRed?.lum ||
      cg.hslYellow?.hue ||
      cg.hslYellow?.sat ||
      cg.hslYellow?.lum ||
      cg.hslGreen?.hue ||
      cg.hslGreen?.sat ||
      cg.hslGreen?.lum ||
      cg.hslBlue?.hue ||
      cg.hslBlue?.sat ||
      cg.hslBlue?.lum)
  ) {
    return true;
  }
  if (
    clip.filterPreset &&
    clip.filterPreset !== 'none' &&
    (clip.filterIntensity ?? 100) > 0
  ) {
    return true;
  }
  if (clip.mask && clip.mask.type !== 'none') return true;
  if (clip.effect && clip.effect.type !== 'none') return true;
  const anim = clip.animations;
  if (
    anim &&
    (anim.inType !== 'none' ||
      anim.outType !== 'none' ||
      anim.comboType !== 'none')
  ) {
    return true;
  }
  if (clip.transition && clip.transition.type !== 'none') return true;
  return false;
}

function isStaticTextClipEligible(tc: TextClip): boolean {
  if (tc.wordHighlights && tc.wordHighlights.length > 0) return false;
  if (tc.keyframes && tc.keyframes.length > 0) return false;
  if (
    tc.textConfig.animIn &&
    tc.textConfig.animIn !== 'none' &&
    tc.textConfig.animIn !== 'fadeIn'
  ) {
    return false;
  }
  if (
    tc.textConfig.animOut &&
    tc.textConfig.animOut !== 'none' &&
    tc.textConfig.animOut !== 'fadeOut'
  ) {
    return false;
  }
  if (tc.textConfig.animLoop && tc.textConfig.animLoop !== 'none') return false;
  const anim = tc.animations;
  if (
    anim &&
    ((anim.inType !== 'none' && anim.inType !== 'fadeIn') ||
      (anim.outType !== 'none' && anim.outType !== 'fadeOut') ||
      anim.comboType !== 'none')
  ) {
    return false;
  }
  return true;
}

function buildFilterPresetFilters(vc: VideoClip): string[] {
  const preset = vc.filterPreset;
  if (!preset || preset === 'none' || (vc.filterIntensity ?? 100) <= 0) {
    return [];
  }
  const p = preset.toLowerCase();
  if (p.includes('bw') || p.includes('gray') || p.includes('mono') || p.includes('noir')) {
    return ['hue=s=0'];
  }
  if (p.includes('sepia') || p.includes('vintage') || p.includes('retro')) {
    return ['colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'];
  }
  if (p.includes('warm') || p.includes('golden') || p.includes('sunset')) {
    return ['colorbalance=rs=0.12:gs=0.03:bs=-0.12'];
  }
  if (p.includes('cool') || p.includes('cold') || p.includes('ice') || p.includes('cyber')) {
    return ['colorbalance=rs=-0.10:gs=0.02:bs=0.14'];
  }
  if (p.includes('vivid') || p.includes('pop') || p.includes('vibrant')) {
    return ['eq=contrast=1.12:saturation=1.35'];
  }
  if (p.includes('cinematic') || p.includes('teal') || p.includes('film') || p.includes('dramatic')) {
    return ['eq=contrast=1.14:saturation=0.92', 'colorbalance=rs=0.05:bs=-0.04'];
  }
  if (p.includes('fade') || p.includes('matte') || p.includes('pastel')) {
    return ['eq=brightness=0.04:contrast=0.88:saturation=0.85'];
  }
  return [];
}

function buildVisualEffectFilters(vc: VideoClip): string[] {
  const fx = vc.effect;
  if (!fx || !fx.type || fx.type === 'none') return [];
  const intensity = Math.max(0.05, Math.min(1, (fx.intensity ?? 60) / 100));
  const t = fx.type;

  if (t === 'filmGrain' || t === 'tvStatic' || t === 'badSignal' || t === 'projector8mm') {
    const strength = Math.max(4, Math.round(intensity * 28));
    return [`noise=alls=${strength}:allf=t+u`];
  }
  if (t === 'chromaticAberration' || t === 'rgbPulse' || t === 'glitch' || t === 'glitchWave') {
    const shift = Math.max(2, Math.round(intensity * 10));
    return [`rgbashift=rh=${shift}:bh=-${shift}`];
  }
  if (t === 'vhs' || t === 'vhsDamaged' || t === 'crtMonitor') {
    const shift = Math.max(2, Math.round(intensity * 7));
    const strength = Math.max(4, Math.round(intensity * 18));
    return [`rgbashift=rh=${shift}:bh=-${shift}`, `noise=alls=${strength}:allf=t`];
  }
  if (t === 'cinematicBars') {
    const barPct = (0.08 + intensity * 0.08).toFixed(3);
    return [
      `drawbox=x=0:y=0:w=iw:h=ih*${barPct}:color=black:t=fill`,
      `drawbox=x=0:y=ih*(1-${barPct}):w=iw:h=ih*${barPct}:color=black:t=fill`,
    ];
  }
  if (t === 'invertFlash') {
    return ['negate'];
  }
  if (t === 'xray') {
    return ['negate', 'hue=s=0'];
  }
  if (t === 'edgeSketch') {
    return ['edgedetect=low=0.1:high=0.3'];
  }
  if (t === 'emboss3D') {
    return ['convolution=-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2:-2 -1 0 -1 1 1 0 1 2'];
  }
  if (t === 'tiltShift' || t === 'radialBlurFX' || t === 'miniatureBlur' || t === 'dreamyBloom') {
    const rad = Math.max(1, Math.round(intensity * 5));
    return [`boxblur=${rad}:1`];
  }
  if (t === 'nightVision') {
    return ['hue=s=0', 'colorbalance=gs=0.45:rs=-0.15:bs=-0.15'];
  }
  if (t === 'noirShadow') {
    return ['hue=s=0', 'eq=contrast=1.35:brightness=-0.05'];
  }
  if (t === 'mirrorVertical') {
    return ['vflip'];
  }
  if (t === 'mirrorClone') {
    return ['hflip'];
  }
  return [];
}

function buildClipColorAndEffectFilters(
  vc: VideoClip,
  bgColor: string,
  fittedYuvFilters?: string[]
): string[] {
  const filters: string[] = [];
  if (vc.transform.flipH) filters.push('hflip');
  if (vc.transform.flipV) filters.push('vflip');

  const rot = ((vc.transform.rotation || 0) % 360 + 360) % 360;
  if (Math.abs(rot - 90) < 0.01) {
    filters.push('transpose=1');
  } else if (Math.abs(rot - 180) < 0.01) {
    filters.push('hflip,vflip');
  } else if (Math.abs(rot - 270) < 0.01) {
    filters.push('transpose=2');
  } else if (rot > 0.01 && rot < 359.99) {
    const rad = (vc.transform.rotation * Math.PI) / 180;
    filters.push(`rotate=${rad.toFixed(5)}:fillcolor=${bgColor}`);
  }

  // Pure-YUV color filters fitted directly from WebGLRenderer (eq + colorcorrect + hue -> 80+ FPS!)
  if (fittedYuvFilters && fittedYuvFilters.length > 0) {
    filters.push(...fittedYuvFilters);
  } else {
    filters.push(...buildFilterPresetFilters(vc));

    const eq = buildEqFilter(vc);
    if (eq) filters.push(eq);

    const cgBasic = vc.colorGrading;
    if (cgBasic && (cgBasic.temperature || cgBasic.tint)) {
      const rl = Math.max(-1, Math.min(1, (cgBasic.temperature || 0) / 150));
      const bl = -rl;
      filters.push(
        `colorcorrect=rl=${rl.toFixed(3)}:bl=${bl.toFixed(3)}:rh=${rl.toFixed(3)}:bh=${bl.toFixed(3)}`
      );
    }
  }

  const cg = vc.colorGrading;
  if (cg) {
    if (cg.sharpness && cg.sharpness > 0) {
      const amt = Math.min(2.0, (cg.sharpness / 100) * 1.5);
      filters.push(`unsharp=5:5:${amt.toFixed(2)}:5:5:0.0`);
    }
    if (cg.vignette && cg.vignette > 0) {
      const ang = (Math.min(1, cg.vignette / 100) * Math.PI) / 4;
      filters.push(`vignette=angle=${ang.toFixed(3)}`);
    }
  }

  filters.push(...buildVisualEffectFilters(vc));

  if (vc.chromaKey?.enabled) {
    const keyHex = (vc.chromaKey.color || '#00ff00').replace('#', '0x');
    const sim = Math.max(0.01, Math.min(1, vc.chromaKey.tolerance ?? 0.3));
    const blend = Math.max(0, Math.min(1, vc.chromaKey.feather ?? 0.1));
    filters.push(
      `colorkey=color=${keyHex}:similarity=${sim.toFixed(3)}:blend=${blend.toFixed(3)}`
    );
  }

  if (vc.transition && vc.transition.type !== 'none') {
    const d = Math.max(0.1, Math.min(vc.duration * 0.5, vc.transition.duration || 0.6));
    filters.push(`fade=t=in:st=0:d=${d.toFixed(3)}`);
  }
  if (vc.animations?.inType === 'fadeIn') {
    const d = Math.max(0.1, Math.min(vc.duration * 0.5, vc.animations.inDuration || 0.5));
    filters.push(`fade=t=in:st=0:d=${d.toFixed(3)}`);
  }
  if (vc.animations?.outType === 'fadeOut') {
    const d = Math.max(0.1, Math.min(vc.duration * 0.5, vc.animations.outDuration || 0.5));
    const st = Math.max(0, vc.duration - d);
    filters.push(`fade=t=out:st=${st.toFixed(3)}:d=${d.toFixed(3)}`);
  }

  return filters;
}

function buildEqFilter(vc: VideoClip): string | null {
  const cg = vc.colorGrading;
  if (!cg) return null;
  const brightnessVal = (cg.brightness || 0) + (cg.exposure || 0) * 0.5;
  if (!brightnessVal && !cg.contrast && !cg.saturation) return null;
  const b = Math.max(-1, Math.min(1, brightnessVal / 100));
  const c = Math.max(0, Math.min(3, 1 + (cg.contrast || 0) / 100));
  const s = Math.max(0, Math.min(3, 1 + (cg.saturation || 0) / 100));
  return `eq=brightness=${b.toFixed(3)}:contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}`;
}

function buildAtempoFilter(speed: number): string {
  const filters: string[] = [];
  let s = Math.max(0.02, Math.min(16, speed));
  while (s > 2.0) {
    filters.push('atempo=2.0');
    s /= 2.0;
  }
  while (s < 0.5) {
    filters.push('atempo=0.5');
    s /= 0.5;
  }
  if (Math.abs(s - 1.0) > 0.001) {
    filters.push(`atempo=${s.toFixed(4)}`);
  }
  return filters.join(',');
}

function buildSpeedAudioFilter(speed: number, preservesPitch = true): string {
  const s = Math.max(0.02, Math.min(16, speed || 1));
  if (Math.abs(s - 1.0) <= 0.001) return '';
  if (preservesPitch) {
    return buildAtempoFilter(s);
  }
  const targetRate = Math.max(1000, Math.round(44100 * s));
  return `aresample=44100,asetrate=${targetRate},aresample=44100`;
}

async function resolveClipBlob(
  clipId: string,
  sourceUrl: string
): Promise<Blob | null> {
  if (sourceUrl) {
    const memBlob = ProjectStorage.getRuntimeBlob(sourceUrl);
    if (memBlob && memBlob.size > 0) return memBlob;
  }
  try {
    const stored = await ProjectStorage.getMediaBlob(clipId);
    if (stored && stored.size > 0) return stored;
  } catch {}
  try {
    if (sourceUrl) {
      const res = await fetch(sourceUrl);
      if (res.ok) {
        const b = await res.blob();
        if (b.size > 0) return b;
      }
    }
  } catch {}
  return null;
}

export class ElectronFFmpegExporter {
  private activeJobId: string | null = null;
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
    if (this.activeJobId) {
      const api = getElectronAPI();
      api?.cancelFFmpegExport?.(this.activeJobId).catch(() => {});
    }
  }

  public static isBasicFFmpegEligible(project: Project): boolean {
    const api = getElectronAPI();
    if (!api) return false;

    let hasMediaClip = false;
    for (const track of project.tracks) {
      if (!track.isVisible) continue;
      if (track.type !== 'audio') {
        for (const c of track.clips) {
          if (c.type === 'video' || c.type === 'image') {
            const vc = c as VideoClip;
            if (
              !vc.sourceUrl ||
              vc.sourceUrl.startsWith('procedural://') ||
              vc.id.startsWith('sample_')
            ) {
              return false;
            }
            hasMediaClip = true;
          }
        }
      } else {
        for (const c of track.clips) {
          if (c.type === 'audio') {
            const ac = c as AudioClip;
            if (
              !ac.sourceUrl ||
              ac.sourceUrl.startsWith('procedural://') ||
              ac.id.startsWith('sample_')
            ) {
              return false;
            }
          }
        }
      }
    }
    return hasMediaClip;
  }

  public static isProjectEligible(project: Project): boolean {
    const api = getElectronAPI();
    if (!api) return false;

    const visibleMediaTracks: typeof project.tracks = [];
    for (const track of project.tracks) {
      if (!track.isVisible) continue;
      if (track.volumeKeyframes && track.volumeKeyframes.length >= 2) {
        return false;
      }

      if (track.type !== 'audio') {
        for (const c of track.clips) {
          if (c.type === 'text' || c.type === 'subtitle') {
            if (!isStaticTextClipEligible(c as TextClip)) return false;
            continue;
          }
          if (c.type === 'video' || c.type === 'image') {
            const vc = c as VideoClip;
            if (
              !vc.sourceUrl ||
              vc.sourceUrl.startsWith('procedural://') ||
              vc.id.startsWith('sample_')
            ) {
              return false;
            }
            if (hasCustomVisualEffects(vc, true)) return false;
            if (vc.speedCurve?.points && vc.speedCurve.points.length >= 2) {
              return false;
            }
            if (
              vc.audio?.voiceFilter &&
              vc.audio.voiceFilter !== 'none'
            ) {
              return false;
            }
            if (vc.audio?.noiseReduction) return false;
          }
        }
        if (track.clips.some((c) => c.type === 'video' || c.type === 'image')) {
          visibleMediaTracks.push(track);
        }
      } else {
        for (const c of track.clips) {
          if (c.type === 'audio') {
            const ac = c as AudioClip;
            if (
              !ac.sourceUrl ||
              ac.sourceUrl.startsWith('procedural://') ||
              ac.id.startsWith('sample_')
            ) {
              return false;
            }
            if (ac.isReversed) return false;
            if (ac.audio?.voiceFilter && ac.audio.voiceFilter !== 'none') return false;
            if (ac.audio?.noiseReduction) return false;
          }
        }
      }
    }

    if (visibleMediaTracks.length === 0) return false;

    // Main/base track clips must not overlap each other
    const baseMediaClips = [...visibleMediaTracks[0].clips]
      .filter((c): c is VideoClip => c.type === 'video' || c.type === 'image')
      .sort((a, b) => a.startTime - b.startTime);

    if (baseMediaClips.length === 0) return false;

    for (let i = 1; i < baseMediaClips.length; i++) {
      if (baseMediaClips[i].startTime < baseMediaClips[i - 1].startTime + baseMediaClips[i - 1].duration - 0.02) {
        return false;
      }
    }

    return true;
  }

  public async tryExport(
    project: Project,
    settings: ExportSettings,
    onProgress: (progress: RenderProgress) => void
  ): Promise<Blob | null> {
    const api = getElectronAPI();
    if (!api) return null;
    const forceFFmpeg = settings.exportEngine === 'ffmpeg';
    const eligible = forceFFmpeg
      ? ElectronFFmpegExporter.isBasicFFmpegEligible(project)
      : ElectronFFmpegExporter.isProjectEligible(project);
    if (!eligible) {
      if (forceFFmpeg) {
        throw new Error(
          'El proyecto contiene clips de demostración o sin archivo de origen. Elimínalos para usar FFmpeg GPU.'
        );
      }
      return null;
    }

    const info = await api.ffmpegInfo!();
    if (!info.available || !info.encoder) {
      if (forceFFmpeg) {
        throw new Error('FFmpeg no está instalado o no se encontró en el PATH.');
      }
      return null;
    }

    const { width, height } = getResolutionDimensions(
      settings.resolution,
      project.settings.aspectRatio,
      project.settings.customWidth,
      project.settings.customHeight
    );
    const fps = Math.min(30, Math.max(1, settings.fps || 30)) as 24 | 25 | 30;
    const totalDuration = Math.max(0.1, project.settings.duration);
    const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
    const bitrateMbps = getRecommendedBitrateMbps(
      settings.resolution,
      fps,
      settings.quality,
      settings.customBitrateMbps
    );

    const sessionId = await api.createExportSession!();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.activeJobId = jobId;
    const startTime = performance.now();

    let unsubscribeProgress: (() => void) | null = null;

    try {
      onProgress({
        percentage: 2,
        currentFrame: 0,
        totalFrames,
        timeRemainingSeconds: -1,
        stage: 'preparing',
        stageLabel: `Aceleración nativa FFmpeg (${info.encoder})...`,
      });

      // Collect unique source files and write each once to temp session
      const urlToTempName = new Map<string, string>();
      const tempNameToProbe = new Map<string, FFmpegProbeResult | null>();
      let fileCounter = 0;

      const ensureClipFile = async (
        clipId: string,
        sourceUrl: string,
        fallbackExt: string,
        persistedFilePath?: string
      ): Promise<string | null> => {
        const key = persistedFilePath || sourceUrl || clipId;
        const existing = urlToTempName.get(key);
        if (existing) return existing;

        // Zero-copy fast path: read directly from disk path in Electron without copying bytes over IPC
        const diskPath =
          persistedFilePath ||
          (sourceUrl ? ProjectStorage.getRuntimeFilePath(sourceUrl) : undefined);
        if (diskPath && api.probeDirectPath) {
          const probe = await api.probeDirectPath(diskPath);
          if (probe) {
            const ref = `__FILE__:${diskPath}`;
            urlToTempName.set(key, ref);
            tempNameToProbe.set(ref, probe);
            return ref;
          }
        }

        const blob = await resolveClipBlob(clipId, sourceUrl);
        if (!blob || blob.size === 0) return null;

        const extMatch = (blob.type || '').split('/')[1]?.split(';')[0];
        const ext = extMatch && extMatch.length <= 5 ? extMatch : fallbackExt;
        const tempName = `src_${fileCounter++}.${ext}`;

        // Stream large blobs in 8 MB chunks to avoid Electron IPC message limits & OOM crashes
        const CHUNK_SIZE = 8 * 1024 * 1024;
        if (blob.size > CHUNK_SIZE && api.appendExportFileChunk) {
          const totalSize = blob.size;
          let offset = 0;
          let isFirst = true;
          while (offset < totalSize) {
            if (this.isCancelled) throw new Error('Export cancelled by user');
            const end = Math.min(totalSize, offset + CHUNK_SIZE);
            const sliceAb = await blob.slice(offset, end).arrayBuffer();
            await api.appendExportFileChunk(
              sessionId,
              tempName,
              new Uint8Array(sliceAb),
              isFirst
            );
            isFirst = false;
            offset = end;
            if (totalSize > 32 * 1024 * 1024) {
              const stagePct = Math.min(4, Math.max(1, Math.round((offset / totalSize) * 4)));
              onProgress({
                percentage: stagePct,
                currentFrame: 0,
                totalFrames,
                timeRemainingSeconds: -1,
                stage: 'preparing',
                stageLabel: `Preparando archivo (${Math.round(offset / (1024 * 1024))} / ${Math.round(totalSize / (1024 * 1024))} MB)...`,
              });
            }
          }
        } else {
          const ab = await blob.arrayBuffer();
          await api.writeExportFile!(sessionId, tempName, new Uint8Array(ab));
        }

        const ref = `__TEMP__:${tempName}`;
        urlToTempName.set(key, ref);

        const probe = await api.probeExportFile!(sessionId, tempName);
        tempNameToProbe.set(ref, probe);
        return ref;
      };

      const visibleMediaTracks = project.tracks.filter(
        (t) =>
          t.isVisible &&
          t.type !== 'audio' &&
          t.clips.some((c) => c.type === 'video' || c.type === 'image')
      );
      const visualTrack = visibleMediaTracks[0];
      const visualTrackMuted =
        visualTrack.isMuted || !hasTrackAudibleVolume(visualTrack);
      const visualTrackVol = Math.max(0, (visualTrack.volume ?? 100) / 100);

      const sortedBase = [...visualTrack.clips]
        .filter((c): c is VideoClip => c.type === 'video' || c.type === 'image')
        .sort((a, b) => a.startTime - b.startTime);

      const videoClips: VideoClip[] = [];
      const overlayClips: Array<{
        clip: VideoClip;
        trackMuted: boolean;
        trackVol: number;
      }> = [];

      let lastBaseEnd = -1;
      for (const c of sortedBase) {
        if (videoClips.length === 0 || c.startTime >= lastBaseEnd - 0.02) {
          videoClips.push(c);
          lastBaseEnd = c.startTime + c.duration;
        } else {
          // Move overlapping base-track clip to overlay layer so FFmpeg concat never fails
          overlayClips.push({
            clip: c,
            trackMuted: visualTrackMuted,
            trackVol: visualTrackVol,
          });
        }
      }

      for (const t of visibleMediaTracks.slice(1)) {
        const tMuted = t.isMuted || !hasTrackAudibleVolume(t);
        const tVol = Math.max(0, (t.volume ?? 100) / 100);
        const clips = [...t.clips]
          .filter((c): c is VideoClip => c.type === 'video' || c.type === 'image')
          .sort((a, b) => a.startTime - b.startTime);
        for (const c of clips) {
          overlayClips.push({ clip: c, trackMuted: tMuted, trackVol: tVol });
        }
      }

      const textClips: TextClip[] = [];
      for (const t of project.tracks) {
        if (!t.isVisible || t.type === 'audio') continue;
        for (const c of t.clips) {
          if (c.type === 'text' || c.type === 'subtitle') {
            textClips.push(c as TextClip);
          }
        }
      }

      const audioTracks = project.tracks.filter(
        (t) => t.isVisible && !t.isMuted && hasTrackAudibleVolume(t)
      );
      const extraAudioClips: Array<{ clip: AudioClip; trackVol: number }> = [];
      for (const t of audioTracks) {
        if (t.type !== 'audio') continue;
        const trackVol = Math.max(0, (t.volume ?? 100) / 100);
        for (const c of t.clips) {
          if (
            c.type === 'audio' &&
            !c.audio?.isMuted &&
            (c.audio?.volume ?? 100) > 0
          ) {
            extraAudioClips.push({ clip: c as AudioClip, trackVol });
          }
        }
      }

      const clipTempNames = new Map<string, string>();
      for (const vc of videoClips) {
        if (this.isCancelled) throw new Error('Export cancelled by user');
        const tName = await ensureClipFile(
          vc.id,
          vc.sourceUrl,
          vc.type === 'image' ? 'png' : 'mp4',
          vc.sourceFilePath
        );
        if (!tName) {
          throw new Error(`No se encontró el archivo de origen del clip "${vc.name}".`);
        }
        clipTempNames.set(vc.id, tName);
      }
      for (let oi = overlayClips.length - 1; oi >= 0; oi--) {
        const oc = overlayClips[oi].clip;
        if (this.isCancelled) throw new Error('Export cancelled by user');
        const tName = await ensureClipFile(
          oc.id,
          oc.sourceUrl,
          oc.type === 'image' ? 'png' : 'mp4',
          oc.sourceFilePath
        );
        if (!tName) {
          console.warn(`Overlay "${oc.name}" sin archivo de origen; se omite.`);
          overlayClips.splice(oi, 1);
          continue;
        }
        clipTempNames.set(oc.id, tName);
      }
      for (let ai = extraAudioClips.length - 1; ai >= 0; ai--) {
        const ac = extraAudioClips[ai].clip;
        if (this.isCancelled) throw new Error('Export cancelled by user');
        const tName = await ensureClipFile(
          ac.id,
          ac.sourceUrl,
          'mp3',
          ac.sourceFilePath
        );
        if (!tName) {
          console.warn(`Audio "${ac.name}" sin archivo de origen; se omite.`);
          extraAudioClips.splice(ai, 1);
          continue;
        }
        clipTempNames.set(ac.id, tName);
      }

      // Render static text/subtitle clips once to transparent PNGs (100x faster than JS frame loop)
      const textPngRefs = new Map<string, string>();
      if (textClips.length > 0) {
        const textCanvas = document.createElement('canvas');
        textCanvas.width = width;
        textCanvas.height = height;
        const textCtx = textCanvas.getContext('2d', { alpha: true });
        const textRenderer = new WebGLRenderer(textCanvas, {
          preserveDrawingBuffer: true,
        });
        try {
          for (let ti = 0; ti < textClips.length; ti++) {
            if (this.isCancelled) throw new Error('Export cancelled by user');
            const tc = textClips[ti];
            if (textCtx) {
              textCtx.clearRect(0, 0, width, height);
            }
            textRenderer.renderTextClip(
              tc,
              width,
              height,
              tc.startTime + tc.duration * 0.5
            );
            const pngBlob = await new Promise<Blob | null>((resolve) =>
              textCanvas.toBlob(resolve, 'image/png')
            );
            if (!pngBlob) return null;
            const pngAb = await pngBlob.arrayBuffer();
            const pngName = `text_${ti}.png`;
            await api.writeExportFile!(sessionId, pngName, new Uint8Array(pngAb));
            textPngRefs.set(tc.id, `__TEMP__:${pngName}`);
          }
        } finally {
          textRenderer.dispose();
        }
      }

      if (this.isCancelled) throw new Error('Export cancelled by user');

      let activeModeLabel = `Renderizando con ${info.encoder}`;

      const executeAndReturnResult = async (
        args: string[],
        fallbackFilterScript?: string
      ): Promise<Blob> => {
        const runOnce = async (runArgs: string[]) =>
          api.runFFmpegExport!({
            jobId,
            sessionId,
            args: runArgs,
            totalDurationSec: totalDuration,
            outputFileName: 'export.mp4',
            directOutputPath: settings.directOutputPath,
            saveToDownloadsName: settings.saveToDownloadsName,
          });

        let res: FFmpegRunResult;
        try {
          res = await runOnce(args);
        } catch (firstErr) {
          if (this.isCancelled) {
            throw firstErr;
          }
          // If hardware encoder failed (e.g., driver/profile limit), retry with ultrafast libx264
          const cvIdx = args.indexOf('-c:v');
          const usedCodec = cvIdx >= 0 ? args[cvIdx + 1] : '';
          if (usedCodec && usedCodec !== 'copy' && usedCodec !== 'libx264') {
            console.warn(
              `Hardware encoder ${usedCodec} failed, retrying with libx264 ultrafast:`,
              firstErr
            );
            const swEncoderArgs = await api.getFFmpegEncoderArgs!(
              'libx264',
              bitrateMbps
            );
            // Rebuild args replacing hardware encoder flags with libx264 ultrafast
            const tOutIdx = args.lastIndexOf('-t');
            const tailArgs = tOutIdx > cvIdx ? args.slice(tOutIdx) : ['-movflags', '+faststart'];
            const retryArgs = [...args.slice(0, cvIdx), ...swEncoderArgs, ...tailArgs];

            // If filtergraph used nv12, rewrite to yuv420p for libx264
            if (fallbackFilterScript) {
              const swScript = fallbackFilterScript.replace(/format=nv12/g, 'format=yuv420p');
              const fcIdx = retryArgs.indexOf('-filter_complex');
              const fcsIdx = retryArgs.indexOf('-/filter_complex');
              if (fcIdx >= 0) {
                retryArgs[fcIdx + 1] = swScript;
              } else if (fcsIdx >= 0 && api.writeTextFile) {
                await api.writeTextFile(sessionId, 'filtergraph_sw.txt', swScript);
                retryArgs[fcsIdx + 1] = '__TEMP__:filtergraph_sw.txt';
              }
            }

            activeModeLabel = 'Renderizando con libx264 (ultrafast)';
            res = await runOnce(retryArgs);
          } else {
            throw firstErr;
          }
        }

        onProgress({
          percentage: 100,
          currentFrame: totalFrames,
          totalFrames,
          timeRemainingSeconds: 0,
          stage: 'muxing',
        });

        if (
          res &&
          typeof res === 'object' &&
          'directPath' in res &&
          typeof res.directPath === 'string'
        ) {
          settings.onDirectSaved?.(res.directPath, res.sizeBytes);
          return new Blob([], { type: 'video/mp4' });
        }
        const outBytes = res as Uint8Array;
        return new Blob([outBytes.buffer as ArrayBuffer], { type: 'video/mp4' });
      };

      unsubscribeProgress =
        api.onFFmpegProgress?.((ev) => {
          if (ev.jobId !== jobId) return;
          const elapsed = (performance.now() - startTime) / 1000;
          const pct = Math.max(5, Math.min(98, ev.percentage));
          let eta = -1;
          if (elapsed > 0.3 && pct > 5) {
            eta = Math.max(0, Math.round((elapsed * (100 - pct)) / pct));
          }
          const speedTag =
            ev.speed && ev.speed !== 'N/A' && !ev.speed.startsWith('0.0')
              ? ` (${ev.speed})`
              : '';
          onProgress({
            percentage: pct,
            currentFrame:
              ev.frame && ev.frame > 0
                ? Math.min(totalFrames, ev.frame)
                : Math.min(totalFrames, Math.round((pct / 100) * totalFrames)),
            totalFrames,
            timeRemainingSeconds: eta,
            stage: 'rendering',
            stageLabel: `${activeModeLabel}${speedTag}...`,
          });
        }) ?? null;

      // Check Ultra-Fast Stream Copy eligibility (single or multi-clip contiguous H.264/HEVC without visual edits)
      const isStreamCopyCodec = (codec?: string) =>
        codec === 'h264' || codec === 'hevc';
      const smartCopyEnabled = settings.smartStreamCopy !== false;
      const dimsMatchForCopy = (probe?: FFmpegProbeResult | null) => {
        if (!probe || !isStreamCopyCodec(probe.videoCodec)) return false;
        if (smartCopyEnabled) return true;
        return (
          Math.abs(probe.width - width) <= 2 &&
          Math.abs(probe.height - height) <= 2 &&
          Math.abs(probe.fps - fps) <= 1.5
        );
      };

      const hasClipVisualFilter = (vc: VideoClip) =>
        Boolean(
          vc.type === 'image' ||
            vc.isFrozen ||
            (vc.keyframes && vc.keyframes.length > 0) ||
            vc.transform.rotation !== 0 ||
            vc.transform.x !== 0 ||
            vc.transform.y !== 0 ||
            vc.transform.scale !== 1 ||
            (vc.transform.scaleX ?? 1) !== 1 ||
            (vc.transform.scaleY ?? 1) !== 1 ||
            vc.transform.opacity < 0.999 ||
            vc.transform.flipH ||
            vc.transform.flipV ||
            (vc.filterPreset && vc.filterPreset !== 'none' && (vc.filterIntensity ?? 100) > 0) ||
            (vc.effect && vc.effect.type !== 'none') ||
            (vc.mask && vc.mask.type !== 'none') ||
            (vc.transition && vc.transition.type !== 'none') ||
            (vc.animations && (vc.animations.inType !== 'none' || vc.animations.outType !== 'none' || vc.animations.comboType !== 'none')) ||
            vc.colorGrading?.brightness ||
            vc.colorGrading?.contrast ||
            vc.colorGrading?.saturation ||
            vc.colorGrading?.exposure ||
            vc.colorGrading?.highlights ||
            vc.colorGrading?.shadows ||
            vc.colorGrading?.temperature ||
            vc.colorGrading?.tint ||
            vc.colorGrading?.sharpness ||
            vc.colorGrading?.vignette ||
            vc.colorGrading?.hslRed?.hue ||
            vc.colorGrading?.hslRed?.sat ||
            vc.colorGrading?.hslRed?.lum ||
            vc.colorGrading?.hslYellow?.hue ||
            vc.colorGrading?.hslYellow?.sat ||
            vc.colorGrading?.hslYellow?.lum ||
            vc.colorGrading?.hslGreen?.hue ||
            vc.colorGrading?.hslGreen?.sat ||
            vc.colorGrading?.hslGreen?.lum ||
            vc.colorGrading?.hslBlue?.hue ||
            vc.colorGrading?.hslBlue?.sat ||
            vc.colorGrading?.hslBlue?.lum ||
            vc.chromaKey?.enabled
        );

      const hasOverlaysOrText =
        overlayClips.length > 0 || textClips.length > 0;

      // Helper to build audio-only mix args when video is stream-copied
      const buildAudioMixForStreamCopy = async (
        videoInputIdx: number,
        videoHasAudio: boolean,
        videoAudioMuted: boolean,
        videoAudioVol: number,
        videoAudioFadeIn: number,
        videoAudioFadeOut: number,
        videoClipDur: number
      ): Promise<{ extraInputs: string[]; filterArgs: string[]; mapAudioArgs: string[] }> => {
        const extraInputs: string[] = [];
        const aFilterParts: string[] = [];
        const aLabels: string[] = [];
        let nextIdx = videoInputIdx + 1;

        if (!videoAudioMuted && videoHasAudio) {
          const chain: string[] = ['asetpts=PTS-STARTPTS'];
          if (Math.abs(videoAudioVol - 1) > 0.01) {
            chain.push(`volume=${videoAudioVol.toFixed(3)}`);
          }
          if (videoAudioFadeIn > 0.02) {
            chain.push(`afade=t=in:st=0:d=${videoAudioFadeIn.toFixed(3)}`);
          }
          if (videoAudioFadeOut > 0.02) {
            const st = Math.max(0, videoClipDur - videoAudioFadeOut);
            chain.push(`afade=t=out:st=${st.toFixed(3)}:d=${videoAudioFadeOut.toFixed(3)}`);
          }
          chain.push('aformat=sample_rates=44100:channel_layouts=stereo');
          aFilterParts.push(`[${videoInputIdx}:a]${chain.join(',')}[va0]`);
          aLabels.push('[va0]');
        }

        for (let i = 0; i < extraAudioClips.length; i++) {
          const { clip: ac, trackVol } = extraAudioClips[i];
          const tName = clipTempNames.get(ac.id)!;
          const probe = tempNameToProbe.get(tName);
          if (probe && !probe.hasAudio) continue;

          const speed = Math.max(0.02, Math.min(16, ac.speed || 1));
          const srcStart = Math.max(0, ac.sourceStartTime);
          const srcDur = ac.duration * speed;
          const inIdx = nextIdx++;
          const trimmedAtInput = srcStart > 0.05;
          if (trimmedAtInput) {
            extraInputs.push('-ss', srcStart.toFixed(3), '-t', (srcDur + 0.35).toFixed(3), '-i', tName);
          } else {
            extraInputs.push('-t', (srcStart + srcDur + 0.35).toFixed(3), '-i', tName);
          }
          const trimStart = trimmedAtInput ? 0 : srcStart;
          const vol = trackVol * Math.max(0, (ac.audio?.volume ?? 100) / 100);
          const aChain: string[] = [
            `atrim=start=${trimStart.toFixed(3)}:duration=${srcDur.toFixed(3)}`,
            'asetpts=PTS-STARTPTS',
          ];
          const speedFilter = buildSpeedAudioFilter(
            speed,
            ac.audio?.preservesPitch ?? true
          );
          if (speedFilter) aChain.push(speedFilter);
          if (Math.abs(vol - 1) > 0.01) aChain.push(`volume=${vol.toFixed(3)}`);
          if ((ac.audio?.fadeInDuration ?? 0) > 0.02) {
            aChain.push(`afade=t=in:st=0:d=${ac.audio!.fadeInDuration.toFixed(3)}`);
          }
          if ((ac.audio?.fadeOutDuration ?? 0) > 0.02) {
            const st = Math.max(0, ac.duration - ac.audio!.fadeOutDuration);
            aChain.push(`afade=t=out:st=${st.toFixed(3)}:d=${ac.audio!.fadeOutDuration.toFixed(3)}`);
          }
          const delayMs = Math.round(ac.startTime * 1000);
          if (delayMs > 0) aChain.push(`adelay=${delayMs}|${delayMs}`);
          aChain.push('aformat=sample_rates=44100:channel_layouts=stereo');
          aFilterParts.push(`[${inIdx}:a]${aChain.join(',')}[xa${i}]`);
          aLabels.push(`[xa${i}]`);
        }

        if (aLabels.length === 0) {
          return { extraInputs, filterArgs: [], mapAudioArgs: ['-an'] };
        }

        let mapAudioArgs: string[];
        if (aLabels.length > 1) {
          aFilterParts.push(
            `${aLabels.join('')}amix=inputs=${aLabels.length}:duration=longest:normalize=0[aout]`
          );
          mapAudioArgs = ['-map', '[aout]', '-c:a', 'aac', '-b:a', '128k'];
        } else {
          mapAudioArgs = ['-map', aLabels[0], '-c:a', 'aac', '-b:a', '128k'];
        }

        const scriptText = aFilterParts.join(';');
        if (scriptText.length >= 8000 && api.writeTextFile) {
          const scriptName = await api.writeTextFile(sessionId, 'audio_mix.txt', scriptText);
          return {
            extraInputs,
            filterArgs: ['-/filter_complex', `__TEMP__:${scriptName}`],
            mapAudioArgs,
          };
        }
        return {
          extraInputs,
          filterArgs: ['-filter_complex', scriptText],
          mapAudioArgs,
        };
      };

      // FAST PATH 1: Single-clip Zero-Reencode Stream Copy (works even with audio edits or extra music tracks!)
      if (
        !hasOverlaysOrText &&
        videoClips.length === 1 &&
        videoClips[0].startTime < 0.03 &&
        Math.abs(videoClips[0].duration - totalDuration) < 0.2 &&
        (videoClips[0].speed || 1) === 1 &&
        !hasClipVisualFilter(videoClips[0])
      ) {
        const vc = videoClips[0];
        const tRef = clipTempNames.get(vc.id)!;
        const probe = tempNameToProbe.get(tRef);

        if (dimsMatchForCopy(probe)) {
          activeModeLabel = '⚡ Copia directa sin recodificar';
          const vcAudioMuted =
            visualTrackMuted ||
            vc.audio?.isMuted ||
            (vc.audio?.volume ?? 100) <= 0;
          const vcVol =
            visualTrackVol * Math.max(0, (vc.audio?.volume ?? 100) / 100);
          const hasAudioEdits =
            Math.abs(vcVol - 1) > 0.02 ||
            (vc.audio?.fadeInDuration ?? 0) > 0.02 ||
            (vc.audio?.fadeOutDuration ?? 0) > 0.02;

          const copyArgs: string[] = [];
          if (vc.sourceStartTime > 0.01) {
            copyArgs.push('-ss', vc.sourceStartTime.toFixed(3));
          }
          copyArgs.push('-i', tRef);

          const hevcTag = probe!.videoCodec === 'hevc' ? ['-tag:v', 'hvc1'] : [];

          if (extraAudioClips.length > 0) {
            const { extraInputs, filterArgs, mapAudioArgs } =
              await buildAudioMixForStreamCopy(
                0,
                Boolean(probe?.hasAudio),
                vcAudioMuted,
                vcVol,
                vc.audio?.fadeInDuration ?? 0,
                vc.audio?.fadeOutDuration ?? 0,
                vc.duration
              );
            copyArgs.push(
              ...extraInputs,
              ...filterArgs,
              '-map',
              '0:v',
              '-c:v',
              'copy',
              ...hevcTag,
              ...mapAudioArgs,
              '-t',
              vc.duration.toFixed(3),
              '-movflags',
              '+faststart'
            );
            return await executeAndReturnResult(copyArgs);
          }

          copyArgs.push('-t', vc.duration.toFixed(3), '-c:v', 'copy', ...hevcTag);

          if (vcAudioMuted || !probe?.hasAudio) {
            copyArgs.push('-an');
          } else if (!hasAudioEdits && probe.audioCodec === 'aac') {
            copyArgs.push('-c:a', 'copy');
          } else {
            const af: string[] = [];
            if (Math.abs(vcVol - 1) > 0.01) af.push(`volume=${vcVol.toFixed(3)}`);
            if ((vc.audio?.fadeInDuration ?? 0) > 0.02) {
              af.push(`afade=t=in:st=0:d=${vc.audio!.fadeInDuration.toFixed(3)}`);
            }
            if ((vc.audio?.fadeOutDuration ?? 0) > 0.02) {
              const fadeSt = Math.max(0, vc.duration - vc.audio!.fadeOutDuration);
              af.push(
                `afade=t=out:st=${fadeSt.toFixed(3)}:d=${vc.audio!.fadeOutDuration.toFixed(3)}`
              );
            }
            if (af.length > 0) copyArgs.push('-af', af.join(','));
            copyArgs.push('-c:a', 'aac', '-b:a', '128k');
          }

          copyArgs.push('-movflags', '+faststart');
          return await executeAndReturnResult(copyArgs);
        }
      }

      // FAST PATH 2: Multi-clip Contiguous Stream Copy via FFmpeg concat demuxer (0 video re-encoding!)
      if (
        !hasOverlaysOrText &&
        videoClips.length > 1 &&
        api.writeConcatFile &&
        videoClips[0].startTime < 0.03
      ) {
        let contiguousVideo = true;
        let allAudioUntouched = extraAudioClips.length === 0;
        let allAudioMuted = extraAudioClips.length === 0;
        let expectedTime = 0;
        const firstProbe = tempNameToProbe.get(clipTempNames.get(videoClips[0].id)!);
        const firstHasAudio = Boolean(firstProbe?.hasAudio);
        const baseMatch = dimsMatchForCopy(firstProbe);

        if (baseMatch && firstProbe) {
          for (const vc of videoClips) {
            if (
              Math.abs(vc.startTime - expectedTime) > 0.05 ||
              (vc.speed || 1) !== 1 ||
              hasClipVisualFilter(vc)
            ) {
              contiguousVideo = false;
              break;
            }
            const p = tempNameToProbe.get(clipTempNames.get(vc.id)!);
            if (
              !p ||
              p.width !== firstProbe.width ||
              p.height !== firstProbe.height ||
              p.videoCodec !== firstProbe.videoCodec ||
              Boolean(p.hasAudio) !== firstHasAudio
            ) {
              contiguousVideo = false;
              break;
            }
            const vcMuted =
              visualTrackMuted ||
              vc.audio?.isMuted ||
              (vc.audio?.volume ?? 100) <= 0;
            const vcVol =
              visualTrackVol * Math.max(0, (vc.audio?.volume ?? 100) / 100);
            if (!vcMuted) {
              allAudioMuted = false;
            }
            if (
              vcMuted ||
              (firstHasAudio && p.audioCodec !== 'aac') ||
              Math.abs(vcVol - 1) > 0.02 ||
              (vc.audio?.fadeInDuration ?? 0) > 0.02 ||
              (vc.audio?.fadeOutDuration ?? 0) > 0.02
            ) {
              allAudioUntouched = false;
            }
            expectedTime = vc.startTime + vc.duration;
          }

          if (contiguousVideo && Math.abs(expectedTime - totalDuration) < 0.25) {
            const lines: string[] = [];
            for (const vc of videoClips) {
              const tRef = clipTempNames.get(vc.id)!;
              const fileSpec = tRef.startsWith('__FILE__:')
                ? tRef.slice(9).replace(/\\/g, '/').replace(/'/g, "'\\''")
                : tRef;
              lines.push(`file '${fileSpec}'`);
              lines.push(`inpoint ${Math.max(0, vc.sourceStartTime).toFixed(3)}`);
              lines.push(
                `outpoint ${(Math.max(0, vc.sourceStartTime) + vc.duration).toFixed(3)}`
              );
            }
            const concatName = await api.writeConcatFile(
              sessionId,
              'concat.txt',
              lines.join('\n')
            );
            const hevcTag = firstProbe.videoCodec === 'hevc' ? ['-tag:v', 'hvc1'] : [];

            if (allAudioUntouched) {
              activeModeLabel = '⚡ Copia directa sin recodificar';
              const concatArgs = [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                `__TEMP__:${concatName}`,
                '-c',
                'copy',
                ...hevcTag,
                '-movflags',
                '+faststart',
              ];
              return await executeAndReturnResult(concatArgs);
            }

            if (allAudioMuted) {
              activeModeLabel = '⚡ Copia directa sin recodificar';
              const concatArgs = [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                `__TEMP__:${concatName}`,
                '-c:v',
                'copy',
                ...hevcTag,
                '-an',
                '-movflags',
                '+faststart',
              ];
              return await executeAndReturnResult(concatArgs);
            }

            // Video is stream-copied via concat demuxer, while audio is mixed cleanly
            if (extraAudioClips.length > 0 && (visualTrackMuted || !firstHasAudio)) {
              activeModeLabel = '⚡ Copia directa de video + mezcla de audio';
              const { extraInputs, filterArgs, mapAudioArgs } =
                await buildAudioMixForStreamCopy(0, false, true, 0, 0, 0, totalDuration);
              const concatArgs = [
                '-f',
                'concat',
                '-safe',
                '0',
                '-i',
                `__TEMP__:${concatName}`,
                ...extraInputs,
                ...filterArgs,
                '-map',
                '0:v',
                '-c:v',
                'copy',
                ...hevcTag,
                ...mapAudioArgs,
                '-t',
                totalDuration.toFixed(3),
                '-movflags',
                '+faststart',
              ];
              return await executeAndReturnResult(concatArgs);
            }
          }
        }
      }

      // Fit WebGL filterPreset + full colorGrading into 100% PURE-YUV FFmpeg filters
      // (eq + colorcorrect + hue) in <2ms so FFmpeg runs at 80+ FPS with ZERO RGB conversion!
      const clipYuvFilters = new Map<string, string[]>();
      {
        const keyToFilters = new Map<string, string[]>();
        const allVisualClips = [
          ...videoClips,
          ...overlayClips.map((o) => o.clip),
        ];
        for (const vc of allVisualClips) {
          if (!clipNeedsColorFit(vc)) continue;
          const fitKey = getClipColorFitKey(vc);
          let fitted = keyToFilters.get(fitKey);
          if (!fitted) {
            fitted = fitClipToFastYuvFilters(vc);
            keyToFilters.set(fitKey, fitted);
          }
          if (fitted.length > 0) {
            clipYuvFilters.set(vc.id, fitted);
          }
        }
      }

      // Multi-clip / Overlays / Text / Re-scale / Speed / Mixed-audio GPU FFmpeg pipeline
      const encoderArgs = await api.getFFmpegEncoderArgs!(
        info.encoder,
        bitrateMbps
      );
      const outPixFmt =
        info.encoder === 'h264_qsv' || info.encoder === 'h264_mf'
          ? 'nv12'
          : 'yuv420p';

      const inputArgs: string[] = [];
      let inputCount = 0;

      // Note: Do NOT pass -hwaccel auto per input — on Intel QSV it forces GPU->CPU downloads (2.3x slower)
      // and exhausts hardware decoder sessions when timelines have many clips.
      const registerFastSeekVideoInput = (
        tRef: string,
        seekSec: number,
        durSec: number
      ): { idx: number; trimmedAtInput: boolean } => {
        const idx = inputCount++;
        if (seekSec > 0.05) {
          inputArgs.push(
            '-ss',
            seekSec.toFixed(3),
            '-t',
            (durSec + 0.35).toFixed(3),
            '-i',
            tRef
          );
          return { idx, trimmedAtInput: true };
        }
        inputArgs.push('-t', (seekSec + durSec + 0.35).toFixed(3), '-i', tRef);
        return { idx, trimmedAtInput: false };
      };

      const registerImageInput = (tRef: string, durSec: number): number => {
        const idx = inputCount++;
        inputArgs.push('-loop', '1', '-t', durSec.toFixed(3), '-i', tRef);
        return idx;
      };

      const bgColor =
        project.settings.background?.type === 'color' &&
        project.settings.background.color
          ? project.settings.background.color.replace('#', '0x')
          : '0x000000';

      const filterParts: string[] = [];
      const videoConcatLabels: string[] = [];
      const audioMixLabels: string[] = [];
      let cursor = 0;
      let segIdx = 0;

      const buildBaseScaleFilter = (
        vc: VideoClip,
        probe?: FFmpegProbeResult | null
      ): string => {
        const sx = Math.max(0.05, Math.abs(vc.transform.scale * (vc.transform.scaleX ?? 1)));
        const sy = Math.max(0.05, Math.abs(vc.transform.scale * (vc.transform.scaleY ?? 1)));
        const isIdentity =
          Math.abs(sx - 1) <= 0.01 &&
          Math.abs(sy - 1) <= 0.01 &&
          Math.abs(vc.transform.x) <= 0.5 &&
          Math.abs(vc.transform.y) <= 0.5;

        // Skip scale & pad completely when input already matches output dimensions with identity transform
        if (isIdentity && probe && probe.width === width && probe.height === height) {
          return '';
        }

        if (!isIdentity) {
          const tw = Math.max(2, Math.round(width * sx) & ~1);
          const th = Math.max(2, Math.round(height * sy) & ~1);
          const fit =
            vc.transform.fitMode === 'cover'
              ? `scale=${tw}:${th}:flags=fast_bilinear:force_original_aspect_ratio=increase,crop=${tw}:${th}`
              : vc.transform.fitMode === 'fill'
              ? `scale=${tw}:${th}:flags=fast_bilinear`
              : `scale=${tw}:${th}:flags=fast_bilinear:force_original_aspect_ratio=decrease`;
          const dx = Math.round((vc.transform.x / 100) * width);
          const dy = Math.round((vc.transform.y / 100) * height);
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          // Safe pad+crop that works for ANY zoom (including scale > 1) and ANY offset without ever crashing pad
          return `${fit},pad=w='max(iw,${width})+${absDx * 2}':h='max(ih,${height})+${absDy * 2}':x='(ow-iw)/2+${dx}':y='(oh-ih)/2+${dy}':color=${bgColor},crop=${width}:${height}:'(iw-${width})/2':'(ih-${height})/2'`;
        }
        return vc.transform.fitMode === 'cover'
          ? `scale=${width}:${height}:flags=fast_bilinear:force_original_aspect_ratio=increase,crop=${width}:${height}`
          : vc.transform.fitMode === 'fill'
          ? `scale=${width}:${height}:flags=fast_bilinear`
          : `scale=${width}:${height}:flags=fast_bilinear:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`;
      };

      const appendAudioChain = (
        inIdx: number,
        startOffset: number,
        srcDur: number,
        speed: number,
        preservesPitch: boolean,
        vol: number,
        fadeIn: number,
        fadeOut: number,
        timelineStart: number,
        clipDur: number,
        label: string
      ) => {
        const aChain: string[] = [
          `atrim=start=${startOffset.toFixed(3)}:duration=${srcDur.toFixed(3)}`,
          `asetpts=PTS-STARTPTS`,
        ];
        const speedFilter = buildSpeedAudioFilter(speed, preservesPitch);
        if (speedFilter) aChain.push(speedFilter);
        if (Math.abs(vol - 1) > 0.01) aChain.push(`volume=${vol.toFixed(3)}`);
        if (fadeIn > 0.02) {
          aChain.push(`afade=t=in:st=0:d=${fadeIn.toFixed(3)}`);
        }
        if (fadeOut > 0.02) {
          const st = Math.max(0, clipDur - fadeOut);
          aChain.push(`afade=t=out:st=${st.toFixed(3)}:d=${fadeOut.toFixed(3)}`);
        }
        const delayMs = Math.round(timelineStart * 1000);
        if (delayMs > 0) aChain.push(`adelay=${delayMs}|${delayMs}`);
        aChain.push(`aformat=sample_rates=44100:channel_layouts=stereo`);
        filterParts.push(`[${inIdx}:a]${aChain.join(',')}[${label}]`);
        audioMixLabels.push(`[${label}]`);
      };

      for (let i = 0; i < videoClips.length; i++) {
        const vc = videoClips[i];
        const tName = clipTempNames.get(vc.id)!;
        const probe = tempNameToProbe.get(tName);

        // Insert background gap if needed
        if (vc.startTime > cursor + 0.02) {
          const gapDur = vc.startTime - cursor;
          const gapLabel = `vgap${segIdx++}`;
          filterParts.push(
            `color=c=${bgColor}:s=${width}x${height}:d=${gapDur.toFixed(3)}:r=${fps},format=${outPixFmt}[${gapLabel}]`
          );
          videoConcatLabels.push(`[${gapLabel}]`);
        }

        const vLabel = `vseg${i}`;
        const scaleFilter = buildBaseScaleFilter(vc, probe);
        const scaleStr = scaleFilter ? `,${scaleFilter}` : '';
        const extraFilters = buildClipColorAndEffectFilters(
          vc,
          bgColor,
          clipYuvFilters.get(vc.id)
        );
        const extraStr = extraFilters.length > 0 ? `,${extraFilters.join(',')}` : '';

        if (vc.type === 'image') {
          const inIdx = registerImageInput(tName, vc.duration);
          filterParts.push(
            `[${inIdx}:v]fps=${fps}${scaleStr}${extraStr},setsar=1,format=${outPixFmt}[${vLabel}]`
          );
        } else {
          const speed = Math.max(0.02, Math.min(16, vc.speed || 1));
          const srcStart = Math.max(0, vc.sourceStartTime);
          const srcDur = vc.duration * speed;
          const { idx: inIdx, trimmedAtInput } = registerFastSeekVideoInput(
            tName,
            srcStart,
            srcDur
          );
          const trimStart = trimmedAtInput ? 0 : srcStart;
          const ptsFilter =
            Math.abs(speed - 1) > 0.001
              ? `setpts=(PTS-STARTPTS)/${speed.toFixed(4)}`
              : `setpts=PTS-STARTPTS`;
          const needsFps = !probe || Math.abs(probe.fps - fps) > 0.5 || Math.abs(speed - 1) > 0.001;
          const fpsStr = needsFps ? `,fps=${fps}` : '';

          filterParts.push(
            `[${inIdx}:v]trim=start=${trimStart.toFixed(3)}:duration=${srcDur.toFixed(3)},${ptsFilter}${fpsStr}${scaleStr}${extraStr},setsar=1,format=${outPixFmt}[${vLabel}]`
          );

          const vcMuted =
            visualTrackMuted ||
            vc.audio?.isMuted ||
            (vc.audio?.volume ?? 100) <= 0;
          if (!vcMuted && probe?.hasAudio) {
            const vcVol =
              visualTrackVol * Math.max(0, (vc.audio?.volume ?? 100) / 100);
            appendAudioChain(
              inIdx,
              trimStart,
              srcDur,
              speed,
              vc.audio?.preservesPitch ?? true,
              vcVol,
              vc.audio?.fadeInDuration ?? 0,
              vc.audio?.fadeOutDuration ?? 0,
              vc.startTime,
              vc.duration,
              `va${i}`
            );
          }
        }

        videoConcatLabels.push(`[${vLabel}]`);
        cursor = Math.max(cursor, vc.startTime + vc.duration);
      }

      if (totalDuration > cursor + 0.04) {
        const tailDur = totalDuration - cursor;
        const gapLabel = `vgap${segIdx++}`;
        filterParts.push(
          `color=c=${bgColor}:s=${width}x${height}:d=${tailDur.toFixed(3)}:r=${fps},format=${outPixFmt}[${gapLabel}]`
        );
        videoConcatLabels.push(`[${gapLabel}]`);
      }

      let currentVideoLabel = 'vbase';
      if (videoConcatLabels.length > 1) {
        filterParts.push(
          `${videoConcatLabels.join('')}concat=n=${videoConcatLabels.length}:v=1:a=0[${currentVideoLabel}]`
        );
      } else {
        filterParts.push(`${videoConcatLabels[0]}copy[${currentVideoLabel}]`);
      }

      // Composite overlay video & image tracks
      let overlayIdx = 0;
      for (let i = 0; i < overlayClips.length; i++) {
        const { clip: oc, trackMuted, trackVol } = overlayClips[i];
        const tName = clipTempNames.get(oc.id)!;
        const probe = tempNameToProbe.get(tName);
        const startT = oc.startTime;
        const endT = oc.startTime + oc.duration;
        const ovLabel = `ov${i}`;
        const nextVideoLabel = `vcomp${overlayIdx++}`;

        const sx = Math.max(0.05, Math.abs(oc.transform.scale * (oc.transform.scaleX ?? 1)));
        const sy = Math.max(0.05, Math.abs(oc.transform.scale * (oc.transform.scaleY ?? 1)));
        const targetW = Math.max(2, Math.round(width * sx) & ~1);
        const targetH = Math.max(2, Math.round(height * sy) & ~1);
        const scaleOp =
          oc.transform.fitMode === 'cover'
            ? `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase,crop=${targetW}:${targetH}`
            : oc.transform.fitMode === 'fill'
            ? `scale=${targetW}:${targetH}`
            : `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`;

        const extraFilters: string[] = [
          scaleOp,
          ...buildClipColorAndEffectFilters(
            oc,
            '0x00000000',
            clipYuvFilters.get(oc.id)
          ),
        ];
        if (oc.transform.opacity < 0.999) {
          extraFilters.push(
            `format=rgba,colorchannelmixer=aa=${Math.max(0, oc.transform.opacity).toFixed(3)}`
          );
        }

        if (oc.type === 'image') {
          const inIdx = registerImageInput(tName, oc.duration);
          filterParts.push(
            `[${inIdx}:v]fps=${fps},${extraFilters.join(',')},setpts=PTS-STARTPTS+${startT.toFixed(3)}/TB[${ovLabel}]`
          );
        } else {
          const speed = Math.max(0.02, Math.min(16, oc.speed || 1));
          const srcStart = Math.max(0, oc.sourceStartTime);
          const srcDur = oc.duration * speed;
          const { idx: inIdx, trimmedAtInput } = registerFastSeekVideoInput(
            tName,
            srcStart,
            srcDur
          );
          const trimStart = trimmedAtInput ? 0 : srcStart;
          const ptsFilter =
            Math.abs(speed - 1) > 0.001
              ? `setpts=(PTS-STARTPTS)/${speed.toFixed(4)}+${startT.toFixed(3)}/TB`
              : `setpts=PTS-STARTPTS+${startT.toFixed(3)}/TB`;

          filterParts.push(
            `[${inIdx}:v]trim=start=${trimStart.toFixed(3)}:duration=${srcDur.toFixed(3)},${ptsFilter},fps=${fps},${extraFilters.join(',')}[${ovLabel}]`
          );

          const ocMuted =
            trackMuted || oc.audio?.isMuted || (oc.audio?.volume ?? 100) <= 0;
          if (!ocMuted && probe?.hasAudio) {
            const ocVol = trackVol * Math.max(0, (oc.audio?.volume ?? 100) / 100);
            appendAudioChain(
              inIdx,
              trimStart,
              srcDur,
              speed,
              oc.audio?.preservesPitch ?? true,
              ocVol,
              oc.audio?.fadeInDuration ?? 0,
              oc.audio?.fadeOutDuration ?? 0,
              oc.startTime,
              oc.duration,
              `ova${i}`
            );
          }
        }

        const ox = Math.round(oc.transform.x);
        const oy = Math.round(oc.transform.y);
        filterParts.push(
          `[${currentVideoLabel}][${ovLabel}]overlay=x=(W-w)/2+${ox}:y=(H-h)/2+${oy}:enable='between(t,${startT.toFixed(3)},${endT.toFixed(3)})':eof_action=pass[${nextVideoLabel}]`
        );
        currentVideoLabel = nextVideoLabel;
      }

      // Composite static text / subtitle PNG overlays (with optional fade in/out)
      for (let ti = 0; ti < textClips.length; ti++) {
        const tc = textClips[ti];
        const pngRef = textPngRefs.get(tc.id);
        if (!pngRef) continue;
        const startT = tc.startTime;
        const endT = tc.startTime + tc.duration;
        const hasFadeIn =
          tc.textConfig.animIn === 'fadeIn' || tc.animations?.inType === 'fadeIn';
        const hasFadeOut =
          tc.textConfig.animOut === 'fadeOut' || tc.animations?.outType === 'fadeOut';

        let txtSrcLabel: string;
        if (hasFadeIn || hasFadeOut) {
          const inIdx = inputCount++;
          inputArgs.push('-loop', '1', '-t', tc.duration.toFixed(3), '-i', pngRef);
          const fadeParts: string[] = ['format=rgba'];
          if (hasFadeIn) {
            const dIn = Math.max(
              0.05,
              tc.animations?.inType === 'fadeIn'
                ? tc.animations.inDuration
                : tc.textConfig.animInDuration || 0.8
            );
            fadeParts.push(`fade=t=in:st=0:d=${dIn.toFixed(3)}:alpha=1`);
          }
          if (hasFadeOut) {
            const dOut = Math.max(
              0.05,
              tc.animations?.outType === 'fadeOut'
                ? tc.animations.outDuration
                : tc.textConfig.animOutDuration || 0.6
            );
            const stOut = Math.max(0, tc.duration - dOut);
            fadeParts.push(`fade=t=out:st=${stOut.toFixed(3)}:d=${dOut.toFixed(3)}:alpha=1`);
          }
          fadeParts.push(`setpts=PTS-STARTPTS+${startT.toFixed(3)}/TB`);
          txtSrcLabel = `txtsrc${ti}`;
          filterParts.push(`[${inIdx}:v]fps=${fps},${fadeParts.join(',')}[${txtSrcLabel}]`);
        } else {
          const inIdx = inputCount++;
          inputArgs.push('-i', pngRef);
          txtSrcLabel = `${inIdx}:v`;
        }

        const nextVideoLabel = `vtxt${ti}`;
        filterParts.push(
          `[${currentVideoLabel}][${txtSrcLabel}]overlay=0:0:enable='between(t,${startT.toFixed(3)},${endT.toFixed(3)})':eof_action=pass[${nextVideoLabel}]`
        );
        currentVideoLabel = nextVideoLabel;
      }

      filterParts.push(`[${currentVideoLabel}]format=${outPixFmt}[vout]`);

      // Extra audio track clips (each clip gets a fast-seeked input to avoid stream collisions)
      for (let i = 0; i < extraAudioClips.length; i++) {
        const { clip: ac, trackVol } = extraAudioClips[i];
        const tName = clipTempNames.get(ac.id)!;
        const probe = tempNameToProbe.get(tName);
        if (probe && !probe.hasAudio) continue;

        const speed = Math.max(0.02, Math.min(16, ac.speed || 1));
        const srcStart = Math.max(0, ac.sourceStartTime);
        const srcDur = ac.duration * speed;

        const inIdx = inputCount++;
        const trimmedAtInput = srcStart > 0.05;
        if (trimmedAtInput) {
          inputArgs.push('-ss', srcStart.toFixed(3), '-t', (srcDur + 0.35).toFixed(3), '-i', tName);
        } else {
          inputArgs.push('-t', (srcStart + srcDur + 0.35).toFixed(3), '-i', tName);
        }
        const trimStart = trimmedAtInput ? 0 : srcStart;

        const vol = trackVol * Math.max(0, (ac.audio?.volume ?? 100) / 100);
        appendAudioChain(
          inIdx,
          trimStart,
          srcDur,
          speed,
          ac.audio?.preservesPitch ?? true,
          vol,
          ac.audio?.fadeInDuration ?? 0,
          ac.audio?.fadeOutDuration ?? 0,
          ac.startTime,
          ac.duration,
          `xa${i}`
        );
      }

      const mapArgs: string[] = ['-map', '[vout]'];
      if (audioMixLabels.length > 1) {
        filterParts.push(
          `${audioMixLabels.join('')}amix=inputs=${audioMixLabels.length}:duration=longest:normalize=0[aout]`
        );
        mapArgs.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
      } else if (audioMixLabels.length === 1) {
        mapArgs.push('-map', audioMixLabels[0], '-c:a', 'aac', '-b:a', '128k');
      }

      const filterScript = filterParts.join(';');
      let filterArgs: string[];
      if (filterScript.length >= 8000 && api.writeTextFile) {
        const scriptName = await api.writeTextFile(
          sessionId,
          'filtergraph.txt',
          filterScript
        );
        filterArgs = ['-/filter_complex', `__TEMP__:${scriptName}`];
      } else {
        filterArgs = ['-filter_complex', filterScript];
      }

      const args = [
        '-filter_threads',
        '0',
        '-sws_flags',
        'fast_bilinear',
        ...inputArgs,
        ...filterArgs,
        ...mapArgs,
        ...encoderArgs,
        '-t',
        totalDuration.toFixed(3),
        '-movflags',
        '+faststart',
      ];

      return await executeAndReturnResult(args, filterScript);
    } catch (err) {
      if (this.isCancelled) throw err;
      if (forceFFmpeg) {
        console.error('ElectronFFmpegExporter failed in forced FFmpeg mode:', err);
        throw err;
      }
      console.warn('ElectronFFmpegExporter fast path failed, falling back to WebCodecs:', err);
      return null;
    } finally {
      if (unsubscribeProgress) {
        try {
          unsubscribeProgress();
        } catch {}
      }
      this.activeJobId = null;
      api.cleanupExportSession?.(sessionId).catch(() => {});
    }
  }
}
