// ============================================================================
// ClipItem - Draggable, Trimmable Multi-track Clip with Transition & Anim Badges
// ============================================================================

import React, { useRef, useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TimelineClip, VideoClip, AudioClip, TextClip } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import {
  Film,
  Music,
  Type,
  Image as ImageIcon,
  Layers,
  Zap,
  VolumeX,
  Diamond,
  Trash2,
} from 'lucide-react';

interface ClipItemProps {
  clip: TimelineClip;
  pixelsPerSecond: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onOpenTool?: (toolId: string) => void;
}

export const ClipItem: React.FC<ClipItemProps> = React.memo(({
  clip,
  pixelsPerSecond,
  scrollContainerRef,
  onOpenTool,
}) => {
  const {
    isSelected,
    selectClip,
    trimClip,
    moveClip,
    updateClip,
    setCurrentTime,
    removeKeyframe,
    showToast,
    isMagnetEnabled,
    packMagneticTracks,
    setReorderTrackId,
    trackHeight,
    playheadMode,
  } = useEditorStore(
    useShallow((s) => ({
      isSelected: s.selectedClipId === clip.id,
      selectClip: s.selectClip,
      trimClip: s.trimClip,
      moveClip: s.moveClip,
      updateClip: s.updateClip,
      setCurrentTime: s.setCurrentTime,
      removeKeyframe: s.removeKeyframe,
      showToast: s.showToast,
      isMagnetEnabled: s.isMagnetEnabled,
      packMagneticTracks: s.packMagneticTracks,
      setReorderTrackId: s.setReorderTrackId,
      trackHeight: s.trackHeight,
      playheadMode: s.playheadMode,
    }))
  );

  const hasKeyframes =
    (clip.type === 'video' ||
      clip.type === 'image' ||
      clip.type === 'text' ||
      clip.type === 'subtitle') &&
    Boolean((clip as VideoClip | TextClip).keyframes?.length);
  const currentTime = useEditorStore((s) => (hasKeyframes ? s.currentTime : 0));

  const clipHeight = Math.max(28, trackHeight - 4);

  const trackClipsCount = useEditorStore(
    (s) => s.project.tracks.find((t) => t.id === clip.trackId)?.clips.length ?? 0
  );

  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const leftPx = clip.startTime * pixelsPerSecond;
  const widthPx = Math.max(8, clip.duration * pixelsPerSecond);

  // Interaction Mode: move clip body, trim left/right, or visual/audio fade in/out
  const [dragMode, setDragMode] = useState<
    | 'none'
    | 'move'
    | 'trimLeft'
    | 'trimRight'
    | 'visualFadeIn'
    | 'visualFadeOut'
    | 'audioFadeIn'
    | 'audioFadeOut'
  >('none');
  const startXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const wasSelectedOnPointerDownRef = useRef(false);
  const didDragRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const [activeKeyframeId, setActiveKeyframeId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeKeyframeId) return;
    const handleOutsidePointerDown = () => setActiveKeyframeId(null);
    window.addEventListener('pointerdown', handleOutsidePointerDown);
    return () =>
      window.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [activeKeyframeId]);

  useEffect(() => cancelLongPress, []);
  const initialTimesRef = useRef({
    start: clip.startTime,
    duration: clip.duration,
  });
  const initialFadeRef = useRef({
    visualFadeIn: 0,
    visualFadeOut: 0,
    audioFadeIn: 0,
    audioFadeOut: 0,
  });

  const hasVisualTrack = clip.type !== 'audio';
  const hasAudioTrack = clip.type === 'audio' || clip.type === 'video';

  const anims = hasVisualTrack ? (clip as VideoClip).animations : undefined;
  const visualFadeInSec =
    anims && anims.inType !== 'none' ? anims.inDuration || 0 : 0;
  const visualFadeOutSec =
    anims && anims.outType !== 'none' ? anims.outDuration || 0 : 0;

  const audioFadeInSec = hasAudioTrack
    ? (clip as VideoClip | AudioClip).audio?.fadeInDuration || 0
    : 0;
  const audioFadeOutSec = hasAudioTrack
    ? (clip as VideoClip | AudioClip).audio?.fadeOutDuration || 0
    : 0;

  const safeClipDuration = Math.max(0.01, clip.duration);
  const visualFadeInPx = Math.min(
    widthPx,
    (visualFadeInSec / safeClipDuration) * widthPx
  );
  const visualFadeOutPx = Math.min(
    widthPx,
    (visualFadeOutSec / safeClipDuration) * widthPx
  );
  const audioFadeInPx = Math.min(
    widthPx,
    (audioFadeInSec / safeClipDuration) * widthPx
  );
  const audioFadeOutPx = Math.min(
    widthPx,
    (audioFadeOutSec / safeClipDuration) * widthPx
  );

  const clampFadeSeconds = (otherFade: number, rawSeconds: number) => {
    const maxAllowed = Math.max(0, clip.duration - otherFade);
    let clamped = Math.max(0, Math.min(maxAllowed, rawSeconds));
    if (clamped < 0.05) clamped = 0;
    return Math.round(clamped * 100) / 100;
  };

  const applyVisualFadeUpdate = (side: 'in' | 'out', rawSeconds: number) => {
    if (!hasVisualTrack) return;
    const otherFade = side === 'in' ? visualFadeOutSec : visualFadeInSec;
    const clamped = clampFadeSeconds(otherFade, rawSeconds);

    const visualClip = clip as VideoClip;
    const baseAnims = visualClip.animations || {
      inType: 'none' as const,
      inDuration: 0,
      outType: 'none' as const,
      outDuration: 0,
      comboType: 'none' as const,
    };
    const nextAnims = { ...baseAnims };
    if (side === 'in') {
      nextAnims.inType =
        clamped > 0
          ? baseAnims.inType !== 'none'
            ? baseAnims.inType
            : 'fadeIn'
          : 'none';
      nextAnims.inDuration = clamped;
    } else {
      nextAnims.outType =
        clamped > 0
          ? baseAnims.outType !== 'none'
            ? baseAnims.outType
            : 'fadeOut'
          : 'none';
      nextAnims.outDuration = clamped;
    }
    updateClip(clip.id, { animations: nextAnims });
  };

  const applyAudioFadeUpdate = (side: 'in' | 'out', rawSeconds: number) => {
    if (!hasAudioTrack) return;
    const otherFade = side === 'in' ? audioFadeOutSec : audioFadeInSec;
    const clamped = clampFadeSeconds(otherFade, rawSeconds);
    const audioClip = clip as VideoClip | AudioClip;

    updateClip(clip.id, {
      audio: {
        ...audioClip.audio,
        ...(side === 'in'
          ? { fadeInDuration: clamped }
          : { fadeOutDuration: clamped }),
      },
    });
  };

  const handlePointerDownBody = (e: React.PointerEvent) => {
    wasSelectedOnPointerDownRef.current = isSelected;
    didDragRef.current = false;
    longPressTriggeredRef.current = false;
    cancelLongPress();
    startXRef.current = e.clientX;
    lastClientXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef?.current?.scrollLeft ?? 0;

    // In Fixed Guide mode, let pointer drag on an unselected clip body pan the track underneath
    // the fixed center guide (once selected, or while holding Shift, drag moves the clip directly).
    if (playheadMode === 'fixed' && !isSelected && !e.shiftKey) {
      if (trackClipsCount > 1) {
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTimerRef.current = null;
          longPressTriggeredRef.current = true;
          setDragMode('none');
          selectClip(clip.id);
          setReorderTrackId(clip.trackId);
        }, 1000);
      }
      return;
    }

    e.stopPropagation();
    if (!isSelected) {
      selectClip(clip.id);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode('move');
    initialTimesRef.current = {
      start: clip.startTime,
      duration: clip.duration,
    };

    if (trackClipsCount > 1) {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressTriggeredRef.current = true;
        setDragMode('none');
        selectClip(clip.id);
        setReorderTrackId(clip.trackId);
      }, 1000);
    }
  };

  const handlePointerDownLeftTrim = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isSelected) selectClip(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    didDragRef.current = false;
    setDragMode('trimLeft');
    startXRef.current = e.clientX;
    lastClientXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef?.current?.scrollLeft ?? 0;
    initialTimesRef.current = {
      start: clip.startTime,
      duration: clip.duration,
    };
  };

  const handlePointerDownRightTrim = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isSelected) selectClip(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    didDragRef.current = false;
    setDragMode('trimRight');
    startXRef.current = e.clientX;
    lastClientXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef?.current?.scrollLeft ?? 0;
    initialTimesRef.current = {
      start: clip.startTime,
      duration: clip.duration,
    };
  };

  const startFadeDrag = (
    e: React.PointerEvent,
    mode: 'visualFadeIn' | 'visualFadeOut' | 'audioFadeIn' | 'audioFadeOut'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSelected) selectClip(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    startXRef.current = e.clientX;
    lastClientXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef?.current?.scrollLeft ?? 0;
    initialFadeRef.current = {
      visualFadeIn: visualFadeInSec,
      visualFadeOut: visualFadeOutSec,
      audioFadeIn: audioFadeInSec,
      audioFadeOut: audioFadeOutSec,
    };
  };

  const applyTimelineDrag = (
    mode: typeof dragMode,
    clientX: number,
    isAutoScrolling: boolean
  ) => {
    const currentScrollLeft =
      scrollContainerRef?.current?.scrollLeft ?? startScrollLeftRef.current;
    const totalDeltaX =
      clientX - startXRef.current + (currentScrollLeft - startScrollLeftRef.current);

    if (mode === 'move' && !didDragRef.current && Math.abs(totalDeltaX) < 4) {
      return;
    }
    didDragRef.current = true;
    cancelLongPress();
    const deltaTime = totalDeltaX / pixelsPerSecond;

    if (mode === 'move') {
      let newStart = Math.max(0, initialTimesRef.current.start + deltaTime);
      // Magnetic snap to 0 or playhead (within 0.12s) only when magnet is enabled
      if (isMagnetEnabled) {
        const playheadTime = useEditorStore.getState().currentTime;
        if (Math.abs(newStart) < 0.12) newStart = 0;
        else if (!isAutoScrolling && Math.abs(newStart - playheadTime) < 0.12) {
          newStart = playheadTime;
        }
      }
      moveClip(clip.id, newStart);
    } else if (mode === 'trimLeft') {
      const maxDelta = initialTimesRef.current.duration - 0.25;
      const clampedDelta = Math.min(maxDelta, deltaTime);
      const newStart = Math.max(0, initialTimesRef.current.start + clampedDelta);
      const actualDelta = newStart - initialTimesRef.current.start;
      const newDuration = Math.max(
        0.25,
        initialTimesRef.current.duration - actualDelta
      );
      trimClip(clip.id, newStart, newDuration);
    } else if (mode === 'trimRight') {
      const newDuration = Math.max(
        0.25,
        initialTimesRef.current.duration + deltaTime
      );
      trimClip(clip.id, initialTimesRef.current.start, newDuration);
    } else if (mode === 'visualFadeIn') {
      applyVisualFadeUpdate('in', initialFadeRef.current.visualFadeIn + deltaTime);
    } else if (mode === 'visualFadeOut') {
      applyVisualFadeUpdate('out', initialFadeRef.current.visualFadeOut - deltaTime);
    } else if (mode === 'audioFadeIn') {
      applyAudioFadeUpdate('in', initialFadeRef.current.audioFadeIn + deltaTime);
    } else if (mode === 'audioFadeOut') {
      applyAudioFadeUpdate('out', initialFadeRef.current.audioFadeOut - deltaTime);
    }
  };

  const applyTimelineDragRef = useRef(applyTimelineDrag);
  applyTimelineDragRef.current = applyTimelineDrag;

  const finishDragRef = useRef((finishedMode: typeof dragMode) => {
    cancelLongPress();
    setDragMode('none');
    if (
      isMagnetEnabled &&
      didDragRef.current &&
      (finishedMode === 'move' ||
        finishedMode === 'trimLeft' ||
        finishedMode === 'trimRight')
    ) {
      packMagneticTracks();
    }
  });
  finishDragRef.current = (finishedMode: typeof dragMode) => {
    cancelLongPress();
    setDragMode('none');
    if (
      isMagnetEnabled &&
      didDragRef.current &&
      (finishedMode === 'move' ||
        finishedMode === 'trimLeft' ||
        finishedMode === 'trimRight')
    ) {
      packMagneticTracks();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    lastClientXRef.current = e.clientX;
    if (dragMode === 'none') {
      if (Math.abs(e.clientX - startXRef.current) > 4) {
        didDragRef.current = true;
        cancelLongPress();
      }
      return;
    }
    e.stopPropagation();
    applyTimelineDrag(dragMode, e.clientX, false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    cancelLongPress();
    if (dragMode !== 'none') {
      e.stopPropagation();
      finishDragRef.current(dragMode);
    }
  };

  // Continuous edge auto-scroll while dragging/trimming a clip near the viewport edges
  useEffect(() => {
    if (
      dragMode !== 'move' &&
      dragMode !== 'trimLeft' &&
      dragMode !== 'trimRight'
    ) {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const stepAutoScroll = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const scrollEl = scrollContainerRef?.current;
      if (scrollEl && didDragRef.current) {
        const rect = scrollEl.getBoundingClientRect();
        const edgeZone = Math.max(44, Math.min(72, rect.width * 0.18));
        const pointerX = lastClientXRef.current;
        const distFromLeft = pointerX - rect.left;
        const distFromRight = rect.right - pointerX;

        let scrollVelocity = 0;
        if (distFromRight < edgeZone) {
          const intensity = Math.min(
            1.8,
            Math.max(0, (edgeZone - distFromRight) / edgeZone)
          );
          scrollVelocity = 180 + 520 * intensity * intensity;
        } else if (distFromLeft < edgeZone && scrollEl.scrollLeft > 0) {
          const intensity = Math.min(
            1.8,
            Math.max(0, (edgeZone - distFromLeft) / edgeZone)
          );
          scrollVelocity = -(180 + 520 * intensity * intensity);
        }

        if (scrollVelocity !== 0) {
          const prevScrollLeft = scrollEl.scrollLeft;
          const nextScrollLeft = Math.max(0, prevScrollLeft + scrollVelocity * dt);
          scrollEl.scrollLeft = nextScrollLeft;
          if (Math.abs(scrollEl.scrollLeft - prevScrollLeft) > 0.01) {
            applyTimelineDragRef.current(dragMode, pointerX, true);
          }
        }
      }

      rafId = window.requestAnimationFrame(stepAutoScroll);
    };

    const handleWindowPointerMove = (ev: PointerEvent) => {
      lastClientXRef.current = ev.clientX;
    };

    const handleWindowPointerUp = () => {
      finishDragRef.current(dragMode);
    };

    rafId = window.requestAnimationFrame(stepAutoScroll);
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [dragMode, pixelsPerSecond, scrollContainerRef]);

  const applyFadeUpdateRef = useRef({
    visual: applyVisualFadeUpdate,
    audio: applyAudioFadeUpdate,
  });
  applyFadeUpdateRef.current = {
    visual: applyVisualFadeUpdate,
    audio: applyAudioFadeUpdate,
  };

  // Fallback window listeners for fade dragging so pointer moves/releases outside the clip never drop
  useEffect(() => {
    if (
      dragMode !== 'visualFadeIn' &&
      dragMode !== 'visualFadeOut' &&
      dragMode !== 'audioFadeIn' &&
      dragMode !== 'audioFadeOut'
    ) {
      return;
    }

    const onWinMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startXRef.current;
      didDragRef.current = true;
      const deltaTime = deltaX / pixelsPerSecond;
      if (dragMode === 'visualFadeIn') {
        applyFadeUpdateRef.current.visual(
          'in',
          initialFadeRef.current.visualFadeIn + deltaTime
        );
      } else if (dragMode === 'visualFadeOut') {
        applyFadeUpdateRef.current.visual(
          'out',
          initialFadeRef.current.visualFadeOut - deltaTime
        );
      } else if (dragMode === 'audioFadeIn') {
        applyFadeUpdateRef.current.audio(
          'in',
          initialFadeRef.current.audioFadeIn + deltaTime
        );
      } else {
        applyFadeUpdateRef.current.audio(
          'out',
          initialFadeRef.current.audioFadeOut - deltaTime
        );
      }
    };

    const onWinUp = () => {
      setDragMode('none');
    };

    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
    return () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
    };
  }, [dragMode, pixelsPerSecond]);

  // Draw Audio Waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const audioConfig = (clip as VideoClip | AudioClip).audio;
    if (!audioConfig) return;

    const waveform = (clip as AudioClip).waveform || [
      0.3, 0.6, 0.8, 0.4, 0.7, 0.9, 0.5, 0.3, 0.6, 0.7, 0.4, 0.8, 0.5, 0.7,
    ];

    ctx.fillStyle =
      audioConfig.isMuted
        ? 'rgba(148, 163, 184, 0.25)'
        : clip.type === 'audio'
        ? '#34d399'
        : '#818cf8';

    const barCount = Math.max(12, Math.min(waveform.length, Math.floor(w / 4)));
    const barWidth = Math.max(2, w / barCount);

    for (let i = 0; i < barCount; i++) {
      const val = waveform[i % waveform.length] || 0.3;
      const barH = val * (h * 0.68);
      const x = i * barWidth;
      const y = (h - barH) / 2;
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barH);
    }
  }, [clip, widthPx, clipHeight]);

  const getClipIcon = () => {
    if (clip.type === 'video') return <Film className="w-3.5 h-3.5 text-indigo-300 shrink-0" />;
    if (clip.type === 'image') return <ImageIcon className="w-3.5 h-3.5 text-pink-300 shrink-0" />;
    if (clip.type === 'audio') return <Music className="w-3.5 h-3.5 text-emerald-300 shrink-0" />;
    return <Type className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
  };

  const getBgStyle = () => {
    if (clip.type === 'video') return 'bg-indigo-900/65 border-indigo-500/60';
    if (clip.type === 'image') return 'bg-pink-900/65 border-pink-500/60';
    if (clip.type === 'audio') return 'bg-emerald-900/65 border-emerald-500/60';
    return 'bg-amber-900/65 border-amber-500/60';
  };

  const hasTransition =
    'transition' in clip &&
    clip.transition?.type &&
    clip.transition.type !== 'none';

  const hasAnimation =
    'animations' in clip &&
    clip.animations &&
    (clip.animations.inType !== 'none' ||
      clip.animations.outType !== 'none' ||
      clip.animations.comboType !== 'none');

  const hasEffect =
    'effect' in clip &&
    clip.effect?.type &&
    clip.effect.type !== 'none';

  const hasFilter =
    'filterPreset' in clip &&
    clip.filterPreset &&
    clip.filterPreset !== 'none';

  const isAudioMuted =
    'audio' in clip && clip.audio?.isMuted;

  return (
    <div
      onPointerDown={handlePointerDownBody}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          wasSelectedOnPointerDownRef.current = false;
          didDragRef.current = false;
          return;
        }
        if (wasSelectedOnPointerDownRef.current && !didDragRef.current) {
          selectClip(null);
        } else {
          selectClip(clip.id);
        }
        wasSelectedOnPointerDownRef.current = false;
        didDragRef.current = false;
      }}
      style={{
        position: 'absolute',
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        height: `${clipHeight}px`,
        top: '2px',
      }}
      className={`group rounded-lg border text-slate-100 flex items-center select-none overflow-visible transition-shadow cursor-grab active:cursor-grabbing ${
        playheadMode === 'fixed' && !isSelected ? 'touch-auto' : 'touch-none'
      } ${getBgStyle()} ${
        isSelected
          ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-20'
          : 'hover:border-white/40 z-10'
      }`}
    >
      {/* Transition Button on the Left Junction of Visual Clips */}
      {(clip.type === 'video' || clip.type === 'image') && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            selectClip(clip.id);
            onOpenTool?.('transitions');
          }}
          className={`absolute -left-[18px] top-1/2 -translate-y-1/2 w-9 h-7 rounded-lg border flex items-center justify-center z-40 shadow-md cursor-pointer transition-transform hover:scale-110 ${
            hasTransition
              ? 'bg-indigo-500 border-white text-white'
              : 'bg-[#181926] border-white/30 text-slate-300 hover:text-white'
          }`}
          title={
            hasTransition
              ? `Transición: ${(clip as VideoClip).transition.type}`
              : 'Agregar Transición'
          }
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Left Trim Handle */}
      {isSelected && (
        <div
          onPointerDown={handlePointerDownLeftTrim}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize bg-white/90 hover:bg-white rounded-l-md flex items-center justify-center z-30 touch-none shadow"
          title="Arrastra para recortar el inicio"
        >
          <div className="w-0.5 h-5 bg-slate-900 rounded-full" />
        </div>
      )}

      {/* Waveform Canvas for Audio / Video */}
      {(clip.type === 'audio' || clip.type === 'video') && (
        <canvas
          ref={waveformCanvasRef}
          width={Math.min(Math.max(40, Math.round(widthPx)), 500)}
          height={clipHeight}
          className="absolute inset-0 w-full h-full opacity-55 pointer-events-none rounded-lg overflow-hidden"
        />
      )}

      {/* Visual Image/Text Fade In / Fade Out Envelope Overlay (Sky Blue + Dark Vignette) */}
      {hasVisualTrack && (visualFadeInPx > 0 || visualFadeOutPx > 0) && (
        <svg
          width={widthPx}
          height={clipHeight}
          viewBox={`0 0 ${widthPx} ${clipHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none rounded-lg overflow-hidden z-[5]"
        >
          {visualFadeInPx > 0 && (
            <>
              <polygon
                points={`0,0 ${visualFadeInPx},0 0,${clipHeight}`}
                fill="rgba(0, 0, 0, 0.48)"
              />
              <line
                x1={0}
                y1={clipHeight}
                x2={visualFadeInPx}
                y2={0}
                stroke="#38bdf8"
                strokeWidth="2"
              />
            </>
          )}
          {visualFadeOutPx > 0 && (
            <>
              <polygon
                points={`${widthPx - visualFadeOutPx},0 ${widthPx},0 ${widthPx},${clipHeight}`}
                fill="rgba(0, 0, 0, 0.48)"
              />
              <line
                x1={widthPx - visualFadeOutPx}
                y1={0}
                x2={widthPx}
                y2={clipHeight}
                stroke="#38bdf8"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      )}

      {/* Audio Volume Fade In / Fade Out Envelope Overlay (Emerald Dashed Audio Ramp) */}
      {hasAudioTrack && (audioFadeInPx > 0 || audioFadeOutPx > 0) && (
        <svg
          width={widthPx}
          height={clipHeight}
          viewBox={`0 0 ${widthPx} ${clipHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none rounded-lg overflow-hidden z-[6]"
        >
          {(() => {
            const topY = clip.type === 'video' ? Math.round(clipHeight * 0.45) : 0;
            return (
              <>
                {audioFadeInPx > 0 && (
                  <>
                    <polygon
                      points={`0,${clipHeight} ${audioFadeInPx},${clipHeight} ${audioFadeInPx},${topY}`}
                      fill="rgba(16, 185, 129, 0.25)"
                    />
                    <line
                      x1={0}
                      y1={clipHeight}
                      x2={audioFadeInPx}
                      y2={topY}
                      stroke="#34d399"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </>
                )}
                {audioFadeOutPx > 0 && (
                  <>
                    <polygon
                      points={`${widthPx - audioFadeOutPx},${topY} ${widthPx - audioFadeOutPx},${clipHeight} ${widthPx},${clipHeight}`}
                      fill="rgba(16, 185, 129, 0.25)"
                    />
                    <line
                      x1={widthPx - audioFadeOutPx}
                      y1={topY}
                      x2={widthPx}
                      y2={clipHeight}
                      stroke="#34d399"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </>
                )}
              </>
            );
          })()}
        </svg>
      )}

      {/* Visual Image Fade In Dot Handle (Top-Left, Sky Blue) */}
      {isSelected && hasVisualTrack && (
        <div
          onPointerDown={(e) => startFadeDrag(e, 'visualFadeIn')}
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `${visualFadeInPx}px`,
            transform: visualFadeInPx < 6 ? 'translateX(0px)' : 'translateX(-50%)',
          }}
          className="absolute -top-2.5 w-6 h-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/fade"
          title={`Aparición de imagen: ${visualFadeInSec.toFixed(2)}s (arrastra)`}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-[0_0_8px_rgba(56,189,248,0.95)] transition-transform ${
              dragMode === 'visualFadeIn'
                ? 'bg-sky-300 scale-125'
                : 'bg-sky-400 group-hover/fade:scale-125'
            }`}
          />
          {dragMode === 'visualFadeIn' && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-sky-400/60 text-[10px] font-mono text-sky-300 whitespace-nowrap shadow-lg pointer-events-none">
              Imagen In: {visualFadeInSec.toFixed(2)}s
            </div>
          )}
        </div>
      )}

      {/* Visual Image Fade Out Dot Handle (Top-Right, Sky Blue) */}
      {isSelected && hasVisualTrack && (
        <div
          onPointerDown={(e) => startFadeDrag(e, 'visualFadeOut')}
          onClick={(e) => e.stopPropagation()}
          style={{
            right: `${visualFadeOutPx}px`,
            transform: visualFadeOutPx < 6 ? 'translateX(0px)' : 'translateX(50%)',
          }}
          className="absolute -top-2.5 w-6 h-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/fade"
          title={`Desvanecimiento de imagen: ${visualFadeOutSec.toFixed(2)}s (arrastra)`}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-[0_0_8px_rgba(56,189,248,0.95)] transition-transform ${
              dragMode === 'visualFadeOut'
                ? 'bg-sky-300 scale-125'
                : 'bg-sky-400 group-hover/fade:scale-125'
            }`}
          />
          {dragMode === 'visualFadeOut' && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-sky-400/60 text-[10px] font-mono text-sky-300 whitespace-nowrap shadow-lg pointer-events-none">
              Imagen Out: {visualFadeOutSec.toFixed(2)}s
            </div>
          )}
        </div>
      )}

      {/* Audio Volume Fade In Dot Handle (Bottom-Left on Video, Top-Left on Audio, Emerald) */}
      {isSelected && hasAudioTrack && (
        <div
          onPointerDown={(e) => startFadeDrag(e, 'audioFadeIn')}
          onClick={(e) => e.stopPropagation()}
          style={{
            left: `${audioFadeInPx}px`,
            transform: audioFadeInPx < 6 ? 'translateX(0px)' : 'translateX(-50%)',
          }}
          className={`absolute ${
            clip.type === 'video' ? '-bottom-2.5' : '-top-2.5'
          } w-6 h-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/audiofade`}
          title={`Aparición de volumen: ${audioFadeInSec.toFixed(2)}s (arrastra)`}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-[0_0_8px_rgba(52,211,153,0.95)] transition-transform ${
              dragMode === 'audioFadeIn'
                ? 'bg-emerald-300 scale-125'
                : 'bg-emerald-400 group-hover/audiofade:scale-125'
            }`}
          />
          {dragMode === 'audioFadeIn' && (
            <div
              className={`absolute ${
                clip.type === 'video' ? '-bottom-6' : '-top-6'
              } left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[10px] font-mono text-emerald-300 whitespace-nowrap shadow-lg pointer-events-none`}
            >
              Vol In: {audioFadeInSec.toFixed(2)}s
            </div>
          )}
        </div>
      )}

      {/* Audio Volume Fade Out Dot Handle (Bottom-Right on Video, Top-Right on Audio, Emerald) */}
      {isSelected && hasAudioTrack && (
        <div
          onPointerDown={(e) => startFadeDrag(e, 'audioFadeOut')}
          onClick={(e) => e.stopPropagation()}
          style={{
            right: `${audioFadeOutPx}px`,
            transform: audioFadeOutPx < 6 ? 'translateX(0px)' : 'translateX(50%)',
          }}
          className={`absolute ${
            clip.type === 'video' ? '-bottom-2.5' : '-top-2.5'
          } w-6 h-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/audiofade`}
          title={`Desvanecimiento de volumen: ${audioFadeOutSec.toFixed(2)}s (arrastra)`}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-[0_0_8px_rgba(52,211,153,0.95)] transition-transform ${
              dragMode === 'audioFadeOut'
                ? 'bg-emerald-300 scale-125'
                : 'bg-emerald-400 group-hover/audiofade:scale-125'
            }`}
          />
          {dragMode === 'audioFadeOut' && (
            <div
              className={`absolute ${
                clip.type === 'video' ? '-bottom-6' : '-top-6'
              } left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[10px] font-mono text-emerald-300 whitespace-nowrap shadow-lg pointer-events-none`}
            >
              Vol Out: {audioFadeOutSec.toFixed(2)}s
            </div>
          )}
        </div>
      )}

      {/* Clip Content Label & Badges */}
      <div className="flex items-center gap-1.5 px-3.5 z-10 truncate w-full pointer-events-none">
        {getClipIcon()}
        <span className="text-[11px] font-bold text-white drop-shadow truncate">
          {clip.name}
        </span>

        {hasAnimation && (
          <span
            className="px-1 py-0.5 rounded bg-purple-500/40 border border-purple-400/50 text-[9px] text-purple-100 flex items-center gap-0.5 shrink-0"
            title="Animación activa"
          >
            <Zap className="w-2.5 h-2.5" />
          </span>
        )}

        {hasEffect && (
          <span
            className="px-1 py-0.5 rounded bg-fuchsia-500/40 border border-fuchsia-400/50 text-[9px] text-fuchsia-100 font-bold shrink-0"
            title={`Efecto: ${(clip as VideoClip).effect.type}`}
          >
            FX
          </span>
        )}

        {hasFilter && (
          <span
            className="px-1 py-0.5 rounded bg-cyan-500/40 border border-cyan-400/50 text-[9px] text-cyan-100 font-bold shrink-0"
            title={`Filtro: ${(clip as VideoClip).filterPreset}`}
          >
            LUT
          </span>
        )}

        {isAudioMuted && clip.type === 'video' && (
          <span
            className="px-1 py-0.5 rounded bg-slate-900/70 text-[9px] text-slate-300 flex items-center gap-0.5 shrink-0"
            title="Audio silenciado / separado"
          >
            <VolumeX className="w-2.5 h-2.5 text-rose-400" />
          </span>
        )}

        <span className="text-[10px] text-slate-200/90 font-mono ml-auto shrink-0">
          {clip.duration.toFixed(1)}s
        </span>
      </div>

      {/* Keyframe Diamond Markers on Timeline Clip */}
      {(clip.type === 'video' ||
        clip.type === 'image' ||
        clip.type === 'text' ||
        clip.type === 'subtitle') &&
        ((clip as VideoClip | TextClip).keyframes || []).map((kf) => {
          const kfLeftPx = Math.max(
            0,
            Math.min(widthPx, kf.time * pixelsPerSecond)
          );
          const isAtPlayhead =
            Math.abs(currentTime - clip.startTime - kf.time) <= 0.05;
          const isKfMenuOpen = activeKeyframeId === kf.id;
          const handleDeleteKf = () => {
            removeKeyframe(clip.id, kf.id);
            setActiveKeyframeId(null);
            showToast('💎 Keyframe eliminado');
          };
          return (
            <div
              key={kf.id}
              style={{ left: `${kfLeftPx}px` }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0.5 -translate-x-1/2 z-30 flex items-center justify-center"
            >
              {isKfMenuOpen && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-950/95 border border-white/20 shadow-xl whitespace-nowrap"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentTime(clip.startTime + kf.time);
                      setActiveKeyframeId(null);
                    }}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300 hover:bg-white/10 transition-colors"
                    title="Ir a este keyframe"
                  >
                    {kf.time.toFixed(2)}s
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKf();
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors"
                    title="Eliminar keyframe"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelected) {
                    useEditorStore.setState({
                      selectedClipId: clip.id,
                      selectedTrackId: clip.trackId,
                    });
                  }
                  setActiveKeyframeId((prev) => (prev === kf.id ? null : kf.id));
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDeleteKf();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteKf();
                }}
                className={`p-0.5 flex items-center justify-center transition-transform hover:scale-125 ${
                  isAtPlayhead || isKfMenuOpen ? 'scale-125' : ''
                }`}
                title={`Keyframe en ${kf.time.toFixed(2)}s · Clic para opciones · Doble clic o clic derecho para eliminar`}
              >
                <Diamond
                  className={`w-3 h-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                    isKfMenuOpen
                      ? 'text-white fill-rose-400'
                      : isAtPlayhead
                        ? 'text-white fill-amber-300'
                        : 'text-amber-300 fill-amber-400'
                  }`}
                />
              </button>
            </div>
          );
        })}

      {/* Right Trim Handle */}
      {isSelected && (
        <div
          onPointerDown={handlePointerDownRightTrim}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize bg-white/90 hover:bg-white rounded-r-md flex items-center justify-center z-30 touch-none shadow"
          title="Arrastra para recortar el final"
        >
          <div className="w-0.5 h-5 bg-slate-900 rounded-full" />
        </div>
      )}
    </div>
  );
});
