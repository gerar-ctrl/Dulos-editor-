// ============================================================================
// Timeline - Multi-track Magnetic Timeline (Mobile & Desktop)
// ============================================================================

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import { importMediaFiles } from '../../core/media/importMediaFiles';
import { TrackHeader } from './TrackHeader';
import { ClipItem } from './ClipItem';
import { Playhead } from './Playhead';
import { ClipReorderView } from './ClipReorderView';
import { TrackVolumeEnvelope } from './TrackVolumeEnvelope';
import {
  ZoomIn,
  ZoomOut,
  Plus,
  Video,
  Layers,
  Type,
  Music,
  VolumeX,
  Upload,
  Magnet,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpDown,
  Minus,
  Pin,
} from 'lucide-react';

const MIN_TIMELINE_ZOOM = 5;
const MAX_TIMELINE_ZOOM = 350;
const MIN_TRACK_HEIGHT = 36;
const MAX_TRACK_HEIGHT = 140;

interface TimelineProps {
  onOpenTool?: (toolId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ onOpenTool }) => {
  const {
    project,
    timelineZoom,
    setTimelineZoom,
    trackHeight,
    setTrackHeight,
    setCurrentTime,
    selectedClipId,
    selectClip,
    selectedTrackId,
    selectTrack,
    visibleVolumeTracks,
    setIsMediaDrawerOpen,
    toggleTrackMute,
    isMagnetEnabled,
    toggleMagnet,
    playheadMode,
    togglePlayheadMode,
    reorderTrackId,
    setReorderTrackId,
    isRecordingDub,
    dubRecordingStartTime,
  } = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      timelineZoom: s.timelineZoom,
      setTimelineZoom: s.setTimelineZoom,
      trackHeight: s.trackHeight,
      setTrackHeight: s.setTrackHeight,
      setCurrentTime: s.setCurrentTime,
      selectedClipId: s.selectedClipId,
      selectClip: s.selectClip,
      selectedTrackId: s.selectedTrackId,
      selectTrack: s.selectTrack,
      visibleVolumeTracks: s.visibleVolumeTracks,
      setIsMediaDrawerOpen: s.setIsMediaDrawerOpen,
      toggleTrackMute: s.toggleTrackMute,
      isMagnetEnabled: s.isMagnetEnabled,
      toggleMagnet: s.toggleMagnet,
      playheadMode: s.playheadMode,
      togglePlayheadMode: s.togglePlayheadMode,
      reorderTrackId: s.reorderTrackId,
      setReorderTrackId: s.setReorderTrackId,
      isRecordingDub: s.isRecordingDub,
      dubRecordingStartTime: s.dubRecordingStartTime,
    }))
  );
  const dubCurrentTime = useEditorStore((s) =>
    s.isRecordingDub ? s.currentTime : 0
  );

  const timelineRootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const leftHeadersScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineContentRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRulerRef = useRef(false);
  const rulerDragStartXRef = useRef(0);
  const rulerDragStartScrollRef = useRef(0);
  const rulerDidDragRef = useRef(false);
  const isPanningTimelineRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollRef = useRef(0);
  const panDidDragRef = useRef(false);
  const suppressClickAfterPanRef = useRef(false);
  const [isPanningTimeline, setIsPanningTimeline] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticTargetScrollRef = useRef(0);
  const lastProgrammaticScrollMsRef = useRef(0);
  const isTouchingTimelineRef = useRef(false);
  const dragCounterRef = useRef(0);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const isFixedGuide = playheadMode === 'fixed';
  const playheadModeRef = useRef(playheadMode);
  playheadModeRef.current = playheadMode;
  const centerOffset = isFixedGuide ? Math.floor(viewportWidth / 2) : 0;

  const duration = Math.max(15, project.settings.duration);
  const extraRunwaySeconds = Math.max(
    12,
    Math.ceil(Math.max(viewportWidth, 400) / Math.max(timelineZoom, 5))
  );
  const displayDuration = Math.max(duration, project.settings.duration + extraRunwaySeconds);
  const totalWidth = displayDuration * timelineZoom;

  const totalClipsCount = project.tracks.reduce(
    (acc, t) => acc + t.clips.length,
    0
  );

  const trackBounds = useMemo(() => {
    const allClips = project.tracks.flatMap((t) => t.clips);
    if (allClips.length === 0) {
      return { start: 0, end: 0 };
    }
    let minStart = Infinity;
    let maxEnd = 0;
    for (const c of allClips) {
      if (c.startTime < minStart) minStart = c.startTime;
      const clipEnd = c.startTime + c.duration;
      if (clipEnd > maxEnd) maxEnd = clipEnd;
    }
    return {
      start: minStart === Infinity ? 0 : minStart,
      end: maxEnd,
    };
  }, [project.tracks]);

  const handleGoToTrackStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetTime = trackBounds.start;
    setCurrentTime(targetTime);
    if (!isFixedGuide && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = Math.max(
        0,
        targetTime * timelineZoom - 40
      );
    }
  };

  const handleGoToTrackEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetTime =
      totalClipsCount > 0 ? trackBounds.end : project.settings.duration;
    setCurrentTime(targetTime);
    if (!isFixedGuide && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const targetPx = targetTime * timelineZoom;
      el.scrollLeft = Math.max(0, targetPx - el.clientWidth + 80);
    }
  };

  const reorderTrack = useMemo(
    () =>
      reorderTrackId
        ? project.tracks.find((t) => t.id === reorderTrackId) ?? null
        : null,
    [project.tracks, reorderTrackId]
  );
  const isReordering = Boolean(reorderTrack && reorderTrack.clips.length > 1);

  // Measure scrollable timeline viewport width for centering the fixed guide
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setViewportWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isReordering]);

  const timelineZoomRef = useRef(timelineZoom);
  timelineZoomRef.current = timelineZoom;

  const firstTrack = project.tracks[0];
  const isFirstTrackSelected = Boolean(
    firstTrack &&
      (selectedTrackId === firstTrack.id ||
        (selectedClipId &&
          firstTrack.clips.some((c) => c.id === selectedClipId)))
  );
  const isFirstTrackSelectedRef = useRef(isFirstTrackSelected);
  isFirstTrackSelectedRef.current = isFirstTrackSelected;

  const scrollToTimeCentered = (time: number, zoom = timelineZoomRef.current) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const targetScroll = Math.max(0, time * zoom);
    if (Math.abs(el.scrollLeft - targetScroll) < 0.5) return;
    isProgrammaticScrollRef.current = true;
    programmaticTargetScrollRef.current = targetScroll;
    lastProgrammaticScrollMsRef.current = performance.now();
    el.scrollLeft = targetScroll;
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  };

  const applyZoomAnchored = (nextZoom: number, anchorClientX?: number) => {
    const clamped = Math.max(
      MIN_TIMELINE_ZOOM,
      Math.min(MAX_TIMELINE_ZOOM, nextZoom)
    );
    const el = scrollContainerRef.current;
    const prevZoom = timelineZoomRef.current;
    if (!el || Math.abs(clamped - prevZoom) < 0.001) {
      timelineZoomRef.current = clamped;
      setTimelineZoom(clamped);
      return;
    }

    if (playheadModeRef.current === 'fixed') {
      const anchorTime = useEditorStore.getState().currentTime;
      timelineZoomRef.current = clamped;
      setTimelineZoom(clamped);
      requestAnimationFrame(() => {
        scrollToTimeCentered(anchorTime, clamped);
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const anchorOffset = isFirstTrackSelectedRef.current
      ? 0
      : anchorClientX !== undefined
        ? Math.max(0, Math.min(el.clientWidth, anchorClientX - rect.left))
        : el.clientWidth / 2;
    const anchorTime = (el.scrollLeft + anchorOffset) / prevZoom;

    timelineZoomRef.current = clamped;
    setTimelineZoom(clamped);

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = Math.max(
          0,
          anchorTime * clamped - anchorOffset
        );
      }
    });
  };

  // PC Ctrl/Alt/Meta + Wheel & Trackpad Pinch-to-Zoom, plus Mobile Two-Finger Pinch
  useEffect(() => {
    const rootEl = timelineRootRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!rootEl && !scrollEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
      e.preventDefault();
      e.stopPropagation();

      const deltaPx =
        e.deltaMode === 1
          ? e.deltaY * 16
          : e.deltaMode === 2
            ? e.deltaY * 300
            : e.deltaY;
      if (deltaPx === 0) return;

      const factor = Math.exp(-deltaPx * 0.004);
      applyZoomAnchored(timelineZoomRef.current * factor, e.clientX);
    };

    let pinchStartDist = 0;
    let pinchStartZoom = timelineZoomRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        pinchStartZoom = timelineZoomRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        const midX = (t1.clientX + t2.clientX) / 2;
        const scale = dist / pinchStartDist;
        applyZoomAnchored(pinchStartZoom * scale, midX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
      }
    };

    const wheelTarget = rootEl ?? scrollEl;
    wheelTarget?.addEventListener('wheel', handleWheel, { passive: false });
    scrollEl?.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollEl?.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollEl?.addEventListener('touchend', handleTouchEnd);
    scrollEl?.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      wheelTarget?.removeEventListener('wheel', handleWheel);
      scrollEl?.removeEventListener('touchstart', handleTouchStart);
      scrollEl?.removeEventListener('touchmove', handleTouchMove);
      scrollEl?.removeEventListener('touchend', handleTouchEnd);
      scrollEl?.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isReordering]);

  // Auto-scroll timeline to follow playhead (or keep track centered on fixed guide) without React re-renders
  useEffect(() => {
    const syncScrollToTime = (t: number) => {
      const el = scrollContainerRef.current;
      if (!el) return;

      if (playheadModeRef.current === 'fixed') {
        scrollToTimeCentered(t);
        return;
      }

      const playheadPx = t * timelineZoomRef.current;
      const viewLeft = el.scrollLeft;
      const viewRight = el.scrollLeft + el.clientWidth;

      if (playheadPx > viewRight - 60) {
        el.scrollLeft = playheadPx - 60;
      } else if (playheadPx < viewLeft) {
        el.scrollLeft = Math.max(0, playheadPx - 40);
      }
    };

    syncScrollToTime(useEditorStore.getState().currentTime);
    return useEditorStore.subscribe((state, prevState) => {
      if (state.currentTime !== prevState.currentTime) {
        syncScrollToTime(state.currentTime);
      }
    });
  }, [isFixedGuide, viewportWidth, isReordering]);

  // Click & Drag on Ruler to Seek Playhead (or Pan Track in Fixed Guide Mode)
  const handleSeekFromEvent = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const clickX = clientX - rect.left - centerOffset;
    const newTime = Math.max(0, Math.min(duration, clickX / timelineZoom));
    setCurrentTime(newTime);
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRulerRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (isFixedGuide) {
      rulerDragStartXRef.current = e.clientX;
      rulerDragStartScrollRef.current = scrollContainerRef.current?.scrollLeft ?? 0;
      rulerDidDragRef.current = false;
      return;
    }
    handleSeekFromEvent(e.clientX, e.currentTarget);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRulerRef.current) return;
    if (isFixedGuide) {
      const dx = e.clientX - rulerDragStartXRef.current;
      if (Math.abs(dx) > 3) {
        rulerDidDragRef.current = true;
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = Math.max(
          0,
          rulerDragStartScrollRef.current - dx
        );
      }
      return;
    }
    handleSeekFromEvent(e.clientX, e.currentTarget);
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRulerRef.current && isFixedGuide && !rulerDidDragRef.current) {
      handleSeekFromEvent(e.clientX, e.currentTarget);
    }
    isDraggingRulerRef.current = false;
  };

  // Pan timeline tracks horizontally with mouse/pen drag (both Free Line & Fixed Guide modes)
  const handleTimelineBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRulerRef.current) return;
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const el = scrollContainerRef.current;
    if (!el) return;

    isPanningTimelineRef.current = true;
    panStartXRef.current = e.clientX;
    panStartScrollRef.current = el.scrollLeft;
    panDidDragRef.current = false;

    const handleWindowPointerMove = (ev: PointerEvent) => {
      if (!isPanningTimelineRef.current || !scrollContainerRef.current) return;
      const dx = ev.clientX - panStartXRef.current;
      if (!panDidDragRef.current && Math.abs(dx) > 4) {
        panDidDragRef.current = true;
        setIsPanningTimeline(true);
      }
      if (panDidDragRef.current) {
        scrollContainerRef.current.scrollLeft = Math.max(
          0,
          panStartScrollRef.current - dx
        );
      }
    };

    const handleWindowPointerUp = () => {
      if (panDidDragRef.current) {
        suppressClickAfterPanRef.current = true;
        window.setTimeout(() => {
          suppressClickAfterPanRef.current = false;
        }, 0);
      }
      isPanningTimelineRef.current = false;
      panDidDragRef.current = false;
      setIsPanningTimeline(false);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  // Memoized ruler tick marks so panning/playback never rebuilds tick DOM nodes
  const rulerTicks = useMemo(() => {
    const ticks = [];
    const step =
      timelineZoom > 120
        ? 0.5
        : timelineZoom > 50
        ? 1
        : timelineZoom > 25
        ? 2
        : timelineZoom > 12
        ? 5
        : 10;

    for (let t = 0; t <= displayDuration; t += step) {
      const left = t * timelineZoom;
      const isWholeSecond = Math.abs(t - Math.round(t)) < 0.01;

      ticks.push(
        <div
          key={t}
          style={{ left: `${left}px` }}
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-between"
        >
          <div
            className={`w-[1px] ${
              isWholeSecond ? 'h-3 bg-slate-400' : 'h-1.5 bg-slate-700'
            }`}
          />
          {isWholeSecond && (
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono pl-1 select-none">
              {Math.floor(t)}s
            </span>
          )}
        </div>
      );
    }
    return ticks;
  }, [displayDuration, timelineZoom]);

  const getTrackIcon = (type: string, isMuted: boolean) => {
    if (isMuted) return <VolumeX className="w-3.5 h-3.5 text-rose-400" />;
    if (type === 'main-video') return <Video className="w-3.5 h-3.5 text-indigo-400" />;
    if (type === 'overlay-video') return <Layers className="w-3.5 h-3.5 text-pink-400" />;
    if (type === 'text') return <Type className="w-3.5 h-3.5 text-amber-400" />;
    return <Music className="w-3.5 h-3.5 text-emerald-400" />;
  };

  // Drag & Drop local audio/video/image files from OS onto the Timeline
  const hasDraggedFiles = (dt: DataTransfer | null) =>
    Boolean(dt && Array.from(dt.types || []).includes('Files'));

  const getDropTimeFromClientX = (clientX: number) => {
    if (totalClipsCount === 0 || !timelineContentRef.current) return 0;
    const rect = timelineContentRef.current.getBoundingClientRect();
    const raw = (clientX - rect.left) / timelineZoom;
    return raw < 0.25 ? 0 : Math.max(0, Number(raw.toFixed(2)));
  };

  const handleTimelineDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsFileDragOver(true);
  };

  const handleTimelineDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleTimelineDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsFileDragOver(false);
      setDragOverTrackId(null);
    }
  };

  const handleTimelineDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsFileDragOver(false);
    const droppedTrackId = dragOverTrackId ?? undefined;
    setDragOverTrackId(null);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const dropTime = getDropTimeFromClientX(e.clientX);
    void importMediaFiles(files, {
      targetTrackId: droppedTrackId,
      dropTime,
    });
  };

  useEffect(() => {
    if (reorderTrackId && (!reorderTrack || reorderTrack.clips.length <= 1)) {
      setReorderTrackId(null);
    }
  }, [reorderTrackId, reorderTrack, setReorderTrackId]);

  if (isReordering && reorderTrack) {
    return <ClipReorderView track={reorderTrack} />;
  }

  return (
    <div
      ref={timelineRootRef}
      onDragEnter={handleTimelineDragEnter}
      onDragOver={handleTimelineDragOver}
      onDragLeave={handleTimelineDragLeave}
      onDrop={handleTimelineDrop}
      className="flex-1 flex flex-col bg-[#0b0c13] select-none overflow-hidden relative"
    >
      {/* Drag & Drop File Overlay */}
      {isFileDragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-indigo-950/55 backdrop-blur-[1px] border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#111322]/95 border border-indigo-400/50 shadow-2xl">
            <Upload className="w-5 h-5 text-indigo-300 animate-bounce" />
            <span className="text-xs sm:text-sm font-semibold text-indigo-100">
              Suelta aquí tu archivo de video o audio para añadirlo a la línea de tiempo
            </span>
          </div>
        </div>
      )}
      {/* Zoom Bar and Status */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-2 sm:px-3 py-1 bg-[#090a10] border-b border-white/5 text-[11px] text-slate-400 shrink-0 gap-x-2 gap-y-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
          <span className="font-semibold text-slate-300 truncate">Línea de Tiempo</span>
          <span className="text-slate-500 shrink-0">· {totalClipsCount} clips</span>
        </div>

        {/* Magnet Toggle, Zoom Controls & Track Jump Arrows */}
        <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 w-full sm:w-auto max-w-full overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayheadMode();
            }}
            aria-pressed={isFixedGuide}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] font-semibold active:scale-95 transition-all shrink-0 whitespace-nowrap ${
              isFixedGuide
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title={
              isFixedGuide
                ? 'Guía fija activada: la línea central es fija y la pista se desliza debajo para recortar ahí (clic para cambiar a Línea libre)'
                : 'Línea libre activada: mueve la línea roja a tu gusto (clic para cambiar a Guía fija)'
            }
          >
            {isFixedGuide ? (
              <Pin className="w-3 h-3" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            )}
            <span>{isFixedGuide ? 'Guía fija' : 'Línea libre'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMagnet();
            }}
            aria-pressed={isMagnetEnabled}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] font-semibold active:scale-95 transition-all shrink-0 whitespace-nowrap ${
              isMagnetEnabled
                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-400/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title={
              isMagnetEnabled
                ? 'Imán activado: los clips se ajustan al inicio y sin espacios (clic para desactivar)'
                : 'Imán desactivado: movimiento libre en la línea de tiempo (clic para activar)'
            }
          >
            <Magnet className="w-3 h-3" />
            <span>Imán</span>
          </button>

          <div className="h-3.5 w-[1px] bg-white/10" />

          <div
            className="flex items-center gap-1 sm:gap-1.5"
            title="Usa el deslizador o Ctrl + Rueda del ratón para encoger o agrandar la pista"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                applyZoomAnchored(timelineZoom / 1.25);
              }}
              className="p-1 hover:text-white rounded active:scale-95 transition-all"
              title="Encoger pista (Reducir zoom)"
              aria-label="Encoger pista"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={MIN_TIMELINE_ZOOM}
              max={MAX_TIMELINE_ZOOM}
              step={1}
              value={Math.round(timelineZoom)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                applyZoomAnchored(Number(e.target.value));
              }}
              aria-label="Zoom de la línea de tiempo"
              className="w-12 sm:w-24 md:w-28 cursor-pointer accent-indigo-500"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                applyZoomAnchored(timelineZoom * 1.25);
              }}
              className="p-1 hover:text-white rounded active:scale-95 transition-all"
              title="Agrandar pista (Aumentar zoom)"
              aria-label="Agrandar pista"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="hidden sm:inline-block font-mono text-[10px] text-indigo-400 w-12 text-center">
              {Math.round(timelineZoom)} px/s
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-white/10" />

          {/* Vertical Track Height Controls */}
          <div
            className="flex items-center gap-1"
            title="Agrandar o encoger el tamaño vertical de las pistas"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400 hidden sm:block shrink-0" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTrackHeight(trackHeight - 12);
              }}
              disabled={trackHeight <= MIN_TRACK_HEIGHT}
              className="p-1 hover:text-white rounded active:scale-95 transition-all disabled:opacity-35 disabled:pointer-events-none"
              title="Encoger altura de pista"
              aria-label="Encoger altura de pista"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={MIN_TRACK_HEIGHT}
              max={MAX_TRACK_HEIGHT}
              step={2}
              value={trackHeight}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                setTrackHeight(Number(e.target.value));
              }}
              aria-label="Altura vertical de las pistas"
              className="hidden md:block w-14 lg:w-20 cursor-pointer accent-indigo-500"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTrackHeight(trackHeight + 12);
              }}
              disabled={trackHeight >= MAX_TRACK_HEIGHT}
              className="p-1 hover:text-white rounded active:scale-95 transition-all disabled:opacity-35 disabled:pointer-events-none"
              title="Agrandar altura de pista"
              aria-label="Agrandar altura de pista"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="hidden lg:inline-block font-mono text-[10px] text-indigo-400 w-9 text-center">
              {trackHeight}px
            </span>
          </div>

          <div className="h-3.5 w-[1px] bg-white/10" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleGoToTrackStart}
              className="flex items-center justify-center p-1 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Ir al principio de la pista"
              aria-label="Ir al principio de la pista"
            >
              <ArrowLeftToLine className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleGoToTrackEnd}
              className="flex items-center justify-center p-1 rounded-md border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Ir al final de la pista"
              aria-label="Ir al final de la pista"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Grid */}
      <div className="flex-1 flex overflow-hidden relative mt-2.5 sm:mt-0 border-t border-white/5 sm:border-t-0">
        {/* Left Track Headers */}
        <div className="flex flex-col bg-[#10111a] z-20 shadow-lg shrink-0 overflow-hidden">
          <div className="h-10 sm:h-6 w-8 sm:w-44 border-r border-b border-white/5 bg-[#0e0f17] shrink-0" />

          <div
            ref={leftHeadersScrollRef}
            className="flex-1 overflow-hidden"
          >
            {/* Desktop full headers */}
            <div className="hidden sm:flex flex-col">
              {project.tracks.map((track) => (
                <TrackHeader key={track.id} track={track} />
              ))}
            </div>

            {/* Mobile compact icons (Tap to toggle mute) */}
            <div className="flex sm:hidden flex-col">
              {project.tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTrackMute(track.id);
                  }}
                  style={{ height: `${trackHeight}px` }}
                  className="w-8 flex items-center justify-center border-r border-b border-white/5 bg-[#0e0f17] active:bg-white/10 shrink-0"
                  title={`${track.name} (Toca para silenciar)`}
                >
                  {getTrackIcon(track.type, track.isMuted)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Scrollable Timeline Body + Fixed Center Guide Overlay */}
        <div className="flex-1 relative flex overflow-hidden">
          <div
            ref={scrollContainerRef}
            onPointerDown={handleTimelineBodyPointerDown}
            onTouchStart={() => {
              isTouchingTimelineRef.current = true;
            }}
            onTouchEnd={() => {
              window.setTimeout(() => {
                isTouchingTimelineRef.current = false;
              }, 120);
            }}
            onTouchCancel={() => {
              isTouchingTimelineRef.current = false;
            }}
            onClickCapture={(e) => {
              if (suppressClickAfterPanRef.current) {
                e.stopPropagation();
                suppressClickAfterPanRef.current = false;
              }
            }}
            onScroll={(e) => {
              if (leftHeadersScrollRef.current) {
                leftHeadersScrollRef.current.scrollTop = e.currentTarget.scrollTop;
              }
              if (playheadModeRef.current === 'fixed') {
                const sl = e.currentTarget.scrollLeft;
                const userInteracting =
                  isDraggingRulerRef.current ||
                  isPanningTimelineRef.current ||
                  isTouchingTimelineRef.current;
                if (
                  !userInteracting &&
                  (useEditorStore.getState().isPlaying ||
                    performance.now() - lastProgrammaticScrollMsRef.current < 150 ||
                    (isProgrammaticScrollRef.current &&
                      Math.abs(sl - programmaticTargetScrollRef.current) < 2))
                ) {
                  return;
                }
                const newTime = Math.max(
                  0,
                  Math.min(displayDuration, sl / timelineZoomRef.current)
                );
                if (
                  Math.abs(newTime - useEditorStore.getState().currentTime) >
                  0.0005
                ) {
                  setCurrentTime(newTime);
                }
              }
            }}
            className={`flex-1 overflow-x-auto overflow-y-auto relative bg-[#0b0c13] timeline-scroll-container overscroll-x-contain ${
              isPanningTimeline ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <div
              ref={timelineContentRef}
              style={{
                width: `${Math.max(totalWidth, 800) + centerOffset * 2}px`,
                paddingLeft: `${centerOffset}px`,
                paddingRight: `${centerOffset}px`,
              }}
              className="relative min-h-full"
            >
              {/* Top Time Ruler */}
              <div
                onPointerDown={handleRulerPointerDown}
                onPointerMove={handleRulerPointerMove}
                onPointerUp={handleRulerPointerUp}
                onClick={(e) => e.stopPropagation()}
                className="h-10 sm:h-6 bg-[#0e0f17] border-b border-white/5 cursor-pointer relative touch-none sticky top-0 z-20"
              >
                {rulerTicks}
              </div>

              {/* Movable Red Playhead Marker (Free Mode) */}
              {!isFixedGuide && (
                <Playhead
                  pixelsPerSecond={timelineZoom}
                  totalDuration={duration}
                />
              )}

            {/* Empty State Overlay when no clips exist */}
            {totalClipsCount === 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMediaDrawerOpen(true);
                }}
                className="absolute inset-x-4 sm:inset-x-8 top-12 sm:top-9 bottom-3 border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-xl flex items-center justify-center gap-2 bg-indigo-950/20 hover:bg-indigo-950/30 cursor-pointer transition-all z-10 px-4 text-center"
              >
                <Plus className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-indigo-200">
                  Toca o arrastra aquí tu video, foto o audio
                </span>
              </div>
            )}

            {/* Tracks & Clips Rows */}
            <div className="flex flex-col">
              {project.tracks.map((track) => (
                <div
                  key={track.id}
                  onDragOver={(e) => {
                    if (!hasDraggedFiles(e.dataTransfer)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dragOverTrackId !== track.id) {
                      setDragOverTrackId(track.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectTrack(track.id);
                  }}
                  style={{ height: `${trackHeight}px` }}
                  className={`border-b border-white/5 relative transition-colors ${
                    isFileDragOver && dragOverTrackId === track.id
                      ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/50'
                      : selectedTrackId === track.id
                        ? 'bg-indigo-500/[0.05]'
                        : 'bg-white/[0.01] hover:bg-white/[0.02]'
                  }`}
                >
                  {track.clips.map((clip) => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      pixelsPerSecond={timelineZoom}
                      scrollContainerRef={scrollContainerRef}
                      onOpenTool={onOpenTool}
                    />
                  ))}
                  {isRecordingDub &&
                    dubRecordingStartTime !== null &&
                    track.id === 'track_audio' && (
                      <div
                        style={{
                          left: `${dubRecordingStartTime * timelineZoom}px`,
                          width: `${Math.max(
                            8,
                            (dubCurrentTime - dubRecordingStartTime) * timelineZoom
                          )}px`,
                        }}
                        className="absolute top-1 bottom-1 rounded-md bg-rose-500/35 border border-rose-400/80 pointer-events-none flex items-center px-2 overflow-hidden z-20"
                      >
                        <span className="text-[10px] font-bold text-rose-100 whitespace-nowrap animate-pulse">
                          🎤 Grabando...
                        </span>
                      </div>
                    )}
                  {visibleVolumeTracks[track.id] && track.type !== 'text' && (
                    <TrackVolumeEnvelope
                      track={track}
                      pixelsPerSecond={timelineZoom}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

          {/* Fixed Center Guide Line (Fixed Mode) */}
          {isFixedGuide && (
            <div
              aria-hidden="true"
              style={{ left: `${centerOffset}px` }}
              className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2 z-30 flex flex-col items-center"
            >
              <div className="w-3 h-2.5 bg-amber-400 rounded-b-sm shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              <div className="w-[2px] flex-1 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.85)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
