// ============================================================================
// ColorPalettePicker - Shared interactive HSV Color Picker ("Selector"),
// 32-color Palette ("Paleta"), Hex input & screen Eyedropper ("Cuentagotas").
// Works identically on Desktop (Electron) and Mobile (Android Capacitor WebView)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Pipette, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const RICH_COLOR_PALETTE: string[] = [
  // Row 1: Neutrals
  '#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#334155', '#1e293b', '#000000',
  // Row 2: Reds, Oranges, Yellows
  '#fecaca', '#f87171', '#ef4444', '#b91c1c', '#fb923c', '#f97316', '#facc15', '#eab308',
  // Row 3: Greens, Teals, Cyans
  '#bef264', '#4ade80', '#22c55e', '#15803d', '#2dd4bf', '#14b8a6', '#22d3ee', '#06b6d4',
  // Row 4: Blues, Indigos, Purples, Pinks
  '#38bdf8', '#3b82f6', '#1d4ed8', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
];

const DEFAULT_QUICK_SWATCHES = [
  '#ffffff',
  '#000000',
  '#facc15',
  '#ef4444',
  '#22d3ee',
  '#6366f1',
  '#ec4899',
  '#22c55e',
  '#f97316',
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input?: string): string {
  if (!input) return '#ffffff';
  const trimmed = input.trim();
  const shortMatch = /^#?([0-9a-f]{3})$/i.exec(trimmed);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const fullMatch = /^#?([0-9a-f]{6})$/i.exec(trimmed);
  if (fullMatch) {
    return `#${fullMatch[1]}`.toLowerCase();
  }
  return '#ffffff';
}

function hexToHsv(hex: string, fallbackHue = 0): { h: number; s: number; v: number } {
  const clean = normalizeHex(hex).slice(1);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = fallbackHue;
  if (delta > 0.00001) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 1);
  const vv = clamp(v, 0, 1);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hh < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hh < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hh < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hh < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const toHex = (n: number) =>
    clamp(Math.round((n + m) * 255), 0, 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

type ActivePanel = 'none' | 'picker' | 'palette';

interface ColorPalettePickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  eyedropperLabel?: string;
  reopenMediaDrawer?: boolean;
  defaultExpanded?: boolean;
  defaultPanel?: ActivePanel;
  compact?: boolean;
  quickSwatches?: string[];
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  value,
  onChange,
  label,
  eyedropperLabel,
  reopenMediaDrawer = false,
  defaultExpanded = false,
  defaultPanel,
  compact = false,
  quickSwatches,
}) => {
  const startEyedropper = useEditorStore((s) => s.startEyedropper);
  const normalized = normalizeHex(value);

  const [activePanel, setActivePanel] = useState<ActivePanel>(
    defaultPanel ?? (defaultExpanded ? 'palette' : 'none')
  );
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() =>
    hexToHsv(normalized, 220)
  );
  const [hexDraft, setHexDraft] = useState(normalized.toUpperCase());

  const svPadRef = useRef<HTMLDivElement | null>(null);
  const hueBarRef = useRef<HTMLDivElement | null>(null);
  const draggingSvRef = useRef(false);
  const draggingHueRef = useRef(false);
  const lastEmittedHexRef = useRef<string>(normalized);

  // Sync external color updates (e.g., from palette click, eyedropper, or undo)
  useEffect(() => {
    setHexDraft(normalized.toUpperCase());
    if (normalized !== lastEmittedHexRef.current) {
      lastEmittedHexRef.current = normalized;
      setHsv((prev) => hexToHsv(normalized, prev.h));
    }
  }, [normalized]);

  const emitHsv = (nextH: number, nextS: number, nextV: number) => {
    setHsv({ h: nextH, s: nextS, v: nextV });
    const nextHex = hsvToHex(nextH, nextS, nextV);
    lastEmittedHexRef.current = nextHex;
    setHexDraft(nextHex.toUpperCase());
    onChange(nextHex);
  };

  const updateSvFromClientPoint = (clientX: number, clientY: number) => {
    const el = svPadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const s = clamp((clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    emitHsv(hsv.h, s, v);
  };

  const updateHueFromClientPoint = (clientX: number) => {
    const el = hueBarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 359.9);
    emitHsv(h, hsv.s, hsv.v);
  };

  const handleEyedropper = () => {
    startEyedropper(
      eyedropperLabel || label || 'color',
      (pickedHex) => {
        const clean = normalizeHex(pickedHex);
        lastEmittedHexRef.current = clean;
        setHsv((prev) => hexToHsv(clean, prev.h));
        setHexDraft(clean.toUpperCase());
        onChange(clean);
      },
      reopenMediaDrawer
    );
  };

  const handleHexInputChange = (raw: string) => {
    const cleaned = raw.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7);
    setHexDraft(cleaned.toUpperCase());
    if (/^#?[0-9a-f]{6}$/i.test(cleaned)) {
      const valid = normalizeHex(cleaned);
      lastEmittedHexRef.current = valid;
      setHsv((prev) => hexToHsv(valid, prev.h));
      onChange(valid);
    }
  };

  const handleHexInputBlur = () => {
    if (/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hexDraft)) {
      const valid = normalizeHex(hexDraft);
      lastEmittedHexRef.current = valid;
      setHsv((prev) => hexToHsv(valid, prev.h));
      setHexDraft(valid.toUpperCase());
      onChange(valid);
    } else {
      setHexDraft(normalized.toUpperCase());
    }
  };

  const swatches = quickSwatches || DEFAULT_QUICK_SWATCHES;
  const pureHueCss = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;

  return (
    <div className="space-y-2 px-5 sm:px-2 touch-pan-y">
      <div className="flex items-center gap-1.5 flex-wrap">
        {label && (
          <span className="text-[11px] text-slate-300 font-medium shrink-0">
            {label}
          </span>
        )}

        {/* Current Color Swatch + Hex Chip (opens interactive Color Picker) */}
        <button
          type="button"
          onClick={() =>
            setActivePanel((p) => (p === 'picker' ? 'none' : 'picker'))
          }
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 border transition-colors ${
            activePanel === 'picker'
              ? 'bg-indigo-600/25 border-indigo-400/70'
              : 'bg-[#181926] border-white/15 hover:border-white/30'
          }`}
          title="Abrir selector de colores personalizado"
        >
          <span
            className="w-4 h-4 rounded border border-white/30 shrink-0 shadow-inner"
            style={{ backgroundColor: normalized }}
          />
          <span className="font-mono text-[10px] text-slate-200 uppercase">
            {normalized}
          </span>
        </button>

        {/* Interactive HSV Color Picker ("Selector") Toggle */}
        <button
          type="button"
          onClick={() =>
            setActivePanel((p) => (p === 'picker' ? 'none' : 'picker'))
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all active:scale-95 ${
            activePanel === 'picker'
              ? 'bg-indigo-600/35 border-indigo-400/70 text-indigo-100'
              : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
          }`}
          title="Abrir selector libre de colores (espectro y tono)"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
            style={{
              background:
                'conic-gradient(#ef4444, #facc15, #22c55e, #06b6d4, #6366f1, #ec4899, #ef4444)',
            }}
          />
          <span>Selector</span>
          {activePanel === 'picker' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {/* Screen Eyedropper (Cuentagotas) */}
        <button
          type="button"
          onClick={handleEyedropper}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-[11px] font-semibold active:scale-95 transition-all"
          title="Cuentagotas: toma un color directamente desde la pantalla"
        >
          <Pipette className="w-3.5 h-3.5" />
          <span>Cuentagotas</span>
        </button>

        {/* Toggle Full 32-Color Palette ("Paleta") */}
        <button
          type="button"
          onClick={() =>
            setActivePanel((p) => (p === 'palette' ? 'none' : 'palette'))
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all active:scale-95 ${
            activePanel === 'palette'
              ? 'bg-indigo-600/30 border-indigo-400/60 text-indigo-200'
              : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-300'
          }`}
          title="Abrir paleta de colores predefinidos"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Paleta</span>
          {activePanel === 'palette' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Interactive Custom HSV Color Picker ("Selector de colores") */}
      {activePanel === 'picker' && (
        <div className="mx-3 sm:mx-1 p-2.5 rounded-xl bg-[#0d0e17] border border-white/15 space-y-2.5 select-none">
          {/* 2D Saturation / Brightness Spectrum Pad */}
          <div
            ref={svPadRef}
            onPointerDown={(e) => {
              e.stopPropagation();
              draggingSvRef.current = true;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
              updateSvFromClientPoint(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!draggingSvRef.current) return;
              e.stopPropagation();
              updateSvFromClientPoint(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              draggingSvRef.current = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerCancel={() => {
              draggingSvRef.current = false;
            }}
            className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden cursor-crosshair touch-none border border-white/20"
            style={{ backgroundColor: pureHueCss }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))',
              }}
            />
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.75),0_2px_6px_rgba(0,0,0,0.6)] pointer-events-none"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                backgroundColor: normalized,
              }}
            />
          </div>

          {/* Hue Rainbow Slider */}
          <div
            ref={hueBarRef}
            onPointerDown={(e) => {
              e.stopPropagation();
              draggingHueRef.current = true;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
              updateHueFromClientPoint(e.clientX);
            }}
            onPointerMove={(e) => {
              if (!draggingHueRef.current) return;
              e.stopPropagation();
              updateHueFromClientPoint(e.clientX);
            }}
            onPointerUp={(e) => {
              draggingHueRef.current = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerCancel={() => {
              draggingHueRef.current = false;
            }}
            className="relative w-full h-5 rounded-full cursor-ew-resize touch-none border border-white/20"
            style={{
              background:
                'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
            }}
          >
            <div
              className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.75)] pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                backgroundColor: pureHueCss,
              }}
            />
          </div>

          {/* Live Preview + Editable HEX Input */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-lg border border-white/25 shadow-inner shrink-0"
                style={{ backgroundColor: normalized }}
              />
              <span className="text-[10px] text-slate-400">
                Arrastra el cuadro y la barra de tono
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#181926] border border-white/15 focus-within:border-indigo-400 rounded-lg px-2 py-1">
              <span className="text-[10px] text-slate-400 font-semibold">HEX</span>
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => handleHexInputChange(e.target.value)}
                onBlur={handleHexInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Código hexadecimal de color"
                className="w-[62px] bg-transparent font-mono text-[11px] text-slate-100 uppercase focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Full 32-Color Palette Grid */}
      {activePanel === 'palette' && (
        <div className="mx-3 sm:mx-1 p-2 rounded-xl bg-[#0d0e17] border border-white/10 grid grid-cols-8 gap-1.5">
          {RICH_COLOR_PALETTE.map((hex) => {
            const isSelected = normalized === hex;
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(hex)}
                aria-label={`Color ${hex}`}
                title={hex.toUpperCase()}
                className={`w-full aspect-square rounded-md border transition-transform ${
                  isSelected
                    ? 'border-white scale-110 ring-2 ring-indigo-400 z-10'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
      )}

      {/* Quick Swatches Row when collapsed */}
      {activePanel === 'none' && !compact && (
        <div className="mx-1 flex items-center gap-1.5 flex-wrap">
          {swatches.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              aria-label={`Color ${hex}`}
              className={`w-5 h-5 rounded-full border transition-transform ${
                normalized === hex.toLowerCase()
                  ? 'border-white scale-110 ring-2 ring-indigo-500'
                  : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
