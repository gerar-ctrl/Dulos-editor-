// ============================================================================
// VideoCanvas - WebGL Viewport, Screen Resize Bar, Multi-Track Video/Audio/Image
// ============================================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import { WebGLRenderer } from '../../core/webgl/WebGLRenderer';
import { globalAudioEngine } from '../../core/audio/AudioEngine';
import { evaluateTrackVolumeAtTime } from '../../core/audio/trackVolumeEnvelope';
import { ProjectStorage } from '../../core/storage/projectStorage';
import { TransformGizmo, TransformActionBar } from './TransformGizmo';
import { InlineTextEditorOverlay } from './InlineTextEditorOverlay';
import {
  ScreenCropOverlay,
  ScreenCropActionBar,
  ScreenCropRect,
} from './ScreenCropOverlay';
import { interpolateClipTransform } from '../../core/keyframes/interpolateKeyframes';
import {
  VideoClip,
  AudioClip,
  TextClip,
  AspectRatio,
  TransformProperties,
} from '../../types/editor';
import { ZoomIn, ZoomOut, Upload, Hand, Crop } from 'lucide-react';

const MIN_PLAYBACK_SPEED = 0.02;

function applySafePlaybackRate(el: HTMLMediaElement, rate: number) {
  const target = Math.max(MIN_PLAYBACK_SPEED, Math.min(16, rate));
  if (Math.abs(el.playbackRate - target) <= 0.002) return;
  try {
    el.playbackRate = target;
  } catch {
    try {
      el.playbackRate = Math.max(0.0625, Math.min(16, target));
    } catch {
      // ignore unsupported rate
    }
  }
}

function applyPreservesPitch(el: HTMLMediaElement, preserve: boolean) {
  const media = el as HTMLMediaElement & {
    preservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
    mozPreservesPitch?: boolean;
  };
  if ('preservesPitch' in media && media.preservesPitch !== preserve) {
    media.preservesPitch = preserve;
  }
  if ('webkitPreservesPitch' in media && media.webkitPreservesPitch !== preserve) {
    media.webkitPreservesPitch = preserve;
  }
  if ('mozPreservesPitch' in media && media.mozPreservesPitch !== preserve) {
    media.mozPreservesPitch = preserve;
  }
}

// Evaluate Bezier/piecewise speed curve multiplier at normalized clip progress [0..1]
function getEffectiveSpeed(clip: VideoClip | AudioClip, localTime: number): number {
  const baseSpeed = Math.max(MIN_PLAYBACK_SPEED, Math.min(16, clip.speed || 1.0));
  const pts = clip.speedCurve?.points;
  if (!pts || pts.length < 2) return baseSpeed;

  const progress = Math.max(0, Math.min(1, localTime / Math.max(0.1, clip.duration)));
  for (let i = 0; i < pts.length - 1; i++) {
    if (progress >= pts[i].x && progress <= pts[i + 1].x) {
      const span = Math.max(0.001, pts[i + 1].x - pts[i].x);
      const f = (progress - pts[i].x) / span;
      const curveMult = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
      return Math.max(MIN_PLAYBACK_SPEED, Math.min(16, baseSpeed * curveMult));
    }
  }
  return baseSpeed;
}

// Draw a rich 60fps procedural cinema scene for sample/demo clips
function drawProceduralDemoFrame(
  canvas: HTMLCanvasElement,
  time: number,
  clipName: string,
  sceneVariant = 0
) {
  const prevStamp = (canvas as any).__renderStamp;
  const prevVariant = (canvas as any).__sceneVariant;
  const prevName = (canvas as any).__clipName;
  if (
    typeof prevStamp === 'number' &&
    Math.abs(prevStamp - time) < 0.0005 &&
    prevVariant === sceneVariant &&
    prevName === clipName
  ) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  (canvas as any).__renderStamp = time;
  (canvas as any).__sceneVariant = sceneVariant;
  (canvas as any).__clipName = clipName;
  const w = canvas.width;
  const h = canvas.height;

  const isSecondScene =
    sceneVariant % 2 === 1 ||
    clipName.includes('#2') ||
    clipName.includes('2') ||
    clipName.includes('Copia') ||
    clipName.includes('Parte 2');

  // Rich multi-stop sky gradient
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

  // Glowing Sun / Moon orb
  const sunX = w * (isSecondScene ? 0.68 : 0.35) + Math.sin(time * 1.4) * (w * 0.08);
  const sunY = h * 0.34 + Math.cos(time * 1.1) * (h * 0.04);
  const sunR = Math.min(w, h) * 0.18;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.6);
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

  // Animated 3D Synthwave Perspective Grid on lower half
  const horizonY = h * 0.56;
  ctx.fillStyle = isSecondScene ? 'rgba(6, 20, 35, 0.86)' : 'rgba(12, 10, 29, 0.86)';
  ctx.fillRect(0, horizonY, w, h - horizonY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, w, h - horizonY);
  ctx.clip();

  ctx.strokeStyle = isSecondScene ? 'rgba(56, 189, 248, 0.45)' : 'rgba(236, 72, 153, 0.45)';
  ctx.lineWidth = 2.5;

  // Perspective vertical lines
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * (w * 0.04), horizonY);
    ctx.lineTo(w * 0.5 + i * (w * 0.24), h);
    ctx.stroke();
  }

  // Moving horizontal grid lines
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

  // Colorful geometric elements (Red, Green, Blue, Yellow so HSL & LUTs pop)
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

  // Title & live timecode badge
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
  ctx.fillText(`ESCENA ${sceneVariant + 1} · ${time.toFixed(2)}s`, w / 2, h * 0.83);
}

export const VideoCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hiddenMediaContainerRef = useRef<HTMLDivElement | null>(null);
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  const videoElementsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsMap = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioElementsMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const proceduralCanvasesMap = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const frozenCanvasesMap = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const frozenCapturingRef = useRef<Set<string>>(new Set());
  const lastSeekTargetMap = useRef<Map<string, number>>(new Map());
  const lastSeekTimeMsMap = useRef<Map<string, number>>(new Map());
  const playPendingRef = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());
  const playStartMsRef = useRef<WeakMap<HTMLMediaElement, number>>(new WeakMap());
  const mediaClockRef = useRef<{ clipId: string; rawTime: number; wallMs: number }>({
    clipId: '',
    rawTime: -1,
    wallMs: 0,
  });
  const bufferingStartRef = useRef<{ clipId: string; sinceMs: number }>({
    clipId: '',
    sinceMs: 0,
  });
  const internalTimeRef = useRef<number>(useEditorStore.getState().currentTime);
  const lastStoreTimeRef = useRef<number>(useEditorStore.getState().currentTime);
  const lastUiSyncMsRef = useRef<number>(0);

  const safePlayMedia = (el: HTMLMediaElement) => {
    if (!el.paused || playPendingRef.current.has(el)) return;
    playPendingRef.current.add(el);
    playStartMsRef.current.set(el, performance.now());
    el.play()
      .then(() => {
        playPendingRef.current.delete(el);
      })
      .catch((err) => {
        playPendingRef.current.delete(el);
        if (err?.name === 'NotAllowedError') {
          el.muted = true;
          el.play().catch(() => {});
        }
      });
  };

  const {
    project,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    registerMediaElement,
    mediaElements,
    selectedClipId,
    activeGizmoClipId,
    isSelectedClipVisibleAtPlayhead,
    gizmoTime,
    selectClip,
    updateClip,
    addClip,
    setAspectRatio,
    isScreenCropMode,
    setScreenCropMode,
    applyScreenCrop,
    inlineEditingTextClipId,
    setInlineEditingTextClipId,
    eyedropperRequest,
    completeEyedropper,
    cancelEyedropper,
    canvasZoom,
    setCanvasZoom,
    showToast,
  } = useEditorStore(
    useShallow((s) => {
      let targetClip: VideoClip | TextClip | null = null;
      if (s.selectedClipId) {
        for (const track of s.project.tracks) {
          const found = track.clips.find((c) => c.id === s.selectedClipId);
          if (found && found.type !== 'audio') {
            targetClip = found as VideoClip | TextClip;
            break;
          }
        }
      } else if (s.project.settings.aspectRatio === 'free' && !s.isPlaying) {
        const visualClips = s.project.tracks
          .filter((tr) => tr.isVisible && tr.type !== 'audio')
          .flatMap((tr) => tr.clips)
          .filter(
            (c): c is VideoClip | TextClip =>
              c.type === 'video' ||
              c.type === 'image' ||
              c.type === 'text' ||
              c.type === 'subtitle'
          );
        const atPlayhead = visualClips.filter(
          (c) =>
            s.currentTime >= c.startTime - 0.05 &&
            s.currentTime <= c.startTime + c.duration + 0.05
        );
        targetClip =
          atPlayhead.length > 0
            ? atPlayhead[atPlayhead.length - 1]
            : visualClips.length > 0
              ? visualClips[visualClips.length - 1]
              : null;
      }

      const visible = Boolean(
        !s.isPlaying &&
          targetClip &&
          s.currentTime >= targetClip.startTime - 0.05 &&
          s.currentTime <= targetClip.startTime + targetClip.duration + 0.05
      );
      const hasKfs = Boolean(
        visible && targetClip && 'keyframes' in targetClip && targetClip.keyframes?.length
      );

      return {
        project: s.project,
        isPlaying: s.isPlaying,
        setCurrentTime: s.setCurrentTime,
        setIsPlaying: s.setIsPlaying,
        registerMediaElement: s.registerMediaElement,
        mediaElements: s.mediaElements,
        selectedClipId: s.selectedClipId,
        activeGizmoClipId: targetClip ? targetClip.id : null,
        isSelectedClipVisibleAtPlayhead: visible,
        gizmoTime: hasKfs ? s.currentTime : 0,
        selectClip: s.selectClip,
        updateClip: s.updateClip,
        addClip: s.addClip,
        setAspectRatio: s.setAspectRatio,
        isScreenCropMode: s.isScreenCropMode,
        setScreenCropMode: s.setScreenCropMode,
        applyScreenCrop: s.applyScreenCrop,
        inlineEditingTextClipId: s.inlineEditingTextClipId,
        setInlineEditingTextClipId: s.setInlineEditingTextClipId,
        eyedropperRequest: s.eyedropperRequest,
        completeEyedropper: s.completeEyedropper,
        cancelEyedropper: s.cancelEyedropper,
        canvasZoom: s.canvasZoom,
        setCanvasZoom: s.setCanvasZoom,
        showToast: s.showToast,
      };
    })
  );

  const [viewportBounds, setViewportBounds] = useState({
    width: 360,
    height: 320,
  });
  const [eyedropperSample, setEyedropperSample] = useState<{
    x: number;
    y: number;
    hex: string;
  } | null>(null);

  const eyedropperSampleRef = useRef<{ x: number; y: number; hex: string } | null>(null);
  const eyedropperCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sampleCanvasPixelAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const relX = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
    const px = Math.max(
      0,
      Math.min(canvas.width - 1, Math.floor((relX / rect.width) * canvas.width))
    );
    const py = Math.max(
      0,
      Math.min(canvas.height - 1, Math.floor((relY / rect.height) * canvas.height))
    );
    const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d');
      if (ctx) {
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        const hex = `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
        return { x: relX, y: relY, hex };
      }
    } catch {
      // Fallback below via 1x1 offscreen canvas
    }
    try {
      if (!eyedropperCanvasRef.current) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        eyedropperCanvasRef.current = c;
      }
      const octx = eyedropperCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!octx) return null;
      octx.clearRect(0, 0, 1, 1);
      octx.drawImage(canvas, px, py, 1, 1, 0, 0, 1, 1);
      const pixel = octx.getImageData(0, 0, 1, 1).data;
      const hex = `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
      return { x: relX, y: relY, hex };
    } catch {
      return null;
    }
  };
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [screenCropRect, setScreenCropRect] = useState<ScreenCropRect>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  useEffect(() => {
    if (isScreenCropMode) {
      setScreenCropRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    }
  }, [isScreenCropMode]);

  // Measure available stage area via ResizeObserver (leaves room for gizmo handles and action bar)
  useEffect(() => {
    const el = stageRef.current || viewportRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportBounds({
          width: Math.max(120, rect.width - 16),
          height: Math.max(80, rect.height - 20),
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Calculate internal WebGL resolution from project aspect ratio
  // Cap preview resolution on mobile devices so WebGL + 2D compositing runs at smooth 60fps
  const isMobileViewport = viewportBounds.width <= 540 ||
    (typeof window !== 'undefined' &&
      (window.innerWidth <= 768 || window.matchMedia?.('(pointer: coarse)')?.matches));

  const logicalCanvasDims = useMemo(() => {
    const ar = project.settings.aspectRatio;
    if (ar === '16:9') return { width: 1920, height: 1080, ratio: 16 / 9 };
    if (ar === '1:1') return { width: 1080, height: 1080, ratio: 1 };
    if (ar === '4:5') return { width: 1080, height: 1350, ratio: 4 / 5 };
    if (ar === '21:9') return { width: 2560, height: 1080, ratio: 21 / 9 };
    if (ar === '4:3') return { width: 1440, height: 1080, ratio: 4 / 3 };
    if (ar === 'free' || ar === 'auto') {
      const cw = Math.max(120, project.settings.customWidth || 1080);
      const ch = Math.max(120, project.settings.customHeight || 1920);
      return { width: cw, height: ch, ratio: cw / ch };
    }
    return { width: 1080, height: 1920, ratio: 9 / 16 };
  }, [
    project.settings.aspectRatio,
    project.settings.customWidth,
    project.settings.customHeight,
  ]);

  const canvasResolution = useMemo(() => {
    const base = logicalCanvasDims;
    const maxPreviewDim = isMobileViewport ? 640 : 854;
    const longest = Math.max(base.width, base.height);
    if (longest > maxPreviewDim) {
      const scale = maxPreviewDim / longest;
      return {
        width: Math.max(64, Math.round((base.width * scale) / 2) * 2),
        height: Math.max(64, Math.round((base.height * scale) / 2) * 2),
        ratio: base.ratio,
      };
    }
    return base;
  }, [logicalCanvasDims, isMobileViewport]);

  // Compute exact on-screen pixel dimensions of the preview frame
  const frameDimensions = useMemo(() => {
    const availW = viewportBounds.width;
    const availH = viewportBounds.height;
    const targetRatio = canvasResolution.ratio;

    let fitW = availH * targetRatio;
    let fitH = availH;

    if (fitW > availW) {
      fitW = availW;
      fitH = availW / targetRatio;
    }

    return {
      width: Math.max(80, Math.round(fitW * canvasZoom)),
      height: Math.max(80, Math.round(fitH * canvasZoom)),
    };
  }, [viewportBounds, canvasResolution.ratio, canvasZoom]);

  // Initialize WebGL Renderer (shaders compile lazily only when a clip uses WebGL effects)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current = new WebGLRenderer(canvas);
    } catch (e) {
      console.error('WebGL init error:', e);
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Helper to attach media elements to hidden DOM container so hardware decoders stay active
  const attachToHiddenDom = (el: HTMLElement) => {
    const container = hiddenMediaContainerRef.current;
    if (container && el.parentElement !== container) {
      container.appendChild(el);
    }
  };

  // Immediately release hardware video decoder slot (critical on Android WebView & Electron)
  const releaseVideoElement = (v: HTMLVideoElement) => {
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
    } catch {}
    v.remove();
  };

  // Capture a single static frame for a frozen video clip and immediately free the temporary decoder
  const captureFrozenFrameCanvas = (vClip: VideoClip) => {
    if (!vClip.sourceUrl || frozenCapturingRef.current.has(vClip.id)) return;
    frozenCapturingRef.current.add(vClip.id);

    const tempVideo = document.createElement('video');
    if (
      vClip.sourceUrl.startsWith('http://') ||
      vClip.sourceUrl.startsWith('https://')
    ) {
      tempVideo.crossOrigin = 'anonymous';
    }
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.setAttribute('playsinline', 'true');
    tempVideo.setAttribute('webkit-playsinline', 'true');
    tempVideo.preload = 'auto';
    attachToHiddenDom(tempVideo);

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeoutId);
      frozenCapturingRef.current.delete(vClip.id);
      releaseVideoElement(tempVideo);
    };

    const drawAndFinish = () => {
      if (finished) return;
      if (tempVideo.videoWidth > 0 && tempVideo.videoHeight > 0 && tempVideo.readyState >= 2) {
        try {
          const maxDim = 1920;
          let w = tempVideo.videoWidth;
          let h = tempVideo.videoHeight;
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
            ctx.drawImage(tempVideo, 0, 0, w, h);
            (snapCanvas as unknown as { __renderStamp?: number }).__renderStamp =
              vClip.sourceStartTime || 0;
            frozenCanvasesMap.current.set(vClip.id, snapCanvas);
            registerMediaElement(vClip.id, snapCanvas);
          }
        } catch {}
      }
      cleanup();
    };

    const timeoutId = window.setTimeout(() => {
      drawAndFinish();
    }, 4500);

    tempVideo.addEventListener(
      'loadedmetadata',
      () => {
        if (finished) return;
        const dur = Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? tempVideo.duration : 0;
        const targetTime = Math.max(
          0,
          dur > 0 ? Math.min(vClip.sourceStartTime || 0, Math.max(0, dur - 0.02)) : vClip.sourceStartTime || 0
        );
        if (Math.abs(tempVideo.currentTime - targetTime) <= 0.02 && tempVideo.readyState >= 2) {
          drawAndFinish();
          return;
        }
        try {
          tempVideo.currentTime = targetTime;
        } catch {
          drawAndFinish();
        }
      },
      { once: true }
    );

    tempVideo.addEventListener(
      'seeked',
      () => {
        if (finished) return;
        if (tempVideo.readyState >= 2) {
          drawAndFinish();
        } else {
          tempVideo.addEventListener('loadeddata', drawAndFinish, { once: true });
        }
      },
      { once: true }
    );

    tempVideo.addEventListener('error', cleanup, { once: true });
    tempVideo.src = vClip.sourceUrl;
  };

  // Synchronize DOM Media Elements (Videos, Images, Audio tracks)
  useEffect(() => {
    const activeIds = new Set<string>();

    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        activeIds.add(clip.id);

        if (clip.type === 'video') {
          const vClip = clip as VideoClip;
          const isProcedural =
            !vClip.sourceUrl ||
            vClip.sourceUrl.startsWith('procedural://') ||
            clip.id.startsWith('sample_');

          if (isProcedural) {
            let pCanvas = proceduralCanvasesMap.current.get(clip.id);
            if (!pCanvas) {
              pCanvas = document.createElement('canvas');
              pCanvas.width = 450;
              pCanvas.height = 800;
              proceduralCanvasesMap.current.set(clip.id, pCanvas);
              registerMediaElement(clip.id, pCanvas);
            }
          } else if (vClip.isFrozen) {
            // Frozen clips use a static canvas snapshot so they NEVER consume a hardware video decoder!
            const staleVideo = videoElementsMap.current.get(clip.id);
            if (staleVideo) {
              releaseVideoElement(staleVideo);
              videoElementsMap.current.delete(clip.id);
              lastSeekTargetMap.current.delete(clip.id);
              lastSeekTimeMsMap.current.delete(clip.id);
            }
            if (!frozenCanvasesMap.current.has(clip.id)) {
              const storeEl = mediaElements.get(clip.id);
              if (
                storeEl instanceof HTMLCanvasElement &&
                storeEl.width > 0 &&
                storeEl.height > 0
              ) {
                frozenCanvasesMap.current.set(clip.id, storeEl);
              } else {
                captureFrozenFrameCanvas(vClip);
              }
            }
          } else {
            let video = videoElementsMap.current.get(clip.id);
            const storeEl = mediaElements.get(clip.id);

            if (
              storeEl instanceof HTMLVideoElement &&
              storeEl.src === vClip.sourceUrl
            ) {
              video = storeEl;
              videoElementsMap.current.set(clip.id, video);
              attachToHiddenDom(video);
            } else if (!video || video.src !== vClip.sourceUrl) {
              video = document.createElement('video');
              if (
                vClip.sourceUrl.startsWith('http://') ||
                vClip.sourceUrl.startsWith('https://')
              ) {
                video.crossOrigin = 'anonymous';
              }
              const nowTime = useEditorStore.getState().currentTime;
              const isNearPlayhead =
                nowTime >= vClip.startTime - 6 &&
                nowTime <= vClip.startTime + vClip.duration + 6;
              video.playsInline = true;
              video.setAttribute('playsinline', 'true');
              video.setAttribute('webkit-playsinline', 'true');
              video.preload = isNearPlayhead ? 'auto' : 'metadata';
              video.muted = track.isMuted || vClip.audio.isMuted;
              video.src = vClip.sourceUrl;
              attachToHiddenDom(video);
              videoElementsMap.current.set(clip.id, video);
              registerMediaElement(clip.id, video);

              const targetInitTime = Math.max(0.001, vClip.sourceStartTime || 0.001);
              video.addEventListener(
                'loadedmetadata',
                () => {
                  if (video && video.currentTime === 0) {
                    try {
                      video.currentTime = targetInitTime;
                    } catch {}
                  }
                },
                { once: true }
              );
            }
          }
        } else if (clip.type === 'image') {
          const imgClip = clip as VideoClip;
          let img = imageElementsMap.current.get(clip.id);
          const storeEl = mediaElements.get(clip.id);
          if (storeEl instanceof HTMLImageElement) {
            img = storeEl;
            imageElementsMap.current.set(clip.id, img);
          } else if (!img && imgClip.sourceUrl) {
            img = new Image();
            if (
              imgClip.sourceUrl.startsWith('http://') ||
              imgClip.sourceUrl.startsWith('https://')
            ) {
              img.crossOrigin = 'anonymous';
            }
            img.decoding = 'async';
            img.src = imgClip.sourceUrl;
            imageElementsMap.current.set(clip.id, img);
            registerMediaElement(clip.id, img);
          }
        } else if (clip.type === 'audio') {
          const aClip = clip as AudioClip;
          if (aClip.sourceUrl && !aClip.sourceUrl.startsWith('procedural://')) {
            let audioEl = audioElementsMap.current.get(clip.id);
            if (!audioEl || audioEl.src !== aClip.sourceUrl) {
              if (audioEl) {
                audioEl.pause();
                audioEl.remove();
              }
              const nowTime = useEditorStore.getState().currentTime;
              const isNearAudioPlayhead =
                nowTime >= aClip.startTime - 6 &&
                nowTime <= aClip.startTime + aClip.duration + 6;
              audioEl = new Audio(aClip.sourceUrl);
              audioEl.preload = isNearAudioPlayhead ? 'auto' : 'metadata';
              audioEl.setAttribute('playsinline', 'true');
              attachToHiddenDom(audioEl);
              audioElementsMap.current.set(clip.id, audioEl);
              registerMediaElement(clip.id, audioEl);

              const targetAudioInitTime = Math.max(0.001, aClip.sourceStartTime || 0.001);
              audioEl.addEventListener(
                'loadedmetadata',
                () => {
                  if (audioEl && audioEl.currentTime === 0) {
                    try {
                      audioEl.currentTime = targetAudioInitTime;
                    } catch {}
                  }
                },
                { once: true }
              );
            }
          }
        }
      });
    });

    // Clean up removed clips' media elements so deleted clips stop playing sound & free decoders
    videoElementsMap.current.forEach((v, id) => {
      if (!activeIds.has(id)) {
        releaseVideoElement(v);
        videoElementsMap.current.delete(id);
        lastSeekTargetMap.current.delete(id);
        lastSeekTimeMsMap.current.delete(id);
      }
    });
    frozenCanvasesMap.current.forEach((c, id) => {
      if (!activeIds.has(id)) {
        c.width = 0;
        c.height = 0;
        frozenCanvasesMap.current.delete(id);
      }
    });
    proceduralCanvasesMap.current.forEach((c, id) => {
      if (!activeIds.has(id)) {
        c.width = 0;
        c.height = 0;
        proceduralCanvasesMap.current.delete(id);
      }
    });
    imageElementsMap.current.forEach((_img, id) => {
      if (!activeIds.has(id)) {
        imageElementsMap.current.delete(id);
      }
    });
    audioElementsMap.current.forEach((a, id) => {
      if (!activeIds.has(id)) {
        a.pause();
        a.removeAttribute('src');
        a.load();
        a.remove();
        audioElementsMap.current.delete(id);
        lastSeekTargetMap.current.delete(id);
        lastSeekTimeMsMap.current.delete(id);
      }
    });
    rendererRef.current?.pruneUnusedResources(activeIds);
  }, [project.tracks, registerMediaElement, mediaElements]);

  // Pause all media immediately when playback stops
  useEffect(() => {
    mediaClockRef.current = { clipId: '', rawTime: -1, wallMs: 0 };
    bufferingStartRef.current = { clipId: '', sinceMs: 0 };
    if (!isPlaying) {
      videoElementsMap.current.forEach((video) => {
        if (!video.paused) video.pause();
      });
      audioElementsMap.current.forEach((audio) => {
        if (!audio.paused) audio.pause();
      });
      // Sync exact rendered playback time to store when pausing
      if (Math.abs(internalTimeRef.current - lastStoreTimeRef.current) > 0.001) {
        lastStoreTimeRef.current = internalTimeRef.current;
        setCurrentTime(internalTimeRef.current);
      }
    } else {
      globalAudioEngine.init();
      const storeT = useEditorStore.getState().currentTime;
      internalTimeRef.current = storeT;
      lastStoreTimeRef.current = storeT;
    }
  }, [isPlaying, setCurrentTime]);

  // Helper to resolve renderable media element for any Video/Image clip
  const getClipRenderElement = (
    clip: VideoClip,
    time: number,
    clipIndex = 0
  ): HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null => {
    const pCanvas = proceduralCanvasesMap.current.get(clip.id);
    if (pCanvas) {
      const renderTime = clip.isFrozen
        ? clip.sourceStartTime
        : (clip.isReversed
            ? Math.max(0, clip.duration - (time - clip.startTime))
            : Math.max(0, time - clip.startTime)) + clip.sourceStartTime;
      drawProceduralDemoFrame(pCanvas, renderTime, clip.name, clipIndex);
      return pCanvas;
    }
    if (clip.type === 'image') {
      return (
        imageElementsMap.current.get(clip.id) ||
        (useEditorStore.getState().mediaElements.get(clip.id) as HTMLImageElement) ||
        null
      );
    }
    if (clip.isFrozen) {
      const frozenCanvas = frozenCanvasesMap.current.get(clip.id);
      if (frozenCanvas && frozenCanvas.width > 0 && frozenCanvas.height > 0) {
        return frozenCanvas;
      }
    }
    const video = videoElementsMap.current.get(clip.id);
    if (video) return video;
    const storeEl = useEditorStore.getState().mediaElements.get(clip.id);
    if (
      storeEl instanceof HTMLVideoElement ||
      storeEl instanceof HTMLCanvasElement ||
      storeEl instanceof HTMLImageElement
    ) {
      return storeEl;
    }
    return null;
  };

  // Main Render & Playback Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();
    let lastPausedRender: {
      renderer: WebGLRenderer;
      project: typeof project;
      time: number;
      width: number;
      height: number;
      mediaSig: string;
    } | null = null;
    let lastPlayingRender: {
      renderer: WebGLRenderer;
      project: typeof project;
      width: number;
      height: number;
      mediaSig: string;
    } | null = null;

    const loop = (timestamp: number) => {
      const realDelta = Math.min(0.25, Math.max(0, (timestamp - lastTimestamp) / 1000));
      lastTimestamp = timestamp;

      const state = useEditorStore.getState();
      // Pause preview WebGL rendering while ExportModal is open so mobile GPU/memory isn't contested
      if (state.isExportModalOpen) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // Adopt external seeks/scrubs/splits from store
      if (Math.abs(state.currentTime - lastStoreTimeRef.current) > 0.0005) {
        internalTimeRef.current = state.currentTime;
        lastStoreTimeRef.current = state.currentTime;
        mediaClockRef.current = { clipId: '', rawTime: -1, wallMs: 0 };
      }

      const playing = state.isPlaying;
      let time = playing ? internalTimeRef.current : state.currentTime;
      const currentProject = state.project;
      const totalDuration = currentProject.settings.duration;

      if (playing) {
        // Prefer hardware media decoder clock when a constant-speed video/audio clip is actively playing
        // so JS frame rate drops on mobile never cause drift or re-seek stuttering.
        let masterClockApplied = false;
        let masterBuffering = false;

        for (const track of currentProject.tracks) {
          if (!track.isVisible) continue;
          for (const clip of track.clips) {
            if (time < clip.startTime || time >= clip.startTime + clip.duration) continue;
            if (clip.type !== 'video' && clip.type !== 'audio') continue;
            if (clip.isFrozen || clip.isReversed) continue;
            if (clip.speedCurve?.points && clip.speedCurve.points.length >= 2) continue;

            const el =
              clip.type === 'video'
                ? videoElementsMap.current.get(clip.id)
                : audioElementsMap.current.get(clip.id);
            if (!el) continue;

            const baseSpeed = Math.max(MIN_PLAYBACK_SPEED, Math.min(16, clip.speed || 1.0));
            if (baseSpeed < 0.0625) continue;
            if (
              !el.paused &&
              !el.seeking &&
              !el.ended &&
              el.readyState >= 2 &&
              !playPendingRef.current.has(el)
            ) {
              if (
                mediaClockRef.current.clipId !== clip.id ||
                Math.abs(el.currentTime - mediaClockRef.current.rawTime) > 0.0001
              ) {
                mediaClockRef.current = {
                  clipId: clip.id,
                  rawTime: el.currentTime,
                  wallMs: timestamp,
                };
              }
              const sinceTick = Math.min(
                0.045,
                Math.max(0, (timestamp - mediaClockRef.current.wallMs) / 1000)
              );
              const interpMediaTime =
                el.currentTime + (el.readyState >= 3 ? sinceTick * baseSpeed : 0);
              const mediaTime =
                clip.startTime + (interpMediaTime - clip.sourceStartTime) / baseSpeed;
              if (
                Math.abs(mediaTime - time) < 0.9 &&
                mediaTime < clip.startTime + clip.duration - 0.01
              ) {
                if (mediaTime >= time) {
                  time = mediaTime;
                } else if (time - mediaTime >= 0.06) {
                  time = Math.max(clip.startTime, mediaTime);
                }
                masterClockApplied = true;
                bufferingStartRef.current = { clipId: '', sinceMs: 0 };
                break;
              }
            } else {
              const vClip = clip.type === 'video' ? (clip as VideoClip) : null;
              const transDur = vClip?.transition?.duration || 0.6;
              const inTransition = Boolean(
                vClip?.transition &&
                  vClip.transition.type !== 'none' &&
                  time - clip.startTime < transDur
              );
              if (el.preload !== 'auto') {
                el.preload = 'auto';
              }
              const lastClipSeekMs = lastSeekTimeMsMap.current.get(clip.id) ?? 0;
              const playStartMs = playStartMsRef.current.get(el) ?? 0;
              const isPendingPlay =
                playPendingRef.current.has(el) && performance.now() - playStartMs < 500;
              const needsBuffer =
                !inTransition &&
                (el.readyState < 2 ||
                  (el.seeking && timestamp - lastClipSeekMs < 600) ||
                  isPendingPlay);
              if (needsBuffer) {
                if (bufferingStartRef.current.clipId !== clip.id) {
                  bufferingStartRef.current = { clipId: clip.id, sinceMs: timestamp };
                }
                // Cap buffering hold to 700ms max so playback can NEVER permanently stall/deadlock
                if (timestamp - bufferingStartRef.current.sinceMs < 700) {
                  masterBuffering = true;
                }
              }
            }
          }
          if (masterClockApplied) break;
        }

        if (!masterClockApplied && !masterBuffering) {
          time += realDelta;
        }

        if (time >= totalDuration) {
          time = 0;
          internalTimeRef.current = 0;
          lastStoreTimeRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
        } else {
          internalTimeRef.current = time;
          const nowMs = performance.now();
          if (nowMs - lastUiSyncMsRef.current >= 50) {
            lastStoreTimeRef.current = time;
            lastUiSyncMsRef.current = nowMs;
            setCurrentTime(time);
          }
        }
      }

      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (renderer && canvas) {
        const { width, height } = canvasResolution;

        let shouldRunLoop = true;
        let skipVisualDraw = false;
        let currentMediaSig = '';
        if (!playing) {
          lastPlayingRender = null;
          let hasPendingMedia = false;
          const sigParts: string[] = [];
          currentProject.tracks.forEach((track) => {
            if (!track.isVisible || track.type === 'audio') return;
            track.clips.forEach((clip) => {
              if (clip.type === 'video') {
                const fc = frozenCanvasesMap.current.get(clip.id);
                if (fc) {
                  sigParts.push(`${clip.id}:frozen:${fc.width}x${fc.height}`);
                } else {
                  const v = videoElementsMap.current.get(clip.id);
                  if (v) {
                    if (v.seeking || v.readyState < 2) hasPendingMedia = true;
                    sigParts.push(`${clip.id}:${v.currentTime.toFixed(3)}:${v.readyState}`);
                  } else if (proceduralCanvasesMap.current.has(clip.id)) {
                    sigParts.push(`${clip.id}:proc:1`);
                  } else if ((clip as VideoClip).isFrozen) {
                    hasPendingMedia = true;
                  }
                }
              } else if (clip.type === 'image') {
                const img = imageElementsMap.current.get(clip.id);
                if (img) {
                  if (!img.complete) hasPendingMedia = true;
                  sigParts.push(`${clip.id}:${img.complete ? 1 : 0}:${img.naturalWidth}`);
                }
              }
            });
          });
          sigParts.push(`inline:${state.inlineEditingTextClipId || ''}`);
          currentMediaSig = sigParts.join('|');
          if (
            !hasPendingMedia &&
            lastPausedRender &&
            lastPausedRender.renderer === renderer &&
            lastPausedRender.project === currentProject &&
            lastPausedRender.time === time &&
            lastPausedRender.width === width &&
            lastPausedRender.height === height &&
            lastPausedRender.mediaSig === currentMediaSig
          ) {
            shouldRunLoop = false;
          }
        } else {
          lastPausedRender = null;
          let hasTimeVaryingVisual = false;
          let hasActiveVisual = false;
          const playingSigParts: string[] = [];

          for (const track of currentProject.tracks) {
            if (!track.isVisible || track.type === 'audio') continue;
            for (const clip of track.clips) {
              if (time < clip.startTime || time >= clip.startTime + clip.duration) continue;
              const localTime = Math.max(0, time - clip.startTime);

              if (clip.type === 'video' || clip.type === 'image') {
                hasActiveVisual = true;
                const vClip = clip as VideoClip;
                const isProc =
                  proceduralCanvasesMap.current.has(clip.id) ||
                  !vClip.sourceUrl ||
                  vClip.sourceUrl.startsWith('procedural://') ||
                  clip.id.startsWith('sample_');
                const inTransition = Boolean(
                  vClip.transition &&
                    vClip.transition.type !== 'none' &&
                    localTime < (vClip.transition.duration || 0.6)
                );
                const anims = vClip.animations;
                const hasClipAnim = Boolean(
                  anims &&
                    ((anims.inType &&
                      anims.inType !== 'none' &&
                      localTime < (anims.inDuration || 0.6)) ||
                      (anims.outType &&
                        anims.outType !== 'none' &&
                        vClip.duration - localTime < (anims.outDuration || 0.6)) ||
                      (anims.comboType && anims.comboType !== 'none'))
                );
                const hasKfs = Boolean(vClip.keyframes && vClip.keyframes.length > 0);
                const hasFx = Boolean(vClip.effect && vClip.effect.type !== 'none');

                if (
                  isProc ||
                  inTransition ||
                  hasClipAnim ||
                  hasKfs ||
                  hasFx ||
                  vClip.isReversed
                ) {
                  hasTimeVaryingVisual = true;
                  break;
                }

                if (clip.type === 'video') {
                  const fc = frozenCanvasesMap.current.get(clip.id);
                  if (fc) {
                    playingSigParts.push(`${clip.id}:frozen:${fc.width}x${fc.height}`);
                  } else {
                    const v = videoElementsMap.current.get(clip.id);
                    if (!v || v.seeking || v.readyState < 2) {
                      hasTimeVaryingVisual = true;
                      break;
                    }
                    playingSigParts.push(
                      `${clip.id}:${v.currentTime.toFixed(4)}:${v.readyState}`
                    );
                  }
                } else {
                  const img = imageElementsMap.current.get(clip.id);
                  if (!img || !img.complete) {
                    hasTimeVaryingVisual = true;
                    break;
                  }
                  playingSigParts.push(`${clip.id}:img:${img.naturalWidth}`);
                }
              } else if (clip.type === 'text' || clip.type === 'subtitle') {
                hasActiveVisual = true;
                const tClip = clip as TextClip;
                const tc = tClip.textConfig;
                const anims = tClip.animations;
                const hasClipAnim = Boolean(
                  anims &&
                    ((anims.inType &&
                      anims.inType !== 'none' &&
                      localTime < (anims.inDuration || 0.6)) ||
                      (anims.outType &&
                        anims.outType !== 'none' &&
                        tClip.duration - localTime < (anims.outDuration || 0.6)) ||
                      (anims.comboType && anims.comboType !== 'none'))
                );
                const hasTextAnim = Boolean(
                  (tc.animIn &&
                    tc.animIn !== 'none' &&
                    localTime < (tc.animInDuration || 0.8)) ||
                  (tc.animOut &&
                    tc.animOut !== 'none' &&
                    localTime > tClip.duration - (tc.animOutDuration || 0.6)) ||
                  (tc.animLoop && tc.animLoop !== 'none')
                );
                const hasTextKfs = Boolean(tClip.keyframes && tClip.keyframes.length > 1);
                if (hasClipAnim || hasTextAnim || hasTextKfs) {
                  hasTimeVaryingVisual = true;
                  break;
                }
                playingSigParts.push(`${clip.id}:txt`);
              }
            }
            if (hasTimeVaryingVisual) break;
          }

          const playingMediaSig = playingSigParts.join('|');
          if (
            !hasTimeVaryingVisual &&
            hasActiveVisual &&
            lastPlayingRender &&
            lastPlayingRender.renderer === renderer &&
            lastPlayingRender.project === currentProject &&
            lastPlayingRender.width === width &&
            lastPlayingRender.height === height &&
            lastPlayingRender.mediaSig === playingMediaSig
          ) {
            skipVisualDraw = true;
          } else if (!hasTimeVaryingVisual && hasActiveVisual) {
            lastPlayingRender = {
              renderer,
              project: currentProject,
              width,
              height,
              mediaSig: playingMediaSig,
            };
          } else {
            lastPlayingRender = null;
          }
        }

        if (shouldRunLoop) {
          if (!playing) {
            lastPausedRender = {
              renderer,
              project: currentProject,
              time,
              width,
              height,
              mediaSig: currentMediaSig,
            };
          }
          if (!skipVisualDraw) {
            renderer.clear(currentProject.settings.background, width, height);
          }

        let renderedAnyVisual = false;

        // Process all tracks
        currentProject.tracks.forEach((track) => {
          const sortedClips = [...track.clips].sort(
            (a, b) => a.startTime - b.startTime
          );

          sortedClips.forEach((clip, idx) => {
            const isInside =
              time >= clip.startTime && time < clip.startTime + clip.duration;

            // 1. Handle Audio Clips (Music, Voiceovers, Separated Audio)
            if (clip.type === 'audio') {
              const aClip = clip as AudioClip;
              const audioEl = audioElementsMap.current.get(clip.id);
              if (audioEl) {
                if (isInside && track.isVisible) {
                  const localTime = Math.max(0, time - clip.startTime);
                  const effSpeed = getEffectiveSpeed(aClip, localTime);
                  const targetMediaTime = Math.max(
                    0,
                    aClip.sourceStartTime + localTime * effSpeed
                  );

                  applySafePlaybackRate(audioEl, effSpeed);
                  applyPreservesPitch(audioEl, aClip.audio.preservesPitch ?? true);

                  const nowMs = performance.now();
                  const lastTarget = lastSeekTargetMap.current.get(clip.id) ?? -999;
                  const lastSeekMs = lastSeekTimeMsMap.current.get(clip.id) ?? 0;
                  const drift = Math.abs(audioEl.currentTime - targetMediaTime);
                  const isStartingAudio =
                    audioEl.paused &&
                    !playPendingRef.current.has(audioEl) &&
                    (Math.abs(lastTarget - targetMediaTime) > 0.15 || nowMs - lastSeekMs > 500);
                  const audioDriftThreshold = isStartingAudio ? 0.25 : 1.0;
                  const audioSeekCooldownMs = isStartingAudio ? 250 : 1500;

                  if (
                    !audioEl.seeking &&
                    !playPendingRef.current.has(audioEl) &&
                    audioEl.readyState >= 1 &&
                    ((!playing && drift > 0.08) ||
                      (playing && drift > audioDriftThreshold && nowMs - lastSeekMs > audioSeekCooldownMs))
                  ) {
                    try {
                      audioEl.currentTime = targetMediaTime;
                      lastSeekTargetMap.current.set(clip.id, targetMediaTime);
                      lastSeekTimeMsMap.current.set(clip.id, nowMs);
                    } catch {}
                  }

                  globalAudioEngine.updateFadeEnvelopes(
                    clip.id,
                    aClip,
                    time,
                    track.isMuted,
                    audioEl,
                    evaluateTrackVolumeAtTime(track, time)
                  );

                  if (playing && audioEl.paused) {
                    safePlayMedia(audioEl);
                  } else if (!playing && !audioEl.paused) {
                    audioEl.pause();
                  }
                } else {
                  const timeUntilAudioStart = clip.startTime - time;
                  const isPrePlayingAudio =
                    playing &&
                    track.isVisible &&
                    timeUntilAudioStart > 0 &&
                    timeUntilAudioStart <= 0.06;

                  if (!isPrePlayingAudio && !audioEl.paused) {
                    audioEl.pause();
                  }

                  if (track.isVisible && timeUntilAudioStart > 0 && timeUntilAudioStart <= 2.5) {
                    if (audioEl.preload !== 'auto') {
                      audioEl.preload = 'auto';
                    }
                    const effSpeed = getEffectiveSpeed(aClip, 0);
                    let entryAudioTime = aClip.sourceStartTime;
                    if (Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
                      entryAudioTime = Math.max(
                        0,
                        Math.min(entryAudioTime, Math.max(0, audioEl.duration - 0.02))
                      );
                    }
                    const lastTarget = lastSeekTargetMap.current.get(clip.id) ?? -999;
                    if (
                      !audioEl.seeking &&
                      audioEl.readyState >= 1 &&
                      Math.abs(audioEl.currentTime - entryAudioTime) > 0.05 &&
                      Math.abs(lastTarget - entryAudioTime) > 0.02
                    ) {
                      try {
                        audioEl.currentTime = entryAudioTime;
                        lastSeekTargetMap.current.set(clip.id, entryAudioTime);
                        lastSeekTimeMsMap.current.set(clip.id, performance.now());
                      } catch {}
                    }
                    if (
                      isPrePlayingAudio &&
                      audioEl.paused &&
                      audioEl.readyState >= 2 &&
                      !audioEl.seeking &&
                      Math.abs(audioEl.currentTime - entryAudioTime) <= 0.08
                    ) {
                      audioEl.muted = true;
                      applySafePlaybackRate(audioEl, effSpeed);
                      applyPreservesPitch(audioEl, aClip.audio.preservesPitch ?? true);
                      safePlayMedia(audioEl);
                    }
                  }
                }
              }
              return;
            }

            if (!track.isVisible) {
              const vid = videoElementsMap.current.get(clip.id);
              if (vid && !vid.paused) vid.pause();
              return;
            }

            // 2. Handle Video & Image Clips
            if (clip.type === 'video' || clip.type === 'image') {
              const vClip = clip as VideoClip;
              const video = videoElementsMap.current.get(clip.id);

              if (isInside) {
                renderedAnyVisual = true;
                const localTime = Math.max(0, time - clip.startTime);
                const effSpeed = getEffectiveSpeed(vClip, localTime);

                if (video) {
                  let targetMediaTime = vClip.sourceStartTime;
                  if (vClip.isFrozen) {
                    targetMediaTime = vClip.sourceStartTime;
                    if (!video.paused) video.pause();
                  } else if (vClip.isReversed) {
                    const clipSpan = vClip.duration * effSpeed;
                    targetMediaTime = Math.max(
                      0,
                      vClip.sourceStartTime + clipSpan - localTime * effSpeed
                    );
                    if (!video.paused) video.pause();
                  } else {
                    targetMediaTime =
                      vClip.sourceStartTime + localTime * effSpeed;
                  }

                  // Clamp to valid video duration if known
                  if (Number.isFinite(video.duration) && video.duration > 0) {
                    targetMediaTime = Math.max(
                      0,
                      Math.min(targetMediaTime, Math.max(0, video.duration - 0.02))
                    );
                  }

                  if (!vClip.isFrozen && !vClip.isReversed) {
                    applySafePlaybackRate(video, effSpeed);
                    applyPreservesPitch(video, vClip.audio.preservesPitch ?? true);
                  }

                  globalAudioEngine.updateFadeEnvelopes(
                    clip.id,
                    vClip,
                    time,
                    track.isMuted,
                    video,
                    evaluateTrackVolumeAtTime(track, time)
                  );

                  const nowMs = performance.now();
                  const lastTarget = lastSeekTargetMap.current.get(clip.id) ?? -999;
                  const lastSeekMs = lastSeekTimeMsMap.current.get(clip.id) ?? 0;
                  const currentDrift = Math.abs(video.currentTime - targetMediaTime);

                  if (playing && !vClip.isFrozen && !vClip.isReversed) {
                    if (video.preload !== 'auto') {
                      video.preload = 'auto';
                    }
                    if (
                      video.readyState === 0 &&
                      video.networkState === HTMLMediaElement.NETWORK_IDLE &&
                      nowMs - lastSeekMs > 1200
                    ) {
                      try {
                        video.load();
                        lastSeekTimeMsMap.current.set(clip.id, nowMs);
                      } catch {}
                    }
                    const targetChanged = Math.abs(lastTarget - targetMediaTime) > 0.15;
                    const isStartingClip =
                      video.paused &&
                      !playPendingRef.current.has(video) &&
                      (targetChanged || nowMs - lastSeekMs > 500);
                    const driftThreshold = isStartingClip ? 0.35 : 1.0;
                    const seekCooldownMs = isStartingClip ? (targetChanged ? 200 : 500) : 1500;
                    if (
                      !video.seeking &&
                      !playPendingRef.current.has(video) &&
                      video.readyState >= 1 &&
                      currentDrift > driftThreshold &&
                      nowMs - lastSeekMs > seekCooldownMs
                    ) {
                      try {
                        video.currentTime = targetMediaTime;
                        lastSeekTargetMap.current.set(clip.id, targetMediaTime);
                        lastSeekTimeMsMap.current.set(clip.id, nowMs);
                      } catch {}
                    }
                    if (video.paused) {
                      safePlayMedia(video);
                    }
                  } else {
                    // Paused, frozen, or reversed scrubbing:
                    if (!video.paused) {
                      video.pause();
                    }
                    if (
                      !video.seeking &&
                      video.readyState >= 1 &&
                      currentDrift > 0.04 &&
                      Math.abs(lastTarget - targetMediaTime) > 0.015
                    ) {
                      try {
                        video.currentTime = targetMediaTime;
                        lastSeekTargetMap.current.set(clip.id, targetMediaTime);
                        lastSeekTimeMsMap.current.set(clip.id, nowMs);
                      } catch {}
                    }
                  }
                }

                if (!skipVisualDraw) {
                  // Check if clip is currently in an active entrance transition and has a preceding clip
                  let prevClipSource: {
                    id: string;
                    element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
                  } | null = null;

                  const trans = vClip.transition;
                  const transDur = trans?.duration || 0.6;
                  if (
                    trans &&
                    trans.type !== 'none' &&
                    localTime < transDur &&
                    idx > 0
                  ) {
                    const prevClip = sortedClips[idx - 1];
                    if (prevClip.type === 'video' || prevClip.type === 'image') {
                      const pVClip = prevClip as VideoClip;
                      const prevEl = getClipRenderElement(
                        pVClip,
                        prevClip.startTime + prevClip.duration - (transDur - localTime) * 0.5,
                        idx - 1
                      );
                      if (prevEl) {
                        if (prevEl instanceof HTMLVideoElement) {
                          if (!prevEl.paused) {
                            prevEl.pause();
                          }
                          const prevEffSpeed = getEffectiveSpeed(pVClip, pVClip.duration);
                          let prevEndMediaTime =
                            pVClip.isFrozen || pVClip.isReversed
                              ? pVClip.sourceStartTime
                              : pVClip.sourceStartTime + pVClip.duration * prevEffSpeed;
                          if (Number.isFinite(prevEl.duration) && prevEl.duration > 0) {
                            prevEndMediaTime = Math.max(
                              0,
                              Math.min(prevEndMediaTime, Math.max(0, prevEl.duration - 0.02))
                            );
                          }
                          const prevDrift = Math.abs(prevEl.currentTime - prevEndMediaTime);
                          const prevLastTarget =
                            lastSeekTargetMap.current.get(prevClip.id) ?? -999;
                          const driftLimit = playing ? 0.35 : 0.08;
                          if (
                            prevDrift > driftLimit &&
                            Math.abs(prevLastTarget - prevEndMediaTime) > 0.02 &&
                            !prevEl.seeking &&
                            prevEl.readyState >= 1
                          ) {
                            try {
                              prevEl.currentTime = prevEndMediaTime;
                              lastSeekTargetMap.current.set(prevClip.id, prevEndMediaTime);
                              lastSeekTimeMsMap.current.set(prevClip.id, performance.now());
                            } catch {}
                          }
                        }
                        prevClipSource = { id: prevClip.id, element: prevEl };
                      }
                    }
                  }

                  let renderEl = getClipRenderElement(vClip, time, idx);
                  // Seamless anti-black-frame fallback: right after a frozen clip (same sourceUrl),
                  // if the resumed video decoder is still seeking its first frame, hold the frozen
                  // snapshot for up to 0.8s instead of flashing black.
                  if (
                    renderEl instanceof HTMLVideoElement &&
                    (renderEl.seeking || renderEl.readyState < 2 || renderEl.videoWidth === 0) &&
                    localTime < 0.8 &&
                    idx > 0
                  ) {
                    const prevClip = sortedClips[idx - 1];
                    if (
                      prevClip.type === 'video' &&
                      (prevClip as VideoClip).isFrozen &&
                      (prevClip as VideoClip).sourceUrl === vClip.sourceUrl
                    ) {
                      const prevFrozenCanvas = frozenCanvasesMap.current.get(prevClip.id);
                      if (prevFrozenCanvas && prevFrozenCanvas.width > 0) {
                        renderEl = prevFrozenCanvas;
                      }
                    }
                  }
                  if (renderEl) {
                    renderer.renderVideoClip(
                      vClip,
                      renderEl,
                      width,
                      height,
                      time,
                      prevClipSource
                    );
                  }
                }
              } else if (video) {
                const timeUntilStart = clip.startTime - time;
                const isPrePlaying =
                  playing &&
                  !vClip.isFrozen &&
                  !vClip.isReversed &&
                  timeUntilStart > 0 &&
                  timeUntilStart <= 0.06;

                if (!isPrePlaying && !video.paused) {
                  video.pause();
                }
                const distFromClip =
                  time < clip.startTime
                    ? clip.startTime - time
                    : time > clip.startTime + clip.duration
                    ? time - (clip.startTime + clip.duration)
                    : 0;
                if (distFromClip > 12 && video.preload === 'auto' && video.paused) {
                  video.preload = 'metadata';
                }
                // Pre-warm upcoming video clip up to 2.5s before it starts so its decoder
                // is already at sourceStartTime with a decoded frame before any transition begins.
                if (timeUntilStart > 0 && timeUntilStart <= 2.5) {
                  if (video.preload !== 'auto') {
                    video.preload = 'auto';
                  }
                  const effSpeed = getEffectiveSpeed(vClip, 0);
                  let entryMediaTime = vClip.isFrozen
                    ? vClip.sourceStartTime
                    : vClip.isReversed
                    ? Math.max(0, vClip.sourceStartTime + vClip.duration * effSpeed)
                    : vClip.sourceStartTime;
                  if (Number.isFinite(video.duration) && video.duration > 0) {
                    entryMediaTime = Math.max(
                      0,
                      Math.min(entryMediaTime, Math.max(0, video.duration - 0.02))
                    );
                  }
                  const lastTarget = lastSeekTargetMap.current.get(clip.id) ?? -999;
                  if (
                    !video.seeking &&
                    video.readyState >= 1 &&
                    Math.abs(video.currentTime - entryMediaTime) > 0.05 &&
                    Math.abs(lastTarget - entryMediaTime) > 0.02
                  ) {
                    try {
                      video.currentTime = entryMediaTime;
                      lastSeekTargetMap.current.set(clip.id, entryMediaTime);
                      lastSeekTimeMsMap.current.set(clip.id, performance.now());
                    } catch {}
                  }
                  // Pre-start playback muted ~60ms before the cut so async play() startup
                  // finishes before the cut frame without stalling or snapping the clock.
                  if (
                    isPrePlaying &&
                    video.paused &&
                    video.readyState >= 2 &&
                    !video.seeking &&
                    Math.abs(video.currentTime - entryMediaTime) <= 0.08
                  ) {
                    video.muted = true;
                    applySafePlaybackRate(video, effSpeed);
                    applyPreservesPitch(video, vClip.audio.preservesPitch ?? true);
                    safePlayMedia(video);
                  }
                }
              }
            }
            // 3. Handle Text & Subtitle Clips
            else if (
              !skipVisualDraw &&
              (clip.type === 'text' || clip.type === 'subtitle') &&
              isInside
            ) {
              const tClip = clip as TextClip;
              const isHiddenForInlineEdit =
                !playing &&
                !state.isScreenCropMode &&
                !state.eyedropperRequest &&
                state.inlineEditingTextClipId === tClip.id;
              if (!isHiddenForInlineEdit) {
                renderer.renderTextClip(tClip, width, height, time);
              }
            }
          });
        });

        // If playhead is at the exact end of the timeline, keep the last visual clip visible instead of flashing black
        if (!skipVisualDraw && !renderedAnyVisual) {
          for (const track of currentProject.tracks) {
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
              const renderEl = getClipRenderElement(lastClip, clampedTime, 0);
              if (renderEl) {
                renderer.renderVideoClip(
                  lastClip,
                  renderEl,
                  width,
                  height,
                  clampedTime,
                  null
                );
                break;
              }
            }
          }
        }
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasResolution, setCurrentTime, setIsPlaying]);

  // Quick Direct Upload Handler (from canvas button or drag-and-drop)
  const handleQuickFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    globalAudioEngine.init();

    const mainTrack = project.tracks.find((t) => t.type === 'main-video');
    if (!mainTrack) return;

    const existingRealClips = mainTrack.clips.filter(
      (c) => !c.id.startsWith('sample_vid_initial_')
    );
    let nextVideoStart = existingRealClips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0
    );

    const prepared = await Promise.all(
      Array.from(fileList).map(async (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isVideo =
          file.type.startsWith('video/') ||
          ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi', 'ogv'].includes(ext);
        const isImage =
          file.type.startsWith('image/') ||
          ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif'].includes(ext);

        if (!isVideo && !isImage) return null;

        const url = URL.createObjectURL(file);
        const clipId = 'clip_' + Math.random().toString(36).substring(2, 9);
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
        void ProjectStorage.saveMediaBlob(clipId, file, url, diskPath);

        if (isVideo) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          attachToHiddenDom(video);

          await new Promise<void>((resolve) => {
            let resolved = false;
            const finish = () => {
              if (resolved) return;
              resolved = true;
              resolve();
            };
            video.addEventListener('loadedmetadata', finish, { once: true });
            video.addEventListener('loadeddata', finish, { once: true });
            video.addEventListener('error', finish, { once: true });
            setTimeout(finish, 1500);
            video.src = url;
          });

          // Decode first frame & buffer in background without blocking timeline insertion
          video.preload = 'auto';
          try {
            if (video.currentTime === 0) video.currentTime = 0.001;
          } catch {}
          video.muted = false;

          const duration =
            Number.isFinite(video.duration) && video.duration > 0
              ? Number(video.duration.toFixed(2))
              : 5;

          videoElementsMap.current.set(clipId, video);
          registerMediaElement(clipId, video);
          return { kind: 'video' as const, file, url, diskPath, clipId, video, duration };
        }

        const img = new Image();
        img.decoding = 'async';
        await new Promise<void>((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            resolve();
          };
          img.onload = finish;
          img.onerror = finish;
          setTimeout(finish, 1500);
          img.src = url;
        });

        imageElementsMap.current.set(clipId, img);
        registerMediaElement(clipId, img);
        return { kind: 'image' as const, file, url, diskPath, clipId, img, duration: 4 };
      })
    );

    const createBaseVisualProps = () => ({
      transform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
        fitMode: 'contain' as const,
      },
      colorGrading: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        sharpness: 0,
        highlights: 0,
        shadows: 0,
        temperature: 0,
        tint: 0,
        vignette: 0,
        hslRed: { hue: 0, sat: 0, lum: 0 },
        hslGreen: { hue: 0, sat: 0, lum: 0 },
        hslBlue: { hue: 0, sat: 0, lum: 0 },
        hslYellow: { hue: 0, sat: 0, lum: 0 },
      },
      filterPreset: 'none' as const,
      filterIntensity: 100,
      chromaKey: {
        enabled: false,
        color: '#00ff00',
        tolerance: 0.3,
        feather: 0.1,
        spillSuppression: 0.2,
      },
      mask: {
        type: 'none' as const,
        size: 50,
        feather: 0,
        rotation: 0,
        inverted: false,
      },
      effect: {
        type: 'none' as const,
        intensity: 50,
        speed: 50,
      },
      transition: { type: 'none' as const, duration: 0.5 },
      animations: {
        inType: 'none' as const,
        inDuration: 0.5,
        outType: 'none' as const,
        outDuration: 0.5,
        comboType: 'none' as const,
      },
      keyframes: [],
    });

    for (const item of prepared) {
      if (!item) continue;

      if (item.kind === 'video') {
        const newClip: VideoClip = {
          id: item.clipId,
          trackId: mainTrack.id,
          type: 'video',
          name: item.file.name,
          sourceUrl: item.url,
          sourceFilePath: item.diskPath,
          startTime: Number(nextVideoStart.toFixed(2)),
          duration: item.duration,
          sourceStartTime: 0,
          sourceDuration: item.duration,
          speed: 1,
          naturalWidth: item.video.videoWidth || 1080,
          naturalHeight: item.video.videoHeight || 1920,
          ...createBaseVisualProps(),
          audio: {
            volume: 100,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            voiceFilter: 'none',
            noiseReduction: false,
            isMuted: false,
            preservesPitch: true,
          },
        };
        addClip(mainTrack.id, newClip);
        nextVideoStart += item.duration;
        showToast(`🎬 Video "${item.file.name}" cargado`);
      } else {
        const newClip: VideoClip = {
          id: item.clipId,
          trackId: mainTrack.id,
          type: 'image',
          name: item.file.name,
          sourceUrl: item.url,
          sourceFilePath: item.diskPath,
          startTime: Number(nextVideoStart.toFixed(2)),
          duration: item.duration,
          sourceStartTime: 0,
          sourceDuration: item.duration,
          speed: 1,
          naturalWidth: item.img.naturalWidth || 1080,
          naturalHeight: item.img.naturalHeight || 1920,
          ...createBaseVisualProps(),
          audio: {
            volume: 100,
            fadeInDuration: 0,
            fadeOutDuration: 0,
            voiceFilter: 'none',
            noiseReduction: false,
            isMuted: true,
            preservesPitch: true,
          },
        };
        addClip(mainTrack.id, newClip);
        nextVideoStart += item.duration;
        showToast(`🖼️ Imagen "${item.file.name}" cargada`);
      }
    }
  };

  // Helper to find top visual clip at current playhead
  const getTopVisualClipAtPlayhead = (): (VideoClip | TextClip) | null => {
    const state = useEditorStore.getState();
    const t = state.currentTime;
    const visualClips = state.project.tracks
      .filter((tr) => tr.isVisible && tr.type !== 'audio')
      .flatMap((tr) => tr.clips)
      .filter(
        (c): c is VideoClip | TextClip =>
          (c.type === 'video' ||
            c.type === 'image' ||
            c.type === 'text' ||
            c.type === 'subtitle') &&
          t >= c.startTime - 0.05 &&
          t <= c.startTime + c.duration + 0.05
      );
    if (visualClips.length > 0) {
      return visualClips[visualClips.length - 1];
    }
    // Fallback to any visual clip in project if playhead is at very end
    const allVisual = state.project.tracks
      .filter((tr) => tr.isVisible && tr.type !== 'audio')
      .flatMap((tr) => tr.clips)
      .filter(
        (c): c is VideoClip | TextClip =>
          c.type === 'video' ||
          c.type === 'image' ||
          c.type === 'text' ||
          c.type === 'subtitle'
      );
    return allVisual.length > 0 ? allVisual[allVisual.length - 1] : null;
  };

  // Currently active clip for TransformGizmo
  const selectedClip = useMemo(() => {
    if (!activeGizmoClipId) return null;
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === activeGizmoClipId);
      if (found && found.type !== 'audio') return found as VideoClip | TextClip;
    }
    return null;
  }, [project.tracks, activeGizmoClipId]);

  // Compute exact base dimensions of the selected clip on the WebGL canvas
  const selectedClipBaseDims = useMemo(() => {
    if (!selectedClip) {
      return {
        baseW: canvasResolution.width * 0.7,
        baseH: canvasResolution.height * 0.7,
        alignOffsetX: 0,
      };
    }
    if (selectedClip.type === 'video' || selectedClip.type === 'image') {
      const vClip = selectedClip as VideoClip;
      const source =
        videoElementsMap.current.get(vClip.id) ||
        imageElementsMap.current.get(vClip.id) ||
        proceduralCanvasesMap.current.get(vClip.id);
      const { baseW, baseH } = WebGLRenderer.getClipBaseDimensions(
        vClip,
        source,
        canvasResolution.width,
        canvasResolution.height
      );
      return { baseW, baseH, alignOffsetX: 0 };
    }
    const tClip = selectedClip as TextClip;
    const tTransform = interpolateClipTransform(
      tClip,
      Math.max(0, (gizmoTime || useEditorStore.getState().currentTime) - tClip.startTime)
    );
    return WebGLRenderer.measureTextClipMetrics(
      tClip,
      canvasResolution.width,
      canvasResolution.height,
      tTransform
    );
  }, [selectedClip, canvasResolution, gizmoTime]);

  // Stage-level direct 1-finger drag & 2-finger pinch/stretch so user can touch anywhere on the screen
  const stageDragRef = useRef<{
    active: boolean;
    clipId: string;
    startX: number;
    startY: number;
    initialTransform: TransformProperties;
  } | null>(null);

  const stagePinchRef = useRef<{
    active: boolean;
    clipId: string;
    startDist: number;
    startDx: number;
    startDy: number;
    startAngle: number;
    startMidX: number;
    startMidY: number;
    gestureAxis: 'uniform' | 'horizontal' | 'vertical';
    initialTransform: TransformProperties & { scaleX: number; scaleY: number };
  } | null>(null);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    globalAudioEngine.init();
    const targetClip = selectedClip || getTopVisualClipAtPlayhead();
    if (!targetClip) return;

    if (selectedClipId !== targetClip.id) {
      selectClip(targetClip.id);
    }

    const initialTransform = interpolateClipTransform(
      targetClip,
      Math.max(0, useEditorStore.getState().currentTime - targetClip.startTime)
    );
    stageDragRef.current = {
      active: true,
      clipId: targetClip.id,
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: { ...initialTransform },
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      !stageDragRef.current?.active ||
      stagePinchRef.current?.active
    ) {
      return;
    }
    const d = stageDragRef.current;
    const safeFrameW = Math.max(80, frameDimensions.width);
    const safeFrameH = Math.max(80, frameDimensions.height);
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) < 2) return;

    let newX = d.initialTransform.x + (dx / safeFrameW) * 100;
    let newY = d.initialTransform.y + (dy / safeFrameH) * 100;
    if (Math.abs(newX) < 1.5) newX = 0;
    if (Math.abs(newY) < 1.5) newY = 0;

    updateClip(d.clipId, {
      transform: {
        ...d.initialTransform,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
      },
    });
  };

  const handleCanvasPointerUp = () => {
    stageDragRef.current = null;
  };

  // Stage-level 2-Finger Multi-Touch Pinch / Stretch anywhere on the viewport
  const handleStageTouchStart = (e: React.TouchEvent) => {
    if (eyedropperRequest) return;
    if (e.touches.length < 2) return;
    const targetClip = selectedClip || getTopVisualClipAtPlayhead();
    if (!targetClip) return;

    if (selectedClipId !== targetClip.id) {
      selectClip(targetClip.id);
    }
    stageDragRef.current = null;

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const dist = Math.max(15, Math.hypot(dx, dy));
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;

    const currentTransform = interpolateClipTransform(
      targetClip,
      Math.max(0, useEditorStore.getState().currentTime - targetClip.startTime)
    );
    const isFree = currentTransform.freeResize === true;
    let gestureAxis: 'uniform' | 'horizontal' | 'vertical' = 'uniform';
    if (isFree) {
      if (absDx > absDy * 2.35 && absDx > 36) {
        gestureAxis = 'horizontal';
      } else if (absDy > absDx * 2.35 && absDy > 36) {
        gestureAxis = 'vertical';
      }
    }

    stagePinchRef.current = {
      active: true,
      clipId: targetClip.id,
      startDist: dist,
      startDx: Math.max(18, absDx),
      startDy: Math.max(18, absDy),
      startAngle: angle,
      startMidX: midX,
      startMidY: midY,
      gestureAxis,
      initialTransform: {
        ...currentTransform,
        scaleX: currentTransform.scaleX ?? 1,
        scaleY: currentTransform.scaleY ?? 1,
      },
    };
  };

  const handleStageTouchMove = (e: React.TouchEvent) => {
    if (!stagePinchRef.current?.active || e.touches.length < 2) return;
    const p = stagePinchRef.current;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const currDist = Math.max(15, Math.hypot(dx, dy));
    const currAbsDx = Math.abs(dx);
    const currAbsDy = Math.abs(dy);
    const currAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const currMidX = (t1.clientX + t2.clientX) / 2;
    const currMidY = (t1.clientY + t2.clientY) / 2;

    const safeFrameW = Math.max(80, frameDimensions.width);
    const safeFrameH = Math.max(80, frameDimensions.height);
    const init = p.initialTransform;

    const newX = init.x + ((currMidX - p.startMidX) / safeFrameW) * 100;
    const newY = init.y + ((currMidY - p.startMidY) / safeFrameH) * 100;

    if (p.gestureAxis === 'horizontal') {
      const ratioX = currAbsDx / p.startDx;
      const newScaleX = Math.max(0.1, Math.min(6.0, init.scaleX * ratioX));
      updateClip(p.clipId, {
        transform: {
          ...init,
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          scaleX: Number(newScaleX.toFixed(2)),
        },
      });
    } else if (p.gestureAxis === 'vertical') {
      const ratioY = currAbsDy / p.startDy;
      const newScaleY = Math.max(0.1, Math.min(6.0, init.scaleY * ratioY));
      updateClip(p.clipId, {
        transform: {
          ...init,
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          scaleY: Number(newScaleY.toFixed(2)),
        },
      });
    } else {
      const distRatio = currDist / p.startDist;
      const newScale = Math.max(0.1, Math.min(6.0, init.scale * distRatio));

      let deltaAngle = currAngle - p.startAngle;
      while (deltaAngle > 180) deltaAngle -= 360;
      while (deltaAngle < -180) deltaAngle += 360;
      let newRot = Math.round(init.rotation + deltaAngle);
      while (newRot > 180) newRot -= 360;
      while (newRot < -180) newRot += 360;
      for (const snapAngle of [0, 90, -90, 180, -180]) {
        if (Math.abs(newRot - snapAngle) <= 3) {
          newRot = snapAngle;
          break;
        }
      }

      updateClip(p.clipId, {
        transform: {
          ...init,
          x: Number(newX.toFixed(1)),
          y: Number(newY.toFixed(1)),
          scale: Number(newScale.toFixed(2)),
          rotation: newRot,
        },
      });
    }
  };

  const handleStageTouchEnd = (e: React.TouchEvent) => {
    if (stagePinchRef.current?.active && e.touches.length < 2) {
      stagePinchRef.current = null;
    }
  };

  const aspectOptions: AspectRatio[] = [
    'auto',
    '9:16',
    '16:9',
    '1:1',
    '4:5',
    '21:9',
    '4:3',
    'free',
  ];

  const isInlineEditingSelectedText = Boolean(
    !isPlaying &&
      !isScreenCropMode &&
      !eyedropperRequest &&
      selectedClip &&
      isSelectedClipVisibleAtPlayhead &&
      inlineEditingTextClipId === selectedClip.id &&
      (selectedClip.type === 'text' || selectedClip.type === 'subtitle')
  );

  const showTransformGizmo = Boolean(
    !isPlaying &&
      !isScreenCropMode &&
      !eyedropperRequest &&
      !isInlineEditingSelectedText &&
      selectedClip &&
      isSelectedClipVisibleAtPlayhead &&
      (selectedClip.type === 'video' ||
        selectedClip.type === 'image' ||
        selectedClip.type === 'text' ||
        selectedClip.type === 'subtitle')
  );

  return (
    <div
      ref={viewportRef}
      onClick={(e) => {
        if (eyedropperRequest) return;
        if (
          e.target === viewportRef.current &&
          project.settings.aspectRatio !== 'free'
        ) {
          selectClip(null);
        }
      }}
      onTouchStart={handleStageTouchStart}
      onTouchMove={handleStageTouchMove}
      onTouchEnd={handleStageTouchEnd}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleQuickFilesUpload(e.dataTransfer.files);
      }}
      className={`relative flex-1 w-full h-full bg-[#07080c] flex flex-col items-center justify-between p-1.5 overflow-hidden select-none touch-none ${
        isDraggingOver ? 'ring-2 ring-cyan-400 bg-cyan-950/20' : ''
      }`}
    >
      {/* Hidden DOM Media Container so hardware video decoders stay active in all browsers */}
      <div
        ref={hiddenMediaContainerRef}
        aria-hidden="true"
        className="fixed bottom-0 right-0 w-px h-px opacity-[0.001] pointer-events-none overflow-hidden -z-50"
      />

      {/* Hidden Direct File Input */}
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          handleQuickFilesUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Top Quick Screen Size / Aspect Ratio, Direct Upload & Preview Zoom Bar */}
      <div className="w-full flex items-center justify-between px-2 py-0.5 bg-[#0c0d16]/90 border border-white/10 rounded-lg z-30 shrink-0 gap-1">
        {/* Aspect Ratio Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-400 font-semibold mr-0.5 hidden sm:inline">
            Pantalla:
          </span>
          {aspectOptions.map((ar) => {
            const active = project.settings.aspectRatio === ar;
            const isFreeBtn = ar === 'free';
            return (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-0.5 whitespace-nowrap ${
                  active
                    ? isFreeBtn
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : isFreeBtn
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={
                  isFreeBtn
                    ? 'Modo Libre: Toca la pantalla con tus dedos para modificar el tamaño de la imagen como quieras'
                    : ar === 'auto'
                    ? 'Medida original del video o imagen'
                    : `Cambiar tamaño de pantalla a ${ar}`
                }
              >
                {isFreeBtn ? (
                  <>
                    <Hand className="w-2.5 h-2.5" />
                    <span>Libre</span>
                  </>
                ) : ar === 'auto' ? (
                  'Original'
                ) : (
                  ar
                )}
              </button>
            );
          })}
          <button
            onClick={() => setScreenCropMode(!isScreenCropMode)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 whitespace-nowrap ${
              isScreenCropMode
                ? 'bg-emerald-500 text-slate-950 shadow-sm ring-1 ring-emerald-300'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 hover:bg-emerald-500/25'
            }`}
            title="Recortar el tamaño de la pantalla a tu gusto arrastrando los bordes"
          >
            <Crop className="w-2.5 h-2.5" />
            <span>Recortar</span>
          </button>
        </div>

        {/* Direct 1-Click Upload Button + Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => quickFileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-[10px] font-bold shadow-sm transition-all active:scale-95"
            title="Subir video o imagen desde tu dispositivo"
          >
            <Upload className="w-3 h-3" />
            <span>Subir Video / Foto</span>
          </button>

          <button
            onClick={() => setCanvasZoom(canvasZoom - 0.15)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
            title="Alejar vista previa"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCanvasZoom(1.0)}
            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-indigo-300"
            title="Restablecer zoom de pantalla (100%)"
          >
            {Math.round(canvasZoom * 100)}%
          </button>
          <button
            onClick={() => setCanvasZoom(canvasZoom + 0.15)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
            title="Acercar vista previa"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Centered Aspect-Ratio Screen Stage */}
      <div
        ref={stageRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center overflow-visible relative my-1"
      >
        <div
          style={{
            width: `${frameDimensions.width}px`,
            height: `${frameDimensions.height}px`,
          }}
          className="relative flex items-center justify-center transition-[width,height] duration-150"
        >
          {/* Clipped Video/Image Canvas Container */}
          <div className="w-full h-full shadow-[0_0_30px_rgba(0,0,0,0.85)] rounded-md overflow-hidden border border-white/20 bg-black flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={canvasResolution.width}
              height={canvasResolution.height}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              className="w-full h-full block pointer-events-auto cursor-move touch-none"
            />
          </div>

          {/* Interactive Screen Eyedropper (Cuentagotas) Overlay */}
          {eyedropperRequest && (
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {}
                const s = sampleCanvasPixelAt(e.clientX, e.clientY);
                if (s) {
                  eyedropperSampleRef.current = s;
                  setEyedropperSample(s);
                }
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                if (e.buttons === 0 && e.pointerType === 'mouse') {
                  const s = sampleCanvasPixelAt(e.clientX, e.clientY);
                  if (s) {
                    eyedropperSampleRef.current = s;
                    setEyedropperSample(s);
                  }
                  return;
                }
                const s = sampleCanvasPixelAt(e.clientX, e.clientY);
                if (s) {
                  eyedropperSampleRef.current = s;
                  setEyedropperSample(s);
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
                const s =
                  sampleCanvasPixelAt(e.clientX, e.clientY) ||
                  eyedropperSampleRef.current ||
                  eyedropperSample;
                eyedropperSampleRef.current = null;
                setEyedropperSample(null);
                if (s) {
                  completeEyedropper(s.hex);
                }
              }}
              onPointerCancel={() => {
                eyedropperSampleRef.current = null;
                setEyedropperSample(null);
              }}
              className="absolute inset-0 z-50 cursor-crosshair touch-none rounded-md ring-2 ring-cyan-400 bg-transparent"
            >
              {eyedropperSample && (
                <>
                  {/* Crosshair target at exact sampled pixel */}
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.85)]"
                    style={{
                      left: `${eyedropperSample.x}px`,
                      top: `${eyedropperSample.y}px`,
                    }}
                  />
                  {/* Magnified color preview loupe */}
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1"
                    style={{
                      left: `${eyedropperSample.x}px`,
                      top: `${Math.max(64, eyedropperSample.y - 20)}px`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-full border-2 border-white shadow-[0_0_16px_rgba(0,0,0,0.85)]"
                      style={{ backgroundColor: eyedropperSample.hex }}
                    />
                    <span className="px-2 py-0.5 rounded-full bg-black/85 border border-white/25 font-mono text-[10px] font-bold text-white uppercase shadow">
                      {eyedropperSample.hex}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Interactive Screen Crop Overlay */}
          {isScreenCropMode && (
            <ScreenCropOverlay
              crop={screenCropRect}
              onChange={setScreenCropRect}
              frameWidth={frameDimensions.width}
              frameHeight={frameDimensions.height}
              logicalWidth={logicalCanvasDims.width}
              logicalHeight={logicalCanvasDims.height}
            />
          )}

          {/* Direct On-Canvas Inline Text Editor Overlay */}
          {isInlineEditingSelectedText && selectedClip && (
            <InlineTextEditorOverlay
              clip={selectedClip as TextClip}
              canvasWidth={canvasResolution.width}
              canvasHeight={canvasResolution.height}
              frameWidth={frameDimensions.width}
              frameHeight={frameDimensions.height}
              alignOffsetX={selectedClipBaseDims.alignOffsetX}
              onChangeText={(nextText) => {
                const tClip = selectedClip as TextClip;
                const cleanPreview = nextText.replace(/\s+/g, ' ').trim();
                updateClip(tClip.id, {
                  name: cleanPreview
                    ? `Texto: ${cleanPreview.slice(0, 22)}`
                    : 'Texto vacío',
                  textConfig: { ...tClip.textConfig, text: nextText },
                });
              }}
              onTransformChange={(newTransform) => {
                updateClip(selectedClip.id, { transform: newTransform });
              }}
              onFinish={() => setInlineEditingTextClipId(null)}
            />
          )}

          {/* Unclipped Interactive Transform Gizmo Overlay */}
          {showTransformGizmo && selectedClip && (
            <TransformGizmo
              clip={selectedClip as VideoClip | TextClip}
              canvasWidth={canvasResolution.width}
              canvasHeight={canvasResolution.height}
              frameWidth={frameDimensions.width}
              frameHeight={frameDimensions.height}
              baseWidthPx={selectedClipBaseDims.baseW}
              baseHeightPx={selectedClipBaseDims.baseH}
              alignOffsetX={selectedClipBaseDims.alignOffsetX}
              onTransformChange={(newTransform) => {
                updateClip(selectedClip.id, { transform: newTransform });
              }}
              onStartInlineTextEdit={
                selectedClip.type === 'text' || selectedClip.type === 'subtitle'
                  ? () => setInlineEditingTextClipId(selectedClip.id)
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Screen Eyedropper Action Pill */}
      {eyedropperRequest && (
        <div className="shrink-0 w-full flex items-center justify-center z-30 pt-0.5">
          <div className="flex items-center gap-2 bg-[#0b0c14]/95 border border-cyan-400/50 rounded-full px-3 py-1 shadow-xl text-xs">
            <span
              className="w-4 h-4 rounded-full border border-white/60 shrink-0"
              style={{ backgroundColor: eyedropperSample?.hex || '#22d3ee' }}
            />
            <span className="text-cyan-200 font-semibold">
              💧 Toca la pantalla ({eyedropperRequest.label})
            </span>
            <button
              type="button"
              onClick={() => {
                setEyedropperSample(null);
                cancelEyedropper();
              }}
              className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Screen Crop Action Pill when cropping screen */}
      {isScreenCropMode && (
        <div className="shrink-0 w-full flex items-center justify-center z-30 pt-0.5">
          <ScreenCropActionBar
            crop={screenCropRect}
            logicalWidth={logicalCanvasDims.width}
            logicalHeight={logicalCanvasDims.height}
            onReset={() =>
              setScreenCropRect({ x: 0, y: 0, width: 1, height: 1 })
            }
            onCancel={() => setScreenCropMode(false)}
            onApply={() => applyScreenCrop(screenCropRect)}
          />
        </div>
      )}

      {/* Quick Transform Action Pill pinned below stage so it always fits on desktop & mobile */}
      {showTransformGizmo && selectedClip && (
        <div className="shrink-0 w-full flex items-center justify-center z-30 pt-0.5">
          <TransformActionBar
            transform={interpolateClipTransform(
              selectedClip as VideoClip | TextClip,
              Math.max(
                0,
                (gizmoTime || useEditorStore.getState().currentTime) -
                  selectedClip.startTime
              )
            )}
            onTransformChange={(newTransform) => {
              updateClip(selectedClip.id, { transform: newTransform });
            }}
          />
        </div>
      )}
    </div>
  );
};
