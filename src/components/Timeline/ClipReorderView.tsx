// ============================================================================
// ClipReorderView - Compact "Ordenar" View for Drag-and-Drop Clip Reordering
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Film, Music, Type } from 'lucide-react';
import { TimelineClip, Track, VideoClip } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';

interface ClipReorderViewProps {
  track: Track;
}

// In-memory cache of extracted video frame thumbnails keyed by sourceUrl + sourceStartTime
const thumbnailCache = new Map<string, string>();
const pendingExtractions = new Map<string, Promise<string | null>>();

// Shared offscreen canvas for fast thumbnail rasterization
let sharedThumbCanvas: HTMLCanvasElement | null = null;
function drawVideoToThumbDataUrl(video: HTMLVideoElement): string | null {
  try {
    const vw = video.videoWidth || 160;
    const vh = video.videoHeight || 160;
    const size = 112;
    if (!sharedThumbCanvas) {
      sharedThumbCanvas = document.createElement('canvas');
      sharedThumbCanvas.width = size;
      sharedThumbCanvas.height = size;
    }
    const ctx = sharedThumbCanvas.getContext('2d');
    if (!ctx) return null;
    const scale = Math.max(size / vw, size / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(video, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return sharedThumbCanvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

// Concurrency-limited extraction queue so multiple clips don't choke browser video decoders
const MAX_CONCURRENT_THUMBNAILS = 3;
let activeThumbnailJobs = 0;
const thumbnailJobQueue: Array<() => void> = [];

function enqueueThumbnailJob<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeThumbnailJobs++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activeThumbnailJobs--;
          const next = thumbnailJobQueue.shift();
          if (next) next();
        });
    };
    if (activeThumbnailJobs < MAX_CONCURRENT_THUMBNAILS) {
      run();
    } else {
      thumbnailJobQueue.push(run);
    }
  });
}

function extractVideoThumbnail(
  clipId: string,
  sourceUrl: string,
  sourceStartTime: number
): Promise<string | null> {
  const key = `${sourceUrl}__${sourceStartTime.toFixed(2)}`;
  const cached = thumbnailCache.get(key);
  if (cached) return Promise.resolve(cached);

  // Instant synchronous capture if the editor already has this video loaded near sourceStartTime
  const existingEl = useEditorStore.getState().mediaElements.get(clipId);
  if (
    existingEl instanceof HTMLVideoElement &&
    existingEl.readyState >= 2 &&
    Math.abs(existingEl.currentTime - sourceStartTime) < 0.25
  ) {
    const instantUrl = drawVideoToThumbDataUrl(existingEl);
    if (instantUrl) {
      thumbnailCache.set(key, instantUrl);
      return Promise.resolve(instantUrl);
    }
  }

  const existing = pendingExtractions.get(key);
  if (existing) return existing;

  const promise = enqueueThumbnailJob(
    () =>
      new Promise<string | null>((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        if (
          sourceUrl.startsWith('http://') ||
          sourceUrl.startsWith('https://')
        ) {
          video.crossOrigin = 'anonymous';
        }

        let settled = false;
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoaded);
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          video.removeAttribute('src');
          video.load();
        };

        const finish = (dataUrl: string | null) => {
          if (settled) return;
          settled = true;
          cleanup();
          pendingExtractions.delete(key);
          if (dataUrl) thumbnailCache.set(key, dataUrl);
          resolve(dataUrl);
        };

        const timeoutId = window.setTimeout(() => finish(null), 3000);

        const onSeeked = () => {
          window.clearTimeout(timeoutId);
          finish(drawVideoToThumbDataUrl(video));
        };

        const onLoaded = () => {
          const dur = Number.isFinite(video.duration) ? video.duration : 0;
          const target =
            dur > 0
              ? Math.min(Math.max(0.05, sourceStartTime), Math.max(0.05, dur - 0.05))
              : 0;
          if (target <= 0.1 || Math.abs(video.currentTime - target) < 0.08) {
            onSeeked();
          } else {
            video.currentTime = target;
          }
        };

        const onError = () => {
          window.clearTimeout(timeoutId);
          finish(null);
        };

        video.addEventListener('loadeddata', onLoaded);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        video.src = sourceUrl;
      })
  );

  pendingExtractions.set(key, promise);
  return promise;
}

function formatCompactDuration(seconds: number): string {
  const safe = Math.max(0, seconds);
  if (safe < 1) {
    return `${safe.toFixed(1)}s`;
  }
  const rounded = Math.round(safe);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `:${secs.toString().padStart(2, '0')}`;
}

const ClipThumbnailCard: React.FC<{
  clip: TimelineClip;
  isSelected: boolean;
  isDragging: boolean;
}> = React.memo(({ clip, isSelected, isDragging }) => {
  const cacheKey =
    clip.type === 'video'
      ? `${clip.sourceUrl}__${clip.sourceStartTime.toFixed(2)}`
      : '';
  const [thumbUrl, setThumbUrl] = useState<string | null>(() =>
    clip.type === 'video'
      ? (clip as VideoClip).thumbnailUrl || thumbnailCache.get(cacheKey) || null
      : null
  );

  useEffect(() => {
    if (clip.type !== 'video') return;
    if ((clip as VideoClip).thumbnailUrl) {
      setThumbUrl((clip as VideoClip).thumbnailUrl!);
      return;
    }
    const cached = thumbnailCache.get(cacheKey);
    if (cached) {
      setThumbUrl(cached);
      return;
    }
    let cancelled = false;
    extractVideoThumbnail(clip.id, clip.sourceUrl, clip.sourceStartTime).then((url) => {
      if (!cancelled && url) {
        setThumbUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clip.id, clip.type, (clip as VideoClip).sourceUrl, (clip as VideoClip).sourceStartTime, (clip as VideoClip).thumbnailUrl, cacheKey]);

  const speedPct = `${Math.round((clip.speed || 1) * 100)}%`;
  const durationLabel = formatCompactDuration(clip.duration);

  return (
    <div
      className={`relative shrink-0 rounded-lg overflow-hidden select-none transition-[transform,border-color,box-shadow] duration-75 ${
        isDragging
          ? 'w-[74px] h-[74px] sm:w-[82px] sm:h-[82px] scale-105 z-30 border-2 border-orange-500 shadow-[0_8px_24px_rgba(249,115,22,0.45)] cursor-grabbing'
          : isSelected
          ? 'w-[70px] h-[70px] sm:w-[78px] sm:h-[78px] z-20 border-2 border-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.35)] cursor-grab'
          : 'w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] z-10 border border-white/15 hover:border-white/40 opacity-90 hover:opacity-100 cursor-grab'
      } bg-[#181a28]`}
    >
      {/* Visual / Media Preview */}
      {clip.type === 'image' && (
        <img
          src={clip.sourceUrl}
          alt={clip.name}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {clip.type === 'video' && thumbUrl && (
        <img
          src={thumbUrl}
          alt={clip.name}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {clip.type === 'video' && !thumbUrl && (
        <div className="w-full h-full flex items-center justify-center bg-indigo-950/70">
          <Film className="w-5 h-5 text-indigo-300" />
        </div>
      )}

      {clip.type === 'audio' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-950/70 px-1">
          <Music className="w-5 h-5 text-emerald-300 mb-0.5" />
          <span className="text-[9px] text-emerald-200/90 truncate w-full text-center">
            {clip.name}
          </span>
        </div>
      )}

      {(clip.type === 'text' || clip.type === 'subtitle') && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-amber-950/70 px-1">
          <Type className="w-4 h-4 text-amber-300 mb-0.5" />
          <span className="text-[9px] text-amber-100 truncate w-full text-center">
            {clip.textConfig.text || clip.name}
          </span>
        </div>
      )}

      {/* Bottom readability gradient */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

      {/* Speed (%) and Duration (:SS) overlay matching reference */}
      <div className="absolute left-1.5 bottom-1 flex flex-col leading-tight pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
        <span className="text-[10px] font-bold text-white tracking-tight">
          {speedPct}
        </span>
        <span className="text-[10px] font-bold text-white tracking-tight">
          {durationLabel}
        </span>
      </div>
    </div>
  );
});

export const ClipReorderView: React.FC<ClipReorderViewProps> = ({ track }) => {
  const {
    selectedClipId,
    selectClip,
    setCurrentTime,
    setReorderTrackId,
    reorderTrackClips,
  } = useEditorStore();

  const sortedClips = useMemo(
    () => [...track.clips].sort((a, b) => a.startTime - b.startTime),
    [track.clips]
  );

  const [localOrder, setLocalOrder] = useState<string[]>(() =>
    sortedClips.map((c) => c.id)
  );
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);

  const scrollRowRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragStateRef = useRef<{
    clipId: string;
    startX: number;
    didDrag: boolean;
    initialOrder: string[];
  } | null>(null);
  const localOrderRef = useRef<string[]>(localOrder);
  localOrderRef.current = localOrder;

  // Keep localOrder synced when track clips change externally (and not actively dragging)
  useEffect(() => {
    if (!draggingClipId) {
      setLocalOrder(sortedClips.map((c) => c.id));
    }
  }, [sortedClips, draggingClipId]);

  // Auto-exit if track no longer has multiple clips
  useEffect(() => {
    if (track.clips.length <= 1) {
      setReorderTrackId(null);
    }
  }, [track.clips.length, setReorderTrackId]);

  const clipById = useMemo(
    () => new Map(track.clips.map((c) => [c.id, c])),
    [track.clips]
  );

  const orderedClips = useMemo(
    () =>
      localOrder
        .map((id) => clipById.get(id))
        .filter((c): c is TimelineClip => Boolean(c)),
    [localOrder, clipById]
  );

  const cachedCentersRef = useRef<Array<{ id: string; centerX: number }> | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef<number>(0);

  const stopAutoScroll = () => {
    autoScrollSpeedRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  useEffect(() => () => stopAutoScroll(), []);

  const refreshCenters = (draggedId: string) => {
    const list: Array<{ id: string; centerX: number }> = [];
    for (const id of localOrderRef.current) {
      if (id === draggedId) continue;
      const el = itemRefs.current.get(id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      list.push({ id, centerX: rect.left + rect.width / 2 });
    }
    cachedCentersRef.current = list;
    return list;
  };

  const computeTargetIndex = (clientX: number, draggedId: string): number => {
    const centers = cachedCentersRef.current || refreshCenters(draggedId);
    let insertIdx = centers.length;
    for (let i = 0; i < centers.length; i++) {
      if (clientX < centers[i].centerX) {
        insertIdx = i;
        break;
      }
    }
    return insertIdx;
  };

  const handleCardPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clipId: string
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    cachedCentersRef.current = null;
    dragStateRef.current = {
      clipId,
      startX: e.clientX,
      didDrag: false,
      initialOrder: [...localOrderRef.current],
    };
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    e.stopPropagation();

    const deltaX = Math.abs(e.clientX - drag.startX);
    if (!drag.didDrag && deltaX < 4) return;

    if (!drag.didDrag) {
      drag.didDrag = true;
      setDraggingClipId(drag.clipId);
      selectClip(drag.clipId);
      refreshCenters(drag.clipId);
    }

    // Smooth rAF edge auto-scroll for long lists of sections
    const container = scrollRowRef.current;
    if (container) {
      const cRect = container.getBoundingClientRect();
      if (e.clientX < cRect.left + 48) {
        autoScrollSpeedRef.current = -10;
      } else if (e.clientX > cRect.right - 48) {
        autoScrollSpeedRef.current = 10;
      } else {
        autoScrollSpeedRef.current = 0;
      }

      if (autoScrollSpeedRef.current !== 0 && autoScrollRafRef.current === null) {
        const step = () => {
          const c = scrollRowRef.current;
          const speed = autoScrollSpeedRef.current;
          if (!c || speed === 0 || !dragStateRef.current) {
            autoScrollRafRef.current = null;
            return;
          }
          c.scrollLeft += speed;
          cachedCentersRef.current = null;
          autoScrollRafRef.current = requestAnimationFrame(step);
        };
        autoScrollRafRef.current = requestAnimationFrame(step);
      } else if (autoScrollSpeedRef.current === 0 && autoScrollRafRef.current !== null) {
        stopAutoScroll();
      }
    }

    const targetIdx = computeTargetIndex(e.clientX, drag.clipId);
    const currentIdx = localOrderRef.current.indexOf(drag.clipId);
    if (currentIdx !== -1 && targetIdx !== currentIdx) {
      const next = localOrderRef.current.filter((id) => id !== drag.clipId);
      next.splice(targetIdx, 0, drag.clipId);
      localOrderRef.current = next;
      cachedCentersRef.current = null;
      setLocalOrder(next);
    }
  };

  const handleCardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    e.stopPropagation();
    dragStateRef.current = null;
    cachedCentersRef.current = null;
    stopAutoScroll();

    if (drag.didDrag) {
      setDraggingClipId(null);
      const finalOrder = localOrderRef.current;
      const orderChanged = finalOrder.some(
        (id, idx) => id !== drag.initialOrder[idx]
      );
      if (orderChanged) {
        reorderTrackClips(track.id, finalOrder);
      }
      selectClip(drag.clipId);
    } else {
      // Tap without dragging: select this section and preview its start
      selectClip(drag.clipId);
      const clicked = clipById.get(drag.clipId);
      if (clicked) {
        setCurrentTime(clicked.startTime);
      }
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex-1 flex flex-col bg-[#0b0c13] select-none overflow-hidden"
    >
      {/* Top Bar: Centered "Ordenar" + Orange Checkmark */}
      <div className="relative flex items-center justify-center px-3 py-2 border-b border-white/10 bg-[#0e0f18] shrink-0">
        <span className="text-xs sm:text-sm font-medium text-slate-200 tracking-wide">
          Ordenar
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReorderTrackId(null);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-orange-500 hover:text-orange-400 hover:bg-white/10 active:scale-95 transition-all"
          title="Confirmar orden"
          aria-label="Confirmar orden"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Horizontal Compact Clips Row */}
      <div
        ref={scrollRowRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-hidden px-4 sm:px-6 gap-2.5 sm:gap-3 timeline-scroll-container"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 mx-auto py-2">
          {orderedClips.map((clip) => {
            const isSelected = selectedClipId === clip.id;
            const isDragging = draggingClipId === clip.id;
            return (
              <div
                key={clip.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(clip.id, el);
                  else itemRefs.current.delete(clip.id);
                }}
                onPointerDown={(e) => handleCardPointerDown(e, clip.id)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerCancel={handleCardPointerUp}
                className="touch-none shrink-0"
              >
                <ClipThumbnailCard
                  clip={clip}
                  isSelected={isSelected}
                  isDragging={isDragging}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle Bottom Hint */}
      <div className="pb-1.5 text-center text-[10px] text-slate-500 shrink-0 pointer-events-none">
        Arrastra cualquier sección al principio, en medio o al final · Toca ✓ para volver
      </div>
    </div>
  );
};
