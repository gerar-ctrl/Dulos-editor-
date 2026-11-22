// ============================================================================
// ScreenCropOverlay.tsx - Interactive Freehand Screen / Canvas Crop Tool
// ============================================================================

import React, { useRef } from 'react';
import { Check, RotateCcw, X, Crop } from 'lucide-react';

export interface ScreenCropRect {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0.05..1
  height: number; // 0.05..1
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface ScreenCropOverlayProps {
  crop: ScreenCropRect;
  onChange: (next: ScreenCropRect) => void;
  frameWidth: number;
  frameHeight: number;
  logicalWidth: number;
  logicalHeight: number;
}

export const ScreenCropOverlay: React.FC<ScreenCropOverlayProps> = ({
  crop,
  onChange,
  frameWidth,
  frameHeight,
  logicalWidth,
  logicalHeight,
}) => {
  const dragRef = useRef<{
    handle: DragHandle;
    startClientX: number;
    startClientY: number;
    startCrop: ScreenCropRect;
  } | null>(null);

  const minNormW = Math.min(0.5, Math.max(0.08, 120 / Math.max(120, logicalWidth)));
  const minNormH = Math.min(0.5, Math.max(0.08, 120 / Math.max(120, logicalHeight)));

  const startDrag = (handle: DragHandle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    e.stopPropagation();
    e.preventDefault();

    const safeW = Math.max(1, frameWidth);
    const safeH = Math.max(1, frameHeight);
    const dx = (e.clientX - d.startClientX) / safeW;
    const dy = (e.clientY - d.startClientY) / safeH;

    const s = d.startCrop;
    const right0 = s.x + s.width;
    const bottom0 = s.y + s.height;

    let x = s.x;
    let y = s.y;
    let w = s.width;
    let h = s.height;

    if (d.handle === 'move') {
      x = Math.max(0, Math.min(1 - s.width, s.x + dx));
      y = Math.max(0, Math.min(1 - s.height, s.y + dy));
    } else {
      if (d.handle.includes('w')) {
        const nextLeft = Math.max(0, Math.min(right0 - minNormW, s.x + dx));
        x = nextLeft;
        w = right0 - nextLeft;
      }
      if (d.handle.includes('e')) {
        const nextRight = Math.min(1, Math.max(s.x + minNormW, right0 + dx));
        w = nextRight - x;
      }
      if (d.handle.includes('n')) {
        const nextTop = Math.max(0, Math.min(bottom0 - minNormH, s.y + dy));
        y = nextTop;
        h = bottom0 - nextTop;
      }
      if (d.handle.includes('s')) {
        const nextBottom = Math.min(1, Math.max(s.y + minNormH, bottom0 + dy));
        h = nextBottom - y;
      }
    }

    onChange({ x, y, width: w, height: h });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    e.stopPropagation();
    dragRef.current = null;
  };

  const leftPct = crop.x * 100;
  const topPct = crop.y * 100;
  const widthPct = crop.width * 100;
  const heightPct = crop.height * 100;
  const rightPct = 100 - (leftPct + widthPct);
  const bottomPct = 100 - (topPct + heightPct);

  const outW = Math.max(120, Math.round((logicalWidth * crop.width) / 2) * 2);
  const outH = Math.max(120, Math.round((logicalHeight * crop.height) / 2) * 2);

  return (
    <div
      className="absolute inset-0 z-40 touch-none select-none"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Dimmed outside masks (4 panels so the cropped region stays completely clear) */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/65 pointer-events-none"
        style={{ height: `${topPct}%` }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 bg-black/65 pointer-events-none"
        style={{ height: `${Math.max(0, bottomPct)}%` }}
      />
      <div
        className="absolute left-0 bg-black/65 pointer-events-none"
        style={{
          top: `${topPct}%`,
          height: `${heightPct}%`,
          width: `${leftPct}%`,
        }}
      />
      <div
        className="absolute right-0 bg-black/65 pointer-events-none"
        style={{
          top: `${topPct}%`,
          height: `${heightPct}%`,
          width: `${Math.max(0, rightPct)}%`,
        }}
      />

      {/* Interactive Crop Frame */}
      <div
        onPointerDown={startDrag('move')}
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
        }}
        className="absolute border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(0,0,0,0.75)] cursor-move"
      >
        {/* Rule-of-thirds grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>

        {/* Live Dimensions Pill */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/80 border border-cyan-400/60 text-[10px] font-mono font-bold text-cyan-200 whitespace-nowrap pointer-events-none shadow">
          {outW} × {outH} px
        </div>

        {/* Corner Handles (large touch hitbox + crisp L-bracket visual) */}
        <div
          onPointerDown={startDrag('nw')}
          className="absolute -left-4 -top-4 w-9 h-9 flex items-center justify-center cursor-nwse-resize"
          title="Recortar esquina superior izquierda"
        >
          <div className="w-4 h-4 border-t-[3px] border-l-[3px] border-white rounded-tl-sm shadow" />
        </div>
        <div
          onPointerDown={startDrag('ne')}
          className="absolute -right-4 -top-4 w-9 h-9 flex items-center justify-center cursor-nesw-resize"
          title="Recortar esquina superior derecha"
        >
          <div className="w-4 h-4 border-t-[3px] border-r-[3px] border-white rounded-tr-sm shadow" />
        </div>
        <div
          onPointerDown={startDrag('sw')}
          className="absolute -left-4 -bottom-4 w-9 h-9 flex items-center justify-center cursor-nesw-resize"
          title="Recortar esquina inferior izquierda"
        >
          <div className="w-4 h-4 border-b-[3px] border-l-[3px] border-white rounded-bl-sm shadow" />
        </div>
        <div
          onPointerDown={startDrag('se')}
          className="absolute -right-4 -bottom-4 w-9 h-9 flex items-center justify-center cursor-nwse-resize"
          title="Recortar esquina inferior derecha"
        >
          <div className="w-4 h-4 border-b-[3px] border-r-[3px] border-white rounded-br-sm shadow" />
        </div>

        {/* Edge Handles */}
        <div
          onPointerDown={startDrag('n')}
          className="absolute left-1/2 -top-3.5 -translate-x-1/2 w-12 h-7 flex items-center justify-center cursor-ns-resize"
          title="Recortar borde superior"
        >
          <div className="w-7 h-1.5 rounded-full bg-cyan-300 border border-black/50 shadow" />
        </div>
        <div
          onPointerDown={startDrag('s')}
          className="absolute left-1/2 -bottom-3.5 -translate-x-1/2 w-12 h-7 flex items-center justify-center cursor-ns-resize"
          title="Recortar borde inferior"
        >
          <div className="w-7 h-1.5 rounded-full bg-cyan-300 border border-black/50 shadow" />
        </div>
        <div
          onPointerDown={startDrag('w')}
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-12 flex items-center justify-center cursor-ew-resize"
          title="Recortar borde izquierdo"
        >
          <div className="w-1.5 h-7 rounded-full bg-cyan-300 border border-black/50 shadow" />
        </div>
        <div
          onPointerDown={startDrag('e')}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-12 flex items-center justify-center cursor-ew-resize"
          title="Recortar borde derecho"
        >
          <div className="w-1.5 h-7 rounded-full bg-cyan-300 border border-black/50 shadow" />
        </div>
      </div>
    </div>
  );
};

interface ScreenCropActionBarProps {
  crop: ScreenCropRect;
  logicalWidth: number;
  logicalHeight: number;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
}

export const ScreenCropActionBar: React.FC<ScreenCropActionBarProps> = ({
  crop,
  logicalWidth,
  logicalHeight,
  onReset,
  onCancel,
  onApply,
}) => {
  const outW = Math.max(120, Math.round((logicalWidth * crop.width) / 2) * 2);
  const outH = Math.max(120, Math.round((logicalHeight * crop.height) / 2) * 2);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0e101c]/95 border border-cyan-500/40 shadow-xl text-[11px] flex-wrap justify-center">
      <span className="flex items-center gap-1 text-cyan-300 font-semibold pr-1">
        <Crop className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Recorte de Pantalla:</span>
        <span className="font-mono text-white">
          {outW}×{outH}px
        </span>
      </span>

      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 font-medium transition-colors"
        title="Restablecer marco de recorte"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Restablecer</span>
      </button>

      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-medium transition-colors"
        title="Cancelar recorte de pantalla"
      >
        <X className="w-3 h-3" />
        <span>Cancelar</span>
      </button>

      <button
        onClick={onApply}
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold shadow transition-all active:scale-95"
        title="Aplicar este tamaño recortado a la pantalla"
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Aplicar Recorte</span>
      </button>
    </div>
  );
};
