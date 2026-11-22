// ============================================================================
// TrackVolumeEnvelope - Sony Vegas-style Track Volume Envelope & Keyframe Nodes
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Track, TrackVolumeKeyframe } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import {
  evaluateTrackVolumeAtTime,
  sortVolumeKeyframes,
} from '../../core/audio/trackVolumeEnvelope';

interface TrackVolumeEnvelopeProps {
  track: Track;
  pixelsPerSecond: number;
}

const EDGE_PADDING_PX = 4;
const MIN_NODE_GAP_SEC = 0.02;

function formatDb(volumePct: number): string {
  if (volumePct <= 0) return '-∞ dB';
  const db = 20 * Math.log10(volumePct / 100);
  const sign = db >= 0 ? '+' : '';
  return `${sign}${db.toFixed(1)} dB`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

type DragMode =
  | { kind: 'flat'; latestVolume: number }
  | { kind: 'node'; nodeId: string; latestKeyframes: TrackVolumeKeyframe[] }
  | {
      kind: 'segment-tail';
      nodeIndex: number;
      startY: number;
      initialVol: number;
      baseKeyframes: TrackVolumeKeyframe[];
      latestKeyframes: TrackVolumeKeyframe[];
      moved: boolean;
    }
  | {
      kind: 'segment-middle';
      leftIndex: number;
      rightIndex: number;
      startY: number;
      initialLeftVol: number;
      initialRightVol: number;
      baseKeyframes: TrackVolumeKeyframe[];
      latestKeyframes: TrackVolumeKeyframe[];
      moved: boolean;
    };

export const TrackVolumeEnvelope: React.FC<TrackVolumeEnvelopeProps> = ({
  track,
  pixelsPerSecond,
}) => {
  const setTrackVolume = useEditorStore((s) => s.setTrackVolume);
  const setTrackVolumeKeyframes = useEditorStore(
    (s) => s.setTrackVolumeKeyframes
  );
  const selectedVolumeNode = useEditorStore((s) => s.selectedVolumeNode);
  const setSelectedVolumeNode = useEditorStore((s) => s.setSelectedVolumeNode);
  const trackHeight = useEditorStore((s) => s.trackHeight);
  const usableHeight = Math.max(16, trackHeight - EDGE_PADDING_PX * 2);

  const selectedNodeId =
    selectedVolumeNode?.trackId === track.id ? selectedVolumeNode.nodeId : null;
  const setSelectedNodeId = (id: string | null) => {
    setSelectedVolumeNode(id ? { trackId: track.id, nodeId: id } : null);
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const [containerWidth, setContainerWidth] = useState(1200);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    volume: number;
    time?: number;
  } | null>(null);

  const keyframes = sortVolumeKeyframes(track.volumeKeyframes ?? []);
  const flatVolume = Math.max(0, Math.min(200, track.volume ?? 100));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Delete selected node with Delete / Backspace without deleting clips
  useEffect(() => {
    if (!selectedNodeId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (track.isLocked) return;
      const current = sortVolumeKeyframes(track.volumeKeyframes ?? []);
      const idx = current.findIndex((k) => k.id === selectedNodeId);
      if (idx === -1) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const next = current.filter((k) => k.id !== selectedNodeId);
      if (next.length === 0) {
        setTrackVolume(track.id, current[idx].volume, false);
      }
      setTrackVolumeKeyframes(track.id, next, true);
      setSelectedNodeId(null);
      setTooltip(null);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    selectedNodeId,
    track.id,
    track.isLocked,
    track.volumeKeyframes,
    setTrackVolume,
    setTrackVolumeKeyframes,
  ]);

  const volumeToY = (vol: number): number =>
    EDGE_PADDING_PX + (1 - Math.max(0, Math.min(200, vol)) / 200) * usableHeight;

  const yToVolume = (localY: number): number => {
    const clampedY = Math.max(
      EDGE_PADDING_PX,
      Math.min(trackHeight - EDGE_PADDING_PX, localY)
    );
    const ratio = (clampedY - EDGE_PADDING_PX) / usableHeight;
    return Math.max(0, Math.min(200, Math.round((1 - ratio) * 200)));
  };

  const timeToX = (sec: number): number => sec * pixelsPerSecond;
  const xToTime = (localX: number): number =>
    Math.max(0, Number((localX / Math.max(1, pixelsPerSecond)).toFixed(3)));

  const getLocalCoords = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { localX: 0, localY: trackHeight / 2, width: containerWidth };
    const rect = el.getBoundingClientRect();
    return {
      localX: Math.max(0, clientX - rect.left),
      localY: clientY - rect.top,
      width: rect.width,
    };
  };

  const clampBadgeX = (localX: number, width: number) =>
    Math.max(56, Math.min(Math.max(56, width - 56), localX));

  const deleteNode = (nodeId: string) => {
    if (track.isLocked) return;
    const current = sortVolumeKeyframes(track.volumeKeyframes ?? []);
    const target = current.find((k) => k.id === nodeId);
    if (!target) return;
    const next = current.filter((k) => k.id !== nodeId);
    if (next.length === 0) {
      setTrackVolume(track.id, target.volume, false);
    }
    setTrackVolumeKeyframes(track.id, next, true);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (hoveredNodeId === nodeId) setHoveredNodeId(null);
    setTooltip(null);
  };

  // --- Flat line (0 nodes) pointer handlers ---
  const handleFlatPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (track.isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { localX, localY, width } = getLocalCoords(e.clientX, e.clientY);
    const nextVol = yToVolume(localY);
    dragRef.current = { kind: 'flat', latestVolume: nextVol };
    setIsDragging(true);
    setSelectedNodeId(null);
    setTooltip({
      x: clampBadgeX(localX, width),
      y: volumeToY(nextVol),
      volume: nextVol,
    });
    setTrackVolume(track.id, nextVol, false);
  };

  const handleFlatPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { localX, localY, width } = getLocalCoords(e.clientX, e.clientY);
    const drag = dragRef.current;
    if (!drag || drag.kind !== 'flat') {
      setTooltip({
        x: clampBadgeX(localX, width),
        y: volumeToY(flatVolume),
        volume: flatVolume,
      });
      return;
    }
    e.stopPropagation();
    const nextVol = yToVolume(localY);
    drag.latestVolume = nextVol;
    setTooltip({
      x: clampBadgeX(localX, width),
      y: volumeToY(nextVol),
      volume: nextVol,
    });
    setTrackVolume(track.id, nextVol, false);
  };

  const handleFlatPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== 'flat') return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    setTrackVolume(track.id, drag.latestVolume, true);
  };

  // --- Node pointer handlers ---
  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: TrackVolumeKeyframe
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedNodeId(node.id);
    if (track.isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: 'node',
      nodeId: node.id,
      latestKeyframes: keyframes,
    };
    setIsDragging(true);
    const { width } = getLocalCoords(e.clientX, e.clientY);
    setTooltip({
      x: clampBadgeX(timeToX(node.time), width),
      y: volumeToY(node.volume),
      volume: node.volume,
      time: node.time,
    });
  };

  const handleNodePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== 'node') return;
    e.stopPropagation();
    const { localX, localY, width } = getLocalCoords(e.clientX, e.clientY);
    const current = sortVolumeKeyframes(drag.latestKeyframes);
    const idx = current.findIndex((k) => k.id === drag.nodeId);
    if (idx === -1) return;

    const minTime = idx > 0 ? current[idx - 1].time + MIN_NODE_GAP_SEC : 0;
    const maxTime =
      idx < current.length - 1
        ? current[idx + 1].time - MIN_NODE_GAP_SEC
        : Infinity;

    const nextTime = Math.max(minTime, Math.min(maxTime, xToTime(localX)));
    const nextVol = yToVolume(localY);

    const updated = current.map((k, i) =>
      i === idx ? { ...k, time: nextTime, volume: nextVol } : k
    );
    drag.latestKeyframes = updated;
    setTooltip({
      x: clampBadgeX(timeToX(nextTime), width),
      y: volumeToY(nextVol),
      volume: nextVol,
      time: nextTime,
    });
    setTrackVolumeKeyframes(track.id, updated, false);
  };

  const handleNodePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== 'node') return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    setTrackVolumeKeyframes(track.id, drag.latestKeyframes, true);
  };

  // --- Segment pointer handlers (when keyframes.length >= 1) ---
  const handleSegmentPointerDown = (
    e: React.PointerEvent<SVGLineElement>,
    segmentIndex: number
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (track.isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const { localY } = getLocalCoords(e.clientX, e.clientY);

    if (segmentIndex === 0 || segmentIndex === keyframes.length) {
      const nodeIdx = segmentIndex === 0 ? 0 : keyframes.length - 1;
      dragRef.current = {
        kind: 'segment-tail',
        nodeIndex: nodeIdx,
        startY: localY,
        initialVol: keyframes[nodeIdx].volume,
        baseKeyframes: keyframes,
        latestKeyframes: keyframes,
        moved: false,
      };
      setIsDragging(true);
      return;
    }

    const leftIdx = segmentIndex - 1;
    const rightIdx = segmentIndex;
    dragRef.current = {
      kind: 'segment-middle',
      leftIndex: leftIdx,
      rightIndex: rightIdx,
      startY: localY,
      initialLeftVol: keyframes[leftIdx].volume,
      initialRightVol: keyframes[rightIdx].volume,
      baseKeyframes: keyframes,
      latestKeyframes: keyframes,
      moved: false,
    };
    setIsDragging(true);
  };

  const handleSegmentPointerMove = (e: React.PointerEvent<SVGLineElement>) => {
    const { localX, localY, width } = getLocalCoords(e.clientX, e.clientY);
    const drag = dragRef.current;

    if (!drag) {
      const hoverTime = xToTime(localX);
      const hoverVol = Math.round(evaluateTrackVolumeAtTime(track, hoverTime));
      setTooltip({
        x: clampBadgeX(localX, width),
        y: volumeToY(hoverVol),
        volume: hoverVol,
        time: hoverTime,
      });
      return;
    }

    if (drag.kind === 'segment-tail') {
      e.stopPropagation();
      const deltaY = localY - drag.startY;
      if (!drag.moved && Math.abs(deltaY) < 2) return;
      drag.moved = true;
      const deltaVol = Math.round((-deltaY / usableHeight) * 200);
      const nextVol = Math.max(
        0,
        Math.min(200, Math.round(drag.initialVol + deltaVol))
      );
      const updated = drag.baseKeyframes.map((k, i) =>
        i === drag.nodeIndex ? { ...k, volume: nextVol } : k
      );
      drag.latestKeyframes = updated;
      setTooltip({
        x: clampBadgeX(localX, width),
        y: volumeToY(nextVol),
        volume: nextVol,
      });
      setTrackVolumeKeyframes(track.id, updated, false);
      return;
    }

    if (drag.kind === 'segment-middle') {
      e.stopPropagation();
      const deltaY = localY - drag.startY;
      if (!drag.moved && Math.abs(deltaY) < 2) return;
      drag.moved = true;
      const deltaVol = Math.round((-deltaY / usableHeight) * 200);
      const nextLeft = Math.max(
        0,
        Math.min(200, Math.round(drag.initialLeftVol + deltaVol))
      );
      const nextRight = Math.max(
        0,
        Math.min(200, Math.round(drag.initialRightVol + deltaVol))
      );
      const updated = drag.baseKeyframes.map((k, i) => {
        if (i === drag.leftIndex) return { ...k, volume: nextLeft };
        if (i === drag.rightIndex) return { ...k, volume: nextRight };
        return k;
      });
      drag.latestKeyframes = updated;
      const avgVol = Math.round((nextLeft + nextRight) / 2);
      setTooltip({
        x: clampBadgeX(localX, width),
        y: volumeToY(avgVol),
        volume: avgVol,
      });
      setTrackVolumeKeyframes(track.id, updated, false);
    }
  };

  const handleSegmentPointerUp = (e: React.PointerEvent<SVGLineElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drag.kind === 'segment-tail' || drag.kind === 'segment-middle') {
      const committed = drag.moved;
      const latest = drag.latestKeyframes;
      dragRef.current = null;
      setIsDragging(false);
      if (committed) {
        setTrackVolumeKeyframes(track.id, latest, true);
      }
    }
  };

  // Build SVG points for >= 1 keyframes
  const svgEndX = Math.max(
    containerWidth,
    keyframes.length > 0 ? timeToX(keyframes[keyframes.length - 1].time) + 120 : 0
  );

  const envelopeCoords: Array<{ x: number; y: number }> =
    keyframes.length > 0
      ? [
          { x: 0, y: volumeToY(keyframes[0].volume) },
          ...keyframes.map((k) => ({
            x: timeToX(k.time),
            y: volumeToY(k.volume),
          })),
          { x: svgEndX, y: volumeToY(keyframes[keyframes.length - 1].volume) },
        ]
      : [];

  const polylinePoints = envelopeCoords.map((p) => `${p.x},${p.y}`).join(' ');
  const fillPolygonPoints =
    envelopeCoords.length > 0
      ? `0,${trackHeight} ${polylinePoints} ${svgEndX},${trackHeight}`
      : '';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[35]"
    >
      {/* Subtle 100% center reference line while dragging */}
      {isDragging && (
        <div
          style={{ top: `${trackHeight / 2}px` }}
          className="absolute inset-x-0 border-t border-dashed border-white/25"
        />
      )}

      {keyframes.length === 0 ? (
        /* Flat line mode (0 nodes) */
        <div
          onPointerDown={handleFlatPointerDown}
          onPointerMove={handleFlatPointerMove}
          onPointerUp={handleFlatPointerUp}
          onPointerCancel={handleFlatPointerUp}
          onPointerEnter={(e) => {
            setIsHovered(true);
            const { localX, width } = getLocalCoords(e.clientX, e.clientY);
            setTooltip({
              x: clampBadgeX(localX, width),
              y: volumeToY(flatVolume),
              volume: flatVolume,
            });
          }}
          onPointerLeave={() => {
            setIsHovered(false);
            if (!isDragging) setTooltip(null);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ top: `${volumeToY(flatVolume)}px` }}
          className={`absolute inset-x-0 h-5 -translate-y-1/2 pointer-events-auto touch-none flex items-center ${
            track.isLocked ? 'cursor-not-allowed' : 'cursor-ns-resize'
          }`}
          title={`Volumen de pista: ${flatVolume}% (${formatDb(flatVolume)}) · Arrastra arriba/abajo · Usa "Añadir nodo" para fijar un nodo en la guía · Tecla V para ocultar`}
        >
          <div
            className={`w-full transition-all ${
              isDragging
                ? 'h-[3px] bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,1)]'
                : isHovered
                  ? 'h-[2.5px] bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.95)]'
                  : 'h-[2px] bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]'
            }`}
          />
        </div>
      ) : (
        /* Keyframe Envelope Mode (>= 1 nodes) */
        <>
          <svg
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          >
            {/* Subtle area fill under envelope */}
            <polygon
              points={fillPolygonPoints}
              fill="rgba(56, 189, 248, 0.06)"
              className="pointer-events-none"
            />
            {/* Visible envelope line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={isDragging || isHovered ? '#7dd3fc' : '#38bdf8'}
              strokeWidth={isDragging ? 2.8 : isHovered ? 2.4 : 2}
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.75))',
              }}
              className="pointer-events-none"
            />
            {/* Interactive hit-target segments */}
            {envelopeCoords.slice(0, -1).map((pt, idx) => {
              const nextPt = envelopeCoords[idx + 1];
              return (
                <line
                  key={`seg-${idx}`}
                  x1={pt.x}
                  y1={pt.y}
                  x2={nextPt.x}
                  y2={nextPt.y}
                  stroke="transparent"
                  strokeWidth={20}
                  pointerEvents="stroke"
                  className={
                    track.isLocked ? 'cursor-not-allowed' : 'cursor-ns-resize'
                  }
                  onPointerEnter={() => setIsHovered(true)}
                  onPointerLeave={() => {
                    setIsHovered(false);
                    if (!isDragging) setTooltip(null);
                  }}
                  onPointerDown={(e) => handleSegmentPointerDown(e, idx)}
                  onPointerMove={handleSegmentPointerMove}
                  onPointerUp={handleSegmentPointerUp}
                  onPointerCancel={handleSegmentPointerUp}
                  onClick={(e) => e.stopPropagation()}
                />
              );
            })}
          </svg>

          {/* Draggable Keyframe Nodes */}
          {keyframes.map((node) => {
            const leftPx = timeToX(node.time);
            const topPx = volumeToY(node.volume);
            const isSelected = selectedNodeId === node.id;
            const isNodeHovered = hoveredNodeId === node.id;
            const volRounded = Math.round(node.volume);

            return (
              <div
                key={node.id}
                style={{ left: `${leftPx}px`, top: `${topPx}px` }}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerUp}
                onPointerCancel={handleNodePointerUp}
                onPointerEnter={(e) => {
                  setHoveredNodeId(node.id);
                  const { width } = getLocalCoords(e.clientX, e.clientY);
                  setTooltip({
                    x: clampBadgeX(leftPx, width),
                    y: topPx,
                    volume: volRounded,
                    time: node.time,
                  });
                }}
                onPointerLeave={() => {
                  setHoveredNodeId(null);
                  if (!isDragging) setTooltip(null);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deleteNode(node.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center pointer-events-auto touch-none ${
                  track.isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                }`}
                title={`Nodo @ ${formatTime(node.time)} · ${volRounded}% (${formatDb(volRounded)}) · Arrastra para mover · Usa "Quitar nodo" o doble clic para eliminar`}
              >
                <div
                  className={`w-3 h-3 rotate-45 border-[1.5px] transition-transform ${
                    isSelected
                      ? 'bg-white border-sky-400 scale-125 ring-2 ring-sky-400/70 shadow-[0_0_10px_rgba(56,189,248,1)]'
                      : isNodeHovered
                        ? 'bg-white border-sky-400 scale-115 shadow-[0_0_8px_rgba(255,255,255,0.95)]'
                        : 'bg-sky-300 border-slate-950 shadow-[0_0_6px_rgba(56,189,248,0.95)]'
                  }`}
                />
              </div>
            );
          })}
        </>
      )}

      {/* Floating Volume Tooltip */}
      {(isDragging || isHovered || hoveredNodeId !== null) && tooltip && (
        <div
          style={{
            left: `${tooltip.x}px`,
            top: tooltip.y < 22 ? `${tooltip.y + 12}px` : `${tooltip.y - 24}px`,
          }}
          className="absolute -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/95 border border-sky-400/60 text-[10px] font-mono text-sky-200 whitespace-nowrap shadow-lg pointer-events-none"
        >
          {tooltip.time !== undefined ? `${formatTime(tooltip.time)} · ` : ''}
          Vol: {Math.round(tooltip.volume)}% ({formatDb(tooltip.volume)})
        </div>
      )}
    </div>
  );
};
