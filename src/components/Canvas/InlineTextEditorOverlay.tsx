// ============================================================================
// InlineTextEditorOverlay - Direct On-Canvas Text Editing & Manipulation
// Renders the live-styled text directly inside a coherent, auto-sized textarea
// while the canvas copy is hidden, eliminating cursor/backspace mismatches,
// and lets the user move, scale, and rotate the text right on screen.
// ============================================================================

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, Move, RotateCw } from 'lucide-react';
import { TextClip, TransformProperties } from '../../types/editor';
import { useEditorStore } from '../../store/useEditorStore';
import { interpolateClipTransform } from '../../core/keyframes/interpolateKeyframes';

interface InlineTextEditorOverlayProps {
  clip: TextClip;
  canvasWidth: number;
  canvasHeight: number;
  frameWidth: number;
  frameHeight: number;
  alignOffsetX?: number;
  onChangeText: (nextText: string) => void;
  onTransformChange: (t: TransformProperties) => void;
  onFinish: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#000000').replace('#', '').trim();
  const a = Math.max(0, Math.min(1, alpha));
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return hex || `rgba(0, 0, 0, ${a})`;
}

export const InlineTextEditorOverlay: React.FC<InlineTextEditorOverlayProps> = ({
  clip,
  canvasWidth,
  canvasHeight,
  frameWidth,
  frameHeight,
  alignOffsetX = 0,
  onChangeText,
  onTransformChange,
  onFinish,
}) => {
  const currentTime = useEditorStore((s) => s.currentTime);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cfg = clip.textConfig;

  // Local draft prevents React/Zustand re-renders from ever resetting Android IME caret position
  const [draftText, setDraftText] = useState<string>(cfg.text ?? '');
  const lastEmittedRef = useRef<string>(cfg.text ?? '');

  useEffect(() => {
    const incoming = cfg.text ?? '';
    if (incoming !== lastEmittedRef.current) {
      lastEmittedRef.current = incoming;
      setDraftText(incoming);
    }
  }, [cfg.text, clip.id]);

  const transform = interpolateClipTransform(
    clip,
    Math.max(0, currentTime - clip.startTime)
  );
  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;

  // Match WebGLRenderer.renderTextClip scaling 1:1
  const resScale = Math.min(canvasWidth, canvasHeight) / 1080;
  const scaleToScreen = frameWidth / Math.max(1, canvasWidth);
  const unitScale = resScale * scaleToScreen * (transform.scale || 1);

  const displayFontSize = Math.max(8, (cfg.fontSize || 56) * unitScale);
  const displayLineHeight = cfg.lineHeight || 1.2;
  const displayLetterSpacing = (cfg.letterSpacing ?? 0) * unitScale;
  const displayWordSpacing = (cfg.wordSpacing ?? 0) * unitScale;
  const displayStrokeWidth = (cfg.strokeWidth ?? 0) * unitScale;
  const displayBgPadX = cfg.hasBackground
    ? (cfg.backgroundPadding || 16) * unitScale
    : 0;
  const displayBgPadY = cfg.hasBackground
    ? ((cfg.backgroundPadding || 16) / 2) * unitScale
    : 0;
  const displayBorderRadius = (cfg.borderRadius ?? 8) * unitScale;

  // Shadow matching Canvas2D
  let textShadow: string | undefined;
  const shadowEnabled =
    cfg.hasShadow !== false &&
    (cfg.shadowOpacity ?? 0.85) > 0.001 &&
    ((cfg.shadowBlur || 0) > 0 || (cfg.shadowDistance || 0) > 0);
  if (shadowEnabled) {
    const rad = ((cfg.shadowAngle ?? 45) * Math.PI) / 180;
    const dist = (cfg.shadowDistance ?? 4) * unitScale;
    const sx = (Math.cos(rad) * dist).toFixed(2);
    const sy = (Math.sin(rad) * dist).toFixed(2);
    const blur = (Math.max(0, cfg.shadowBlur || 0) * unitScale).toFixed(2);
    let shadowCss = cfg.shadowColor || 'rgba(0,0,0,0.85)';
    if (cfg.shadowOpacity !== undefined) {
      const a = Math.max(0, Math.min(1, cfg.shadowOpacity));
      const m6 = /^#([0-9a-f]{6})$/i.exec(shadowCss.trim());
      if (m6) {
        const r = parseInt(m6[1].slice(0, 2), 16);
        const g = parseInt(m6[1].slice(2, 4), 16);
        const b = parseInt(m6[1].slice(4, 6), 16);
        shadowCss = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      } else {
        const mRgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(shadowCss.trim());
        if (mRgb) {
          shadowCss = `rgba(${mRgb[1]},${mRgb[2]},${mRgb[3]},${a.toFixed(3)})`;
        }
      }
    }
    textShadow = `${sx}px ${sy}px ${blur}px ${shadowCss}`;
  }

  const leftPercent =
    50 + transform.x + (alignOffsetX / Math.max(1, canvasWidth)) * 100;
  const topPercent = 50 + transform.y;

  // Auto-size textarea cleanly to match the exact rendered text without unintended wrapping
  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number }>({
    w: 140,
    h: 48,
  });

  useLayoutEffect(() => {
    const m = mirrorRef.current;
    if (!m) return;
    const rect = m.getBoundingClientRect();
    // Unscale if parent has scaleX/scaleY
    const rawW = m.scrollWidth || rect.width;
    const rawH = m.scrollHeight || rect.height;
    const minW = Math.max(64, displayFontSize * 2.2);
    const minH = Math.max(32, displayFontSize * displayLineHeight);
    // Add a small extra caret margin (+14px) so the cursor at the end never triggers horizontal scroll
    setMeasuredSize({
      w: Math.ceil(Math.max(minW, rawW) + 14),
      h: Math.ceil(Math.max(minH, rawH)),
    });
  }, [
    draftText,
    displayFontSize,
    displayLineHeight,
    displayLetterSpacing,
    displayWordSpacing,
    cfg.fontFamily,
    cfg.fontWeight,
  ]);

  // Focus once when entering inline edit for a clip
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      const val = el.value || '';
      if (val === 'NUEVO TEXTO' || val === 'TEXTO AQUÍ') {
        el.select();
      } else {
        el.setSelectionRange(val.length, val.length);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [clip.id]);

  // Direct on-screen drag / scale / rotate state
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'scale' | 'rotate'>('none');
  const [snapX, setSnapX] = useState(false);
  const [snapY, setSnapY] = useState(false);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    cx: number;
    cy: number;
    startDist: number;
    startAngle: number;
    initTransform: TransformProperties;
  } | null>(null);

  const beginGesture = (
    e: React.PointerEvent,
    mode: 'move' | 'scale' | 'rotate'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    const rect = boxRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : e.clientX;
    const cy = rect ? rect.top + rect.height / 2 : e.clientY;
    const startDist = Math.max(20, Math.hypot(e.clientX - cx, e.clientY - cy));
    const startAngle =
      (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;

    gestureRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cx,
      cy,
      startDist,
      startAngle,
      initTransform: { ...transform },
    };
    setDragMode(mode);
  };

  const handleGestureMove = (e: React.PointerEvent) => {
    if (dragMode === 'none' || !gestureRef.current) return;
    e.stopPropagation();
    const g = gestureRef.current;
    const safeW = Math.max(80, frameWidth);
    const safeH = Math.max(80, frameHeight);

    if (dragMode === 'move') {
      let newX = g.initTransform.x + ((e.clientX - g.startX) / safeW) * 100;
      let newY = g.initTransform.y + ((e.clientY - g.startY) / safeH) * 100;
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
    } else if (dragMode === 'scale') {
      const currDist = Math.max(
        16,
        Math.hypot(e.clientX - g.cx, e.clientY - g.cy)
      );
      const ratio = currDist / g.startDist;
      const nextScale = Math.max(
        0.15,
        Math.min(6.0, (g.initTransform.scale || 1) * ratio)
      );
      onTransformChange({
        ...transform,
        scale: Number(nextScale.toFixed(2)),
      });
    } else if (dragMode === 'rotate') {
      const currAngle =
        (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI;
      let newRot = Math.round(
        (g.initTransform.rotation || 0) + (currAngle - g.startAngle)
      );
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
  };

  const handleGestureEnd = (e: React.PointerEvent) => {
    if (dragMode !== 'none') {
      e.stopPropagation();
      setDragMode('none');
      setSnapX(false);
      setSnapY(false);
      gestureRef.current = null;
    }
  };

  const flipPillBelow = topPercent < 20;
  const mirrorText = draftText.endsWith('\n') ? `${draftText} ` : draftText || ' ';

  const sharedTypographyStyle: React.CSSProperties = {
    fontFamily: `"${cfg.fontFamily || 'Inter'}", sans-serif`,
    fontWeight: cfg.fontWeight || 800,
    fontSize: `${displayFontSize}px`,
    lineHeight: displayLineHeight,
    letterSpacing: `${displayLetterSpacing}px`,
    wordSpacing: `${displayWordSpacing}px`,
    textAlign: cfg.alignment || 'center',
    whiteSpace: 'pre',
    fontKerning: 'normal',
  };

  return (
    <div
      className="absolute inset-0 z-40 pointer-events-auto"
      onPointerMove={handleGestureMove}
      onPointerUp={handleGestureEnd}
      onPointerCancel={handleGestureEnd}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onFinish();
        }
      }}
    >
      {/* Magnetic Snap Center Guidelines */}
      {snapX && (
        <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-10" />
      )}
      {snapY && (
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-[1.5px] bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-10" />
      )}

      {/* Hidden exact-typography mirror used to measure natural width/height without wrapping */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        style={{
          ...sharedTypographyStyle,
          position: 'fixed',
          top: -9999,
          left: -9999,
          visibility: 'hidden',
          pointerEvents: 'none',
          width: 'auto',
          height: 'auto',
          display: 'inline-block',
        }}
      >
        {mirrorText}
      </div>

      {/* Positioned, Rotatable, Scalable Live Text Frame */}
      <div
        ref={boxRef}
        style={{
          position: 'absolute',
          left: `${leftPercent}%`,
          top: `${topPercent}%`,
          transform: `translate(-50%, -50%) rotate(${transform.rotation}deg) scale(${
            scaleX * (transform.flipH ? -1 : 1)
          }, ${scaleY * (transform.flipV ? -1 : 1)})`,
          opacity: transform.opacity,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-cyan-400/90 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
      >
        {/* Compact Floating Move + Done Pill (flips below if near top edge) */}
        <div
          style={{
            transform: `translateX(-50%) scale(${
              1 / Math.max(0.25, Math.abs(scaleX))
            }, ${1 / Math.max(0.25, Math.abs(scaleY))})`,
          }}
          className={`absolute left-1/2 ${
            flipPillBelow ? '-bottom-9' : '-top-9'
          } flex items-center gap-1 bg-[#0b0c14]/95 border border-cyan-400/50 rounded-full px-1.5 py-0.5 shadow-xl whitespace-nowrap z-50`}
        >
          <button
            type="button"
            onPointerDown={(e) => beginGesture(e, 'move')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-cyan-200 text-[10px] font-semibold cursor-grab active:cursor-grabbing touch-none"
            title="Arrastra para mover el texto por la pantalla"
          >
            <Move className="w-3 h-3" />
            <span>Mover</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onFinish();
            }}
            className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold active:scale-95 transition-all"
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Listo</span>
          </button>
        </div>

        {/* Top-Right Rotate Handle */}
        <div
          onPointerDown={(e) => beginGesture(e, 'rotate')}
          className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none z-50"
          title="Arrastra para rotar el texto"
        >
          <div className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-md flex items-center justify-center">
            <RotateCw className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
          </div>
        </div>

        {/* Bottom-Right Scale Handle */}
        <div
          onPointerDown={(e) => beginGesture(e, 'scale')}
          className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize touch-none z-50"
          title="Arrastra para cambiar el tamaño del texto"
        >
          <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md" />
        </div>

        {/* Styled Background Box + Direct Visible Editable Textarea */}
        <div
          style={{
            backgroundColor:
              cfg.hasBackground && (cfg.backgroundOpacity ?? 0) > 0
                ? hexToRgba(
                    cfg.backgroundColor || '#000000',
                    cfg.backgroundOpacity ?? 0.85
                  )
                : 'transparent',
            borderRadius: `${displayBorderRadius}px`,
            paddingLeft: `${displayBgPadX}px`,
            paddingRight: `${displayBgPadX}px`,
            paddingTop: `${displayBgPadY}px`,
            paddingBottom: `${displayBgPadY}px`,
          }}
          className="relative flex items-center justify-center"
        >
          {!draftText && (
            <span
              style={{ fontSize: `${Math.max(12, Math.min(20, displayFontSize * 0.6))}px` }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/55 font-semibold drop-shadow whitespace-nowrap"
            >
              Escribe aquí...
            </span>
          )}

          <textarea
            ref={textareaRef}
            value={draftText}
            wrap="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="sentences"
            onChange={(e) => {
              const nextVal = e.target.value;
              lastEmittedRef.current = nextVal;
              setDraftText(nextVal);
              onChangeText(nextVal);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                e.preventDefault();
                onFinish();
              }
            }}
            style={{
              ...sharedTypographyStyle,
              width: `${measuredSize.w}px`,
              height: `${measuredSize.h}px`,
              color: cfg.color || '#ffffff',
              caretColor: '#22d3ee',
              textShadow,
              WebkitTextStroke:
                displayStrokeWidth > 0.1
                  ? `${displayStrokeWidth.toFixed(2)}px ${cfg.strokeColor || '#000000'}`
                  : undefined,
              paintOrder: displayStrokeWidth > 0.1 ? 'stroke fill' : undefined,
              userSelect: 'text',
              WebkitUserSelect: 'text',
              touchAction: 'manipulation',
            }}
            className="block bg-transparent resize-none overflow-hidden focus:outline-none p-0 m-0 border-0 select-text selection:bg-cyan-500/35"
            aria-label="Editar texto directamente en pantalla"
          />
        </div>
      </div>
    </div>
  );
};
