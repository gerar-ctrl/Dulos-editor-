// ============================================================================
// TextTab - Complete Text Editor with Live Preview, 50+ Animations,
// Color Palette + Eyedropper (Fill, Stroke, Background) & Text Keyframes
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  TextClip,
  TextAlignment,
  TextAnimationIn,
  TextAnimationOut,
} from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { NEW_TEXT_ANIMATIONS } from '../../../core/webgl/textAnimations';
import {
  TEXT_FONTS,
  TEXT_FONT_CATEGORIES,
  TextFontCategory,
  ensureExtraFontsStylesheetsLoaded,
} from '../../../data/textFonts';
import {
  extractKeyframeProperties,
  interpolateClipTransform,
} from '../../../core/keyframes/interpolateKeyframes';
import { ColorPalettePicker } from '../../Common/ColorPalettePicker';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Sparkles,
  Palette,
  Square,
  ALargeSmall,
  Pencil,
  Play,
  Diamond,
  Plus,
  Trash2,
  SunDim,
  Search,
  X,
} from 'lucide-react';

interface TextTabProps {
  clip: TextClip;
}

type TextToolSection =
  | 'texto'
  | 'fuente'
  | 'alineacion'
  | 'tamano'
  | 'espaciado'
  | 'color'
  | 'sombra'
  | 'fondo'
  | 'animacion'
  | 'keyframes';

const FONTS = TEXT_FONTS;

const CLASSIC_IN_ANIMATIONS: { value: TextAnimationIn; label: string }[] = [
  { value: 'none', label: 'Sin entrada' },
  { value: 'fadeIn', label: 'Desvanecer' },
  { value: 'typewriter', label: 'Máquina de escribir' },
  { value: 'bounce', label: 'Rebote' },
  { value: 'pop', label: 'Pop elástico' },
  { value: 'zoom', label: 'Zoom entrada' },
  { value: 'zoomOut', label: 'Zoom desde grande' },
  { value: 'slideUp', label: 'Deslizar arriba' },
  { value: 'slideDown', label: 'Deslizar abajo' },
  { value: 'slideLeft', label: 'Deslizar izquierda' },
  { value: 'slideRight', label: 'Deslizar derecha' },
  { value: 'flip', label: 'Giro 3D' },
  { value: 'wave', label: 'Onda' },
  { value: 'blurIn', label: 'Desenfoque' },
];

const CLASSIC_OUT_ANIMATIONS: { value: TextAnimationOut; label: string }[] = [
  { value: 'none', label: 'Sin salida' },
  { value: 'fadeOut', label: 'Desvanecer' },
  { value: 'typewriterOut', label: 'Borrado máquina' },
  { value: 'bounceOut', label: 'Rebote salida' },
  { value: 'popOut', label: 'Pop salida' },
  { value: 'zoomOut', label: 'Zoom achicar' },
  { value: 'zoomIn', label: 'Zoom expandir' },
  { value: 'slideUp', label: 'Deslizar arriba' },
  { value: 'slideDown', label: 'Deslizar abajo' },
  { value: 'slideLeft', label: 'Deslizar izquierda' },
  { value: 'slideRight', label: 'Deslizar derecha' },
  { value: 'flipOut', label: 'Giro 3D salida' },
  { value: 'blurOut', label: 'Desenfoque' },
];

const IN_ANIMATIONS: { value: TextAnimationIn; label: string }[] = [
  ...CLASSIC_IN_ANIMATIONS,
  ...NEW_TEXT_ANIMATIONS,
];

const OUT_ANIMATIONS: { value: TextAnimationOut; label: string }[] = [
  ...CLASSIC_OUT_ANIMATIONS,
  ...NEW_TEXT_ANIMATIONS,
];

const SECTIONS: {
  id: TextToolSection;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'texto', label: 'Escribir', icon: Pencil },
  { id: 'fuente', label: 'Fuente', icon: Type },
  { id: 'alineacion', label: 'Alineación', icon: AlignCenter },
  { id: 'tamano', label: 'Tamaño', icon: ALargeSmall },
  { id: 'espaciado', label: 'Espaciado', icon: AlignJustify },
  { id: 'color', label: 'Color y Borde', icon: Palette },
  { id: 'sombra', label: 'Sombra', icon: SunDim },
  { id: 'fondo', label: 'Bloque / Fondo', icon: Square },
  { id: 'animacion', label: 'Animación', icon: Sparkles },
  { id: 'keyframes', label: 'Keyframes', icon: Diamond },
];

export const TextTab: React.FC<TextTabProps> = ({ clip }) => {
  const {
    updateClip,
    setCurrentTime,
    setIsPlaying,
    addKeyframe,
    removeKeyframe,
    currentTime,
    inlineEditingTextClipId,
    setInlineEditingTextClipId,
  } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      setCurrentTime: s.setCurrentTime,
      setIsPlaying: s.setIsPlaying,
      addKeyframe: s.addKeyframe,
      removeKeyframe: s.removeKeyframe,
      currentTime: s.currentTime,
      inlineEditingTextClipId: s.inlineEditingTextClipId,
      setInlineEditingTextClipId: s.setInlineEditingTextClipId,
    }))
  );
  const [activeSection, setActiveSection] = useState<TextToolSection | null>(
    null
  );
  const isInlineEditing = inlineEditingTextClipId === clip.id;
  const [animMode, setAnimMode] = useState<'in' | 'out'>('in');
  const [fontCategory, setFontCategory] = useState<TextFontCategory>('all');
  const [fontSearch, setFontSearch] = useState('');
  const previewRafRef = useRef<number | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const cfg = clip.textConfig;

  useEffect(() => {
    ensureExtraFontsStylesheetsLoaded();
  }, []);

  const stopPreview = () => {
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  // Compute a timestamp where the text is 100% visible (past entrance, before exit)
  const getSafeVisibleTime = (overrideCfg?: Partial<typeof cfg>) => {
    const merged = overrideCfg ? { ...cfg, ...overrideCfg } : cfg;
    const inDur =
      merged.animIn && merged.animIn !== 'none'
        ? Math.max(0.1, merged.animInDuration || 0.6)
        : 0;
    const outDur =
      merged.animOut && merged.animOut !== 'none'
        ? Math.max(0.1, merged.animOutDuration || 0.6)
        : 0;
    const safeStart =
      clip.startTime + Math.min(clip.duration * 0.45, inDur + 0.05);
    const safeEnd =
      clip.startTime + Math.max(clip.duration * 0.55, clip.duration - outDur - 0.05);
    return {
      safeStart,
      safeEnd,
      midTime: Number(((safeStart + safeEnd) / 2).toFixed(2)),
    };
  };

  // Ensure the playhead sits in the fully visible window of the text clip while editing
  const ensurePlayheadVisible = (overrideCfg?: Partial<typeof cfg>) => {
    const now = useEditorStore.getState().currentTime;
    const { safeStart, safeEnd, midTime } = getSafeVisibleTime(overrideCfg);
    if (now < safeStart || now > safeEnd) {
      setCurrentTime(midTime);
    }
  };

  // When opening TextTab or switching to a text clip, immediately make sure it's visible on screen
  useEffect(() => {
    stopPreview();
    setIsPlaying(false);
    ensurePlayheadVisible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.id]);

  const handleUpdate = (
    partial: Partial<typeof cfg>,
    skipVisibleJump = false
  ) => {
    if (!skipVisibleJump) {
      stopPreview();
      setIsPlaying(false);
      ensurePlayheadVisible(partial);
    }
    updateClip(clip.id, { textConfig: { ...cfg, ...partial } });
  };

  const handleFontSelect = (fontFamily: string) => {
    handleUpdate({ fontFamily });
    if (typeof document !== 'undefined' && document.fonts?.load) {
      document.fonts
        .load(`${cfg.fontWeight || 800} 48px "${fontFamily}"`)
        .then(() => {
          const latest = useEditorStore
            .getState()
            .project.tracks.flatMap((t) => t.clips)
            .find((c) => c.id === clip.id) as TextClip | undefined;
          if (latest) {
            updateClip(clip.id, { textConfig: { ...latest.textConfig } });
          }
        })
        .catch(() => {});
    }
  };

  // Smooth rAF-driven preview for both Entrada and Salida (immune to video decoder buffering)
  const previewAnimation = (mode: 'in' | 'out', durationOverride?: number) => {
    stopPreview();
    setIsPlaying(false);

    const latestClip =
      (useEditorStore
        .getState()
        .project.tracks.flatMap((t) => t.clips)
        .find((c) => c.id === clip.id) as TextClip | undefined) || clip;
    const latestCfg = latestClip.textConfig;

    if (mode === 'in') {
      const dur = Math.max(
        0.2,
        Math.min(latestClip.duration, durationOverride ?? (latestCfg.animInDuration || 0.6))
      );
      const fromTime = latestClip.startTime;
      const toTime = Math.min(
        latestClip.startTime + latestClip.duration - 0.02,
        latestClip.startTime + dur + 0.04
      );
      const startPerf = performance.now();
      const totalMs = dur * 1000;

      setCurrentTime(fromTime);
      const step = (now: number) => {
        const progress = Math.min(1, (now - startPerf) / Math.max(120, totalMs));
        const t = fromTime + (toTime - fromTime) * progress;
        setCurrentTime(t);
        if (progress < 1) {
          previewRafRef.current = requestAnimationFrame(step);
        } else {
          previewRafRef.current = null;
        }
      };
      previewRafRef.current = requestAnimationFrame(step);
    } else {
      const dur = Math.max(
        0.2,
        Math.min(latestClip.duration, durationOverride ?? (latestCfg.animOutDuration || 0.6))
      );
      const outStart = Math.max(
        latestClip.startTime,
        latestClip.startTime + latestClip.duration - dur
      );
      const holdTime = Math.max(latestClip.startTime, outStart - 0.06);
      const endTime = latestClip.startTime + latestClip.duration - 0.005;
      const returnTime = getSafeVisibleTime(latestCfg).midTime;

      // Show the text clearly for 180ms before animating its exit
      setCurrentTime(holdTime);
      previewTimerRef.current = window.setTimeout(() => {
        const startPerf = performance.now();
        const totalMs = dur * 1000;
        const step = (now: number) => {
          const progress = Math.min(1, (now - startPerf) / Math.max(120, totalMs));
          const t = outStart + (endTime - outStart) * progress;
          setCurrentTime(t);
          if (progress < 1) {
            previewRafRef.current = requestAnimationFrame(step);
          } else {
            previewRafRef.current = null;
            // After showing the full exit, return to visible frame so user can keep editing
            previewTimerRef.current = window.setTimeout(() => {
              setCurrentTime(returnTime);
            }, 300);
          }
        };
        previewRafRef.current = requestAnimationFrame(step);
      }, 180);
    }
  };

  const toggleSection = (id: TextToolSection) => {
    if (id === 'texto') {
      if (isInlineEditing) {
        setInlineEditingTextClipId(null);
      } else {
        stopPreview();
        setIsPlaying(false);
        ensurePlayheadVisible();
        setActiveSection(null);
        setInlineEditingTextClipId(clip.id);
      }
      return;
    }
    if (id === 'animacion' && isInlineEditing) {
      setInlineEditingTextClipId(null);
    }
    setActiveSection((prev) => (prev === id ? null : id));
  };

  const animOutValue: TextAnimationOut = cfg.animOut || 'none';
  const animOutDurValue = cfg.animOutDuration ?? 0.6;
  const localTime = Math.max(
    0,
    Math.min(clip.duration, currentTime - clip.startTime)
  );
  const keyframes = clip.keyframes || [];

  const handleAddTextKeyframe = () => {
    const effective = interpolateClipTransform(clip, localTime);
    addKeyframe(clip.id, {
      id: 'kf_' + Math.random().toString(36).substring(2, 9),
      time: Number(localTime.toFixed(2)),
      properties: extractKeyframeProperties(effective),
      easing: 'easeInOut',
    });
  };

  return (
    <div className="px-3 py-2 text-xs text-slate-300 space-y-2.5">
      {/* Horizontal Options Strip */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
          activeSection ? 'pb-2 border-b border-white/10' : ''
        }`}
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive =
            id === 'texto' ? isInlineEditing : activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleSection(id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                isActive
                  ? id === 'texto'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-950/50'
                    : 'bg-indigo-600 text-white border-indigo-400/60 shadow-md shadow-indigo-950/50'
                  : 'bg-[#181926] text-slate-300 border-white/10 hover:text-white hover:border-white/25'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded Functional Tool for the Selected Horizontal Option */}

      {activeSection === 'fuente' && (() => {
        const filteredFonts = (
          fontCategory === 'all'
            ? FONTS
            : FONTS.filter((f) => f.category === fontCategory)
        ).filter((f) => {
          const q = fontSearch.trim().toLowerCase();
          if (!q) return true;
          return (
            f.label.toLowerCase().includes(q) ||
            f.tag.toLowerCase().includes(q)
          );
        });

        return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                onFocus={(e) => {
                  const target = e.currentTarget;
                  target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  window.setTimeout(() => {
                    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  }, 180);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                placeholder={`Buscar entre ${FONTS.length} fuentes...`}
                className="w-full bg-[#181926] border border-white/20 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 rounded-lg pl-8 pr-7 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none select-text"
              />
              {fontSearch && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setFontSearch('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1.5 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {fontSearch && (
              <span className="shrink-0 text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-400/30 px-2 py-1 rounded-lg">
                {filteredFonts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {TEXT_FONT_CATEGORIES.map((cat) => {
              const active = fontCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? FONTS.length
                  : FONTS.filter((f) => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFontCategory(cat.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                    active
                      ? 'bg-indigo-600 border-indigo-400/60 text-white'
                      : 'bg-[#181926] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
          {filteredFonts.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-slate-400">
              No se encontraron fuentes para "{fontSearch.trim()}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
              {filteredFonts.map((f) => {
                const selected = cfg.fontFamily === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => handleFontSelect(f.value)}
                    className={`text-left px-2.5 py-2 rounded-lg border transition-all ${
                      selected
                        ? 'bg-indigo-600/25 border-indigo-500 text-white'
                        : 'bg-[#181926] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div
                      className="text-sm leading-tight truncate"
                      style={{ fontFamily: `"${f.value}", ${f.fallback}` }}
                    >
                      {f.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{f.tag}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        );
      })()}

      {activeSection === 'alineacion' && (
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'left', label: 'Izquierda', Icon: AlignLeft },
              { key: 'center', label: 'Centro', Icon: AlignCenter },
              { key: 'right', label: 'Derecha', Icon: AlignRight },
            ] as { key: TextAlignment; label: string; Icon: React.FC<{ className?: string }> }[]
          ).map(({ key, label, Icon }) => {
            const active = cfg.alignment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleUpdate({ alignment: key })}
                className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 border-indigo-400/60 text-white'
                    : 'bg-[#181926] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeSection === 'tamano' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Tamaño de fuente</span>
            <span className="font-mono text-indigo-300 font-bold">
              {cfg.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min="16"
            max="300"
            value={cfg.fontSize}
            onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex gap-1.5">
            {[
              { label: 'Pequeño', size: 60 },
              { label: 'Mediano', size: 100 },
              { label: 'Estándar', size: 140 },
              { label: 'Titular', size: 200 },
            ].map((preset) => (
              <button
                key={preset.size}
                type="button"
                onClick={() => handleUpdate({ fontSize: preset.size })}
                className={`flex-1 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                  cfg.fontSize === preset.size
                    ? 'bg-indigo-600 border-indigo-400/60 text-white'
                    : 'bg-[#181926] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'espaciado' && (
        <div className="space-y-3">
          {/* 1. Interlineado (Line Height) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold">
                Interlineado (entre líneas)
              </span>
              <span className="font-mono text-indigo-300 font-bold">
                {(cfg.lineHeight ?? 1.15).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="3.0"
              step="0.05"
              value={cfg.lineHeight ?? 1.15}
              onChange={(e) =>
                handleUpdate({ lineHeight: Number(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex gap-1.5">
              {[
                { label: 'Compacto', val: 0.85 },
                { label: 'Normal', val: 1.15 },
                { label: 'Amplio', val: 1.5 },
                { label: 'Doble', val: 2.0 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleUpdate({ lineHeight: preset.val })}
                  className={`flex-1 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                    Math.abs((cfg.lineHeight ?? 1.15) - preset.val) < 0.03
                      ? 'bg-indigo-600 border-indigo-400/60 text-white'
                      : 'bg-[#181926] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Separación entre letras / caracteres (Letter Spacing) */}
          <div className="space-y-1.5 pt-2.5 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold">
                Separación entre letras
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {(cfg.letterSpacing ?? 0) > 0 ? '+' : ''}
                {cfg.letterSpacing ?? 0}px
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="40"
              step="0.5"
              value={cfg.letterSpacing ?? 0}
              onChange={(e) =>
                handleUpdate({ letterSpacing: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex gap-1.5">
              {[
                { label: 'Pegado', val: -2 },
                { label: 'Normal', val: 0 },
                { label: 'Abierto', val: 6 },
                { label: 'Ancho', val: 14 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleUpdate({ letterSpacing: preset.val })}
                  className={`flex-1 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                    Math.abs((cfg.letterSpacing ?? 0) - preset.val) < 0.3
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                      : 'bg-[#181926] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Separación entre palabras (Word Spacing) */}
          <div className="space-y-1.5 pt-2.5 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold">
                Separación entre palabras
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {(cfg.wordSpacing ?? 0) > 0 ? '+' : ''}
                {cfg.wordSpacing ?? 0}px
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="60"
              step="1"
              value={cfg.wordSpacing ?? 0}
              onChange={(e) =>
                handleUpdate({ wordSpacing: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex gap-1.5">
              {[
                { label: 'Normal', val: 0 },
                { label: 'Medio', val: 10 },
                { label: 'Amplio', val: 24 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleUpdate({ wordSpacing: preset.val })}
                  className={`flex-1 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                    Math.abs((cfg.wordSpacing ?? 0) - preset.val) < 0.5
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                      : 'bg-[#181926] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'color' && (
        <div className="space-y-3">
          {/* Text Fill Color with Palette & Eyedropper */}
          <ColorPalettePicker
            value={cfg.color || '#ffffff'}
            onChange={(hex) => handleUpdate({ color: hex })}
            label="Relleno:"
            eyedropperLabel="relleno del texto"
          />

          {/* Stroke / Border Color with Palette, Eyedropper & Width */}
          <div className="space-y-2 pt-2.5 border-t border-white/10">
            <ColorPalettePicker
              value={cfg.strokeColor || '#000000'}
              onChange={(hex) =>
                handleUpdate({
                  strokeColor: hex,
                  ...(cfg.strokeWidth === 0 ? { strokeWidth: 4 } : {}),
                })
              }
              label="Borde:"
              eyedropperLabel="borde del texto"
              compact
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">
                Grosor de borde:
              </span>
              <input
                type="range"
                min="0"
                max="20"
                value={cfg.strokeWidth || 0}
                onChange={(e) =>
                  handleUpdate({ strokeWidth: Number(e.target.value) })
                }
                className="flex-1 accent-indigo-500 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-slate-300 w-9 text-right">
                {cfg.strokeWidth || 0}px
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'sombra' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-semibold">
              Activar sombra del texto
            </span>
            <button
              type="button"
              onClick={() => {
                const currentlyEnabled =
                  cfg.hasShadow !== false &&
                  ((cfg.shadowBlur || 0) > 0 || (cfg.shadowDistance || 0) > 0);
                if (currentlyEnabled) {
                  handleUpdate({ hasShadow: false });
                } else {
                  handleUpdate({
                    hasShadow: true,
                    shadowColor:
                      cfg.shadowColor && cfg.shadowColor.startsWith('#')
                        ? cfg.shadowColor
                        : '#000000',
                    shadowOpacity:
                      cfg.shadowOpacity && cfg.shadowOpacity > 0.05
                        ? cfg.shadowOpacity
                        : 0.85,
                    shadowBlur: cfg.shadowBlur > 0 ? cfg.shadowBlur : 12,
                    shadowDistance:
                      cfg.shadowDistance > 0 ? cfg.shadowDistance : 5,
                    shadowAngle: cfg.shadowAngle ?? 45,
                  });
                }
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                cfg.hasShadow !== false &&
                ((cfg.shadowBlur || 0) > 0 || (cfg.shadowDistance || 0) > 0)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#181926] text-slate-400 border border-white/10'
              }`}
            >
              {cfg.hasShadow !== false &&
              ((cfg.shadowBlur || 0) > 0 || (cfg.shadowDistance || 0) > 0)
                ? 'Activada'
                : 'Desactivada'}
            </button>
          </div>

          {/* Quick Shadow Presets */}
          <div className="flex gap-1.5">
            {[
              {
                label: 'Suave',
                patch: {
                  hasShadow: true,
                  shadowColor: '#000000',
                  shadowOpacity: 0.65,
                  shadowBlur: 14,
                  shadowDistance: 4,
                  shadowAngle: 45,
                },
              },
              {
                label: 'Fuerte',
                patch: {
                  hasShadow: true,
                  shadowColor: '#000000',
                  shadowOpacity: 0.95,
                  shadowBlur: 18,
                  shadowDistance: 8,
                  shadowAngle: 45,
                },
              },
              {
                label: 'Dura',
                patch: {
                  hasShadow: true,
                  shadowColor: '#000000',
                  shadowOpacity: 1,
                  shadowBlur: 0,
                  shadowDistance: 7,
                  shadowAngle: 45,
                },
              },
              {
                label: 'Neón',
                patch: {
                  hasShadow: true,
                  shadowColor: '#22d3ee',
                  shadowOpacity: 0.95,
                  shadowBlur: 26,
                  shadowDistance: 0,
                  shadowAngle: 0,
                },
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleUpdate(preset.patch)}
                className="flex-1 py-1 rounded-md border bg-[#181926] border-white/10 text-slate-300 hover:text-white hover:border-indigo-400/50 text-[10px] font-semibold transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {cfg.hasShadow !== false && (
            <div className="space-y-2.5 pt-1 border-t border-white/10">
              <ColorPalettePicker
                value={
                  cfg.shadowColor && cfg.shadowColor.startsWith('#')
                    ? cfg.shadowColor
                    : '#000000'
                }
                onChange={(hex) =>
                  handleUpdate({ hasShadow: true, shadowColor: hex })
                }
                label="Color sombra:"
                eyedropperLabel="color de sombra del texto"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Opacidad</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {Math.round((cfg.shadowOpacity ?? 0.85) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((cfg.shadowOpacity ?? 0.85) * 100)}
                    onChange={(e) =>
                      handleUpdate({
                        hasShadow: true,
                        shadowOpacity: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Difuminado</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {cfg.shadowBlur ?? 10}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={cfg.shadowBlur ?? 10}
                    onChange={(e) =>
                      handleUpdate({
                        hasShadow: true,
                        shadowBlur: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Distancia</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {cfg.shadowDistance ?? 4}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={cfg.shadowDistance ?? 4}
                    onChange={(e) =>
                      handleUpdate({
                        hasShadow: true,
                        shadowDistance: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Ángulo</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {cfg.shadowAngle ?? 45}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={cfg.shadowAngle ?? 45}
                    onChange={(e) =>
                      handleUpdate({
                        hasShadow: true,
                        shadowAngle: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'fondo' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-semibold">
              Activar bloque de fondo
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !cfg.hasBackground;
                handleUpdate({
                  hasBackground: next,
                  ...(next && !(cfg.backgroundOpacity && cfg.backgroundOpacity > 0)
                    ? { backgroundOpacity: 0.85 }
                    : {}),
                });
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                cfg.hasBackground
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#181926] text-slate-400 border border-white/10'
              }`}
            >
              {cfg.hasBackground ? 'Activada' : 'Desactivada'}
            </button>
          </div>

          {cfg.hasBackground && (
            <div className="space-y-2.5 pt-1">
              <ColorPalettePicker
                value={cfg.backgroundColor || '#000000'}
                onChange={(hex) => handleUpdate({ backgroundColor: hex })}
                label="Bloque:"
                eyedropperLabel="bloque de fondo del texto"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Redondeo</span>
                    <span className="font-mono">{cfg.borderRadius ?? 8}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={cfg.borderRadius ?? 8}
                    onChange={(e) =>
                      handleUpdate({ borderRadius: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Opacidad</span>
                    <span className="font-mono">
                      {Math.round((cfg.backgroundOpacity ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round((cfg.backgroundOpacity ?? 0) * 100)}
                    onChange={(e) =>
                      handleUpdate({
                        backgroundOpacity: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'animacion' && (
        <div className="space-y-2.5">
          {/* Sub-tabs: Entrada / Salida */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-[#0c0d14] p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setAnimMode('in')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  animMode === 'in'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrada ({IN_ANIMATIONS.length - 1})
              </button>
              <button
                type="button"
                onClick={() => setAnimMode('out')}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  animMode === 'out'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Salida ({OUT_ANIMATIONS.length - 1})
              </button>
            </div>

            <button
              type="button"
              onClick={() => previewAnimation(animMode)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Previsualizar</span>
            </button>
          </div>

          {animMode === 'in' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                {IN_ANIMATIONS.map((opt) => {
                  const active = cfg.animIn === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleUpdate({ animIn: opt.value }, true);
                        if (opt.value !== 'none') {
                          previewAnimation('in');
                        } else {
                          ensurePlayheadVisible({ animIn: 'none' });
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all truncate ${
                        active
                          ? 'bg-indigo-600 border-indigo-400/60 text-white shadow-sm'
                          : 'bg-[#181926] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {cfg.animIn !== 'none' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 shrink-0">
                    Duración entrada:
                  </span>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={cfg.animInDuration || 0.6}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      handleUpdate({ animInDuration: d }, true);
                    }}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-indigo-300 w-9 text-right">
                    {(cfg.animInDuration || 0.6).toFixed(1)}s
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                {OUT_ANIMATIONS.map((opt) => {
                  const active = animOutValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleUpdate(
                          { animOut: opt.value, animOutDuration: animOutDurValue },
                          true
                        );
                        if (opt.value !== 'none') {
                          previewAnimation('out', animOutDurValue);
                        } else {
                          ensurePlayheadVisible({ animOut: 'none' });
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all truncate ${
                        active
                          ? 'bg-purple-600 border-purple-400/60 text-white shadow-sm'
                          : 'bg-[#181926] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {animOutValue !== 'none' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 shrink-0">
                    Duración salida:
                  </span>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={animOutDurValue}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      handleUpdate({ animOutDuration: d }, true);
                    }}
                    className="flex-1 accent-purple-500 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-purple-300 w-9 text-right">
                    {animOutDurValue.toFixed(1)}s
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeSection === 'keyframes' && (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleAddTextKeyframe}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Keyframe en {localTime.toFixed(2)}s</span>
          </button>

          {keyframes.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              Añade un keyframe, avanza en la línea de tiempo y arrastra el texto sobre la pantalla para animar su movimiento automáticamente.
            </p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {keyframes.map((kf) => (
                <div
                  key={kf.id}
                  onClick={() => setCurrentTime(clip.startTime + kf.time)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Diamond className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="font-mono text-slate-200">
                      {kf.time.toFixed(2)}s
                    </span>
                    <span className="text-[10px] text-slate-400">
                      X:{Math.round(kf.properties.x ?? 0)}% Y:{Math.round(kf.properties.y ?? 0)}% Esc:{(kf.properties.scale ?? 1).toFixed(2)}x
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeKeyframe(clip.id, kf.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Eliminar keyframe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
