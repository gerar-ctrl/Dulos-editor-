// ============================================================================
// TransformGizmo - Multi-Touch (1 & 2 Fingers) Free Resize, Pinch, Stretch & Move
// ============================================================================

import React, { useState, useRef } from 'react';
import { TransformProperties, VideoClip, TextClip } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import { interpolateClipTransform } from '../../core/keyframes/interpolateKeyframes';
import {
  RotateCw,
  Maximize,
  Minimize,
  Crosshair,
  FlipHorizontal,
  Move,
  Hand,
  Lock,
  Pencil,
} from 'lucide-react';

interface TransformGizmoProps {
  clip: VideoClip | TextClip;
  canvasWidth: number;
  canvasHeight: number;
  frameWidth: number;
  frameHeight: number;
  baseWidthPx: number;
  baseHeightPx: number;
  alignOffsetX?: number;
  onTransformChange: (t: TransformProperties) => void;
  onStartInlineTextEdit?: () => void;
}

export const TransformGizmo: React.FC<TransformGizmoProps> = ({
  clip,
  canvasWidth,
  canvasHeight,
  frameWidth,
  frameHeight,
  baseWidthPx,
  baseHeightPx,
  alignOffsetX = 0,
  onTransformChange,
  onStartInlineTextEdit,
}) => {
  const currentTime = useEditorStore((s) => s.currentTime);
  const transform = interpolateClipTransform(
    clip,
    Math.max(0, currentTime - clip.startTime)
  );
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const isFreeResize = transform.freeResize === true; // Fixed proportion by default; user can toggle to Free anytime

  const [mode, setMode] = useState<
    'none' | 'move' | 'scale-corner' | 'scale-edge' | 'rotate' | 'pinch'
  >('none');
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);

  const startPointerRef = useRef({ x: 0, y: 0 });
  const moveDraggedRef = useRef(false);
  const initialTransformRef = useRef({ ...transform, scaleX, scaleY });
  const scaleCornerSignRef = useRef({ sx: 1, sy: 1 });
  const boxCenterRef = useRef({ cx: 0, cy: 0 });

  // Multi-touch 2-finger pinch / stretch / rotate state
  const pinchStateRef = useRef<{
    active: boolean;
    startDist: number;
    startDx: number;
    startDy: number;
    startAngle: number;
    startMidX: number;
    startMidY: number;
    gestureAxis: 'uniform' | 'horizontal' | 'vertical';
    initialTransform: TransformProperties & { scaleX: number; scaleY: number };
  } | null>(null);

  // Convert clip dimensions & transform to CSS percentages
  const leftPercent =
    50 + transform.x + (alignOffsetX / Math.max(1, canvasWidth)) * 100;
  const topPercent = 50 + transform.y;
  const effectiveW = baseWidthPx * transform.scale * scaleX;
  const effectiveH = baseHeightPx * transform.scale * scaleY;
  const widthPercent = Math.max(
    12,
    (effectiveW / Math.max(1, canvasWidth)) * 100
  );
  const heightPercent = Math.max(
    10,
    (effectiveH / Math.max(1, canvasHeight)) * 100
  );

  // Handle 1-Finger Drag Move
  const handlePointerDownMove = (e: React.PointerEvent) => {
    if (pinchStateRef.current?.active) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setMode('move');
    moveDraggedRef.current = false;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    initialTransformRef.current = {
      ...transform,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
    };
  };

  // Handle Corner or Edge Finger Resize
  const handlePointerDownScale = (
    e: React.PointerEvent,
    sx: number,
    sy: number,
    isEdge = false
  ) => {
    if (pinchStateRef.current?.active) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setMode(isEdge ? 'scale-edge' : 'scale-corner');
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    initialTransformRef.current = {
      ...transform,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
    };
    scaleCornerSignRef.current = { sx, sy };
  };

  // Handle Rotate
  const handlePointerDownRotate = (e: React.PointerEvent) => {
    if (pinchStateRef.current?.active) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setMode('rotate');
    const parentRect = (
      e.currentTarget.parentElement as HTMLElement
    )?.getBoundingClientRect();
    if (parentRect) {
      boxCenterRef.current = {
        cx: parentRect.left + parentRect.width / 2,
        cy: parentRect.top + parentRect.height / 2,
      };
    }
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    initialTransformRef.current = {
      ...transform,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mode === 'none' || mode === 'pinch' || pinchStateRef.current?.active) {
      return;
    }
    e.stopPropagation();

    const safeFrameW = Math.max(80, frameWidth);
    const safeFrameH = Math.max(80, frameHeight);
    const deltaX = e.clientX - startPointerRef.current.x;
    const deltaY = e.clientY - startPointerRef.current.y;
    const init = initialTransformRef.current;

    if (mode === 'move') {
      if (Math.hypot(deltaX, deltaY) > 6) {
        moveDraggedRef.current = true;
      }
      let newX = init.x + (deltaX / safeFrameW) * 100;
      let newY = init.y + (deltaY / safeFrameH) * 100;

      // Magnetic Snapping to Center (within 1.6% threshold)
      if (Math.abs(newX) < 1.6) {
        newX = 0;
        setSnapX(true);
      } else {
        setSnapX(false);
      }

      if (Math.abs(newY) < 1.6) {
        newY = 0;
        setSnapY(true);
      } else {
        setSnapY(false);
      }

      onTransformChange({
        ...transform,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
      });
    } else if (mode === 'scale-edge' || mode === 'scale-corner') {
      const { sx, sy } = scaleCornerSignRef.current;

      // Project screen finger delta into clip's rotated coordinate space
      const rad = ((-init.rotation || 0) * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const localDx = deltaX * cosR - deltaY * sinR;
      const localDy = deltaX * sinR + deltaY * cosR;

      // Initial rendered box dimensions in screen pixels
      const initBoxScreenW = Math.max(
        30,
        ((baseWidthPx * init.scale * init.scaleX) / Math.max(1, canvasWidth)) *
          safeFrameW
      );
      const initBoxScreenH = Math.max(
        30,
        ((baseHeightPx * init.scale * init.scaleY) / Math.max(1, canvasHeight)) *
          safeFrameH
      );

      if (mode === 'scale-edge') {
        if (isFreeResize) {
          // Side handles stretch width (scaleX) or height (scaleY) independently in Free mode
          let newScaleX = init.scaleX;
          let newScaleY = init.scaleY;

          if (sx !== 0) {
            const factorX = 1 + (localDx * sx * 2) / initBoxScreenW;
            newScaleX = Math.max(0.1, Math.min(6.0, init.scaleX * factorX));
          }
          if (sy !== 0) {
            const factorY = 1 + (localDy * sy * 2) / initBoxScreenH;
            newScaleY = Math.max(0.1, Math.min(6.0, init.scaleY * factorY));
          }

          onTransformChange({
            ...transform,
            scaleX: Number(newScaleX.toFixed(2)),
            scaleY: Number(newScaleY.toFixed(2)),
          });
        } else {
          // Fixed mode: always scale uniformly without disproportionate stretching
          const factor =
            sx !== 0
              ? 1 + (localDx * sx * 2) / initBoxScreenW
              : 1 + (localDy * sy * 2) / initBoxScreenH;
          const newScale = Math.max(0.1, Math.min(6.0, init.scale * factor));
          onTransformChange({
            ...transform,
            scale: Number(newScale.toFixed(2)),
          });
        }
      } else {
        // Corner handle:
        // If Free Resize is enabled, allow independent Width & Height modification with 1 finger.
        // If Fixed mode (default), scale uniformly without stretching disproportionately.
        if (isFreeResize && !e.shiftKey) {
          const factorX = 1 + (localDx * sx * 2) / initBoxScreenW;
          const factorY = 1 + (localDy * sy * 2) / initBoxScreenH;
          const newScaleX = Math.max(0.1, Math.min(6.0, init.scaleX * factorX));
          const newScaleY = Math.max(0.1, Math.min(6.0, init.scaleY * factorY));

          onTransformChange({
            ...transform,
            scaleX: Number(newScaleX.toFixed(2)),
            scaleY: Number(newScaleY.toFixed(2)),
          });
        } else {
          const projectedDelta =
            (localDx * sx) / (initBoxScreenW * 0.5) +
            (localDy * sy) / (initBoxScreenH * 0.5);
          const newScale = Math.max(
            0.1,
            Math.min(6.0, init.scale * (1 + projectedDelta * 0.5))
          );
          onTransformChange({
            ...transform,
            scale: Number(newScale.toFixed(2)),
          });
        }
      }
    } else if (mode === 'rotate') {
      const { cx, cy } = boxCenterRef.current;
      if (cx && cy) {
        const startAngle =
          (Math.atan2(
            startPointerRef.current.y - cy,
            startPointerRef.current.x - cx
          ) *
            180) /
          Math.PI;
        const currAngle =
          (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
        let newRot = Math.round(init.rotation + (currAngle - startAngle));
        while (newRot > 180) newRot -= 360;
        while (newRot < -180) newRot += 360;
        for (const snapAngle of [0, 90, -90, 180, -180]) {
          if (Math.abs(newRot - snapAngle) <= 3) {
            newRot = snapAngle;
            break;
          }
        }
        onTransformChange({
          ...transform,
          rotation: newRot,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mode !== 'none' && mode !== 'pinch') {
      const wasTapOnText =
        mode === 'move' && !moveDraggedRef.current && Boolean(onStartInlineTextEdit);
      e.stopPropagation();
      setMode('none');
      setSnapX(false);
      setSnapY(false);
      if (wasTapOnText) {
        onStartInlineTextEdit?.();
      }
    }
  };

  // Multi-Touch 2-Finger Pinch / Stretch / Rotate / Pan directly on Gizmo
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      e.stopPropagation();
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

      // Determine if user placed fingers horizontally to stretch width, vertically to stretch height, or diagonally to zoom
      let gestureAxis: 'uniform' | 'horizontal' | 'vertical' = 'uniform';
      if (isFreeResize) {
        if (absDx > absDy * 2.35 && absDx > 36) {
          gestureAxis = 'horizontal';
        } else if (absDy > absDx * 2.35 && absDy > 36) {
          gestureAxis = 'vertical';
        }
      }

      pinchStateRef.current = {
        active: true,
        startDist: dist,
        startDx: Math.max(18, absDx),
        startDy: Math.max(18, absDy),
        startAngle: angle,
        startMidX: midX,
        startMidY: midY,
        gestureAxis,
        initialTransform: {
          ...transform,
          scaleX: transform.scaleX ?? 1,
          scaleY: transform.scaleY ?? 1,
        },
      };
      setMode('pinch');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pinchStateRef.current?.active || e.touches.length < 2) return;
    e.stopPropagation();

    const p = pinchStateRef.current;
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

    const safeFrameW = Math.max(80, frameWidth);
    const safeFrameH = Math.max(80, frameHeight);
    const init = p.initialTransform;

    const newX = init.x + ((currMidX - p.startMidX) / safeFrameW) * 100;
    const newY = init.y + ((currMidY - p.startMidY) / safeFrameH) * 100;

    if (p.gestureAxis === 'horizontal') {
      const ratioX = currAbsDx / p.startDx;
      const newScaleX = Math.max(0.1, Math.min(6.0, init.scaleX * ratioX));
      onTransformChange({
        ...transform,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
        scaleX: Number(newScaleX.toFixed(2)),
      });
    } else if (p.gestureAxis === 'vertical') {
      const ratioY = currAbsDy / p.startDy;
      const newScaleY = Math.max(0.1, Math.min(6.0, init.scaleY * ratioY));
      onTransformChange({
        ...transform,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
        scaleY: Number(newScaleY.toFixed(2)),
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

      onTransformChange({
        ...transform,
        x: Number(newX.toFixed(1)),
        y: Number(newY.toFixed(1)),
        scale: Number(newScale.toFixed(2)),
        rotation: newRot,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (pinchStateRef.current?.active && e.touches.length < 2) {
      pinchStateRef.current = null;
      setMode('none');
    }
  };

  const pctW = Math.round(transform.scale * scaleX * 100);
  const pctH = Math.round(transform.scale * scaleY * 100);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-20"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Magnetic Snap Guideline: Center X */}
      {snapX && (
        <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-10" />
      )}
      {/* Magnetic Snap Guideline: Center Y */}
      {snapY && (
        <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-10" />
      )}

      {/* Interactive Bounding Box Widget */}
      <div
        style={{
          position: 'absolute',
          left: `${leftPercent}%`,
          top: `${topPercent}%`,
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          transform: `translate(-50%, -50%) rotate(${transform.rotation}deg)`,
          border: '2px solid #38bdf8',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.45)',
        }}
        className="pointer-events-auto cursor-move flex items-center justify-center group touch-none"
        onPointerDown={handlePointerDownMove}
      >
        {/* Top Live Status Badge */}
        {mode !== 'none' && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black/90 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap shadow-lg pointer-events-none z-40">
            Ancho: {pctW}% · Alto: {pctH}% · {transform.rotation}°
          </div>
        )}

        {/* Rotation Handle (Large Touch Target) */}
        <div
          className="absolute -top-9 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none z-30"
          onPointerDown={handlePointerDownRotate}
          title="Arrastra para rotar"
        >
          <div className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center hover:scale-125 transition-transform">
            <RotateCw className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
          </div>
        </div>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[1.5px] h-6 bg-cyan-400 pointer-events-none" />

        {/* 4 Corner Handles (Large 36x36px Touch Zones for Mobile Fingers) */}
        <div
          className="absolute -top-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
          onPointerDown={(e) => handlePointerDownScale(e, -1, -1, false)}
          title={
            isFreeResize
              ? 'Arrastra para cambiar el tamaño libremente'
              : 'Arrastra para cambiar el tamaño proporcionalmente (Fijo)'
          }
        >
          <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md hover:scale-125 transition-transform" />
        </div>

        <div
          className="absolute -top-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
          onPointerDown={(e) => handlePointerDownScale(e, 1, -1, false)}
          title={
            isFreeResize
              ? 'Arrastra para cambiar el tamaño libremente'
              : 'Arrastra para cambiar el tamaño proporcionalmente (Fijo)'
          }
        >
          <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md hover:scale-125 transition-transform" />
        </div>

        <div
          className="absolute -bottom-4 -left-4 w-8 h-8 flex items-center justify-center cursor-nesw-resize touch-none z-30"
          onPointerDown={(e) => handlePointerDownScale(e, -1, 1, false)}
          title={
            isFreeResize
              ? 'Arrastra para cambiar el tamaño libremente'
              : 'Arrastra para cambiar el tamaño proporcionalmente (Fijo)'
          }
        >
          <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md hover:scale-125 transition-transform" />
        </div>

        <div
          className="absolute -bottom-4 -right-4 w-8 h-8 flex items-center justify-center cursor-nwse-resize touch-none z-30"
          onPointerDown={(e) => handlePointerDownScale(e, 1, 1, false)}
          title={
            isFreeResize
              ? 'Arrastra para cambiar el tamaño libremente'
              : 'Arrastra para cambiar el tamaño proporcionalmente (Fijo)'
          }
        >
          <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md hover:scale-125 transition-transform" />
        </div>

        {/* 4 Side Handles for Independent Width / Height Stretching (Only in Free / Libre mode) */}
        {isFreeResize && (
          <>
            {/* Left Edge (Width) */}
            <div
              className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-12 flex items-center justify-center cursor-ew-resize touch-none z-20"
              onPointerDown={(e) => handlePointerDownScale(e, -1, 0, true)}
              title="Arrastra para estirar o encoger el ancho"
            >
              <div className="w-2.5 h-7 rounded-full bg-cyan-400 border border-white shadow-md hover:scale-110 transition-transform" />
            </div>

            {/* Right Edge (Width) */}
            <div
              className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-12 flex items-center justify-center cursor-ew-resize touch-none z-20"
              onPointerDown={(e) => handlePointerDownScale(e, 1, 0, true)}
              title="Arrastra para estirar o encoger el ancho"
            >
              <div className="w-2.5 h-7 rounded-full bg-cyan-400 border border-white shadow-md hover:scale-110 transition-transform" />
            </div>

            {/* Top Edge (Height) */}
            <div
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-8 flex items-center justify-center cursor-ns-resize touch-none z-20"
              onPointerDown={(e) => handlePointerDownScale(e, 0, -1, true)}
              title="Arrastra para estirar o encoger el alto"
            >
              <div className="w-7 h-2.5 rounded-full bg-cyan-400 border border-white shadow-md hover:scale-110 transition-transform" />
            </div>

            {/* Bottom Edge (Height) */}
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-8 flex items-center justify-center cursor-ns-resize touch-none z-20"
              onPointerDown={(e) => handlePointerDownScale(e, 0, 1, true)}
              title="Arrastra para estirar o encoger el alto"
            >
              <div className="w-7 h-2.5 rounded-full bg-cyan-400 border border-white shadow-md hover:scale-110 transition-transform" />
            </div>
          </>
        )}

        {/* Direct On-Screen Edit Pill for Text/Subtitle Clips */}
        {onStartInlineTextEdit && mode === 'none' && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onStartInlineTextEdit();
            }}
            className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white border border-white/30 text-[10px] font-bold shadow-lg whitespace-nowrap z-30 active:scale-95 transition-transform"
            title="Toca para escribir directamente sobre la pantalla"
          >
            <Pencil className="w-2.5 h-2.5" />
            <span>Escribir aquí</span>
          </button>
        )}

        {/* Center Crosshair */}
        <div className="w-3.5 h-3.5 border border-cyan-300/70 rounded-full flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-1 h-1 bg-cyan-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};

interface TransformActionBarProps {
  transform: TransformProperties;
  onTransformChange: (t: TransformProperties) => void;
}

/**
 * Floating-style quick transform bar rendered below the canvas stage so it never
 * gets clipped by the stage bounds on desktop or narrow viewports.
 */
export const TransformActionBar: React.FC<TransformActionBarProps> = ({
  transform,
  onTransformChange,
}) => {
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  const isFreeResize = transform.freeResize === true;

  return (
    <div
      className="flex items-center gap-1 bg-[#0b0c14]/95 backdrop-blur-md border border-white/15 rounded-full px-2 py-0.5 shadow-xl pointer-events-auto whitespace-nowrap max-w-full overflow-x-auto no-scrollbar"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="shrink-0 flex items-center bg-white/5 border border-white/10 rounded-full p-0.5">
        <button
          onClick={() =>
            onTransformChange({
              ...transform,
              freeResize: false,
            })
          }
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
            !isFreeResize
              ? 'bg-indigo-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Modo Fijo: Cambia el tamaño manteniendo la proporción sin estirarse"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>Fijo</span>
        </button>
        <button
          onClick={() =>
            onTransformChange({
              ...transform,
              freeResize: true,
            })
          }
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
            isFreeResize
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Modo Libre: Manipula ancho y alto de la pantalla libremente"
        >
          <Hand className="w-2.5 h-2.5" />
          <span>Libre</span>
        </button>
      </div>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            fitMode: 'contain',
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
          })
        }
        className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold transition-colors ${
          (transform.fitMode || 'contain') === 'contain' &&
          transform.scale === 1 &&
          scaleX === 1 &&
          scaleY === 1
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-white/10'
        }`}
        title="Ajustar clip dentro de la pantalla"
      >
        <Minimize className="w-2.5 h-2.5" />
        <span>Ajustar</span>
      </button>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            fitMode: 'cover',
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
          })
        }
        className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold transition-colors ${
          transform.fitMode === 'cover' && scaleX === 1 && scaleY === 1
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-white/10'
        }`}
        title="Rellenar toda la pantalla sin bordes negros"
      >
        <Maximize className="w-2.5 h-2.5" />
        <span>Rellenar</span>
      </button>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            fitMode: 'fill',
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            x: 0,
            y: 0,
          })
        }
        className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold transition-colors ${
          transform.fitMode === 'fill' && scaleX === 1 && scaleY === 1
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-white/10'
        }`}
        title="Estirar imagen a todos los bordes de la pantalla"
      >
        <Move className="w-2.5 h-2.5" />
        <span>Estirar</span>
      </button>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            x: 0,
            y: 0,
          })
        }
        className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        title="Centrar en pantalla"
      >
        <Crosshair className="w-2.5 h-2.5" />
        <span>Centrar</span>
      </button>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            rotation: (transform.rotation + 90) % 360,
          })
        }
        className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        title="Girar 90 grados"
      >
        <RotateCw className="w-2.5 h-2.5" />
        <span>90°</span>
      </button>

      <button
        onClick={() =>
          onTransformChange({
            ...transform,
            flipH: !transform.flipH,
          })
        }
        className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold transition-colors ${
          transform.flipH
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-white/10'
        }`}
        title="Voltear horizontalmente (Espejo)"
      >
        <FlipHorizontal className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};
