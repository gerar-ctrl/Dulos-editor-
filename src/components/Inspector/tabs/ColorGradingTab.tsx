// ============================================================================
// ColorGradingTab - 85 Studio LUT Filters, 10-Band Color Grading & Selective HSL
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { VideoClip, FilterPreset } from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { Sliders, Sparkles, Palette, RotateCcw, CheckCheck } from 'lucide-react';
import { HorizontalScrollRow } from '../../Editor/HorizontalScrollRow';
import { PARAMETRIC_FILTER_LIST, FilterCategory } from '../../../core/webgl/parametricFilters';

interface ColorGradingTabProps {
  clip: VideoClip;
  initialSubTab?: 'filters' | 'adjust' | 'hsl';
}

type HslChannel = 'hslRed' | 'hslYellow' | 'hslGreen' | 'hslBlue';

interface FilterPresetCard {
  id: FilterPreset;
  label: string;
  desc: string;
  category: FilterCategory;
  swatch: string;
}

const BASE_FILTER_PRESETS: FilterPresetCard[] = [
  {
    id: 'none',
    label: 'Original',
    desc: 'Sin filtro LUT',
    category: 'all',
    swatch: 'from-slate-600 to-slate-800',
  },
  {
    id: 'tealOrange',
    label: 'Teal & Orange',
    desc: 'Blockbuster Hollywood',
    category: 'cinema',
    swatch: 'from-teal-500 via-cyan-700 to-orange-500',
  },
  {
    id: 'cinematic',
    label: 'Cine Anamórfico',
    desc: 'Sombras azuladas + S-Curve',
    category: 'cinema',
    swatch: 'from-slate-800 via-indigo-900 to-amber-600',
  },
  {
    id: 'imax',
    label: 'IMAX HDR',
    desc: 'Contraste profundo y nitidez',
    category: 'cinema',
    swatch: 'from-blue-600 via-indigo-600 to-emerald-500',
  },
  {
    id: 'bleachBypass',
    label: 'Bleach Bypass',
    desc: 'Plata retenida / Acción cruda',
    category: 'cinema',
    swatch: 'from-zinc-600 via-slate-700 to-stone-900',
  },
  {
    id: 'night',
    label: 'Luz de Luna',
    desc: 'Noche cinematográfica azul',
    category: 'cinema',
    swatch: 'from-blue-900 via-indigo-950 to-sky-700',
  },
  {
    id: 'vintage',
    label: 'Kodak Gold 70s',
    desc: 'Película cálida retro',
    category: 'vintage',
    swatch: 'from-amber-600 via-orange-700 to-purple-900',
  },
  {
    id: 'fadedFilm',
    label: 'Mate Analógico',
    desc: 'Negros lavados suaves',
    category: 'vintage',
    swatch: 'from-stone-500 via-amber-700/70 to-zinc-800',
  },
  {
    id: 'sepia',
    label: 'Sepia Clásico',
    desc: 'Tono bronce antiguo',
    category: 'vintage',
    swatch: 'from-amber-700 to-yellow-950',
  },
  {
    id: 'pastel',
    label: 'Pastel Aesthetic',
    desc: 'Tonos suaves algodonosos',
    category: 'vintage',
    swatch: 'from-pink-400 via-purple-400 to-cyan-300',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Neón',
    desc: 'Magenta eléctrico y cian',
    category: 'cyber',
    swatch: 'from-fuchsia-600 via-purple-800 to-cyan-400',
  },
  {
    id: 'matrix',
    label: 'Matrix Sci-Fi',
    desc: 'Tinte esmeralda digital',
    category: 'cyber',
    swatch: 'from-emerald-600 via-green-900 to-black',
  },
  {
    id: 'anime',
    label: 'Cielo Anime',
    desc: 'Azules y verdes luminosos',
    category: 'cyber',
    swatch: 'from-sky-400 via-blue-500 to-emerald-400',
  },
  {
    id: 'vibrant',
    label: 'Vibrante Pop',
    desc: 'Realce inteligente de color',
    category: 'nature',
    swatch: 'from-rose-500 via-amber-400 to-emerald-500',
  },
  {
    id: 'goldenHour',
    label: 'Hora Dorada',
    desc: 'Atardecer cálido luminoso',
    category: 'nature',
    swatch: 'from-amber-400 via-orange-500 to-rose-600',
  },
  {
    id: 'sunset',
    label: 'Sunset California',
    desc: 'Degradado coral y oro',
    category: 'nature',
    swatch: 'from-purple-600 via-rose-500 to-amber-400',
  },
  {
    id: 'warm',
    label: 'Cálido Ámbar',
    desc: 'Balance soleado',
    category: 'nature',
    swatch: 'from-orange-500 to-amber-700',
  },
  {
    id: 'cool',
    label: 'Frío Ártico',
    desc: 'Tono glaciar nórdico',
    category: 'nature',
    swatch: 'from-cyan-500 to-blue-800',
  },
  {
    id: 'bw',
    label: 'Blanco y Negro',
    desc: 'Monocromo plata pura',
    category: 'bw',
    swatch: 'from-zinc-300 via-zinc-600 to-zinc-950',
  },
  {
    id: 'noir',
    label: 'Film Noir',
    desc: 'Alto contraste dramático',
    category: 'bw',
    swatch: 'from-white via-neutral-800 to-black',
  },
  {
    id: 'blockbuster',
    label: 'Blockbuster Pro',
    desc: 'Sombras acero + ámbar vivo',
    category: 'cinema',
    swatch: 'from-sky-800 via-slate-900 to-amber-500',
  },
  {
    id: 'warmCinema',
    label: 'Cine Indie Cálido',
    desc: 'Medios dorados suaves',
    category: 'cinema',
    swatch: 'from-amber-500 via-orange-700 to-stone-800',
  },
  {
    id: 'moodyDark',
    label: 'Moody Oscuro',
    desc: 'Sombras profundas + desaturado',
    category: 'cinema',
    swatch: 'from-zinc-700 via-slate-900 to-black',
  },
  {
    id: 'polaroid',
    label: 'Polaroid 80s',
    desc: 'Altas luces cremosas retro',
    category: 'vintage',
    swatch: 'from-amber-200 via-emerald-800/70 to-stone-800',
  },
  {
    id: 'fujiVelvia',
    label: 'Fuji Velvia',
    desc: 'Paisajes vívidos de película',
    category: 'vintage',
    swatch: 'from-emerald-500 via-fuchsia-600 to-indigo-700',
  },
  {
    id: 'kodachrome',
    label: 'Kodachrome 64',
    desc: 'Rojos ricos y negros intensos',
    category: 'vintage',
    swatch: 'from-red-600 via-amber-500 to-stone-900',
  },
  {
    id: 'synthwave',
    label: 'Synthwave 80s',
    desc: 'Púrpura, rosa y cian neón',
    category: 'cyber',
    swatch: 'from-purple-800 via-pink-500 to-cyan-400',
  },
  {
    id: 'vaporwaveLUT',
    label: 'Vaporwave Pastel',
    desc: 'Rosa y aqua soñador',
    category: 'cyber',
    swatch: 'from-pink-400 via-purple-400 to-teal-300',
  },
  {
    id: 'neonNoir',
    label: 'Neon Noir',
    desc: 'Contraste oscuro + neón azul',
    category: 'cyber',
    swatch: 'from-blue-600 via-fuchsia-600 to-black',
  },
  {
    id: 'emerald',
    label: 'Bosque Esmeralda',
    desc: 'Verdes profundos y frescos',
    category: 'nature',
    swatch: 'from-emerald-500 via-teal-700 to-slate-900',
  },
  {
    id: 'arctic',
    label: 'Ártico Glacial',
    desc: 'Azules hielo cristalinos',
    category: 'nature',
    swatch: 'from-sky-300 via-cyan-500 to-blue-900',
  },
  {
    id: 'desert',
    label: 'Desierto Dorado',
    desc: 'Arena cálida y terracota',
    category: 'nature',
    swatch: 'from-amber-400 via-orange-600 to-yellow-900',
  },
  {
    id: 'softPortrait',
    label: 'Retrato Suave',
    desc: 'Tonos de piel luminosos',
    category: 'nature',
    swatch: 'from-rose-300 via-amber-200 to-stone-600',
  },
  {
    id: 'highContrastBW',
    label: 'B&N Plata Pura',
    desc: 'Blanco y negro extremo',
    category: 'bw',
    swatch: 'from-white via-zinc-500 to-black',
  },
  {
    id: 'infrared',
    label: 'Infrarrojo Surreal',
    desc: 'Vegetación carmesí intensa',
    category: 'cyber',
    swatch: 'from-rose-600 via-pink-500 to-zinc-900',
  },
  {
    id: 'duotoneGold',
    label: 'Oro & Obsidiana',
    desc: 'Duotono dorado de lujo',
    category: 'bw',
    swatch: 'from-amber-300 via-yellow-600 to-black',
  },
];

const ALL_FILTER_PRESETS: FilterPresetCard[] = [
  ...BASE_FILTER_PRESETS,
  ...PARAMETRIC_FILTER_LIST.map((f) => ({
    id: f.id,
    label: f.label,
    desc: f.desc,
    category: f.category,
    swatch: f.swatch,
  })),
];

export const ColorGradingTab: React.FC<ColorGradingTabProps> = ({
  clip,
  initialSubTab = 'filters',
}) => {
  const { updateClip, updateAllVisualClips, showToast } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      updateAllVisualClips: s.updateAllVisualClips,
      showToast: s.showToast,
    }))
  );
  const [subTab, setSubTab] = useState<'filters' | 'adjust' | 'hsl'>(initialSubTab);
  const [filterCat, setFilterCat] = useState<FilterCategory>('all');
  const [activeHslChannel, setActiveHslChannel] = useState<HslChannel>('hslRed');

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const cg = clip.colorGrading;
  const filterIntensity = clip.filterIntensity ?? 100;

  const handleUpdate = (partial: Partial<typeof cg>) => {
    updateClip(clip.id, { colorGrading: { ...cg, ...partial } });
  };

  const resetAllColor = () => {
    updateClip(clip.id, {
      filterPreset: 'none',
      filterIntensity: 100,
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
    });
    showToast('🎨 Color y filtros restablecidos al original');
  };

  const applyColorToAllClips = () => {
    updateAllVisualClips({
      filterPreset: clip.filterPreset,
      filterIntensity: clip.filterIntensity ?? 100,
      colorGrading: { ...cg },
    });
    showToast('🎨 Filtro y ajustes de color aplicados a todos los clips');
  };

  const visiblePresets = useMemo(
    () =>
      ALL_FILTER_PRESETS.filter(
        (p) => filterCat === 'all' || p.id === 'none' || p.category === filterCat
      ),
    [filterCat]
  );

  const currentHsl = cg[activeHslChannel] || { hue: 0, sat: 0, lum: 0 };

  const updateHsl = (partial: Partial<typeof currentHsl>) => {
    handleUpdate({
      [activeHslChannel]: { ...currentHsl, ...partial },
    });
  };

  return (
    <div className="space-y-3 p-3.5 text-xs text-slate-300">
      {/* Top Sub-Navigation: Filtros LUT vs Ajustar vs HSL */}
      <div className="flex bg-[#141622] p-1 rounded-xl border border-white/10">
        <button
          onClick={() => setSubTab('filters')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'filters'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Filtros LUT ({ALL_FILTER_PRESETS.length - 1})</span>
        </button>
        <button
          onClick={() => setSubTab('adjust')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'adjust'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Ajustar (10)</span>
        </button>
        <button
          onClick={() => setSubTab('hsl')}
          className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'hsl'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>HSL Pro</span>
        </button>
      </div>

      {/* 1. FILTROS LUT TAB */}
      {subTab === 'filters' && (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'cinema', label: '🎬 Cine' },
              { id: 'vintage', label: '🎞️ Vintage' },
              { id: 'cyber', label: '🌆 Cyber / Anime' },
              { id: 'nature', label: '☀️ Cálidos / Fríos' },
              { id: 'bw', label: '⚫ B&N / Noir' },
              { id: 'portrait', label: '👤 Retrato / Editorial' },
              { id: 'mood', label: '🎭 Atmósfera / Arte' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(cat.id as FilterCategory)}
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] whitespace-nowrap transition-all ${
                  filterCat === cat.id
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <HorizontalScrollRow>
            {visiblePresets.map((p) => {
              const isSelected = (clip.filterPreset || 'none') === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    updateClip(clip.id, {
                      filterPreset: p.id,
                      filterIntensity: clip.filterIntensity ?? 100,
                    });
                    if (p.id !== 'none') {
                      showToast(`🎨 Filtro LUT "${p.label}" aplicado`);
                    }
                  }}
                  className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl font-medium text-left border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.swatch} shrink-0 shadow-inner border border-white/20 flex items-center justify-center font-black text-[10px] text-white/90 drop-shadow`}
                  >
                    {p.label.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">{p.label}</div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {p.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </HorizontalScrollRow>

          {clip.filterPreset && clip.filterPreset !== 'none' && (
            <div className="pt-2.5 border-t border-white/10 space-y-2.5">
              <div>
                <div className="flex justify-between text-slate-300 font-semibold mb-1">
                  <span>Intensidad del Filtro LUT</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {filterIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={filterIntensity}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      filterIntensity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={applyColorToAllClips}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Aplicar a Todos los Clips</span>
                </button>
                <button
                  onClick={resetAllColor}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-semibold flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. MANUAL 10-BAND COLOR GRADING TAB */}
      {subTab === 'adjust' && (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-200 font-bold">
              Corrección de Color de 10 Bandas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={applyColorToAllClips}
                className="text-[10px] px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 font-semibold"
              >
                Aplicar a todos
              </button>
              <button
                onClick={resetAllColor}
                className="text-[10px] px-2 py-1 rounded bg-white/5 text-slate-300 hover:bg-white/10 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            {[
              {
                key: 'exposure',
                label: 'Exposición',
                min: -100,
                max: 100,
                val: cg.exposure,
              },
              {
                key: 'brightness',
                label: 'Brillo',
                min: -100,
                max: 100,
                val: cg.brightness,
              },
              {
                key: 'contrast',
                label: 'Contraste',
                min: -100,
                max: 100,
                val: cg.contrast,
              },
              {
                key: 'saturation',
                label: 'Saturación',
                min: -100,
                max: 100,
                val: cg.saturation,
              },
              {
                key: 'highlights',
                label: 'Altas Luces (Highlights)',
                min: -100,
                max: 100,
                val: cg.highlights,
              },
              {
                key: 'shadows',
                label: 'Sombras (Shadows)',
                min: -100,
                max: 100,
                val: cg.shadows,
              },
              {
                key: 'temperature',
                label: 'Temperatura (Frío/Cálido)',
                min: -100,
                max: 100,
                val: cg.temperature,
              },
              {
                key: 'tint',
                label: 'Matiz (Verde/Magenta)',
                min: -100,
                max: 100,
                val: cg.tint,
              },
              {
                key: 'sharpness',
                label: 'Nitidez (Convolución 3x3)',
                min: 0,
                max: 100,
                val: cg.sharpness,
              },
              {
                key: 'vignette',
                label: 'Viñeta Cinematográfica',
                min: 0,
                max: 100,
                val: cg.vignette,
              },
            ].map((slider) => (
              <div key={slider.key}>
                <div className="flex justify-between text-slate-300 mb-0.5">
                  <span className="font-medium text-[11px]">{slider.label}</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {slider.val > 0 ? `+${slider.val}` : slider.val}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  value={slider.val}
                  onChange={(e) =>
                    handleUpdate({ [slider.key]: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SELECTIVE HSL TAB */}
      {subTab === 'hsl' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-bold">
              Color Selectivo por Canal (HSL)
            </span>
            <button
              onClick={() =>
                handleUpdate({
                  hslRed: { hue: 0, sat: 0, lum: 0 },
                  hslYellow: { hue: 0, sat: 0, lum: 0 },
                  hslGreen: { hue: 0, sat: 0, lum: 0 },
                  hslBlue: { hue: 0, sat: 0, lum: 0 },
                })
              }
              className="text-[10px] text-indigo-400 hover:underline"
            >
              Restablecer HSL
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'hslRed', label: 'Rojos / Piel', color: 'bg-rose-500' },
              { id: 'hslYellow', label: 'Amarillos', color: 'bg-amber-400' },
              { id: 'hslGreen', label: 'Verdes', color: 'bg-emerald-500' },
              { id: 'hslBlue', label: 'Azules / Cielo', color: 'bg-sky-500' },
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveHslChannel(ch.id as HslChannel)}
                className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 font-bold text-[11px] transition-all ${
                  activeHslChannel === ch.id
                    ? 'bg-white/15 border-white text-white shadow'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${ch.color}`} />
                <span className="truncate">{ch.label}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Tono (Hue)</span>
                <span className="font-mono text-indigo-400">
                  {currentHsl.hue}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.hue}
                onChange={(e) => updateHsl({ hue: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Saturación Canal</span>
                <span className="font-mono text-indigo-400">
                  {currentHsl.sat}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.sat}
                onChange={(e) => updateHsl({ sat: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Luminancia Canal</span>
                <span className="font-mono text-indigo-400">
                  {currentHsl.lum}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentHsl.lum}
                onChange={(e) => updateHsl({ lum: Number(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
