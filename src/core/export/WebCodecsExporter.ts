// ============================================================================
// WebCodecsExporter - Hardware Accelerated Frame-Accurate MP4 Video Exporter
// ============================================================================

import { Muxer, StreamTarget } from 'mp4-muxer';
import {
  Project,
  ExportSettings,
  VideoClip,
  TextClip,
  TimelineClip,
} from '../../types/editor';
import {
  getResolutionDimensions,
  getRecommendedBitrateMbps,
} from './estimateSize';
import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { AudioExporter } from './AudioExporter';
import {
  hasExportableMedia,
  NO_MEDIA_EXPORT_MESSAGE,
} from './exportValidation';
import { hasTrackAudibleVolume } from '../audio/trackVolumeEnvelope';
import { ProjectStorage } from '../storage/projectStorage';
import { Mp4VideoFrameReader } from './Mp4VideoDecoder';
import {
  ElectronFFmpegExporter,
  ElectronFFmpegAPI,
} from './ElectronFFmpegExporter';
import {
  getAndroidBridge,
  parseNativeExportResult,
  writeBytesToNativeSessionAt,
} from '../native/androidBridge';

export interface RenderProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  timeRemainingSeconds: number;
  stage?: 'preparing' | 'rendering' | 'audio' | 'muxing';
  stageLabel?: string;
}

const IS_MOBILE_DEVICE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
    (typeof window !== 'undefined' && window.innerWidth < 768));

function isPlainIdentityVideoClip(clip: VideoClip): boolean {
  if (clip.keyframes && clip.keyframes.length > 0) return false;
  const t = clip.transform;
  if (
    t.x !== 0 ||
    t.y !== 0 ||
    t.scale !== 1 ||
    (t.scaleX ?? 1) !== 1 ||
    (t.scaleY ?? 1) !== 1 ||
    t.rotation !== 0 ||
    t.opacity !== 1 ||
    t.flipH ||
    t.flipV ||
    t.blendMode !== 'normal'
  ) {
    return false;
  }
  const cg = clip.colorGrading;
  if (
    cg &&
    (cg.brightness ||
      cg.contrast ||
      cg.saturation ||
      cg.exposure ||
      cg.sharpness ||
      cg.highlights ||
      cg.shadows ||
      cg.temperature ||
      cg.tint ||
      cg.vignette ||
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
    return false;
  }
  if (clip.filterPreset && clip.filterPreset !== 'none' && (clip.filterIntensity ?? 100) > 0) {
    return false;
  }
  if (clip.chromaKey?.enabled) return false;
  if (clip.mask && clip.mask.type !== 'none') return false;
  if (clip.effect && clip.effect.type !== 'none') return false;
  const anim = clip.animations;
  if (
    anim &&
    (anim.inType !== 'none' || anim.outType !== 'none' || anim.comboType !== 'none')
  ) {
    return false;
  }
  if (clip.transition && clip.transition.type !== 'none') return false;
  return true;
}

function isTimeStaticVideoClip(clip: VideoClip): boolean {
  if (clip.keyframes && clip.keyframes.length > 0) return false;
  if (clip.effect && clip.effect.type !== 'none') return false;
  const anim = clip.animations;
  if (
    anim &&
    (anim.inType !== 'none' || anim.outType !== 'none' || anim.comboType !== 'none')
  ) {
    return false;
  }
  if (clip.transition && clip.transition.type !== 'none') return false;
  return true;
}

function clipCoversCanvasOpaquely(
  clip: VideoClip,
  srcW: number,
  srcH: number,
  srcRotation: number,
  canvasW: number,
  canvasH: number
): boolean {
  if (clip.keyframes && clip.keyframes.length > 0) return false;
  const t = clip.transform;
  if (
    t.opacity < 0.999 ||
    t.x !== 0 ||
    t.y !== 0 ||
    t.rotation !== 0 ||
    t.scale < 1 ||
    (t.scaleX ?? 1) < 1 ||
    (t.scaleY ?? 1) < 1 ||
    (t.blendMode && t.blendMode !== 'normal')
  ) {
    return false;
  }
  if (clip.chromaKey?.enabled) return false;
  if (clip.mask && clip.mask.type !== 'none') return false;
  const anim = clip.animations;
  if (
    anim &&
    (anim.inType !== 'none' || anim.outType !== 'none' || anim.comboType !== 'none')
  ) {
    return false;
  }
  if (clip.transition && clip.transition.type !== 'none') return false;

  const fitMode = t.fitMode || 'contain';
  if (fitMode === 'fill' || fitMode === 'cover') return true;
  if (srcW <= 0 || srcH <= 0 || canvasW <= 0 || canvasH <= 0) return false;
  const swap = srcRotation === 90 || srcRotation === 270;
  const effW = swap ? srcH : srcW;
  const effH = swap ? srcW : srcH;
  return Math.abs(effW / effH - canvasW / canvasH) < 0.004;
}

interface SortedTrackClips {
  type: string;
  clips: TimelineClip[];
}

// Evaluate Bezier/piecewise speed curve multiplier at normalized clip progress [0..1]
function getEffectiveSpeed(clip: VideoClip, localTime: number): number {
  const baseSpeed = Math.max(0.02, Math.min(16, clip.speed || 1.0));
  const pts = clip.speedCurve?.points;
  if (!pts || pts.length < 2) return baseSpeed;

  const progress = Math.max(
    0,
    Math.min(1, localTime / Math.max(0.1, clip.duration))
  );
  for (let i = 0; i < pts.length - 1; i++) {
    if (progress >= pts[i].x && progress <= pts[i + 1].x) {
      const span = Math.max(0.001, pts[i + 1].x - pts[i].x);
      const f = (progress - pts[i].x) / span;
      const curveMult = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
      return Math.max(0.02, Math.min(16, baseSpeed * curveMult));
    }
  }
  return baseSpeed;
}

// Compute target media timestamp inside a VideoClip at timeline time `currentTime`
function computeClipMediaTime(clip: VideoClip, currentTime: number): number {
  const localTime = Math.max(0, currentTime - clip.startTime);
  const effSpeed = getEffectiveSpeed(clip, localTime);

  if (clip.isFrozen) {
    return Math.max(0, clip.sourceStartTime);
  }
  if (clip.isReversed && !clip.isPreReversedMedia) {
    const clipSpan = clip.duration * effSpeed;
    return Math.max(
      0,
      clip.sourceStartTime + clipSpan - localTime * effSpeed
    );
  }
  return Math.max(0, clip.sourceStartTime + localTime * effSpeed);
}

// Draw procedural cinema scene for demo clips during export
function drawProceduralExportFrame(
  canvas: HTMLCanvasElement,
  time: number,
  clipName: string,
  sceneVariant = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  const isSecondScene =
    sceneVariant % 2 === 1 ||
    clipName.includes('#2') ||
    clipName.includes('2') ||
    clipName.includes('Copia') ||
    clipName.includes('Parte 2');

  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (isSecondScene) {
    grad.addColorStop(0, '#062c43');
    grad.addColorStop(0.45, '#054569');
    grad.addColorStop(0.78, '#f59e0b');
    grad.addColorStop(1, '#ef4444');
  } else {
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.4, '#311042');
    grad.addColorStop(0.75, '#be185d');
    grad.addColorStop(1, '#fb923c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const sunX =
    w * (isSecondScene ? 0.68 : 0.35) + Math.sin(time * 1.4) * (w * 0.08);
  const sunY = h * 0.34 + Math.cos(time * 1.1) * (h * 0.04);
  const sunR = Math.min(w, h) * 0.18;
  const sunGrad = ctx.createRadialGradient(
    sunX,
    sunY,
    sunR * 0.1,
    sunX,
    sunY,
    sunR * 1.6
  );
  if (isSecondScene) {
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f97316');
    sunGrad.addColorStop(1, 'rgba(249,115,22,0)');
  } else {
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.5, '#f43f5e');
    sunGrad.addColorStop(1, 'rgba(244,63,94,0)');
  }
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 1.6, 0, Math.PI * 2);
  ctx.fill();

  const horizonY = h * 0.56;
  ctx.fillStyle = isSecondScene
    ? 'rgba(6, 20, 35, 0.86)'
    : 'rgba(12, 10, 29, 0.86)';
  ctx.fillRect(0, horizonY, w, h - horizonY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, w, h - horizonY);
  ctx.clip();

  ctx.strokeStyle = isSecondScene
    ? 'rgba(56, 189, 248, 0.45)'
    : 'rgba(236, 72, 153, 0.45)';
  ctx.lineWidth = 2.5;

  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * (w * 0.04), horizonY);
    ctx.lineTo(w * 0.5 + i * (w * 0.24), h);
    ctx.stroke();
  }

  const gridOffset = (time * 1.6) % 1;
  for (let j = 0; j < 8; j++) {
    const p = (j + gridOffset) / 8;
    const y = horizonY + Math.pow(p, 1.9) * (h - horizonY);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  const cx = w / 2 + Math.sin(time * 2.2) * (w * 0.14);
  const cy = h * 0.44 + Math.cos(time * 1.7) * (h * 0.06);
  const radius = Math.min(w, h) * (0.16 + 0.025 * Math.sin(time * 5));

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = isSecondScene ? '#22c55e' : '#38bdf8';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = isSecondScene ? '#eab308' : '#f43f5e';
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(w * 0.1, h * 0.72, w * 0.8, h * 0.14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.1, h * 0.72, w * 0.8, h * 0.14);

  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(w * 0.058)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(clipName.toUpperCase().slice(0, 24), w / 2, h * 0.78);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `700 ${Math.round(w * 0.036)}px monospace`;
  ctx.fillText(
    `ESCENA ${sceneVariant + 1} · ${time.toFixed(2)}s`,
    w / 2,
    h * 0.83
  );
}

// Frame-accurate asynchronous video seek helper
async function seekVideoElement(
  video: HTMLVideoElement,
  targetTime: number
): Promise<void> {
  if (video.readyState < 1) {
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener('loadeddata', finish);
        video.removeEventListener('error', finish);
        resolve();
      };
      video.addEventListener('loadeddata', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
      setTimeout(finish, 800);
    });
  }

  let clamped = Math.max(0, targetTime);
  if (Number.isFinite(video.duration) && video.duration > 0) {
    clamped = Math.max(
      0,
      Math.min(targetTime, Math.max(0, video.duration - 0.015))
    );
  }

  if (
    !video.seeking &&
    Math.abs(video.currentTime - clamped) < 0.012 &&
    video.readyState >= 2
  ) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', finish);
      resolve();
    };

    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    timer = setTimeout(finish, 500);

    try {
      video.currentTime = clamped;
    } catch {
      finish();
    }
  });
}

interface PreparedExportMedia {
  elements: Map<
    string,
    HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  >;
  decoders: Map<string, Mp4VideoFrameReader>;
  buffers: Map<string, ArrayBuffer>;
  proceduralIds: Set<string>;
  getFallbackVideo: (clip: VideoClip) => Promise<HTMLVideoElement | null>;
  cleanup: () => void;
}

const encoderConfigCache = new Map<string, VideoEncoderConfig>();

export class WebCodecsExporter {
  private isCancelled = false;
  private ffmpegExporter: ElectronFFmpegExporter | null = null;
  private activeAndroidSessionId: string | null = null;

  public cancel() {
    this.isCancelled = true;
    this.ffmpegExporter?.cancel();
  }

  private async loadClipBlob(clipId: string, sourceUrl: string): Promise<Blob | null> {
    if (sourceUrl) {
      const memBlob = ProjectStorage.getRuntimeBlob(sourceUrl);
      if (memBlob && memBlob.size > 0) return memBlob;
      try {
        const res = await fetch(sourceUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) return blob;
        }
      } catch {}
    }
    try {
      const storedBlob = await ProjectStorage.getMediaBlob(clipId);
      if (storedBlob && storedBlob.size > 0) return storedBlob;
    } catch {}
    return null;
  }

  // Create dedicated hardware VideoDecoders (for MP4/MOV) or offscreen DOM media elements in parallel
  private async prepareExportMedia(
    project: Project,
    existingMedia: Map<
      string,
      HTMLVideoElement | HTMLAudioElement | HTMLImageElement | HTMLCanvasElement
    >,
    container: HTMLElement
  ): Promise<PreparedExportMedia> {
    const elements = new Map<
      string,
      HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
    >();
    const decoders = new Map<string, Mp4VideoFrameReader>();
    const buffers = new Map<string, ArrayBuffer>();
    const proceduralIds = new Set<string>();
    const createdBlobUrls: string[] = [];
    const createdVideos: HTMLVideoElement[] = [];

    const tasks: Promise<void>[] = [];
    const blobPromises = new Map<string, Promise<Blob | null>>();
    const getSharedBlob = (clipId: string, sourceUrl: string): Promise<Blob | null> => {
      const key = sourceUrl || clipId;
      let p = blobPromises.get(key);
      if (!p) {
        p = this.loadClipBlob(clipId, sourceUrl);
        blobPromises.set(key, p);
      }
      return p;
    };

    const createOffscreenVideoElement = (vClip: VideoClip): Promise<HTMLVideoElement | null> => {
      return new Promise<HTMLVideoElement | null>((resolve) => {
        const vid = document.createElement('video');
        if (
          vClip.sourceUrl.startsWith('http://') ||
          vClip.sourceUrl.startsWith('https://')
        ) {
          vid.crossOrigin = 'anonymous';
        }
        vid.muted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', 'true');
        vid.setAttribute('webkit-playsinline', 'true');
        vid.preload = 'auto';
        container.appendChild(vid);
        createdVideos.push(vid);

        let done = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const finish = (res: HTMLVideoElement | null) => {
          if (done) return;
          done = true;
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve(res);
        };

        const initTarget = Math.max(0.001, vClip.sourceStartTime || 0.001);
        vid.addEventListener(
          'loadedmetadata',
          () => {
            try {
              vid.currentTime = initTarget;
            } catch {
              finish(vid);
            }
          },
          { once: true }
        );
        vid.addEventListener('seeked', () => finish(vid), { once: true });
        vid.addEventListener('loadeddata', () => finish(vid), {
          once: true,
        });
        vid.addEventListener(
          'error',
          async () => {
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            const storedBlob = await ProjectStorage.getMediaBlob(vClip.id);
            if (storedBlob) {
              const freshUrl = URL.createObjectURL(storedBlob);
              createdBlobUrls.push(freshUrl);
              timeoutId = setTimeout(() => finish(vid), 4000);
              vid.addEventListener('loadeddata', () => finish(vid), {
                once: true,
              });
              vid.addEventListener('error', () => finish(null), {
                once: true,
              });
              vid.src = freshUrl;
              vid.load();
            } else {
              const fallbackEl = existingMedia.get(vClip.id);
              if (fallbackEl instanceof HTMLVideoElement) {
                finish(fallbackEl);
              } else {
                finish(null);
              }
            }
          },
          { once: true }
        );

        timeoutId = setTimeout(() => finish(vid), 3000);
        vid.src = vClip.sourceUrl;
        vid.load();
      });
    };

    const fallbackVideoPromises = new Map<string, Promise<HTMLVideoElement | null>>();
    const getFallbackVideo = (vClip: VideoClip): Promise<HTMLVideoElement | null> => {
      const existing = elements.get(vClip.id);
      if (existing instanceof HTMLVideoElement) {
        return Promise.resolve(existing);
      }
      let p = fallbackVideoPromises.get(vClip.id);
      if (!p) {
        p = createOffscreenVideoElement(vClip).then((vid) => {
          if (vid) {
            elements.set(vClip.id, vid);
          }
          return vid;
        });
        fallbackVideoPromises.set(vClip.id, p);
      }
      return p;
    };

    // Group non-overlapping video clips sharing the same sourceUrl so they reuse a single VideoDecoder
    const decoderGroups = new Map<string, Array<{ endTime: number; readerPromise: Promise<Mp4VideoFrameReader | null> }>>();

    for (const track of project.tracks) {
      if (!track.isVisible) continue;

      const sortedTrackClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
      for (const clip of sortedTrackClips) {
        if (clip.type !== 'video' && clip.type !== 'image') continue;
        const vClip = clip as VideoClip;

        const isProcedural =
          !vClip.sourceUrl ||
          vClip.sourceUrl.startsWith('procedural://') ||
          clip.id.startsWith('sample_');

        if (isProcedural) {
          const pCanvas = document.createElement('canvas');
          pCanvas.width = 720;
          pCanvas.height = 1280;
          drawProceduralExportFrame(
            pCanvas,
            vClip.sourceStartTime || 0,
            vClip.name,
            0
          );
          elements.set(clip.id, pCanvas);
          proceduralIds.add(clip.id);
          continue;
        }

        if (clip.type === 'image') {
          tasks.push(
            (async () => {
              const existing = existingMedia.get(clip.id);
              if (
                existing instanceof HTMLImageElement &&
                existing.complete &&
                existing.naturalWidth > 0
              ) {
                elements.set(clip.id, existing);
                return;
              }

              const img = await new Promise<HTMLImageElement | null>((resolve) => {
                const image = new Image();
                if (
                  vClip.sourceUrl.startsWith('http://') ||
                  vClip.sourceUrl.startsWith('https://')
                ) {
                  image.crossOrigin = 'anonymous';
                }
                let done = false;
                const finish = (res: HTMLImageElement | null) => {
                  if (done) return;
                  done = true;
                  resolve(res);
                };
                image.onload = () => finish(image);
                image.onerror = async () => {
                  const storedBlob = await ProjectStorage.getMediaBlob(clip.id);
                  if (storedBlob) {
                    const freshUrl = URL.createObjectURL(storedBlob);
                    createdBlobUrls.push(freshUrl);
                    image.onload = () => finish(image);
                    image.onerror = () => finish(null);
                    image.src = freshUrl;
                  } else {
                    finish(null);
                  }
                };
                setTimeout(() => finish(image.complete ? image : null), 2500);
                image.src = vClip.sourceUrl;
              });

              if (img) {
                elements.set(clip.id, img);
              }
            })()
          );
          continue;
        }

        // Video clip: prefer fast sequential WebCodecs VideoDecoder (10-50x faster than <video> seeking)
        if (clip.type === 'video') {
          const sourceKey = vClip.sourceUrl || clip.id;
          const transMargin = vClip.transition && vClip.transition.type !== 'none'
            ? (vClip.transition.duration || 0.6) + 0.1
            : 0;
          const clipStartWithMargin = vClip.startTime - transMargin;
          const clipEnd = vClip.startTime + vClip.duration;

          let groupList = decoderGroups.get(sourceKey);
          if (!groupList) {
            groupList = [];
            decoderGroups.set(sourceKey, groupList);
          }

          let matchedGroup = groupList.find((g) => clipStartWithMargin >= g.endTime + 0.05);
          let readerPromise: Promise<Mp4VideoFrameReader | null>;

          if (matchedGroup) {
            matchedGroup.endTime = Math.max(matchedGroup.endTime, clipEnd);
            readerPromise = matchedGroup.readerPromise;
          } else {
            readerPromise = (async () => {
              const blob = await getSharedBlob(clip.id, vClip.sourceUrl);
              if (blob && blob.size > 0) {
                const reader = await Mp4VideoFrameReader.createFromBlob(blob);
                if (reader) return reader;

                // In Electron, transcode non-MP4/unsupported formats (WebM, MKV, AVI, fragmented MP4)
                // via GPU FFmpeg in <1-2s instead of falling back to slow HTMLVideoElement.seek()
                const eApi =
                  typeof window !== 'undefined'
                    ? (window as unknown as { electronAPI?: ElectronFFmpegAPI }).electronAPI
                    : undefined;
                if (eApi?.isElectron) {
                  try {
                    const diskPath = vClip.sourceUrl
                      ? ProjectStorage.getRuntimeFilePath(vClip.sourceUrl)
                      : undefined;
                    let fastMp4: Uint8Array | null = null;
                    if (diskPath && eApi.transcodePathToFastMp4) {
                      fastMp4 = await eApi.transcodePathToFastMp4(diskPath);
                    } else if (eApi.transcodeToFastMp4) {
                      const ext = (blob.type || '').split('/')[1]?.split(';')[0] || 'mp4';
                      const ab = await blob.arrayBuffer();
                      fastMp4 = await eApi.transcodeToFastMp4(new Uint8Array(ab), ext);
                    }
                    if (fastMp4 && fastMp4.byteLength > 0) {
                      return await Mp4VideoFrameReader.create(fastMp4.buffer as ArrayBuffer);
                    }
                  } catch {}
                }
              }
              return null;
            })();
            groupList.push({ endTime: clipEnd, readerPromise });
          }

          tasks.push(
            (async () => {
              const reader = await readerPromise;
              if (reader) {
                decoders.set(clip.id, reader);
                return;
              }

              // Fallback to dedicated offscreen <video> element (for WebM, fragmented MP4, etc.)
              const video = await createOffscreenVideoElement(vClip);
              if (video) {
                elements.set(clip.id, video);
              }
            })()
          );
        }
      }
    }

    await Promise.all(tasks);

    return {
      elements,
      decoders,
      buffers,
      proceduralIds,
      getFallbackVideo,
      cleanup: () => {
        buffers.clear();
        for (const reader of decoders.values()) {
          try {
            reader.dispose();
          } catch {}
        }
        decoders.clear();
        for (const vid of createdVideos) {
          try {
            vid.pause();
            vid.removeAttribute('src');
            vid.load();
            vid.remove();
          } catch {}
        }
        for (const url of createdBlobUrls) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      },
    };
  }

  private buildSortedTracks(project: Project): SortedTrackClips[] {
    const result: SortedTrackClips[] = [];
    for (const track of project.tracks) {
      if (!track.isVisible) continue;
      result.push({
        type: track.type,
        clips: [...track.clips].sort((a, b) => a.startTime - b.startTime),
      });
    }
    return result;
  }

  // Render a single project frame at `currentTime`, awaiting any required <video> seeks first
  private async renderProjectFrameAtTime(
    project: Project,
    renderer: WebGLRenderer,
    width: number,
    height: number,
    currentTime: number,
    prepared: PreparedExportMedia,
    sortedTracks?: SortedTrackClips[],
    skip2DCanvas = false
  ): Promise<void> {
    renderer.clear(project.settings.background, width, height, skip2DCanvas);

    let renderedAnyVisual = false;
    const tracksToRender = sortedTracks || this.buildSortedTracks(project);

    for (const track of tracksToRender) {
      const sortedClips = track.clips;

      for (let idx = 0; idx < sortedClips.length; idx++) {
        const clip = sortedClips[idx];
        if (clip.startTime > currentTime) break;
        if (currentTime >= clip.startTime + clip.duration) continue;

        if (clip.type === 'video' || clip.type === 'image') {
          const vClip = clip as VideoClip;
          const mediaTime = computeClipMediaTime(vClip, currentTime);
          const decoder = prepared.decoders.get(clip.id);
          let source:
            | HTMLVideoElement
            | HTMLImageElement
            | HTMLCanvasElement
            | VideoFrame
            | undefined;

          let sourceRotation = 0;
          if (decoder && !decoder.hasError()) {
            const frame = await decoder.getFrameAtTime(mediaTime);
            if (frame) {
              source = frame;
              sourceRotation = decoder.getNeedsManualRotation(frame);
            }
          }
          if (!source) {
            source = prepared.elements.get(clip.id);
            if (!source && clip.type === 'video' && !prepared.proceduralIds.has(clip.id)) {
              source = (await prepared.getFallbackVideo(vClip)) ?? undefined;
            }
          }
          if (!source) continue;

          renderedAnyVisual = true;

          if (prepared.proceduralIds.has(clip.id) && source instanceof HTMLCanvasElement) {
            drawProceduralExportFrame(source, mediaTime, vClip.name, idx);
          } else if (source instanceof HTMLVideoElement) {
            await seekVideoElement(source, mediaTime);
          }

          // Check if clip is in an active entrance transition with a preceding clip
          let prevClipSource: {
            id: string;
            element:
              | HTMLVideoElement
              | HTMLImageElement
              | HTMLCanvasElement
              | VideoFrame;
          } | null = null;

          const localTime = Math.max(0, currentTime - clip.startTime);
          const transDur = vClip.transition?.duration || 0.6;
          if (
            vClip.transition &&
            vClip.transition.type !== 'none' &&
            localTime < transDur &&
            idx > 0
          ) {
            const prevClip = sortedClips[idx - 1];
            if (prevClip.type === 'video' || prevClip.type === 'image') {
              const pVClip = prevClip as VideoClip;
              const prevEvalTime =
                prevClip.startTime +
                prevClip.duration -
                (transDur - localTime) * 0.5;
              const prevMediaTime = computeClipMediaTime(pVClip, prevEvalTime);
              const prevDecoder = prepared.decoders.get(prevClip.id);
              let prevEl:
                | HTMLVideoElement
                | HTMLImageElement
                | HTMLCanvasElement
                | VideoFrame
                | undefined;
              if (prevDecoder && !prevDecoder.hasError()) {
                prevEl = (await prevDecoder.getFrameAtTime(prevMediaTime)) ?? undefined;
              }
              if (!prevEl) {
                prevEl = prepared.elements.get(prevClip.id);
                if (!prevEl && prevClip.type === 'video' && !prepared.proceduralIds.has(prevClip.id)) {
                  prevEl = (await prepared.getFallbackVideo(pVClip)) ?? undefined;
                }
              }

              if (prevEl) {
                if (
                  prepared.proceduralIds.has(prevClip.id) &&
                  prevEl instanceof HTMLCanvasElement
                ) {
                  drawProceduralExportFrame(
                    prevEl,
                    prevMediaTime,
                    pVClip.name,
                    idx - 1
                  );
                } else if (prevEl instanceof HTMLVideoElement) {
                  await seekVideoElement(prevEl, prevMediaTime);
                }
                prevClipSource = { id: prevClip.id, element: prevEl };
              }
            }
          }

          renderer.renderVideoClip(
            vClip,
            source,
            width,
            height,
            currentTime,
            prevClipSource,
            sourceRotation,
            skip2DCanvas
          );
        } else if (clip.type === 'text' || clip.type === 'subtitle') {
          renderer.renderTextClip(
            clip as TextClip,
            width,
            height,
            currentTime
          );
        }
      }
    }

    // If at the exact end of timeline, hold the last visual clip's final frame so it never flashes blank
    if (!renderedAnyVisual) {
      for (const track of project.tracks) {
        if (!track.isVisible || track.type === 'audio') continue;
        const visualClips = track.clips.filter(
          (c): c is VideoClip => c.type === 'video' || c.type === 'image'
        );
        if (visualClips.length > 0) {
          const lastClip = visualClips.reduce((a, b) =>
            a.startTime + a.duration >= b.startTime + b.duration ? a : b
          );
          const clampedTime = Math.max(
            lastClip.startTime,
            lastClip.startTime + lastClip.duration - 0.02
          );
          const mediaTime = computeClipMediaTime(lastClip, clampedTime);
          const decoder = prepared.decoders.get(lastClip.id);
          let source:
            | HTMLVideoElement
            | HTMLImageElement
            | HTMLCanvasElement
            | VideoFrame
            | undefined;
          let lastSourceRotation = 0;
          if (decoder && !decoder.hasError()) {
            const frame = await decoder.getFrameAtTime(mediaTime);
            if (frame) {
              source = frame;
              lastSourceRotation = decoder.getNeedsManualRotation(frame);
            }
          }
          if (!source) {
            source = prepared.elements.get(lastClip.id);
            if (!source && lastClip.type === 'video' && !prepared.proceduralIds.has(lastClip.id)) {
              source = (await prepared.getFallbackVideo(lastClip)) ?? undefined;
            }
          }
          if (source) {
            if (
              prepared.proceduralIds.has(lastClip.id) &&
              source instanceof HTMLCanvasElement
            ) {
              drawProceduralExportFrame(source, mediaTime, lastClip.name, 0);
            } else if (source instanceof HTMLVideoElement) {
              await seekVideoElement(source, mediaTime);
            }
            renderer.renderVideoClip(
              lastClip,
              source,
              width,
              height,
              clampedTime,
              null,
              lastSourceRotation,
              skip2DCanvas
            );
            break;
          }
        }
      }
    }
  }

  // Negotiate a supported H.264 VideoEncoderConfig for the given dimensions and framerate
  private async findSupportedVideoEncoderConfig(
    width: number,
    height: number,
    fps: number,
    bitrate: number,
    accelModes: HardwareAcceleration[] = [
      'prefer-hardware',
      'no-preference',
      'prefer-software',
    ]
  ): Promise<VideoEncoderConfig | null> {
    if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported) {
      return null;
    }

    const cacheKey = `${width}x${height}@${fps}:${accelModes.join(',')}`;
    const cached = encoderConfigCache.get(cacheKey);
    if (cached) {
      return { ...cached, bitrate };
    }

    const maxDim = Math.max(width, height);
    const candidateCodecs =
      maxDim <= 1280 && fps <= 30
        ? [
            'avc1.640028', // High Profile Level 4.0 (720p/1080p30)
            'avc1.4d0028', // Main Profile Level 4.0
            'avc1.42001f', // Baseline Level 3.1 (wide mobile HW support)
            'avc1.64002a', // High Profile Level 4.2
            'avc1.4d002a', // Main Profile Level 4.2
            'avc1.42002a', // Baseline Level 4.2
            'avc1.640033', // High Profile Level 5.1
            'avc1.640034', // High Profile Level 5.2
          ]
        : maxDim <= 1920
        ? fps <= 30
          ? [
              'avc1.640028', // High Profile Level 4.0 (widest 1080p30 HW support)
              'avc1.64002a', // High Profile Level 4.2 (1080p60)
              'avc1.4d0028', // Main Profile Level 4.0
              'avc1.4d002a', // Main Profile Level 4.2
              'avc1.42002a', // Baseline Level 4.2
              'avc1.640033', // High Profile Level 5.1
              'avc1.640034', // High Profile Level 5.2
              'avc1.42001f', // Baseline Level 3.1
            ]
          : [
              'avc1.64002a', // High Profile Level 4.2 (1080p60)
              'avc1.4d002a', // Main Profile Level 4.2
              'avc1.42002a', // Baseline Level 4.2
              'avc1.640028', // High Profile Level 4.0
              'avc1.640033', // High Profile Level 5.1
              'avc1.640034', // High Profile Level 5.2
              'avc1.42001f', // Baseline Level 3.1
            ]
        : [
            'avc1.640034', // High Profile Level 5.2
            'avc1.640033', // High Profile Level 5.1
            'avc1.4d0034', // Main Profile Level 5.2
            'avc1.4d0033', // Main Profile Level 5.1
            'avc1.64002a', // High Profile Level 4.2
            'avc1.42002a', // Baseline Level 4.2
          ];

    const latencyModes: readonly (LatencyMode | undefined)[] = IS_MOBILE_DEVICE
      ? [undefined, 'realtime', 'quality']
      : ['realtime', undefined, 'quality'];

    for (const hw of accelModes) {
      for (const latencyMode of latencyModes) {
        // Test the primary codec for this resolution first so we don't fire 8 parallel GPU process queries at once
        const primaryCodec = candidateCodecs[0];
        if (primaryCodec) {
          const primaryCfg: VideoEncoderConfig = {
            codec: primaryCodec,
            width,
            height,
            bitrate,
            framerate: fps,
            hardwareAcceleration: hw,
            ...(latencyMode ? { latencyMode } : {}),
            avc: { format: 'avc' },
          };
          try {
            const support = await VideoEncoder.isConfigSupported(primaryCfg);
            if (support.supported) {
              const resolved = support.config || primaryCfg;
              encoderConfigCache.set(cacheKey, resolved);
              return resolved;
            }
          } catch {}
        }

        const results = await Promise.all(
          candidateCodecs.slice(1).map(async (codec) => {
            const cfg: VideoEncoderConfig = {
              codec,
              width,
              height,
              bitrate,
              framerate: fps,
              hardwareAcceleration: hw,
              ...(latencyMode ? { latencyMode } : {}),
              avc: { format: 'avc' },
            };
            try {
              const support = await VideoEncoder.isConfigSupported(cfg);
              if (support.supported) {
                return support.config || cfg;
              }
            } catch {
              // Unsupported codec
            }
            return null;
          })
        );
        const matched = results.find((r): r is VideoEncoderConfig => r !== null);
        if (matched) {
          encoderConfigCache.set(cacheKey, matched);
          return matched;
        }
      }
    }

    return null;
  }

  public async exportProject(
    project: Project,
    settings: ExportSettings,
    mediaSources: Map<
      string,
      HTMLVideoElement | HTMLAudioElement | HTMLImageElement | HTMLCanvasElement
    >,
    onProgress: (progress: RenderProgress) => void
  ): Promise<Blob> {
    this.isCancelled = false;

    if (!hasExportableMedia(project)) {
      throw new Error(NO_MEDIA_EXPORT_MESSAGE);
    }

    // Fast path: native hardware-accelerated FFmpeg export in Electron
    if (settings.exportEngine !== 'webcodecs') {
      const ffExporter = new ElectronFFmpegExporter();
      this.ffmpegExporter = ffExporter;
      try {
        const fastBlob = await ffExporter.tryExport(project, settings, onProgress);
        if (fastBlob) {
          return fastBlob;
        }
      } finally {
        this.ffmpegExporter = null;
      }
      if (this.isCancelled) {
        throw new Error('Export cancelled by user');
      }
    }

    const { width, height } = getResolutionDimensions(
      settings.resolution,
      project.settings.aspectRatio,
      project.settings.customWidth,
      project.settings.customHeight
    );
    const fps = Math.min(30, Math.max(1, settings.fps || 30)) as 24 | 25 | 30;
    const duration = Math.max(1, project.settings.duration);
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    const bitrateMbps = getRecommendedBitrateMbps(
      settings.resolution,
      fps,
      settings.quality,
      settings.customBitrateMbps
    );

    // Keep <video> fallback container inside viewport with minimal opacity so mobile browsers never throttle decoding;
    // keep the rendering canvas detached from DOM to avoid compositor invalidation overhead.
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.cssText =
      'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0.001;pointer-events:none;z-index:-9999;';
    document.body.appendChild(hiddenContainer);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d', { alpha: false, desynchronized: true });

    const renderer = new WebGLRenderer(canvas, { preserveDrawingBuffer: true });
    const hasWebCodecs =
      typeof VideoEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined';

    onProgress({
      percentage: 0,
      currentFrame: 0,
      totalFrames,
      timeRemainingSeconds: -1,
      stage: 'preparing',
      stageLabel: 'Preparando medios y codificador...',
    });

    const targetBitrate = Math.round(bitrateMbps * 1_000_000);
    const [prepared, encoderConfig] = await Promise.all([
      this.prepareExportMedia(project, mediaSources, hiddenContainer),
      hasWebCodecs
        ? this.findSupportedVideoEncoderConfig(
            width,
            height,
            fps,
            targetBitrate
          )
        : Promise.resolve(null),
    ]);

    try {
      if (hasWebCodecs && encoderConfig) {
        try {
          return await this.exportWithWebCodecs(
            project,
            renderer,
            canvas,
            width,
            height,
            fps,
            totalFrames,
            encoderConfig,
            prepared,
            onProgress,
            settings
          );
        } catch (err) {
          if (this.isCancelled) throw err;
          console.warn(
            'WebCodecs hardware export failed, retrying with software/fallback encoder:',
            err
          );
          if (encoderConfig.hardwareAcceleration !== 'prefer-software') {
            const swConfig = await this.findSupportedVideoEncoderConfig(
              width,
              height,
              fps,
              targetBitrate,
              ['prefer-software', 'no-preference']
            );
            if (swConfig) {
              try {
                // Reset decoders back to the start of the timeline before retrying
                for (const dec of prepared.decoders.values()) {
                  try {
                    await dec.getFrameAtTime(0);
                  } catch {}
                }
                return await this.exportWithWebCodecs(
                  project,
                  renderer,
                  canvas,
                  width,
                  height,
                  fps,
                  totalFrames,
                  swConfig,
                  prepared,
                  onProgress,
                  settings
                );
              } catch (swErr) {
                if (this.isCancelled) throw swErr;
                console.warn(
                  'WebCodecs software fallback failed, falling back to MediaRecorder:',
                  swErr
                );
              }
            }
          }
        }
      }

      return await this.exportWithMediaRecorder(
        project,
        renderer,
        canvas,
        width,
        height,
        fps,
        totalFrames,
        bitrateMbps,
        prepared,
        onProgress
      );
    } finally {
      if (this.activeAndroidSessionId) {
        try {
          getAndroidBridge()?.cancelExportSession(this.activeAndroidSessionId);
        } catch {}
        this.activeAndroidSessionId = null;
      }
      prepared.cleanup();
      renderer.dispose();
      try {
        hiddenContainer.remove();
      } catch {}
    }
  }

  private async exportWithWebCodecs(
    project: Project,
    renderer: WebGLRenderer,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    fps: number,
    totalFrames: number,
    encoderConfig: VideoEncoderConfig,
    prepared: PreparedExportMedia,
    onProgress: (progress: RenderProgress) => void,
    settings?: ExportSettings
  ): Promise<Blob> {
    // Check AAC AudioEncoder support and kick off audio mixdown in parallel with video encoding
    const hasAudioClips = project.tracks.some(
      (t) =>
        !t.isMuted &&
        t.isVisible &&
        hasTrackAudibleVolume(t) &&
        t.clips.some(
          (c) =>
            (c.type === 'video' || c.type === 'audio') &&
            c.audio &&
            !c.audio.isMuted &&
            !c.isFrozen &&
            (c.audio.volume ?? 100) > 0
        )
    );

    let supportedAudioConfig: AudioEncoderConfig | null = null;
    let mixedAudioBuffer: AudioBuffer | null = null;
    let audioMixPromise: Promise<AudioBuffer | null> = Promise.resolve(null);

    if (
      hasAudioClips &&
      typeof AudioEncoder !== 'undefined' &&
      typeof AudioData !== 'undefined'
    ) {
      try {
        const candidateAudioCfg: AudioEncoderConfig = {
          codec: 'mp4a.40.2',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitrate: 128_000,
        };
        const audioSupport =
          await AudioEncoder.isConfigSupported(candidateAudioCfg);
        if (audioSupport.supported) {
          supportedAudioConfig = audioSupport.config || candidateAudioCfg;
          const audioSampleRate = supportedAudioConfig.sampleRate || 44100;
          if (IS_MOBILE_DEVICE) {
            // Mix audio sequentially on mobile to avoid CPU/RAM/disk contention
            mixedAudioBuffer = await AudioExporter.renderProjectAudioBuffer(
              project,
              audioSampleRate,
              prepared.buffers
            ).catch(() => null);
            prepared.buffers.clear();
          } else {
            // Mix audio in parallel with video encoding on desktop for zero startup delay
            audioMixPromise = AudioExporter.renderProjectAudioBuffer(
              project,
              audioSampleRate,
              prepared.buffers
            ).catch(() => null);
          }
        }
      } catch {
        supportedAudioConfig = null;
      }
    }
    if (!supportedAudioConfig) {
      prepared.buffers.clear();
    }

    const androidBridge = getAndroidBridge();
    if (this.activeAndroidSessionId && androidBridge) {
      try {
        androidBridge.cancelExportSession(this.activeAndroidSessionId);
      } catch {}
      this.activeAndroidSessionId = null;
    }

    let nativeSessionId: string | null = null;
    if (androidBridge && settings?.saveToDownloadsName) {
      try {
        const sid = androidBridge.openExportSession(
          settings.saveToDownloadsName,
          'video/mp4'
        );
        if (sid) {
          nativeSessionId = sid;
          this.activeAndroidSessionId = sid;
        }
      } catch {
        nativeSessionId = null;
      }
    }

    const PAGE_SIZE = nativeSessionId ? 1024 * 1024 : 4 * 1024 * 1024;
    const pages: Uint8Array[] = [];
    let maxFileSize = 0;

    const muxerTarget = new StreamTarget({
      chunked: true,
      chunkSize: PAGE_SIZE,
      onData: (data, position) => {
        if (nativeSessionId) {
          writeBytesToNativeSessionAt(nativeSessionId, data, position);
          if (position + data.byteLength > maxFileSize) {
            maxFileSize = position + data.byteLength;
          }
          return;
        }
        let remaining = data.byteLength;
        let srcOffset = 0;
        let dstPos = position;
        while (remaining > 0) {
          const pageIdx = Math.floor(dstPos / PAGE_SIZE);
          const pageOffset = dstPos % PAGE_SIZE;
          while (pages.length <= pageIdx) {
            pages.push(new Uint8Array(PAGE_SIZE));
          }
          const copyLen = Math.min(remaining, PAGE_SIZE - pageOffset);
          pages[pageIdx].set(
            data.subarray(srcOffset, srcOffset + copyLen),
            pageOffset
          );
          srcOffset += copyLen;
          dstPos += copyLen;
          remaining -= copyLen;
        }
        if (position + data.byteLength > maxFileSize) {
          maxFileSize = position + data.byteLength;
        }
      },
    });
    const hasMuxedAudio = Boolean(supportedAudioConfig);
    const muxer = new Muxer({
      target: muxerTarget,
      video: {
        codec: 'avc',
        width,
        height,
        frameRate: fps,
      },
      ...(hasMuxedAudio && supportedAudioConfig
        ? {
            audio: {
              codec: 'aac',
              numberOfChannels: supportedAudioConfig.numberOfChannels || 2,
              sampleRate: supportedAudioConfig.sampleRate || 44100,
            },
          }
        : {}),
      fastStart: false,
      firstTimestampBehavior: 'offset',
    });

    let encodedVideoChunks = 0;
    let videoEncoderError: Error | null = null;

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        encodedVideoChunks++;
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        videoEncoderError =
          e instanceof Error ? e : new Error(String(e || 'VideoEncoder error'));
      },
    });

    videoEncoder.configure(encoderConfig);

    let dequeueWaiter: (() => void) | null = null;
    videoEncoder.ondequeue = () => {
      if (dequeueWaiter) {
        const w = dequeueWaiter;
        dequeueWaiter = null;
        w();
      }
    };

    const sortedTracks = this.buildSortedTracks(project);
    const yieldChannel =
      typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
    let yieldPendingResolve: (() => void) | null = null;
    if (yieldChannel) {
      yieldChannel.port1.onmessage = () => {
        const r = yieldPendingResolve;
        yieldPendingResolve = null;
        if (r) r();
      };
    }
    const yieldToMain = () =>
      yieldChannel
        ? new Promise<void>((resolve) => {
            yieldPendingResolve = resolve;
            yieldChannel.port2.postMessage(null);
          })
        : new Promise<void>((resolve) => setTimeout(resolve, 0));
    const frameDurationMicros = 1_000_000 / fps;
    const roundedFrameDurationMicros = Math.round(frameDurationMicros);
    const keyFrameInterval = Math.max(1, Math.round(fps * 2));
    const startTime = performance.now();
    let lastYieldTime = startTime;
    let lastProgressTime = 0;
    let lastCanvasSignature = '';

    const maxEncodeQueue = IS_MOBILE_DEVICE ? 12 : 64;

    try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isCancelled) {
        throw new Error('Export cancelled by user');
      }

      if (videoEncoderError || videoEncoder.state === 'closed') {
        throw (
          videoEncoderError ||
          new Error('VideoEncoder closed unexpectedly during rendering')
        );
      }

      const currentTime = frameIndex / fps;
      const frameTimestampMicros = Math.round(frameIndex * frameDurationMicros);

      // Event-driven encoder backpressure so we wake up immediately when hardware encoder frees a slot
      let waitCycles = 0;
      while (videoEncoder.encodeQueueSize > maxEncodeQueue && waitCycles < 1000) {
        if (this.isCancelled || videoEncoderError || (videoEncoder.state as string) === 'closed') {
          break;
        }
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(t);
            resolve();
          };
          const t = setTimeout(() => {
            if (dequeueWaiter === done) dequeueWaiter = null;
            resolve();
          }, 15);
          dequeueWaiter = done;
        });
        waitCycles++;
      }

      if (this.isCancelled) {
        throw new Error('Export cancelled by user');
      }

      if (videoEncoder.encodeQueueSize > maxEncodeQueue) {
        throw new Error('VideoEncoder stalled during rendering');
      }

      if (videoEncoderError || (videoEncoder.state as string) === 'closed') {
        throw (
          videoEncoderError ||
          new Error('VideoEncoder closed unexpectedly during rendering')
        );
      }

      // Check for single-clip direct VideoFrame zero-copy passthrough or static canvas reuse
      let activeVisualClip: VideoClip | null = null;
      let activeClipCount = 0;
      let hasActiveText = false;
      for (let tIdx = 0; tIdx < sortedTracks.length; tIdx++) {
        if (sortedTracks[tIdx].type === 'audio') continue;
        const clips = sortedTracks[tIdx].clips;
        for (let cIdx = 0; cIdx < clips.length; cIdx++) {
          const c = clips[cIdx];
          if (c.type === 'audio') continue;
          if (c.startTime > currentTime) break;
          if (currentTime < c.startTime + c.duration) {
            activeClipCount++;
            if (c.type === 'text' || c.type === 'subtitle') {
              hasActiveText = true;
            } else if (activeClipCount === 1 && (c.type === 'video' || c.type === 'image')) {
              activeVisualClip = c as VideoClip;
            }
          }
        }
      }

      let encodedDirect = false;
      if (
        activeClipCount === 1 &&
        activeVisualClip &&
        activeVisualClip.type === 'video' &&
        !prepared.proceduralIds.has(activeVisualClip.id) &&
        isTimeStaticVideoClip(activeVisualClip)
      ) {
        const isPlain = isPlainIdentityVideoClip(activeVisualClip);
        const decoder = prepared.decoders.get(activeVisualClip.id);
        if (decoder && !decoder.hasError()) {
          const mediaTime = computeClipMediaTime(activeVisualClip, currentTime);
          const srcFrame = await decoder.getFrameAtTime(mediaTime);
          if (srcFrame) {
            const srcRotation = decoder.getNeedsManualRotation(srcFrame);
            const isSdr8BitFormat =
              srcFrame.format === 'I420' ||
              srcFrame.format === 'I420A' ||
              srcFrame.format === 'NV12' ||
              srcFrame.format === 'RGBA' ||
              srcFrame.format === 'RGBX' ||
              srcFrame.format === 'BGRA' ||
              srcFrame.format === 'BGRX';
            if (
              isPlain &&
              isSdr8BitFormat &&
              srcRotation === 0 &&
              srcFrame.displayWidth === width &&
              srcFrame.displayHeight === height
            ) {
              try {
                const directFrame = new VideoFrame(srcFrame, {
                  timestamp: frameTimestampMicros,
                  duration: roundedFrameDurationMicros,
                });
                videoEncoder.encode(directFrame, {
                  keyFrame: frameIndex % keyFrameInterval === 0,
                });
                directFrame.close();
                lastCanvasSignature = '';
                encodedDirect = true;
              } catch {
                encodedDirect = false;
              }
            } else {
              const glCanvas = !isPlain ? renderer.getWebGLCanvas() : null;
              const encodeSource = glCanvas || canvas;
              const sig = `vf:${activeVisualClip.id}:${srcFrame.timestamp}`;
              if (sig === lastCanvasSignature) {
                const reusedFrame = new VideoFrame(encodeSource, {
                  timestamp: frameTimestampMicros,
                  duration: roundedFrameDurationMicros,
                });
                videoEncoder.encode(reusedFrame, {
                  keyFrame: frameIndex % keyFrameInterval === 0,
                });
                reusedFrame.close();
                encodedDirect = true;
              } else {
                const useSkip2D = Boolean(glCanvas);
                if (
                  useSkip2D ||
                  !clipCoversCanvasOpaquely(
                    activeVisualClip,
                    srcFrame.displayWidth,
                    srcFrame.displayHeight,
                    srcRotation,
                    width,
                    height
                  )
                ) {
                  renderer.clear(project.settings.background, width, height, useSkip2D);
                }
                renderer.renderVideoClip(
                  activeVisualClip,
                  srcFrame,
                  width,
                  height,
                  currentTime,
                  null,
                  srcRotation,
                  useSkip2D
                );
                const finalSource = useSkip2D
                  ? renderer.getWebGLCanvas() || canvas
                  : canvas;
                lastCanvasSignature = sig;
                const canvasFrame = new VideoFrame(finalSource, {
                  timestamp: frameTimestampMicros,
                  duration: roundedFrameDurationMicros,
                });
                videoEncoder.encode(canvasFrame, {
                  keyFrame: frameIndex % keyFrameInterval === 0,
                });
                canvasFrame.close();
                encodedDirect = true;
              }
            }
          }
        }
      } else if (
        activeClipCount === 1 &&
        activeVisualClip &&
        (activeVisualClip.type === 'image' || activeVisualClip.isFrozen) &&
        !prepared.proceduralIds.has(activeVisualClip.id) &&
        isPlainIdentityVideoClip(activeVisualClip)
      ) {
        const sig = `static:${activeVisualClip.id}`;
        if (sig === lastCanvasSignature) {
          const reusedFrame = new VideoFrame(canvas, {
            timestamp: frameTimestampMicros,
            duration: roundedFrameDurationMicros,
          });
          videoEncoder.encode(reusedFrame, {
            keyFrame: frameIndex % keyFrameInterval === 0,
          });
          reusedFrame.close();
          encodedDirect = true;
        } else {
          await this.renderProjectFrameAtTime(
            project,
            renderer,
            width,
            height,
            currentTime,
            prepared,
            sortedTracks
          );
          lastCanvasSignature = sig;
          const canvasFrame = new VideoFrame(canvas, {
            timestamp: frameTimestampMicros,
            duration: roundedFrameDurationMicros,
          });
          videoEncoder.encode(canvasFrame, {
            keyFrame: frameIndex % keyFrameInterval === 0,
          });
          canvasFrame.close();
          encodedDirect = true;
        }
      }

      if (!encodedDirect) {
        // Check if composite frame (e.g. 24fps video + static text overlay exported at 30fps) is identical to previous frame
        let compositeSig = '';
        let canCheckCompositeReuse = activeClipCount > 1;
        if (canCheckCompositeReuse) {
          const sigParts: string[] = [];
          for (let tIdx = 0; tIdx < sortedTracks.length && canCheckCompositeReuse; tIdx++) {
            if (sortedTracks[tIdx].type === 'audio') continue;
            const clips = sortedTracks[tIdx].clips;
            for (let cIdx = 0; cIdx < clips.length; cIdx++) {
              const c = clips[cIdx];
              if (c.type === 'audio') continue;
              if (c.startTime > currentTime) break;
              if (currentTime < c.startTime + c.duration) {
                if ('keyframes' in c && c.keyframes && c.keyframes.length > 0) {
                  canCheckCompositeReuse = false;
                  break;
                }
                if (c.type === 'text' || c.type === 'subtitle') {
                  const tc = c as TextClip;
                  const loc = Math.max(0, currentTime - tc.startTime);
                  const anim = tc.animations;
                  const hasClipAnim = Boolean(
                    anim && (anim.inType !== 'none' || anim.outType !== 'none' || anim.comboType !== 'none')
                  );
                  const hasTextIn = Boolean(tc.textConfig.animIn && tc.textConfig.animIn !== 'none' && loc < Math.max(0.1, tc.textConfig.animInDuration || 0.8));
                  const hasTextOut = Boolean(tc.textConfig.animOut && tc.textConfig.animOut !== 'none' && loc > Math.max(0, tc.duration - Math.max(0.1, tc.textConfig.animOutDuration || 0.6)));
                  const hasLoop = Boolean(tc.textConfig.animLoop && tc.textConfig.animLoop !== 'none');
                  if (hasClipAnim || hasTextIn || hasTextOut || hasLoop) {
                    canCheckCompositeReuse = false;
                    break;
                  }
                  sigParts.push(`t:${tc.id}`);
                } else if (c.type === 'image') {
                  const vc = c as VideoClip;
                  if (!isTimeStaticVideoClip(vc)) {
                    canCheckCompositeReuse = false;
                    break;
                  }
                  sigParts.push(`i:${vc.id}`);
                } else if (c.type === 'video') {
                  const vc = c as VideoClip;
                  const dec = prepared.decoders.get(vc.id);
                  if (!dec || dec.hasError() || !isTimeStaticVideoClip(vc) || prepared.proceduralIds.has(vc.id)) {
                    canCheckCompositeReuse = false;
                    break;
                  }
                  const mTime = computeClipMediaTime(vc, currentTime);
                  const vf = await dec.getFrameAtTime(mTime);
                  if (!vf) {
                    canCheckCompositeReuse = false;
                    break;
                  }
                  sigParts.push(`v:${vc.id}:${vf.timestamp}`);
                }
              }
            }
          }
          if (canCheckCompositeReuse && sigParts.length > 0) {
            compositeSig = `comp:${sigParts.join(';')}`;
          }
        }

        const glCanvas = !hasActiveText ? renderer.getWebGLCanvas() : null;
        const skip2D = Boolean(glCanvas);
        const targetSource = glCanvas || canvas;

        if (compositeSig && compositeSig === lastCanvasSignature) {
          const reusedComposite = new VideoFrame(targetSource, {
            timestamp: frameTimestampMicros,
            duration: roundedFrameDurationMicros,
          });
          videoEncoder.encode(reusedComposite, {
            keyFrame: frameIndex % keyFrameInterval === 0,
          });
          reusedComposite.close();
        } else {
          await this.renderProjectFrameAtTime(
            project,
            renderer,
            width,
            height,
            currentTime,
            prepared,
            sortedTracks,
            skip2D
          );
          lastCanvasSignature = compositeSig;

          const videoFrame = new VideoFrame(targetSource, {
            timestamp: frameTimestampMicros,
            duration: roundedFrameDurationMicros,
          });

          videoEncoder.encode(videoFrame, {
            keyFrame: frameIndex % keyFrameInterval === 0,
          });
          videoFrame.close();
        }
      }

      const now = performance.now();
      if (
        frameIndex === 0 ||
        frameIndex === totalFrames - 1 ||
        now - lastProgressTime >= 120
      ) {
        lastProgressTime = now;
        const percentage = Math.min(
          98,
          Math.round(((frameIndex + 1) / totalFrames) * 95)
        );
        const elapsedSeconds = (now - startTime) / 1000;
        let timeRemainingSeconds = -1;
        if (elapsedSeconds >= 0.35 && frameIndex >= 4) {
          const rate = (frameIndex + 1) / elapsedSeconds;
          const remainingFrames = totalFrames - (frameIndex + 1);
          timeRemainingSeconds = Math.max(0, Math.round(remainingFrames / rate));
        }

        onProgress({
          percentage,
          currentFrame: frameIndex + 1,
          totalFrames,
          timeRemainingSeconds,
          stage: 'rendering',
        });
      }

      // Yield to browser event loop so UI stays responsive without excessive scheduling overhead
      if (now - lastYieldTime >= (IS_MOBILE_DEVICE ? 60 : 120)) {
        await yieldToMain();
        lastYieldTime = performance.now();
      }
    }

      await videoEncoder.flush();
    } finally {
      if (yieldChannel) {
        try {
          yieldChannel.port1.close();
          yieldChannel.port2.close();
        } catch {}
      }
      try {
        if (videoEncoder.state !== 'closed') {
          videoEncoder.close();
        }
      } catch {}
    }

    if (videoEncoderError || encodedVideoChunks === 0) {
      throw (
        videoEncoderError ||
        new Error('VideoEncoder produced 0 encoded video chunks')
      );
    }

    // Await parallel audio mixdown (or use sequential mobile mixdown) & encode AAC audio if supported
    if (supportedAudioConfig && !mixedAudioBuffer) {
      onProgress({
        percentage: 96,
        currentFrame: totalFrames,
        totalFrames,
        timeRemainingSeconds: -1,
        stage: 'audio',
        stageLabel: 'Finalizando mezcla de audio...',
      });
      mixedAudioBuffer = await audioMixPromise;
    }
    prepared.buffers.clear();

    if (supportedAudioConfig && mixedAudioBuffer) {
      try {
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            muxer.addAudioChunk(chunk, meta);
          },
          error: (e) => {
            console.warn('AudioEncoder warning:', e);
          },
        });

        audioEncoder.configure(supportedAudioConfig);

        const sampleRate = mixedAudioBuffer.sampleRate;
        const totalSamples = mixedAudioBuffer.length;
        const left = mixedAudioBuffer.getChannelData(0);
        const right =
          mixedAudioBuffer.numberOfChannels > 1
            ? mixedAudioBuffer.getChannelData(1)
            : left;

        const chunkFrames = 1024 * 8;
        for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
          const framesInChunk = Math.min(chunkFrames, totalSamples - offset);
          const planar = new Float32Array(framesInChunk * 2);
          planar.set(left.subarray(offset, offset + framesInChunk), 0);
          planar.set(
            right.subarray(offset, offset + framesInChunk),
            framesInChunk
          );

          const timestampMicros = Math.round((offset / sampleRate) * 1_000_000);
          const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: framesInChunk,
            numberOfChannels: 2,
            timestamp: timestampMicros,
            data: planar,
          });
          audioEncoder.encode(audioData);
          audioData.close();
        }

        await audioEncoder.flush();
        audioEncoder.close();
      } catch (audioErr) {
        console.warn('Audio muxing skipped:', audioErr);
      }
    }

    muxer.finalize();

    if (nativeSessionId && androidBridge) {
      const sid = nativeSessionId;
      this.activeAndroidSessionId = null;
      const rawRes = androidBridge.finishExportSession(sid);
      const parsed = parseNativeExportResult(rawRes);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'No se pudo guardar el video en el celular');
      }
      settings?.onAndroidNativeSaved?.({
        uri: parsed.uri || '',
        displayPath: parsed.displayPath || parsed.filename || settings.saveToDownloadsName || 'video.mp4',
        filename: parsed.filename || settings.saveToDownloadsName || 'video.mp4',
        mimeType: 'video/mp4',
      });
      onProgress({
        percentage: 100,
        currentFrame: totalFrames,
        totalFrames,
        timeRemainingSeconds: 0,
      });
      return new Blob([], { type: 'video/mp4' });
    }

    const blobParts: BlobPart[] = [];
    let remainingBytes = maxFileSize;
    for (let i = 0; i < pages.length && remainingBytes > 0; i++) {
      const len = Math.min(remainingBytes, PAGE_SIZE);
      const part = len === PAGE_SIZE ? pages[i] : pages[i].subarray(0, len);
      blobParts.push(part as unknown as BlobPart);
      remainingBytes -= len;
    }
    const outBlob = new Blob(blobParts, { type: 'video/mp4' });
    pages.length = 0;

    onProgress({
      percentage: 100,
      currentFrame: totalFrames,
      totalFrames,
      timeRemainingSeconds: 0,
    });

    return outBlob;
  }

  // Frame-accurate async MediaRecorder fallback
  private async exportWithMediaRecorder(
    project: Project,
    renderer: WebGLRenderer,
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    fps: number,
    totalFrames: number,
    bitrateMbps: number,
    prepared: PreparedExportMedia,
    onProgress: (progress: RenderProgress) => void
  ): Promise<Blob> {
    // Prefer manual frame capture (0) when requestFrame() is available so slow mobile frames
    // don't get auto-captured at irregular wall-clock intervals
    const probeStream = canvas.captureStream(0);
    const probeTrack = probeStream.getVideoTracks()[0] as
      | (MediaStreamTrack & { requestFrame?: () => void })
      | undefined;
    const supportsRequestFrame =
      Boolean(probeTrack && typeof probeTrack.requestFrame === 'function');
    if (!supportsRequestFrame) {
      probeStream.getTracks().forEach((t) => t.stop());
    }
    const stream = supportsRequestFrame ? probeStream : canvas.captureStream(fps);
    const chunks: Blob[] = [];

    const candidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const supportedMime = candidates.find((t) => MediaRecorder.isTypeSupported(t));
    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: Math.round(bitrateMbps * 1_000_000),
      ...(supportedMime ? { mimeType: supportedMime } : {}),
    };
    const recorder = new MediaRecorder(stream, recorderOptions);
    const resolvedMimeType = supportedMime || recorder.mimeType || 'video/webm';

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const out = new Blob(chunks, { type: resolvedMimeType });
        if (out.size === 0) {
          reject(new Error('MediaRecorder produced an empty video'));
        } else {
          resolve(out);
        }
      };
      recorder.onerror = (ev) => {
        const errObj = (ev as Event & { error?: unknown }).error;
        reject(
          errObj instanceof Error
            ? errObj
            : new Error('MediaRecorder error during rendering')
        );
      };
    });

    recorder.start(250);
    const startTime = performance.now();
    const frameIntervalMs = 1000 / fps;

    try {
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        if (this.isCancelled) {
          recorder.stop();
          throw new Error('Export cancelled by user');
        }

        const tickStart = performance.now();
        const currentTime = frameIndex / fps;

        await this.renderProjectFrameAtTime(
          project,
          renderer,
          width,
          height,
          currentTime,
          prepared
        );

        const videoTrack = stream.getVideoTracks()[0] as MediaStreamTrack & {
          requestFrame?: () => void;
        };
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try {
            videoTrack.requestFrame();
          } catch {}
        }

        const elapsedSeconds = Math.max(
          0.05,
          (performance.now() - startTime) / 1000
        );
        const rate = (frameIndex + 1) / elapsedSeconds;
        const remainingFrames = totalFrames - (frameIndex + 1);

        onProgress({
          percentage: Math.round(((frameIndex + 1) / totalFrames) * 100),
          currentFrame: frameIndex + 1,
          totalFrames,
          timeRemainingSeconds: Math.max(0, Math.round(remainingFrames / rate)),
        });

        const spentMs = performance.now() - tickStart;
        if (supportsRequestFrame) {
          if (frameIndex % 4 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        } else {
          const waitMs = Math.max(4, Math.round(frameIntervalMs - spentMs));
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }

      recorder.stop();
      return await stopPromise;
    } finally {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  }
}
