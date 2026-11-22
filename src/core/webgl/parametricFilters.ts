// ============================================================================
// Parametric Studio LUT Filters (Presets 36..85)
// Single source of truth for WebGL uniforms, Canvas2D fallback, and UI cards.
// ============================================================================

import { FilterPreset } from '../../types/editor';

export type ParametricFilterId = Exclude<
  FilterPreset,
  | 'none'
  | 'tealOrange'
  | 'cinematic'
  | 'imax'
  | 'vintage'
  | 'fadedFilm'
  | 'sepia'
  | 'bw'
  | 'noir'
  | 'cyberpunk'
  | 'matrix'
  | 'vibrant'
  | 'anime'
  | 'goldenHour'
  | 'warm'
  | 'cool'
  | 'night'
  | 'bleachBypass'
  | 'pastel'
  | 'sunset'
  | 'blockbuster'
  | 'warmCinema'
  | 'moodyDark'
  | 'polaroid'
  | 'fujiVelvia'
  | 'kodachrome'
  | 'synthwave'
  | 'vaporwaveLUT'
  | 'neonNoir'
  | 'emerald'
  | 'arctic'
  | 'desert'
  | 'highContrastBW'
  | 'infrared'
  | 'duotoneGold'
  | 'softPortrait'
>;

export type FilterCategory = 'all' | 'cinema' | 'vintage' | 'cyber' | 'nature' | 'bw' | 'portrait' | 'mood';

export interface ParametricFilterGpuParams {
  /** 3x3 color matrix rows: [r0,r1,r2, g0,g1,g2, b0,b1,b2] */
  matrix: readonly [
    number, number, number,
    number, number, number,
    number, number, number,
  ];
  /** [r, g, b, strength] */
  shadow: readonly [number, number, number, number];
  /** [r, g, b, strength] */
  high: readonly [number, number, number, number];
  /** [contrast, saturation, gamma, lift] */
  params: readonly [number, number, number, number];
  /** [gainR, gainG, gainB, sCurve] */
  gain: readonly [number, number, number, number];
  /** [duotoneMix, vibrance, 0, 0] */
  extra: readonly [number, number, number, number];
}

export interface ParametricFilterMeta {
  id: ParametricFilterId;
  numericId: number;
  label: string;
  desc: string;
  category: Exclude<FilterCategory, 'all'>;
  swatch: string;
  gpu: ParametricFilterGpuParams;
}

const ID_MAT: ParametricFilterGpuParams['matrix'] = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const BW_MAT: ParametricFilterGpuParams['matrix'] = [
  0.299, 0.587, 0.114,
  0.299, 0.587, 0.114,
  0.299, 0.587, 0.114,
];

function def(
  id: ParametricFilterId,
  numericId: number,
  label: string,
  desc: string,
  category: Exclude<FilterCategory, 'all'>,
  swatch: string,
  partial: Partial<ParametricFilterGpuParams>
): ParametricFilterMeta {
  return {
    id,
    numericId,
    label,
    desc,
    category,
    swatch,
    gpu: {
      matrix: partial.matrix ?? ID_MAT,
      shadow: partial.shadow ?? [0, 0, 0, 0],
      high: partial.high ?? [1, 1, 1, 0],
      params: partial.params ?? [1, 1, 1, 0],
      gain: partial.gain ?? [1, 1, 1, 0],
      extra: partial.extra ?? [0, 0, 0, 0],
    },
  };
}

export const PARAMETRIC_FILTER_LIST: readonly ParametricFilterMeta[] = [
  // ── 🎬 CINE (36..45) ───────────────────────────────────────────────────────
  def('oppenheimer', 36, 'Oppenheimer 70mm', 'Carbón profundo + cobre cálido', 'cinema', 'from-stone-900 via-amber-800 to-orange-500', {
    shadow: [0.06, 0.08, 0.12, 0.55],
    high: [1.0, 0.68, 0.42, 0.50],
    params: [1.22, 0.86, 1.04, 0.02],
    gain: [1.05, 0.99, 0.92, 0.35],
  }),
  def('dune', 37, 'Dune Arrakis', 'Ocre desértico épico desaturado', 'cinema', 'from-amber-700 via-stone-700 to-yellow-900', {
    shadow: [0.22, 0.16, 0.10, 0.45],
    high: [1.0, 0.82, 0.54, 0.65],
    params: [1.14, 0.68, 1.05, 0.04],
    gain: [1.10, 1.01, 0.84, 0.25],
  }),
  def('bladeRunner', 38, 'Blade 2049', 'Niebla ámbar y cian distópico', 'cinema', 'from-cyan-700 via-slate-800 to-amber-500', {
    shadow: [0.04, 0.28, 0.34, 0.70],
    high: [1.0, 0.62, 0.18, 0.70],
    params: [1.18, 0.92, 1.02, 0.05],
    gain: [1.04, 0.98, 0.95, 0.20],
  }),
  def('joker', 39, 'Gotham Verde', 'Sombras verde ácido + rojos vivos', 'cinema', 'from-emerald-900 via-teal-800 to-red-700', {
    shadow: [0.04, 0.26, 0.18, 0.72],
    high: [0.98, 0.88, 0.65, 0.40],
    params: [1.24, 0.94, 1.08, 0.02],
    gain: [0.98, 1.04, 0.90, 0.35],
  }),
  def('wesAnderson', 40, 'Simetría Pastel', 'Crema, coral y menta vintage', 'cinema', 'from-rose-300 via-amber-200 to-teal-300', {
    shadow: [0.16, 0.24, 0.22, 0.38],
    high: [1.0, 0.88, 0.76, 0.48],
    params: [0.96, 1.12, 0.92, 0.08],
    gain: [1.06, 1.02, 0.96, 0.0],
    extra: [0, 0.25, 0, 0],
  }),
  def('johnWick', 41, 'Neo Club', 'Sombras azul nocturno + neón', 'cinema', 'from-blue-950 via-indigo-800 to-fuchsia-600', {
    shadow: [0.04, 0.14, 0.42, 0.78],
    high: [0.95, 0.42, 0.88, 0.55],
    params: [1.28, 1.10, 1.06, 0.0],
    gain: [1.02, 0.94, 1.12, 0.30],
  }),
  def('godfather', 42, 'Padrino Clásico', 'Chocolate oscuro y oro antiguo', 'cinema', 'from-stone-950 via-amber-900 to-yellow-700', {
    shadow: [0.14, 0.08, 0.04, 0.65],
    high: [0.98, 0.80, 0.48, 0.55],
    params: [1.22, 0.78, 1.14, 0.02],
    gain: [1.08, 0.98, 0.82, 0.40],
  }),
  def('madMax', 43, 'Furia Cromo', 'Naranjas extremos y cian acero', 'cinema', 'from-orange-500 via-amber-600 to-cyan-700', {
    shadow: [0.04, 0.26, 0.38, 0.65],
    high: [1.0, 0.58, 0.16, 0.75],
    params: [1.32, 1.24, 1.02, 0.0],
    gain: [1.12, 1.00, 0.88, 0.45],
  }),
  def('thriller', 44, 'Suspenso Frío', 'Acero desaturado y tensión verde', 'cinema', 'from-slate-800 via-teal-950 to-zinc-700', {
    shadow: [0.05, 0.14, 0.16, 0.60],
    high: [0.78, 0.88, 0.90, 0.40],
    params: [1.20, 0.58, 1.08, 0.03],
    gain: [0.90, 1.01, 1.04, 0.30],
  }),
  def('documentary', 45, 'Docu Realismo', 'Contraste limpio y piel fiel', 'cinema', 'from-sky-700 via-slate-600 to-amber-600', {
    shadow: [0.06, 0.08, 0.12, 0.20],
    high: [0.98, 0.96, 0.92, 0.20],
    params: [1.10, 1.04, 0.98, 0.01],
    gain: [1.01, 1.00, 0.99, 0.22],
    extra: [0, 0.22, 0, 0],
  }),

  // ── 🎞️ VINTAGE / PELÍCULA (46..55) ─────────────────────────────────────────
  def('portra400', 46, 'Kodak Portra 400', 'Piel sedosa y pastel natural', 'vintage', 'from-rose-300 via-amber-300 to-stone-500', {
    shadow: [0.12, 0.10, 0.12, 0.30],
    high: [1.0, 0.92, 0.82, 0.40],
    params: [0.98, 0.94, 0.92, 0.06],
    gain: [1.05, 1.01, 0.95, 0.10],
    extra: [0, 0.20, 0, 0],
  }),
  def('cinestill800', 47, 'CineStill 800T', 'Tungsteno nocturno y halos azules', 'vintage', 'from-blue-800 via-cyan-600 to-rose-500', {
    shadow: [0.04, 0.18, 0.36, 0.65],
    high: [1.0, 0.72, 0.68, 0.45],
    params: [1.16, 1.06, 0.98, 0.03],
    gain: [0.96, 1.00, 1.12, 0.25],
  }),
  def('agfaVista', 48, 'Agfa Vista 200', 'Rojos vibrantes y verdes retro', 'vintage', 'from-red-600 via-emerald-600 to-amber-400', {
    matrix: [1.06, -0.02, -0.02, 0.0, 1.04, -0.02, -0.02, 0.02, 0.96],
    shadow: [0.06, 0.14, 0.10, 0.35],
    high: [1.0, 0.90, 0.76, 0.35],
    params: [1.14, 1.18, 0.96, 0.04],
    gain: [1.04, 1.02, 0.94, 0.20],
  }),
  def('super8', 49, 'Super 8mm', 'Película casera cálida de los 70s', 'vintage', 'from-amber-700 via-orange-600 to-stone-700', {
    matrix: [0.92, 0.12, 0.0, 0.06, 0.88, 0.06, 0.02, 0.08, 0.74],
    shadow: [0.18, 0.12, 0.06, 0.45],
    high: [1.0, 0.88, 0.62, 0.45],
    params: [0.94, 0.84, 0.94, 0.11],
    gain: [1.06, 1.00, 0.86, 0.0],
  }),
  def('vhsRetro', 50, 'VHS 1992', 'Negros lavados + tinte magenta/cian', 'vintage', 'from-fuchsia-700 via-slate-700 to-cyan-500', {
    shadow: [0.20, 0.06, 0.24, 0.50],
    high: [0.80, 0.98, 1.0, 0.42],
    params: [0.88, 0.92, 0.90, 0.13],
    gain: [1.02, 0.96, 1.06, 0.0],
  }),
  def('lomo', 51, 'Lomografía', 'Saturación cruzada y contraste duro', 'vintage', 'from-emerald-500 via-amber-500 to-rose-600', {
    shadow: [0.04, 0.20, 0.22, 0.48],
    high: [1.0, 0.86, 0.40, 0.45],
    params: [1.30, 1.32, 1.04, 0.0],
    gain: [1.06, 1.02, 0.94, 0.40],
  }),
  def('crossProcess', 52, 'Proceso Cruzado', 'Sombras cian/verde + luces oro', 'vintage', 'from-teal-600 via-lime-500 to-yellow-400', {
    matrix: [0.95, 0.10, -0.05, 0.0, 1.06, 0.02, -0.05, 0.12, 0.94],
    shadow: [0.02, 0.28, 0.26, 0.65],
    high: [1.0, 0.94, 0.44, 0.62],
    params: [1.18, 1.12, 0.98, 0.03],
    gain: [1.00, 1.04, 0.92, 0.20],
  }),
  def('daguerreotype', 53, 'Daguerrotipo', 'Plata envejecida tono bronce', 'vintage', 'from-stone-400 via-amber-700 to-stone-900', {
    matrix: BW_MAT,
    shadow: [0.16, 0.12, 0.08, 0.60],
    high: [0.96, 0.88, 0.74, 0.65],
    params: [1.16, 0.65, 1.06, 0.06],
    gain: [1.04, 0.98, 0.88, 0.25],
  }),
  def('technicolor', 54, 'Technicolor 50s', 'Rojos y cianes saturados clásicos', 'vintage', 'from-red-600 via-cyan-500 to-amber-500', {
    matrix: [1.18, -0.10, -0.08, -0.04, 1.06, -0.02, -0.06, 0.04, 1.08],
    shadow: [0.04, 0.12, 0.16, 0.30],
    high: [1.0, 0.92, 0.84, 0.25],
    params: [1.22, 1.30, 1.00, 0.0],
    gain: [1.06, 0.98, 1.00, 0.30],
  }),
  def('expiredFilm', 55, 'Rollo Vencido', 'Sombras verdosas y luces rosadas', 'vintage', 'from-lime-700 via-stone-600 to-pink-400', {
    shadow: [0.10, 0.24, 0.12, 0.55],
    high: [1.0, 0.78, 0.86, 0.50],
    params: [0.92, 0.82, 0.92, 0.10],
    gain: [1.02, 1.00, 0.96, 0.0],
  }),

  // ── 🌆 CYBER / NEÓN / ARTE (56..65) ────────────────────────────────────────
  def('outrun', 56, 'Outrun Turbo', 'Magenta eléctrico y azul cobalto', 'cyber', 'from-fuchsia-600 via-indigo-700 to-cyan-400', {
    shadow: [0.12, 0.02, 0.38, 0.75],
    high: [1.0, 0.24, 0.78, 0.65],
    params: [1.26, 1.25, 1.02, 0.02],
    gain: [1.08, 0.86, 1.18, 0.30],
  }),
  def('holoPrism', 57, 'Prisma Holo', 'Lavanda iridiscente y turquesa', 'cyber', 'from-violet-400 via-pink-300 to-teal-300', {
    shadow: [0.18, 0.12, 0.36, 0.55],
    high: [0.68, 0.98, 0.94, 0.55],
    params: [1.04, 1.15, 0.88, 0.08],
    gain: [1.02, 0.98, 1.10, 0.0],
  }),
  def('toxicAcid', 58, 'Ácido Tóxico', 'Lima radiactivo y púrpura oscuro', 'cyber', 'from-lime-400 via-emerald-600 to-purple-950', {
    shadow: [0.18, 0.02, 0.28, 0.78],
    high: [0.72, 1.0, 0.14, 0.72],
    params: [1.30, 1.28, 1.04, 0.0],
    gain: [0.92, 1.14, 0.86, 0.35],
  }),
  def('tokyoNight', 59, 'Tokio Noche', 'Neón azul frío y rojo carmesí', 'cyber', 'from-blue-700 via-slate-900 to-rose-600', {
    shadow: [0.02, 0.14, 0.36, 0.75],
    high: [1.0, 0.26, 0.38, 0.60],
    params: [1.24, 1.14, 1.06, 0.0],
    gain: [1.06, 0.94, 1.10, 0.30],
  }),
  def('ultraviolet', 60, 'Ultravioleta', 'Violetas intensos y sombras índigo', 'cyber', 'from-purple-700 via-violet-800 to-indigo-950', {
    shadow: [0.10, 0.04, 0.34, 0.75],
    high: [0.84, 0.48, 1.0, 0.65],
    params: [1.20, 1.18, 1.02, 0.03],
    gain: [1.04, 0.84, 1.22, 0.20],
  }),
  def('glitchPop', 61, 'Pop Art Cómics', 'Saturación extrema y contraste duro', 'cyber', 'from-yellow-400 via-rose-500 to-cyan-500', {
    params: [1.48, 1.55, 0.98, 0.0],
    gain: [1.06, 1.02, 1.04, 0.55],
  }),
  def('thermal', 62, 'Visión Térmica', 'Mapa de calor infrarrojo', 'cyber', 'from-blue-700 via-rose-500 to-yellow-300', {
    matrix: BW_MAT,
    shadow: [0.08, 0.04, 0.68, 1.0],
    high: [1.0, 0.86, 0.14, 1.0],
    params: [1.25, 1.35, 0.96, 0.0],
    gain: [1.15, 0.95, 1.05, 0.20],
    extra: [0.88, 0, 0, 0],
  }),
  def('nightVision', 63, 'Visión Nocturna', 'Verde fósforo militar brillante', 'cyber', 'from-lime-400 via-green-600 to-black', {
    matrix: BW_MAT,
    shadow: [0.02, 0.08, 0.02, 1.0],
    high: [0.42, 1.0, 0.36, 1.0],
    params: [1.28, 1.0, 0.82, 0.04],
    extra: [0.95, 0, 0, 0],
  }),
  def('bloodMoon', 64, 'Luna de Sangre', 'Carmesí oscuro y sombras negras', 'cyber', 'from-red-700 via-rose-900 to-black', {
    shadow: [0.08, 0.01, 0.02, 0.85],
    high: [1.0, 0.22, 0.20, 0.72],
    params: [1.26, 0.88, 1.08, 0.0],
    gain: [1.18, 0.72, 0.72, 0.30],
  }),
  def('cyberMint', 65, 'Menta Cibernética', 'Turquesa neón y grises metálicos', 'cyber', 'from-teal-400 via-cyan-600 to-slate-900', {
    shadow: [0.04, 0.16, 0.18, 0.65],
    high: [0.36, 1.0, 0.84, 0.65],
    params: [1.18, 0.92, 0.98, 0.03],
    gain: [0.84, 1.12, 1.06, 0.25],
  }),

  // ── ☀️ CÁLIDOS / FRÍOS / NATURALEZA (66..75) ────────────────────────────────
  def('tropical', 66, 'Paraíso Tropical', 'Turquesas vivos y verdes palmera', 'nature', 'from-cyan-400 via-emerald-400 to-amber-300', {
    shadow: [0.02, 0.22, 0.24, 0.35],
    high: [1.0, 0.94, 0.72, 0.35],
    params: [1.10, 1.24, 0.94, 0.02],
    gain: [0.98, 1.06, 1.04, 0.15],
    extra: [0, 0.35, 0, 0],
  }),
  def('autumn', 67, 'Otoño Dorado', 'Hojas cobrizas y ámbar profundo', 'nature', 'from-orange-600 via-amber-700 to-red-900', {
    matrix: [1.12, 0.06, -0.06, 0.04, 0.96, -0.04, -0.04, 0.0, 0.82],
    shadow: [0.18, 0.08, 0.04, 0.45],
    high: [1.0, 0.74, 0.36, 0.50],
    params: [1.14, 1.12, 1.02, 0.02],
    gain: [1.08, 0.98, 0.86, 0.20],
  }),
  def('winterFrost', 68, 'Escarcha Invernal', 'Blancos puros y azul pálido', 'nature', 'from-sky-100 via-blue-300 to-slate-600', {
    shadow: [0.10, 0.18, 0.32, 0.45],
    high: [0.92, 0.97, 1.0, 0.45],
    params: [1.08, 0.76, 0.90, 0.06],
    gain: [0.94, 1.00, 1.08, 0.10],
  }),
  def('springBloom', 69, 'Primavera Floral', 'Verdes frescos y rosas suaves', 'nature', 'from-pink-300 via-emerald-300 to-sky-300', {
    shadow: [0.10, 0.18, 0.14, 0.28],
    high: [1.0, 0.88, 0.92, 0.38],
    params: [1.02, 1.16, 0.90, 0.05],
    gain: [1.04, 1.05, 1.00, 0.0],
    extra: [0, 0.28, 0, 0],
  }),
  def('mediterranean', 70, 'Mediterráneo', 'Azul mar profundo y blancos cálidos', 'nature', 'from-blue-600 via-sky-400 to-amber-200', {
    shadow: [0.02, 0.14, 0.34, 0.48],
    high: [1.0, 0.96, 0.86, 0.38],
    params: [1.16, 1.18, 0.96, 0.02],
    gain: [1.02, 1.01, 1.06, 0.25],
  }),
  def('coffeeCream', 71, 'Café & Crema', 'Tonos espresso suaves y beige', 'nature', 'from-amber-900 via-stone-600 to-amber-200', {
    shadow: [0.16, 0.10, 0.06, 0.55],
    high: [1.0, 0.90, 0.78, 0.50],
    params: [1.06, 0.74, 1.02, 0.06],
    gain: [1.05, 0.98, 0.88, 0.15],
  }),
  def('peachGlow', 72, 'Durazno Glow', 'Luminosidad cálida para retratos', 'nature', 'from-orange-300 via-rose-300 to-amber-200', {
    shadow: [0.14, 0.08, 0.08, 0.25],
    high: [1.0, 0.84, 0.74, 0.45],
    params: [1.00, 1.04, 0.88, 0.05],
    gain: [1.08, 1.00, 0.93, 0.0],
  }),
  def('lavenderMist', 73, 'Bruma Lavanda', 'Atmósfera suave violeta-rosa', 'nature', 'from-purple-300 via-fuchsia-300 to-slate-500', {
    shadow: [0.16, 0.10, 0.24, 0.45],
    high: [0.96, 0.86, 1.0, 0.45],
    params: [0.96, 0.90, 0.90, 0.08],
    gain: [1.02, 0.96, 1.08, 0.0],
  }),
  def('forestDeep', 74, 'Selva Profunda', 'Verdes musgo oscuros y ricos', 'nature', 'from-green-900 via-emerald-800 to-stone-900', {
    shadow: [0.02, 0.14, 0.08, 0.55],
    high: [0.84, 0.96, 0.78, 0.35],
    params: [1.18, 0.96, 1.10, 0.01],
    gain: [0.90, 1.08, 0.92, 0.30],
  }),
  def('sunburst', 75, 'Sol de Verano', 'Amarillos brillantes y piel bronceada', 'nature', 'from-yellow-400 via-orange-400 to-amber-600', {
    shadow: [0.14, 0.08, 0.02, 0.30],
    high: [1.0, 0.92, 0.56, 0.48],
    params: [1.12, 1.20, 0.92, 0.02],
    gain: [1.08, 1.03, 0.86, 0.15],
  }),

  // ── ⚫ B&N / DUOTONOS (76..85) ─────────────────────────────────────────────
  def('leicaBW', 76, 'Leica Monochrom', 'Rango tonal rico y medios sedosos', 'bw', 'from-zinc-200 via-zinc-500 to-zinc-900', {
    matrix: [0.34, 0.56, 0.10, 0.34, 0.56, 0.10, 0.34, 0.56, 0.10],
    params: [1.24, 0.0, 1.02, 0.01],
    gain: [1.0, 1.0, 1.0, 0.40],
  }),
  def('triX400', 77, 'Kodak Tri-X 400', 'Blanco y negro clásico reportero', 'bw', 'from-neutral-300 via-neutral-700 to-black', {
    matrix: [0.26, 0.62, 0.12, 0.26, 0.62, 0.12, 0.26, 0.62, 0.12],
    params: [1.38, 0.0, 1.08, 0.02],
    gain: [1.0, 1.0, 1.0, 0.50],
  }),
  def('cyanotype', 78, 'Cianotipo', 'Impresión fotográfica azul Prusia', 'bw', 'from-sky-200 via-blue-700 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.03, 0.10, 0.26, 1.0],
    high: [0.88, 0.96, 1.0, 1.0],
    params: [1.16, 1.0, 1.00, 0.02],
    extra: [1.0, 0, 0, 0],
  }),
  def('selenium', 79, 'Tono Selenio', 'Monocromo con sombras berenjena', 'bw', 'from-stone-200 via-purple-950 to-black', {
    matrix: BW_MAT,
    shadow: [0.12, 0.06, 0.14, 1.0],
    high: [0.96, 0.94, 0.92, 1.0],
    params: [1.22, 1.0, 1.02, 0.02],
    extra: [0.95, 0, 0, 0],
  }),
  def('platina', 80, 'Platino Puro', 'Altas luces plateadas y negros suaves', 'bw', 'from-slate-100 via-slate-400 to-stone-800', {
    matrix: BW_MAT,
    shadow: [0.08, 0.08, 0.09, 1.0],
    high: [0.98, 0.97, 0.94, 1.0],
    params: [1.06, 1.0, 0.94, 0.05],
    extra: [0.95, 0, 0, 0],
  }),
  def('duotoneCrimson', 81, 'Duotono Carmesí', 'Negros profundos y rojo rubí', 'bw', 'from-rose-500 via-red-800 to-black', {
    matrix: BW_MAT,
    shadow: [0.06, 0.01, 0.03, 1.0],
    high: [1.0, 0.36, 0.42, 1.0],
    params: [1.24, 1.0, 1.00, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneOcean', 82, 'Duotono Océano', 'Azul abisal y cian luminoso', 'bw', 'from-cyan-300 via-blue-700 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.02, 0.06, 0.22, 1.0],
    high: [0.42, 0.96, 1.0, 1.0],
    params: [1.20, 1.0, 0.98, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneEmerald', 83, 'Duotono Esmeralda', 'Verde bosque y menta brillante', 'bw', 'from-emerald-300 via-green-800 to-black', {
    matrix: BW_MAT,
    shadow: [0.02, 0.10, 0.06, 1.0],
    high: [0.48, 1.0, 0.72, 1.0],
    params: [1.20, 1.0, 0.98, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneViolet', 84, 'Duotono Violeta', 'Índigo oscuro y lavanda neón', 'bw', 'from-violet-300 via-purple-800 to-indigo-950', {
    matrix: BW_MAT,
    shadow: [0.08, 0.02, 0.20, 1.0],
    high: [0.88, 0.62, 1.0, 1.0],
    params: [1.22, 1.0, 0.96, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('charcoal', 85, 'Carbón Mate', 'B&N artístico de negros lavados', 'bw', 'from-stone-300 via-stone-600 to-stone-800', {
    matrix: BW_MAT,
    params: [0.95, 0.0, 0.96, 0.12],
    gain: [1.02, 1.00, 0.97, 0.0],
  }),

  // ── 🎬 CINE PRO (86..100) ──────────────────────────────────────────────────
  def('imaxDark', 86, 'IMAX Oscuro', 'Sombras profundas y contraste épico', 'cinema', 'from-slate-950 via-blue-950 to-amber-700', {
    shadow: [0.04, 0.07, 0.14, 0.65],
    high: [1.0, 0.88, 0.72, 0.35],
    params: [1.26, 0.92, 1.06, 0.0],
    gain: [1.02, 1.0, 0.96, 0.38],
  }),
  def('anamorphicGold', 87, 'Anamórfico Oro', 'Destellos dorados sobre sombras frías', 'cinema', 'from-amber-400 via-slate-800 to-indigo-950', {
    shadow: [0.06, 0.10, 0.18, 0.55],
    high: [1.0, 0.82, 0.42, 0.55],
    params: [1.16, 1.04, 0.98, 0.02],
    gain: [1.04, 1.01, 0.94, 0.28],
  }),
  def('noirThriller', 88, 'Thriller Noir', 'Cian acerado y contraste tenso', 'cinema', 'from-cyan-950 via-slate-800 to-zinc-950', {
    shadow: [0.04, 0.14, 0.18, 0.62],
    high: [0.85, 0.95, 1.0, 0.30],
    params: [1.24, 0.72, 1.05, 0.02],
    gain: [0.94, 1.0, 1.04, 0.32],
  }),
  def('scifiTeal', 89, 'Sci-Fi Teal', 'Cian futurista de laboratorio espacial', 'cinema', 'from-teal-500 via-cyan-900 to-slate-950', {
    shadow: [0.02, 0.16, 0.22, 0.68],
    high: [0.78, 0.98, 1.0, 0.42],
    params: [1.18, 0.90, 1.0, 0.02],
    gain: [0.90, 1.03, 1.06, 0.25],
  }),
  def('neoTokyo', 90, 'Neo Tokyo', 'Luces nocturnas rojas y azul neón', 'cinema', 'from-rose-600 via-indigo-900 to-cyan-500', {
    shadow: [0.08, 0.04, 0.22, 0.60],
    high: [1.0, 0.45, 0.65, 0.42],
    params: [1.20, 1.18, 1.02, 0.01],
    gain: [1.04, 0.96, 1.06, 0.30],
  }),
  def('westernDust', 91, 'Western Polvo', 'Ocre desértico y sol abrasador', 'cinema', 'from-amber-700 via-orange-900 to-stone-900', {
    shadow: [0.14, 0.09, 0.04, 0.50],
    high: [1.0, 0.80, 0.52, 0.48],
    params: [1.14, 0.84, 1.02, 0.04],
    gain: [1.08, 0.98, 0.86, 0.20],
  }),
  def('actionSlate', 92, 'Acción Pizarra', 'Gris metálico de alto impacto', 'cinema', 'from-zinc-700 via-slate-800 to-stone-950', {
    shadow: [0.06, 0.08, 0.10, 0.55],
    high: [0.92, 0.95, 1.0, 0.30],
    params: [1.28, 0.68, 1.04, 0.01],
    gain: [0.98, 1.0, 1.02, 0.40],
  }),
  def('hollywood70', 93, 'Hollywood 70s', 'Celuloide clásico de grano cálido', 'cinema', 'from-amber-500 via-stone-700 to-emerald-950', {
    shadow: [0.06, 0.10, 0.06, 0.48],
    high: [1.0, 0.86, 0.64, 0.44],
    params: [1.08, 0.95, 0.98, 0.05],
    gain: [1.04, 1.0, 0.92, 0.18],
  }),
  def('dramaWarm', 94, 'Drama Cálido', 'Tonos íntimos ámbar y piel natural', 'cinema', 'from-orange-500 via-amber-800 to-stone-900', {
    shadow: [0.10, 0.06, 0.04, 0.45],
    high: [1.0, 0.88, 0.74, 0.40],
    params: [1.10, 0.94, 0.98, 0.03],
    gain: [1.05, 1.0, 0.93, 0.22],
  }),
  def('indieFilm', 95, 'Cine Indie', 'Negros suaves y verdes sutiles', 'cinema', 'from-emerald-800 via-stone-700 to-amber-500', {
    shadow: [0.06, 0.12, 0.10, 0.50],
    high: [0.98, 0.92, 0.78, 0.35],
    params: [1.02, 0.88, 0.96, 0.07],
    gain: [0.99, 1.02, 0.96, 0.12],
  }),
  def('epicBronze', 96, 'Bronce Épico', 'Batalla medieval dorada y oscura', 'cinema', 'from-amber-600 via-stone-800 to-black', {
    shadow: [0.08, 0.06, 0.04, 0.60],
    high: [0.98, 0.72, 0.38, 0.55],
    params: [1.24, 0.78, 1.05, 0.01],
    gain: [1.06, 0.97, 0.86, 0.34],
  }),
  def('moonlitCine', 97, 'Luna Cinematográfica', 'Azul cobalto nocturno y plata', 'cinema', 'from-blue-900 via-indigo-950 to-slate-900', {
    shadow: [0.03, 0.08, 0.24, 0.70],
    high: [0.80, 0.90, 1.0, 0.38],
    params: [1.15, 0.80, 1.06, 0.02],
    gain: [0.88, 0.96, 1.10, 0.25],
  }),
  def('crimsonShadow', 98, 'Sombra Carmesí', 'Rojos profundos de cine de terror', 'cinema', 'from-red-900 via-stone-900 to-black', {
    shadow: [0.18, 0.02, 0.04, 0.62],
    high: [1.0, 0.82, 0.78, 0.35],
    params: [1.25, 0.88, 1.06, 0.01],
    gain: [1.08, 0.92, 0.92, 0.35],
  }),
  def('emeraldCine', 99, 'Esmeralda Cine', 'Verdes profundos estilo Fincher', 'cinema', 'from-emerald-900 via-teal-950 to-black', {
    shadow: [0.02, 0.14, 0.10, 0.65],
    high: [0.88, 1.0, 0.88, 0.35],
    params: [1.20, 0.82, 1.04, 0.02],
    gain: [0.92, 1.05, 0.96, 0.30],
  }),
  def('midnightBlue', 100, 'Azul Medianoche', 'Tono urbano frío de alta definición', 'cinema', 'from-indigo-900 via-blue-950 to-black', {
    shadow: [0.04, 0.06, 0.22, 0.62],
    high: [0.86, 0.92, 1.0, 0.32],
    params: [1.18, 0.90, 1.02, 0.02],
    gain: [0.92, 0.98, 1.08, 0.26],
  }),

  // ── 🎞️ VINTAGE PRO (101..115) ─────────────────────────────────────────────
  def('kodakPortra800', 101, 'Portra 800', 'Película cálida de grano luminoso', 'vintage', 'from-amber-400 via-rose-400 to-stone-700', {
    shadow: [0.08, 0.06, 0.08, 0.35],
    high: [1.0, 0.92, 0.82, 0.35],
    params: [1.04, 1.04, 0.96, 0.04],
    gain: [1.04, 1.01, 0.96, 0.10],
  }),
  def('fujiPro400H', 102, 'Fuji Pro 400H', 'Verdes menta suaves y piel pastel', 'vintage', 'from-emerald-300 via-teal-600 to-stone-700', {
    shadow: [0.05, 0.12, 0.10, 0.38],
    high: [0.98, 0.98, 0.92, 0.30],
    params: [0.98, 0.94, 0.95, 0.06],
    gain: [0.97, 1.03, 1.0, 0.08],
  }),
  def('ilfordHP5', 103, 'Ilford HP5', 'Película analógica B&N de 400 ASA', 'vintage', 'from-zinc-400 via-stone-600 to-zinc-900', {
    matrix: BW_MAT,
    params: [1.12, 0.0, 1.0, 0.05],
    gain: [1.0, 0.99, 0.97, 0.22],
  }),
  def('polaroidSX70', 104, 'Polaroid SX-70', 'Instantánea clásica lavada y cálida', 'vintage', 'from-yellow-300 via-amber-600 to-teal-900', {
    shadow: [0.06, 0.10, 0.12, 0.45],
    high: [1.0, 0.94, 0.74, 0.40],
    params: [0.94, 0.88, 0.95, 0.09],
    gain: [1.03, 1.01, 0.93, 0.05],
  }),
  def('ektachrome', 105, 'Ektachrome E100', 'Diapositiva vibrante con azules puros', 'vintage', 'from-sky-500 via-blue-700 to-amber-500', {
    shadow: [0.04, 0.08, 0.18, 0.42],
    high: [1.0, 0.95, 0.88, 0.30],
    params: [1.16, 1.15, 1.0, 0.02],
    gain: [1.0, 1.01, 1.05, 0.24],
    extra: [0, 0.25, 0, 0],
  }),
  def('cineStill50D', 106, 'CineStill 50D', 'Luz día cinematográfica con halación', 'vintage', 'from-orange-400 via-amber-600 to-slate-800', {
    shadow: [0.06, 0.08, 0.12, 0.38],
    high: [1.0, 0.84, 0.68, 0.42],
    params: [1.10, 1.02, 0.98, 0.03],
    gain: [1.05, 1.0, 0.94, 0.18],
  }),
  def('agfaChrome', 107, 'Agfa Chrome', 'Colores retro europeos de los 60s', 'vintage', 'from-rose-400 via-amber-600 to-emerald-800', {
    shadow: [0.08, 0.10, 0.06, 0.42],
    high: [1.0, 0.90, 0.78, 0.38],
    params: [1.08, 0.90, 0.98, 0.06],
    gain: [1.04, 0.99, 0.91, 0.16],
  }),
  def('retro70s', 108, 'Retro 70s Disco', 'Ámbar dorado y negros chocolates', 'vintage', 'from-amber-500 via-orange-700 to-stone-900', {
    shadow: [0.14, 0.08, 0.04, 0.52],
    high: [1.0, 0.86, 0.54, 0.48],
    params: [1.04, 0.92, 0.96, 0.08],
    gain: [1.06, 0.99, 0.88, 0.14],
  }),
  def('retro80s', 109, 'Retro 80s Pop', 'Magenta suave y cian nostálgico', 'vintage', 'from-pink-500 via-purple-700 to-cyan-600', {
    shadow: [0.12, 0.04, 0.18, 0.46],
    high: [1.0, 0.82, 0.92, 0.36],
    params: [1.08, 1.12, 0.97, 0.05],
    gain: [1.04, 0.96, 1.04, 0.16],
  }),
  def('cassetteTape', 110, 'Cinta Cassette', 'Tonos VHS lavados de los 90s', 'vintage', 'from-slate-500 via-indigo-800 to-amber-700', {
    shadow: [0.08, 0.08, 0.14, 0.48],
    high: [0.96, 0.90, 0.80, 0.34],
    params: [0.92, 0.82, 0.94, 0.10],
    gain: [1.01, 0.99, 0.97, 0.06],
  }),
  def('warmSepia2', 111, 'Sepia Dorado', 'Tono archivo histórico luminoso', 'vintage', 'from-amber-500 via-yellow-800 to-stone-900', {
    matrix: [0.42, 0.72, 0.18, 0.36, 0.64, 0.16, 0.24, 0.46, 0.12],
    params: [1.06, 0.95, 0.98, 0.05],
    gain: [1.05, 1.0, 0.92, 0.15],
  }),
  def('fadedMemory', 112, 'Recuerdo Lavado', 'Bruma pastel de baja saturación', 'vintage', 'from-stone-400 via-rose-300 to-slate-600', {
    shadow: [0.10, 0.09, 0.12, 0.38],
    high: [0.98, 0.94, 0.92, 0.30],
    params: [0.88, 0.72, 0.92, 0.12],
    gain: [1.01, 1.0, 0.99, 0.0],
  }),
  def('antiqueBrass', 113, 'Latón Antiguo', 'Bronce envejecido y contraste suave', 'vintage', 'from-yellow-700 via-amber-900 to-stone-950', {
    shadow: [0.10, 0.08, 0.04, 0.54],
    high: [0.98, 0.82, 0.56, 0.44],
    params: [1.08, 0.65, 1.0, 0.06],
    gain: [1.04, 0.98, 0.88, 0.18],
  }),
  def('nostalgia90s', 114, 'Nostalgia 90s', 'Cámara desechable con tinte verde', 'vintage', 'from-lime-700 via-amber-600 to-stone-800', {
    shadow: [0.06, 0.12, 0.08, 0.46],
    high: [1.0, 0.94, 0.80, 0.34],
    params: [1.02, 0.92, 0.96, 0.07],
    gain: [1.0, 1.04, 0.94, 0.10],
  }),
  def('sunbleached', 115, 'Quemado al Sol', 'Colores deslavados de verano', 'vintage', 'from-amber-200 via-orange-400 to-stone-600', {
    shadow: [0.12, 0.10, 0.08, 0.36],
    high: [1.0, 0.95, 0.86, 0.45],
    params: [0.90, 0.78, 0.90, 0.11],
    gain: [1.05, 1.02, 0.95, 0.05],
  }),

  // ── 🌆 CYBER / NEÓN PRO (116..130) ────────────────────────────────────────
  def('neonMagenta', 116, 'Neón Magenta', 'Fucsia eléctrico sobre sombras oscuras', 'cyber', 'from-fuchsia-500 via-pink-700 to-indigo-950', {
    shadow: [0.10, 0.02, 0.18, 0.65],
    high: [1.0, 0.35, 0.88, 0.52],
    params: [1.22, 1.25, 1.02, 0.0],
    gain: [1.08, 0.90, 1.08, 0.28],
  }),
  def('cyberBlue', 117, 'Cyber Azul', 'Azul eléctrico futurista de alta energía', 'cyber', 'from-cyan-400 via-blue-700 to-slate-950', {
    shadow: [0.02, 0.08, 0.26, 0.70],
    high: [0.40, 0.92, 1.0, 0.55],
    params: [1.20, 1.18, 1.0, 0.0],
    gain: [0.88, 1.0, 1.14, 0.26],
  }),
  def('laserLime', 118, 'Láser Lima', 'Verde ácido brillante y negro profundo', 'cyber', 'from-lime-400 via-emerald-800 to-black', {
    shadow: [0.02, 0.14, 0.04, 0.65],
    high: [0.68, 1.0, 0.25, 0.55],
    params: [1.24, 1.20, 1.02, 0.0],
    gain: [0.94, 1.12, 0.88, 0.30],
  }),
  def('arcadePink', 119, 'Arcade Pink', 'Rosa neón retro de los 80s', 'cyber', 'from-pink-400 via-purple-700 to-blue-950', {
    shadow: [0.08, 0.04, 0.22, 0.60],
    high: [1.0, 0.50, 0.82, 0.50],
    params: [1.14, 1.22, 0.97, 0.03],
    gain: [1.08, 0.94, 1.06, 0.20],
  }),
  def('hologramTint', 120, 'Holograma Cian', 'Proyección digital translúcida', 'cyber', 'from-teal-300 via-cyan-600 to-indigo-950', {
    shadow: [0.02, 0.14, 0.22, 0.62],
    high: [0.55, 1.0, 0.98, 0.52],
    params: [1.12, 0.92, 0.96, 0.04],
    gain: [0.86, 1.06, 1.10, 0.18],
  }),
  def('quantumViolet', 121, 'Cuántico Violeta', 'Púrpura profundo y destellos cian', 'cyber', 'from-violet-500 via-purple-900 to-cyan-500', {
    shadow: [0.10, 0.02, 0.24, 0.68],
    high: [0.70, 0.90, 1.0, 0.45],
    params: [1.20, 1.16, 1.0, 0.01],
    gain: [1.0, 0.94, 1.12, 0.26],
  }),
  def('hyperTeal', 122, 'Hiper Teal', 'Turquesa saturado con rojos vivos', 'cyber', 'from-teal-400 via-cyan-800 to-rose-600', {
    shadow: [0.02, 0.18, 0.20, 0.65],
    high: [1.0, 0.72, 0.68, 0.42],
    params: [1.22, 1.24, 1.0, 0.0],
    gain: [1.02, 1.02, 1.02, 0.28],
    extra: [0, 0.30, 0, 0],
  }),
  def('acidYellow', 123, 'Amarillo Ácido', 'Neón amarillo industrial', 'cyber', 'from-yellow-400 via-lime-700 to-zinc-950', {
    shadow: [0.06, 0.08, 0.02, 0.60],
    high: [1.0, 0.96, 0.22, 0.55],
    params: [1.24, 1.15, 1.02, 0.0],
    gain: [1.06, 1.06, 0.82, 0.30],
  }),
  def('plasmaRed', 124, 'Plasma Rojo', 'Energía roja intensa de reactor', 'cyber', 'from-red-500 via-rose-800 to-black', {
    shadow: [0.18, 0.02, 0.04, 0.68],
    high: [1.0, 0.42, 0.32, 0.52],
    params: [1.26, 1.20, 1.03, 0.0],
    gain: [1.12, 0.88, 0.88, 0.32],
  }),
  def('electricIndigo', 125, 'Índigo Eléctrico', 'Azul violeta saturado nocturno', 'cyber', 'from-indigo-500 via-blue-800 to-violet-950', {
    shadow: [0.05, 0.04, 0.25, 0.68],
    high: [0.68, 0.78, 1.0, 0.48],
    params: [1.18, 1.18, 1.0, 0.01],
    gain: [0.95, 0.96, 1.14, 0.25],
  }),
  def('synthSunset', 126, 'Atardecer Synth', 'Degradado neón naranja y púrpura', 'cyber', 'from-orange-500 via-fuchsia-700 to-indigo-950', {
    shadow: [0.12, 0.02, 0.22, 0.62],
    high: [1.0, 0.56, 0.26, 0.55],
    params: [1.18, 1.24, 0.98, 0.02],
    gain: [1.08, 0.95, 1.02, 0.24],
  }),
  def('matrixDeep', 127, 'Matrix Profundo', 'Código verde oscuro de alto contraste', 'cyber', 'from-emerald-400 via-green-900 to-black', {
    shadow: [0.0, 0.14, 0.04, 0.72],
    high: [0.40, 1.0, 0.52, 0.55],
    params: [1.28, 0.95, 1.04, 0.0],
    gain: [0.84, 1.14, 0.88, 0.36],
  }),
  def('glitchCyan', 128, 'Glitch Cian', 'Cian digital frío con blancos puros', 'cyber', 'from-cyan-300 via-sky-700 to-zinc-950', {
    shadow: [0.02, 0.12, 0.18, 0.58],
    high: [0.65, 1.0, 1.0, 0.48],
    params: [1.22, 1.10, 1.0, 0.01],
    gain: [0.88, 1.04, 1.10, 0.28],
  }),
  def('futureChrome', 129, 'Cromo Futuro', 'Plata metálica con reflejo azulado', 'cyber', 'from-slate-300 via-cyan-800 to-slate-950', {
    shadow: [0.04, 0.08, 0.14, 0.55],
    high: [0.90, 0.98, 1.0, 0.42],
    params: [1.26, 0.58, 1.02, 0.02],
    gain: [0.96, 1.0, 1.06, 0.36],
  }),
  def('bladeAmber', 130, 'Blade Ámbar', 'Naranja distópico sobre niebla', 'cyber', 'from-amber-500 via-orange-800 to-stone-950', {
    shadow: [0.12, 0.06, 0.02, 0.65],
    high: [1.0, 0.64, 0.24, 0.60],
    params: [1.20, 0.92, 1.02, 0.03],
    gain: [1.08, 0.96, 0.84, 0.28],
  }),

  // ── ☀️ NATURALEZA / CLIMA (131..145) ──────────────────────────────────────
  def('alpineCrisp', 131, 'Alpino Puro', 'Aire de montaña nítido y azulado', 'nature', 'from-sky-400 via-cyan-600 to-emerald-800', {
    shadow: [0.04, 0.09, 0.16, 0.32],
    high: [0.96, 0.99, 1.0, 0.28],
    params: [1.14, 1.10, 0.98, 0.0],
    gain: [0.96, 1.01, 1.05, 0.22],
  }),
  def('saharaHeat', 132, 'Calor del Sahara', 'Arena dorada y luz intensa de mediodía', 'nature', 'from-amber-300 via-orange-500 to-yellow-800', {
    shadow: [0.12, 0.07, 0.02, 0.40],
    high: [1.0, 0.88, 0.58, 0.48],
    params: [1.12, 1.08, 0.96, 0.02],
    gain: [1.08, 1.01, 0.88, 0.18],
  }),
  def('rainforest', 133, 'Selva Tropical', 'Verdes profundos húmedos y ricos', 'nature', 'from-emerald-500 via-green-800 to-teal-950', {
    shadow: [0.02, 0.12, 0.08, 0.48],
    high: [0.88, 1.0, 0.84, 0.34],
    params: [1.14, 1.18, 1.0, 0.01],
    gain: [0.94, 1.06, 0.95, 0.22],
    extra: [0, 0.28, 0, 0],
  }),
  def('oceanicDeep', 134, 'Océano Profundo', 'Azules marinos profundos y turquesa', 'nature', 'from-cyan-500 via-blue-800 to-indigo-950', {
    shadow: [0.02, 0.10, 0.22, 0.58],
    high: [0.76, 0.96, 1.0, 0.38],
    params: [1.14, 1.08, 1.0, 0.01],
    gain: [0.90, 1.0, 1.08, 0.22],
  }),
  def('coralReef', 135, 'Arrecife Coral', 'Turquesa cristalino y coral cálido', 'nature', 'from-rose-400 via-teal-400 to-blue-700', {
    shadow: [0.02, 0.14, 0.18, 0.38],
    high: [1.0, 0.84, 0.78, 0.34],
    params: [1.10, 1.22, 0.96, 0.02],
    gain: [1.03, 1.02, 1.02, 0.16],
    extra: [0, 0.30, 0, 0],
  }),
  def('autumnMaple', 136, 'Arce de Otoño', 'Rojos y naranjas intensos de bosque', 'nature', 'from-red-500 via-orange-600 to-amber-800', {
    shadow: [0.12, 0.05, 0.02, 0.44],
    high: [1.0, 0.76, 0.44, 0.46],
    params: [1.14, 1.16, 0.99, 0.02],
    gain: [1.09, 0.98, 0.86, 0.20],
  }),
  def('sakuraSpring', 137, 'Primavera Sakura', 'Rosas florales suaves y luz fresca', 'nature', 'from-pink-300 via-rose-400 to-sky-400', {
    shadow: [0.08, 0.06, 0.12, 0.30],
    high: [1.0, 0.88, 0.92, 0.38],
    params: [1.02, 1.08, 0.94, 0.04],
    gain: [1.04, 0.98, 1.02, 0.08],
  }),
  def('nordicFjord', 138, 'Fiordo Nórdico', 'Grises azulados y verdes fríos', 'nature', 'from-slate-500 via-teal-800 to-slate-900', {
    shadow: [0.04, 0.09, 0.14, 0.50],
    high: [0.88, 0.94, 0.98, 0.32],
    params: [1.10, 0.78, 1.02, 0.03],
    gain: [0.94, 1.0, 1.04, 0.20],
  }),
  def('goldenSavanna', 139, 'Sabana Dorada', 'Atardecer cálido de pradera africana', 'nature', 'from-yellow-500 via-amber-700 to-stone-900', {
    shadow: [0.10, 0.07, 0.02, 0.46],
    high: [1.0, 0.84, 0.48, 0.50],
    params: [1.14, 1.06, 0.98, 0.02],
    gain: [1.07, 1.0, 0.86, 0.22],
  }),
  def('volcanicAsh', 140, 'Ceniza Volcánica', 'Gris basalto con acentos cálidos', 'nature', 'from-stone-600 via-zinc-800 to-orange-900', {
    shadow: [0.06, 0.05, 0.05, 0.52],
    high: [0.98, 0.84, 0.72, 0.30],
    params: [1.20, 0.58, 1.04, 0.02],
    gain: [1.02, 0.98, 0.94, 0.30],
  }),
  def('emeraldValley', 141, 'Valle Esmeralda', 'Praderas verdes vívidas y luminosas', 'nature', 'from-lime-400 via-emerald-600 to-green-900', {
    shadow: [0.03, 0.10, 0.05, 0.36],
    high: [0.94, 1.0, 0.84, 0.32],
    params: [1.10, 1.18, 0.97, 0.01],
    gain: [0.96, 1.05, 0.95, 0.16],
  }),
  def('sunsetBlush', 142, 'Ocaso Rubor', 'Rosa dorado suave al caer el sol', 'nature', 'from-rose-400 via-orange-400 to-purple-700', {
    shadow: [0.10, 0.05, 0.14, 0.42],
    high: [1.0, 0.80, 0.72, 0.45],
    params: [1.08, 1.14, 0.96, 0.03],
    gain: [1.06, 0.98, 0.96, 0.14],
  }),
  def('morningDew', 143, 'Rocío Matinal', 'Luz limpia y fresca de madrugada', 'nature', 'from-cyan-200 via-sky-400 to-teal-700', {
    shadow: [0.05, 0.10, 0.14, 0.32],
    high: [0.96, 1.0, 1.0, 0.30],
    params: [1.02, 0.96, 0.94, 0.04],
    gain: [0.96, 1.02, 1.04, 0.10],
  }),
  def('starlightCool', 144, 'Luz Estelar', 'Noche despejada con brillos fríos', 'nature', 'from-indigo-400 via-blue-900 to-slate-950', {
    shadow: [0.03, 0.06, 0.20, 0.60],
    high: [0.82, 0.92, 1.0, 0.38],
    params: [1.14, 0.86, 1.03, 0.02],
    gain: [0.90, 0.98, 1.09, 0.22],
  }),
  def('amberDusk', 145, 'Crepúsculo Ámbar', 'Última luz cálida del día', 'nature', 'from-amber-500 via-rose-700 to-indigo-950', {
    shadow: [0.08, 0.04, 0.12, 0.50],
    high: [1.0, 0.76, 0.48, 0.48],
    params: [1.12, 1.06, 0.99, 0.02],
    gain: [1.06, 0.98, 0.90, 0.20],
  }),

  // ── ⚫ B&N Y DUOTONO PRO (146..157) ───────────────────────────────────────
  def('silverGelatin', 146, 'Gelatina de Plata', 'B&N clásico de cuarto oscuro', 'bw', 'from-zinc-200 via-zinc-500 to-black', {
    matrix: BW_MAT,
    params: [1.18, 0.0, 0.98, 0.02],
    gain: [1.0, 1.0, 1.02, 0.28],
  }),
  def('highKeyBW', 147, 'B&N Clave Alta', 'Blanco y negro luminoso y editorial', 'bw', 'from-white via-zinc-300 to-zinc-600', {
    matrix: BW_MAT,
    params: [1.08, 0.0, 0.86, 0.06],
    gain: [1.06, 1.06, 1.06, 0.12],
  }),
  def('lowKeyBW', 148, 'B&N Clave Baja', 'Sombras profundas y drama extremo', 'bw', 'from-zinc-500 via-zinc-900 to-black', {
    matrix: BW_MAT,
    params: [1.34, 0.0, 1.12, 0.0],
    gain: [0.96, 0.96, 0.96, 0.42],
  }),
  def('noirGritty', 149, 'Noir Urbano', 'B&N crudo estilo detective', 'bw', 'from-stone-300 via-zinc-700 to-black', {
    matrix: BW_MAT,
    params: [1.38, 0.0, 1.05, 0.01],
    gain: [1.01, 1.0, 0.98, 0.45],
  }),
  def('softMonochrome', 150, 'Monocromo Suave', 'Escala de grises delicada para retrato', 'bw', 'from-stone-200 via-stone-400 to-stone-700', {
    matrix: BW_MAT,
    params: [0.96, 0.0, 0.93, 0.07],
    gain: [1.02, 1.01, 0.99, 0.08],
  }),
  def('matteGray', 151, 'Gris Mate', 'Negros elevados sin contraste duro', 'bw', 'from-neutral-300 via-neutral-500 to-neutral-700', {
    matrix: BW_MAT,
    params: [0.90, 0.0, 0.95, 0.14],
    gain: [1.0, 1.0, 1.0, 0.04],
  }),
  def('dramaticBW', 152, 'B&N Dramático', 'Curva en S pronunciada y blancos vivos', 'bw', 'from-white via-neutral-600 to-black', {
    matrix: BW_MAT,
    params: [1.28, 0.0, 1.02, 0.0],
    gain: [1.04, 1.04, 1.04, 0.40],
  }),
  def('streetBW', 153, 'Street Photo B&N', 'Contraste equilibrado de fotografía callejera', 'bw', 'from-zinc-300 via-zinc-600 to-zinc-950', {
    matrix: BW_MAT,
    params: [1.22, 0.0, 1.0, 0.02],
    gain: [1.02, 1.02, 1.02, 0.30],
  }),
  def('duotoneIndigo', 154, 'Duotono Índigo', 'Azul noche profundo y blanco hielo', 'bw', 'from-sky-200 via-indigo-700 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.04, 0.05, 0.22, 1.0],
    high: [0.85, 0.92, 1.0, 1.0],
    params: [1.18, 1.0, 0.98, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneCopper', 155, 'Duotono Cobre', 'Sombras espresso y luces cobre', 'bw', 'from-orange-300 via-amber-800 to-stone-950', {
    matrix: BW_MAT,
    shadow: [0.08, 0.04, 0.02, 1.0],
    high: [1.0, 0.72, 0.50, 1.0],
    params: [1.16, 1.0, 0.98, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneRose', 156, 'Duotono Rosa', 'Vino oscuro y rosa pastel', 'bw', 'from-pink-200 via-rose-700 to-stone-950', {
    matrix: BW_MAT,
    shadow: [0.14, 0.02, 0.08, 1.0],
    high: [1.0, 0.78, 0.86, 1.0],
    params: [1.15, 1.0, 0.97, 0.0],
    extra: [1.0, 0, 0, 0],
  }),
  def('duotoneTeal', 157, 'Duotono Turquesa', 'Abismo marino y menta luminosa', 'bw', 'from-teal-200 via-cyan-800 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.02, 0.08, 0.14, 1.0],
    high: [0.58, 1.0, 0.94, 1.0],
    params: [1.18, 1.0, 0.98, 0.0],
    extra: [1.0, 0, 0, 0],
  }),

  // ── 👤 RETRATO / EDITORIAL (158..171) ─────────────────────────────────────
  def('skinGlow', 158, 'Brillo de Piel', 'Piel radiante con calidez natural', 'portrait', 'from-amber-200 via-rose-300 to-amber-500', {
    shadow: [0.06, 0.04, 0.04, 0.25],
    high: [1.0, 0.92, 0.86, 0.32],
    params: [1.04, 1.02, 0.94, 0.03],
    gain: [1.04, 1.01, 0.98, 0.10],
  }),
  def('studioSoft', 159, 'Estudio Suave', 'Iluminación limpia de estudio fotográfico', 'portrait', 'from-stone-200 via-amber-100 to-stone-500', {
    shadow: [0.04, 0.04, 0.05, 0.22],
    high: [1.0, 0.98, 0.96, 0.25],
    params: [1.06, 0.96, 0.95, 0.03],
    gain: [1.02, 1.01, 1.0, 0.12],
  }),
  def('goldenSkin', 160, 'Piel Dorada', 'Bronceado suave y luminoso', 'portrait', 'from-amber-300 via-orange-400 to-amber-700', {
    shadow: [0.08, 0.05, 0.03, 0.30],
    high: [1.0, 0.88, 0.70, 0.38],
    params: [1.06, 1.06, 0.96, 0.02],
    gain: [1.06, 1.0, 0.92, 0.14],
  }),
  def('editorialClean', 161, 'Editorial Limpio', 'Blancos puros y contraste de revista', 'portrait', 'from-slate-100 via-zinc-300 to-slate-600', {
    shadow: [0.03, 0.04, 0.06, 0.25],
    high: [0.98, 0.99, 1.0, 0.25],
    params: [1.14, 0.92, 0.98, 0.01],
    gain: [1.0, 1.0, 1.02, 0.22],
  }),
  def('beautyCream', 162, 'Crema Beauty', 'Tono suave cremoso para rostro', 'portrait', 'from-orange-100 via-rose-200 to-amber-300', {
    shadow: [0.07, 0.05, 0.05, 0.24],
    high: [1.0, 0.94, 0.88, 0.34],
    params: [0.98, 0.94, 0.92, 0.05],
    gain: [1.03, 1.01, 0.98, 0.06],
  }),
  def('warmHoney', 163, 'Miel Cálida', 'Dorado dulce y sombras suaves', 'portrait', 'from-yellow-300 via-amber-500 to-stone-700', {
    shadow: [0.09, 0.06, 0.03, 0.36],
    high: [1.0, 0.89, 0.68, 0.40],
    params: [1.05, 1.04, 0.96, 0.03],
    gain: [1.06, 1.01, 0.91, 0.14],
  }),
  def('ivorySoft', 164, 'Marfil Suave', 'Tonos claros y delicados', 'portrait', 'from-stone-100 via-amber-50 to-stone-400', {
    shadow: [0.06, 0.05, 0.05, 0.24],
    high: [1.0, 0.97, 0.92, 0.30],
    params: [0.96, 0.86, 0.92, 0.06],
    gain: [1.02, 1.01, 0.98, 0.04],
  }),
  def('peachVelvet', 165, 'Terciopelo Durazno', 'Rubor cálido estilo vlog', 'portrait', 'from-orange-200 via-rose-300 to-amber-500', {
    shadow: [0.08, 0.05, 0.06, 0.28],
    high: [1.0, 0.86, 0.78, 0.38],
    params: [1.02, 1.05, 0.94, 0.04],
    gain: [1.05, 0.99, 0.95, 0.10],
  }),
  def('roseQuartz', 166, 'Cuarzo Rosa', 'Tinte rosado elegante y moderno', 'portrait', 'from-pink-200 via-rose-300 to-purple-500', {
    shadow: [0.07, 0.04, 0.09, 0.30],
    high: [1.0, 0.88, 0.92, 0.36],
    params: [1.04, 0.98, 0.95, 0.03],
    gain: [1.04, 0.98, 1.01, 0.12],
  }),
  def('bronzeTan', 167, 'Bronceado Sol', 'Piel cálida de verano', 'portrait', 'from-amber-400 via-orange-600 to-stone-800', {
    shadow: [0.10, 0.05, 0.02, 0.38],
    high: [1.0, 0.84, 0.64, 0.40],
    params: [1.10, 1.08, 0.98, 0.02],
    gain: [1.07, 0.99, 0.89, 0.18],
  }),
  def('porcelain', 168, 'Porcelana Fría', 'Piel clara con sombras azuladas suaves', 'portrait', 'from-slate-100 via-sky-200 to-indigo-400', {
    shadow: [0.04, 0.06, 0.12, 0.30],
    high: [0.98, 0.98, 1.0, 0.32],
    params: [1.04, 0.88, 0.93, 0.04],
    gain: [0.98, 1.0, 1.04, 0.10],
  }),
  def('fashionCrisp', 169, 'Moda Pasarela', 'Alto contraste nítido de revista', 'portrait', 'from-zinc-200 via-stone-500 to-zinc-900', {
    shadow: [0.04, 0.04, 0.06, 0.40],
    high: [1.0, 0.98, 0.96, 0.30],
    params: [1.20, 0.94, 1.0, 0.01],
    gain: [1.02, 1.01, 1.0, 0.28],
  }),
  def('naturalLight', 170, 'Luz Natural', 'Realce sutil y fiel a la realidad', 'portrait', 'from-amber-100 via-sky-200 to-stone-500', {
    shadow: [0.04, 0.04, 0.05, 0.18],
    high: [1.0, 0.98, 0.94, 0.20],
    params: [1.05, 1.04, 0.97, 0.01],
    gain: [1.01, 1.01, 1.0, 0.10],
    extra: [0, 0.15, 0, 0],
  }),
  def('velvetMatte', 171, 'Mate Terciopelo', 'Acabado mate sedoso para retratos', 'portrait', 'from-stone-300 via-rose-400 to-stone-800', {
    shadow: [0.08, 0.06, 0.07, 0.36],
    high: [0.98, 0.92, 0.88, 0.28],
    params: [0.96, 0.90, 0.95, 0.08],
    gain: [1.02, 1.0, 0.98, 0.06],
  }),

  // ── 🎭 ATMÓSFERA / ARTE (172..185) ────────────────────────────────────────
  def('dreamyHaze', 172, 'Bruma Soñadora', 'Luz etérea de bajo contraste', 'mood', 'from-purple-200 via-pink-300 to-indigo-500', {
    shadow: [0.10, 0.08, 0.16, 0.38],
    high: [1.0, 0.92, 0.98, 0.36],
    params: [0.90, 0.96, 0.92, 0.10],
    gain: [1.02, 0.99, 1.04, 0.04],
  }),
  def('melancholy', 173, 'Melancolía Azul', 'Tonos apagados fríos y reflexivos', 'mood', 'from-slate-500 via-blue-800 to-slate-950', {
    shadow: [0.04, 0.08, 0.16, 0.56],
    high: [0.84, 0.90, 0.96, 0.34],
    params: [1.06, 0.64, 1.02, 0.05],
    gain: [0.92, 0.98, 1.06, 0.18],
  }),
  def('mysticPurple', 174, 'Púrpura Místico', 'Atmósfera mágica violeta', 'mood', 'from-purple-400 via-violet-800 to-black', {
    shadow: [0.10, 0.03, 0.20, 0.60],
    high: [0.92, 0.74, 1.0, 0.44],
    params: [1.14, 1.08, 1.0, 0.02],
    gain: [1.01, 0.94, 1.09, 0.22],
  }),
  def('velvetNight', 175, 'Noche Terciopelo', 'Negro profundo con brillo azulado', 'mood', 'from-indigo-700 via-slate-900 to-black', {
    shadow: [0.03, 0.04, 0.12, 0.62],
    high: [0.88, 0.90, 1.0, 0.30],
    params: [1.22, 0.84, 1.06, 0.01],
    gain: [0.94, 0.97, 1.06, 0.32],
  }),
  def('emberGlow', 176, 'Brillo de Brasa', 'Calor rojizo de fogata nocturna', 'mood', 'from-orange-500 via-red-800 to-stone-950', {
    shadow: [0.14, 0.03, 0.02, 0.58],
    high: [1.0, 0.66, 0.32, 0.52],
    params: [1.18, 1.10, 1.01, 0.01],
    gain: [1.10, 0.94, 0.82, 0.26],
  }),
  def('frostBite', 177, 'Escarcha Polar', 'Blanco helado y cian ártico', 'mood', 'from-cyan-100 via-sky-400 to-blue-900', {
    shadow: [0.03, 0.12, 0.22, 0.50],
    high: [0.86, 0.98, 1.0, 0.46],
    params: [1.14, 0.82, 0.96, 0.04],
    gain: [0.90, 1.02, 1.12, 0.20],
  }),
  def('jadeMist', 178, 'Niebla de Jade', 'Verde jade suave y místico', 'mood', 'from-emerald-300 via-teal-700 to-slate-900', {
    shadow: [0.03, 0.12, 0.10, 0.52],
    high: [0.82, 1.0, 0.90, 0.38],
    params: [1.04, 0.88, 0.97, 0.05],
    gain: [0.92, 1.05, 0.98, 0.14],
  }),
  def('obsidian', 179, 'Obsidiana', 'Negros cristalinos y contraste puro', 'mood', 'from-zinc-600 via-neutral-900 to-black', {
    shadow: [0.02, 0.02, 0.03, 0.55],
    high: [0.96, 0.96, 1.0, 0.28],
    params: [1.30, 0.74, 1.06, 0.0],
    gain: [0.98, 0.99, 1.02, 0.38],
  }),
  def('crimsonMood', 180, 'Pasión Carmesí', 'Rojos profundos y atmósfera intensa', 'mood', 'from-rose-500 via-red-800 to-black', {
    shadow: [0.16, 0.02, 0.05, 0.56],
    high: [1.0, 0.78, 0.76, 0.42],
    params: [1.18, 1.08, 1.02, 0.01],
    gain: [1.09, 0.92, 0.92, 0.26],
  }),
  def('amberDream', 181, 'Sueño Ámbar', 'Luz cálida nostálgica y suave', 'mood', 'from-amber-300 via-orange-500 to-stone-800', {
    shadow: [0.10, 0.06, 0.03, 0.44],
    high: [1.0, 0.88, 0.62, 0.46],
    params: [1.02, 1.0, 0.95, 0.05],
    gain: [1.06, 1.0, 0.90, 0.12],
  }),
  def('twilightZone', 182, 'Crepúsculo Violeta', 'Hora mágica entre azul y púrpura', 'mood', 'from-indigo-400 via-purple-700 to-slate-950', {
    shadow: [0.07, 0.04, 0.20, 0.56],
    high: [0.90, 0.80, 1.0, 0.42],
    params: [1.12, 1.04, 0.99, 0.03],
    gain: [0.98, 0.95, 1.08, 0.20],
  }),
  def('ethereal', 183, 'Etéreo Luminoso', 'Altas luces brillantes y suaves', 'mood', 'from-white via-sky-200 to-indigo-400', {
    shadow: [0.08, 0.10, 0.14, 0.28],
    high: [1.0, 0.98, 1.0, 0.44],
    params: [0.94, 0.88, 0.88, 0.08],
    gain: [1.02, 1.02, 1.04, 0.05],
  }),
  def('shadowPlay', 184, 'Juego de Sombras', 'Siluetas marcadas con tono cálido', 'mood', 'from-amber-600 via-stone-800 to-black', {
    shadow: [0.05, 0.04, 0.03, 0.60],
    high: [1.0, 0.86, 0.68, 0.36],
    params: [1.30, 0.86, 1.08, 0.0],
    gain: [1.04, 0.99, 0.92, 0.38],
  }),
  def('celestial', 185, 'Celestial', 'Azul cielo profundo y oro sutil', 'mood', 'from-sky-400 via-indigo-700 to-amber-400', {
    shadow: [0.04, 0.08, 0.20, 0.52],
    high: [1.0, 0.92, 0.72, 0.42],
    params: [1.14, 1.08, 0.98, 0.02],
    gain: [1.0, 1.0, 1.06, 0.22],
  }),

  // ── 🎬 CINE ADICIONAL (186..200) ───────────────────────────────────────────
  def('tenetInvert', 186, 'Tenet Inverso', 'Acero frío + rojo temporal', 'cinema', 'from-slate-800 via-cyan-800 to-rose-700', {
    shadow: [0.04, 0.16, 0.28, 0.68],
    high: [1.0, 0.42, 0.38, 0.48],
    params: [1.26, 0.92, 1.04, 0.01],
    gain: [1.02, 0.98, 1.06, 0.34],
  }),
  def('avatarPandora', 187, 'Pandora Biolum', 'Azules profundos + neón turquesa', 'cinema', 'from-blue-950 via-cyan-600 to-teal-400', {
    shadow: [0.02, 0.12, 0.34, 0.72],
    high: [0.52, 0.98, 1.0, 0.55],
    params: [1.18, 1.24, 0.98, 0.02],
    gain: [0.92, 1.04, 1.12, 0.26],
    extra: [0, 0.28, 0, 0],
  }),
  def('interstellarDust', 188, 'Polvo Estelar', 'Beige espacial + sombras carbón', 'cinema', 'from-stone-900 via-amber-700 to-stone-300', {
    shadow: [0.06, 0.07, 0.10, 0.58],
    high: [0.98, 0.88, 0.72, 0.46],
    params: [1.16, 0.78, 1.03, 0.04],
    gain: [1.05, 1.0, 0.92, 0.24],
  }),
  def('matrixRevolutions', 189, 'Matrix Dorado', 'Verde código + reflejo ámbar', 'cinema', 'from-emerald-950 via-green-700 to-amber-500', {
    shadow: [0.02, 0.20, 0.08, 0.75],
    high: [0.95, 1.0, 0.55, 0.50],
    params: [1.24, 0.94, 1.05, 0.01],
    gain: [0.96, 1.08, 0.86, 0.32],
  }),
  def('sicarioHeat', 190, 'Calor Frontera', 'Ocre intenso + contraste árido', 'cinema', 'from-amber-900 via-orange-700 to-yellow-400', {
    shadow: [0.16, 0.10, 0.04, 0.54],
    high: [1.0, 0.78, 0.44, 0.62],
    params: [1.28, 0.88, 1.06, 0.02],
    gain: [1.12, 1.0, 0.82, 0.36],
  }),
  def('revenantCold', 191, 'Superviviente Frío', 'Nieve azulada + piel natural', 'cinema', 'from-slate-300 via-sky-700 to-slate-950', {
    shadow: [0.06, 0.14, 0.24, 0.62],
    high: [0.88, 0.95, 1.0, 0.44],
    params: [1.14, 0.74, 1.02, 0.03],
    gain: [0.94, 1.0, 1.08, 0.22],
  }),
  def('skyfallSteel', 192, 'Acero Londres', 'Gris azulado elegante 007', 'cinema', 'from-slate-700 via-blue-900 to-zinc-950', {
    shadow: [0.05, 0.10, 0.18, 0.66],
    high: [0.86, 0.92, 0.98, 0.38],
    params: [1.22, 0.82, 1.04, 0.02],
    gain: [0.96, 0.99, 1.06, 0.30],
  }),
  def('driveNeon', 193, 'Drive Nocturno', 'Magenta urbano + cian asfalto', 'cinema', 'from-fuchsia-700 via-slate-900 to-cyan-500', {
    shadow: [0.04, 0.14, 0.32, 0.72],
    high: [1.0, 0.38, 0.78, 0.56],
    params: [1.26, 1.16, 1.03, 0.01],
    gain: [1.06, 0.94, 1.10, 0.32],
  }),
  def('laLaLandGold', 194, 'Musical Dorado', 'Atardecer púrpura y oro Hollywood', 'cinema', 'from-purple-700 via-amber-500 to-yellow-300', {
    shadow: [0.14, 0.08, 0.26, 0.48],
    high: [1.0, 0.88, 0.48, 0.54],
    params: [1.10, 1.22, 0.96, 0.03],
    gain: [1.06, 1.02, 0.94, 0.18],
    extra: [0, 0.24, 0, 0],
  }),
  def('moonlightBlue', 195, 'Luz de Luna Cine', 'Índigo profundo y reflejo plata', 'cinema', 'from-indigo-950 via-blue-700 to-sky-300', {
    shadow: [0.03, 0.06, 0.24, 0.76],
    high: [0.82, 0.92, 1.0, 0.46],
    params: [1.20, 0.94, 1.05, 0.02],
    gain: [0.92, 0.98, 1.14, 0.28],
  }),
  def('parasiteSlate', 196, 'Pizarra Drama', 'Verde musgo sutil + sombras limpias', 'cinema', 'from-stone-800 via-emerald-900 to-stone-400', {
    shadow: [0.06, 0.12, 0.10, 0.56],
    high: [0.96, 0.94, 0.86, 0.38],
    params: [1.18, 0.84, 1.02, 0.02],
    gain: [0.98, 1.02, 0.96, 0.26],
  }),
  def('furyRoadChrome', 197, 'Cromo Desierto', 'Naranja fuego + cielo cobalto', 'cinema', 'from-orange-600 via-amber-500 to-sky-600', {
    shadow: [0.06, 0.18, 0.34, 0.62],
    high: [1.0, 0.72, 0.28, 0.66],
    params: [1.32, 1.24, 1.02, 0.0],
    gain: [1.10, 1.0, 0.90, 0.38],
    extra: [0, 0.25, 0, 0],
  }),
  def('herWarmth', 198, 'Romance Cálido', 'Rojos suaves + crema nostálgica', 'cinema', 'from-rose-400 via-amber-300 to-orange-200', {
    shadow: [0.18, 0.08, 0.08, 0.38],
    high: [1.0, 0.90, 0.78, 0.48],
    params: [0.98, 1.08, 0.94, 0.06],
    gain: [1.08, 1.0, 0.92, 0.10],
  }),
  def('gladiatorSand', 199, 'Arena Épica', 'Bronce antiguo + contraste alto', 'cinema', 'from-yellow-800 via-stone-700 to-amber-300', {
    shadow: [0.12, 0.09, 0.05, 0.60],
    high: [1.0, 0.84, 0.56, 0.54],
    params: [1.26, 0.82, 1.06, 0.02],
    gain: [1.08, 1.0, 0.86, 0.34],
  }),
  def('inceptionDream', 200, 'Sueño Urbano', 'Gris arquitectónico + cian frío', 'cinema', 'from-slate-600 via-cyan-800 to-stone-900', {
    shadow: [0.05, 0.12, 0.18, 0.62],
    high: [0.92, 0.95, 0.98, 0.36],
    params: [1.20, 0.76, 1.04, 0.03],
    gain: [0.96, 1.0, 1.04, 0.28],
  }),

  // ── 🎞️ VINTAGE ADICIONAL (201..215) ────────────────────────────────────────
  def('kodakGold200', 201, 'Kodak Gold 200', 'Dorado clásico de verano 35mm', 'vintage', 'from-amber-300 via-yellow-500 to-orange-700', {
    shadow: [0.12, 0.09, 0.05, 0.36],
    high: [1.0, 0.90, 0.62, 0.52],
    params: [1.08, 1.14, 0.96, 0.04],
    gain: [1.08, 1.02, 0.88, 0.18],
  }),
  def('fujiSuperia400', 202, 'Fuji Superia 400', 'Verdes frescos + magenta suave', 'vintage', 'from-emerald-400 via-teal-600 to-rose-400', {
    shadow: [0.06, 0.16, 0.14, 0.44],
    high: [0.98, 0.96, 0.88, 0.38],
    params: [1.10, 1.12, 0.98, 0.04],
    gain: [0.98, 1.04, 0.98, 0.20],
  }),
  def('ilfordDelta3200', 203, 'Ilford Delta 3200', 'Monocromo grano alto contrastado', 'vintage', 'from-zinc-200 via-stone-600 to-black', {
    matrix: BW_MAT,
    shadow: [0.05, 0.05, 0.06, 0.40],
    high: [0.96, 0.96, 0.94, 0.30],
    params: [1.34, 0.0, 1.06, 0.05],
    gain: [1.0, 1.0, 1.0, 0.38],
  }),
  def('lomochromePurple', 204, 'Lomo Púrpura', 'Verdes tornados a violeta analógico', 'vintage', 'from-purple-500 via-fuchsia-600 to-amber-400', {
    matrix: [0.95, 0.35, 0.10, 0.10, 0.65, 0.25, 0.25, 0.45, 0.90],
    shadow: [0.18, 0.05, 0.24, 0.52],
    high: [1.0, 0.82, 0.92, 0.42],
    params: [1.14, 1.18, 1.0, 0.03],
    gain: [1.04, 0.92, 1.08, 0.22],
  }),
  def('ektar100', 205, 'Kodak Ektar 100', 'Saturación rica y rojos profundos', 'vintage', 'from-red-500 via-amber-500 to-sky-600', {
    shadow: [0.08, 0.06, 0.12, 0.40],
    high: [1.0, 0.88, 0.72, 0.42],
    params: [1.18, 1.28, 0.98, 0.02],
    gain: [1.06, 1.0, 0.94, 0.24],
    extra: [0, 0.25, 0, 0],
  }),
  def('cinestill400D', 206, 'CineStill 400D', 'Luz diurna con halación cálida', 'vintage', 'from-amber-200 via-rose-400 to-teal-700', {
    shadow: [0.06, 0.14, 0.16, 0.42],
    high: [1.0, 0.86, 0.72, 0.48],
    params: [1.08, 1.10, 0.96, 0.04],
    gain: [1.05, 1.01, 0.94, 0.18],
  }),
  def('polaroid600', 207, 'Polaroid 600', 'Instantánea clásica tonos crema', 'vintage', 'from-amber-100 via-teal-400 to-stone-700', {
    shadow: [0.10, 0.16, 0.18, 0.46],
    high: [1.0, 0.94, 0.80, 0.44],
    params: [0.96, 0.90, 0.94, 0.08],
    gain: [1.04, 1.02, 0.95, 0.08],
  }),
  def('orwoChrome', 208, 'ORWO Chrome', 'Película europea tonos oliva', 'vintage', 'from-lime-700 via-stone-600 to-amber-300', {
    shadow: [0.10, 0.14, 0.08, 0.48],
    high: [0.96, 0.92, 0.74, 0.42],
    params: [1.12, 0.88, 1.02, 0.05],
    gain: [1.0, 1.04, 0.90, 0.20],
  }),
  def('sepiaAntique', 209, 'Sepia Antiguo', 'Fotografía del siglo XIX', 'vintage', 'from-amber-800 via-stone-700 to-amber-200', {
    matrix: [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131],
    shadow: [0.14, 0.08, 0.04, 0.45],
    high: [1.0, 0.88, 0.68, 0.40],
    params: [1.08, 0.85, 1.02, 0.06],
    gain: [1.06, 0.98, 0.88, 0.18],
  }),
  def('retroVHS88', 210, 'VHS 1988', 'Cinta magnética lavada y magenta', 'vintage', 'from-pink-500 via-slate-600 to-cyan-500', {
    shadow: [0.14, 0.08, 0.18, 0.50],
    high: [0.96, 0.88, 0.92, 0.36],
    params: [0.94, 0.92, 0.96, 0.10],
    gain: [1.02, 0.96, 1.04, 0.10],
  }),
  def('filmMatte90s', 211, 'Mate Años 90', 'Negros elevados y contraste suave', 'vintage', 'from-stone-400 via-amber-500 to-slate-800', {
    shadow: [0.12, 0.12, 0.14, 0.44],
    high: [0.96, 0.90, 0.82, 0.34],
    params: [0.92, 0.94, 0.95, 0.10],
    gain: [1.02, 1.0, 0.96, 0.06],
  }),
  def('kodakVision3', 212, 'Vision3 500T', 'Tungsteno cine sombras azuladas', 'vintage', 'from-sky-700 via-slate-800 to-amber-400', {
    shadow: [0.05, 0.12, 0.24, 0.54],
    high: [1.0, 0.88, 0.70, 0.46],
    params: [1.16, 1.04, 1.0, 0.03],
    gain: [1.02, 1.0, 1.04, 0.24],
  }),
  def('fadedSlide', 213, 'Diapositiva', 'Proyección vintage deslavada', 'vintage', 'from-yellow-200 via-rose-300 to-sky-400', {
    shadow: [0.14, 0.14, 0.18, 0.42],
    high: [1.0, 0.94, 0.84, 0.40],
    params: [0.90, 0.86, 0.92, 0.11],
    gain: [1.04, 1.0, 0.96, 0.04],
  }),
  def('warmArchive', 214, 'Archivo Cálido', 'Documental histórico dorado', 'vintage', 'from-amber-600 via-stone-600 to-yellow-200', {
    shadow: [0.14, 0.10, 0.06, 0.48],
    high: [1.0, 0.88, 0.66, 0.48],
    params: [1.06, 0.78, 1.0, 0.06],
    gain: [1.06, 1.0, 0.90, 0.16],
  }),
  def('amber8mm', 215, 'Ámbar 8mm', 'Película casera tonos miel', 'vintage', 'from-orange-400 via-amber-600 to-stone-800', {
    shadow: [0.16, 0.10, 0.04, 0.50],
    high: [1.0, 0.82, 0.52, 0.54],
    params: [1.08, 0.92, 0.98, 0.07],
    gain: [1.08, 0.98, 0.84, 0.18],
  }),

  // ── 🌆 CYBER / ANIME ADICIONAL (216..230) ──────────────────────────────────
  def('cyberpunk2077', 216, 'Night City 77', 'Amarillo neón + cian eléctrico', 'cyber', 'from-yellow-400 via-fuchsia-600 to-cyan-500', {
    shadow: [0.04, 0.18, 0.36, 0.74],
    high: [1.0, 0.88, 0.20, 0.58],
    params: [1.28, 1.32, 1.02, 0.0],
    gain: [1.04, 0.98, 1.08, 0.34],
    extra: [0, 0.32, 0, 0],
  }),
  def('synthMagenta', 217, 'Synth Magenta', 'Rosa neón retro 80s', 'cyber', 'from-fuchsia-500 via-purple-700 to-indigo-950', {
    shadow: [0.12, 0.02, 0.28, 0.76],
    high: [1.0, 0.32, 0.85, 0.62],
    params: [1.22, 1.24, 1.0, 0.02],
    gain: [1.10, 0.90, 1.12, 0.28],
  }),
  def('neonEmerald', 218, 'Neón Esmeralda', 'Verde láser + negro profundo', 'cyber', 'from-emerald-400 via-teal-700 to-black', {
    shadow: [0.02, 0.20, 0.16, 0.74],
    high: [0.35, 1.0, 0.68, 0.58],
    params: [1.26, 1.20, 1.04, 0.0],
    gain: [0.90, 1.14, 1.0, 0.32],
  }),
  def('hologramCyan', 219, 'Holograma Cian', 'Proyección digital azul celeste', 'cyber', 'from-cyan-300 via-sky-600 to-blue-950', {
    shadow: [0.02, 0.16, 0.36, 0.74],
    high: [0.58, 0.98, 1.0, 0.60],
    params: [1.20, 1.12, 0.98, 0.03],
    gain: [0.88, 1.04, 1.14, 0.24],
  }),
  def('acidLime', 220, 'Ácido Lima', 'Verde fosforescente rave', 'cyber', 'from-lime-400 via-emerald-600 to-zinc-950', {
    shadow: [0.06, 0.16, 0.02, 0.70],
    high: [0.78, 1.0, 0.22, 0.60],
    params: [1.28, 1.30, 1.02, 0.0],
    gain: [0.98, 1.14, 0.86, 0.34],
  }),
  def('hyperViolet', 221, 'Hiper Violeta', 'Púrpura eléctrico + azul neón', 'cyber', 'from-violet-500 via-indigo-700 to-cyan-500', {
    shadow: [0.10, 0.04, 0.34, 0.74],
    high: [0.82, 0.52, 1.0, 0.56],
    params: [1.24, 1.22, 1.02, 0.02],
    gain: [1.02, 0.92, 1.16, 0.28],
  }),
  def('laserCrimson', 222, 'Láser Carmesí', 'Rojo neón + sombras oscuras', 'cyber', 'from-red-600 via-rose-800 to-black', {
    shadow: [0.14, 0.02, 0.06, 0.72],
    high: [1.0, 0.24, 0.32, 0.60],
    params: [1.30, 1.18, 1.06, 0.0],
    gain: [1.14, 0.90, 0.92, 0.36],
  }),
  def('digitalAmber', 223, 'Ámbar Digital', 'Naranja HUD + sombras grafito', 'cyber', 'from-amber-400 via-orange-600 to-slate-950', {
    shadow: [0.06, 0.08, 0.12, 0.68],
    high: [1.0, 0.68, 0.18, 0.62],
    params: [1.24, 1.16, 1.02, 0.01],
    gain: [1.10, 1.0, 0.86, 0.30],
  }),
  def('chromeMatrix', 224, 'Cromo Matrix', 'Metálico frío con tinte verde', 'cyber', 'from-zinc-400 via-emerald-700 to-black', {
    shadow: [0.04, 0.14, 0.10, 0.66],
    high: [0.84, 0.98, 0.90, 0.42],
    params: [1.28, 0.72, 1.04, 0.02],
    gain: [0.94, 1.06, 0.98, 0.34],
  }),
  def('vaporPink', 225, 'Vaporwave Rosa', 'Pastel neón rosa y turquesa', 'cyber', 'from-pink-400 via-purple-400 to-cyan-300', {
    shadow: [0.12, 0.22, 0.34, 0.56],
    high: [1.0, 0.62, 0.88, 0.54],
    params: [1.06, 1.24, 0.94, 0.06],
    gain: [1.06, 0.98, 1.08, 0.14],
  }),
  def('quantumTeal', 226, 'Cuántico Teal', 'Turquesa sci-fi luminoso', 'cyber', 'from-teal-300 via-cyan-700 to-slate-950', {
    shadow: [0.02, 0.18, 0.24, 0.70],
    high: [0.48, 0.98, 0.94, 0.54],
    params: [1.22, 1.18, 1.0, 0.02],
    gain: [0.90, 1.08, 1.08, 0.26],
  }),
  def('plasmaBlue', 227, 'Plasma Azul', 'Azul eléctrico de alta energía', 'cyber', 'from-blue-400 via-indigo-700 to-black', {
    shadow: [0.02, 0.08, 0.36, 0.78],
    high: [0.55, 0.82, 1.0, 0.58],
    params: [1.26, 1.20, 1.03, 0.0],
    gain: [0.92, 0.98, 1.16, 0.30],
  }),
  def('arcadeGlow', 228, 'Arcade Retro', 'Colores saturados de recreativa', 'cyber', 'from-rose-500 via-amber-400 to-cyan-400', {
    shadow: [0.12, 0.06, 0.24, 0.56],
    high: [1.0, 0.92, 0.45, 0.48],
    params: [1.24, 1.34, 0.98, 0.02],
    gain: [1.06, 1.02, 1.04, 0.26],
    extra: [0, 0.30, 0, 0],
  }),
  def('tokyoRainLUT', 229, 'Lluvia Tokio', 'Asfalto mojado + neones rojos', 'cyber', 'from-slate-900 via-cyan-800 to-rose-600', {
    shadow: [0.04, 0.14, 0.22, 0.70],
    high: [1.0, 0.42, 0.54, 0.48],
    params: [1.22, 1.12, 1.04, 0.02],
    gain: [1.02, 0.98, 1.06, 0.30],
  }),
  def('ultravioletPro', 230, 'Ultravioleta Pro', 'Luz negra + contrastes morados', 'cyber', 'from-purple-600 via-violet-900 to-black', {
    shadow: [0.10, 0.02, 0.26, 0.80],
    high: [0.85, 0.50, 1.0, 0.56],
    params: [1.28, 1.16, 1.05, 0.01],
    gain: [1.02, 0.88, 1.18, 0.34],
  }),

  // ── ☀️ CÁLIDOS / FRÍOS Y NATURALEZA (231..245) ────────────────────────────
  def('glacierIce', 231, 'Glaciar Ártico', 'Blancos puros + azul hielo', 'nature', 'from-white via-sky-300 to-blue-700', {
    shadow: [0.06, 0.18, 0.30, 0.54],
    high: [0.92, 0.98, 1.0, 0.48],
    params: [1.14, 0.88, 0.96, 0.04],
    gain: [0.92, 1.0, 1.10, 0.18],
  }),
  def('canyonRed', 232, 'Cañón Rojo', 'Roca terracota + cielo azul', 'nature', 'from-red-600 via-orange-500 to-sky-500', {
    shadow: [0.14, 0.08, 0.06, 0.46],
    high: [1.0, 0.78, 0.52, 0.54],
    params: [1.18, 1.16, 1.0, 0.02],
    gain: [1.10, 0.98, 0.88, 0.26],
  }),
  def('amazoniaGreen', 233, 'Selva Amazónica', 'Verdes exuberantes + humedad', 'nature', 'from-emerald-500 via-green-700 to-teal-950', {
    shadow: [0.04, 0.14, 0.08, 0.56],
    high: [0.86, 1.0, 0.72, 0.44],
    params: [1.16, 1.20, 1.0, 0.02],
    gain: [0.94, 1.10, 0.92, 0.24],
    extra: [0, 0.22, 0, 0],
  }),
  def('pacificTeal', 234, 'Pacífico Profundo', 'Azul océano + espuma clara', 'nature', 'from-teal-400 via-cyan-700 to-slate-900', {
    shadow: [0.03, 0.14, 0.22, 0.60],
    high: [0.82, 0.96, 1.0, 0.44],
    params: [1.14, 1.08, 0.99, 0.02],
    gain: [0.92, 1.02, 1.08, 0.22],
  }),
  def('mediterraneanSun', 235, 'Sol Mediterráneo', 'Calidez dorada y mar turquesa', 'nature', 'from-amber-300 via-orange-400 to-cyan-500', {
    shadow: [0.08, 0.14, 0.18, 0.40],
    high: [1.0, 0.90, 0.68, 0.50],
    params: [1.12, 1.22, 0.96, 0.03],
    gain: [1.06, 1.02, 0.94, 0.18],
    extra: [0, 0.24, 0, 0],
  }),
  def('tundraFrost', 236, 'Escarcha Tundra', 'Frío desaturado y limpio', 'nature', 'from-slate-300 via-cyan-600 to-slate-800', {
    shadow: [0.08, 0.14, 0.20, 0.52],
    high: [0.88, 0.94, 1.0, 0.42],
    params: [1.10, 0.72, 1.0, 0.05],
    gain: [0.94, 1.0, 1.06, 0.16],
  }),
  def('autumnOchre', 237, 'Ocre de Otoño', 'Hojas doradas y tonos tierra', 'nature', 'from-amber-500 via-orange-700 to-stone-900', {
    shadow: [0.14, 0.08, 0.04, 0.48],
    high: [1.0, 0.80, 0.48, 0.54],
    params: [1.14, 1.10, 1.0, 0.02],
    gain: [1.10, 1.0, 0.84, 0.22],
  }),
  def('cherryBlossomLUT', 238, 'Cerezos en Flor', 'Rosa suave primaveral', 'nature', 'from-pink-200 via-rose-400 to-stone-600', {
    shadow: [0.12, 0.10, 0.14, 0.36],
    high: [1.0, 0.88, 0.92, 0.48],
    params: [1.02, 1.12, 0.94, 0.05],
    gain: [1.06, 0.98, 1.02, 0.10],
  }),
  def('monsoonSlate', 239, 'Tormenta Monzón', 'Gris lluvioso + verdes intensos', 'nature', 'from-slate-600 via-teal-800 to-zinc-950', {
    shadow: [0.04, 0.10, 0.14, 0.62],
    high: [0.82, 0.90, 0.94, 0.36],
    params: [1.22, 0.86, 1.04, 0.02],
    gain: [0.94, 1.02, 1.04, 0.28],
  }),
  def('desertMirage', 240, 'Espejismo Duna', 'Arena luminosa + calor solar', 'nature', 'from-yellow-200 via-amber-500 to-orange-800', {
    shadow: [0.16, 0.10, 0.04, 0.42],
    high: [1.0, 0.88, 0.60, 0.58],
    params: [1.12, 1.04, 0.96, 0.04],
    gain: [1.10, 1.02, 0.86, 0.20],
  }),
  def('pineForest', 241, 'Bosque de Pinos', 'Verde pino oscuro y aire puro', 'nature', 'from-emerald-800 via-green-900 to-stone-950', {
    shadow: [0.04, 0.12, 0.08, 0.58],
    high: [0.88, 0.96, 0.84, 0.38],
    params: [1.16, 0.96, 1.02, 0.02],
    gain: [0.94, 1.06, 0.94, 0.26],
  }),
  def('coralSunset', 242, 'Atardecer Coral', 'Naranja coral y cielo rosado', 'nature', 'from-orange-400 via-rose-500 to-purple-700', {
    shadow: [0.14, 0.08, 0.18, 0.44],
    high: [1.0, 0.78, 0.64, 0.56],
    params: [1.12, 1.20, 0.96, 0.03],
    gain: [1.08, 0.98, 0.94, 0.20],
  }),
  def('lagoonAqua', 243, 'Laguna Turquesa', 'Agua cristalina tropical', 'nature', 'from-cyan-300 via-teal-500 to-emerald-700', {
    shadow: [0.04, 0.18, 0.22, 0.52],
    high: [0.80, 1.0, 0.96, 0.48],
    params: [1.12, 1.24, 0.96, 0.03],
    gain: [0.92, 1.08, 1.06, 0.18],
    extra: [0, 0.22, 0, 0],
  }),
  def('prairieGold', 244, 'Pradera Dorada', 'Luz cálida de tarde en campo', 'nature', 'from-yellow-300 via-amber-500 to-stone-700', {
    shadow: [0.10, 0.08, 0.04, 0.40],
    high: [1.0, 0.90, 0.58, 0.52],
    params: [1.08, 1.10, 0.96, 0.04],
    gain: [1.06, 1.02, 0.88, 0.16],
  }),
  def('auroraBorealisLUT', 245, 'Aurora Polar', 'Verdes y violetas nocturnos', 'nature', 'from-emerald-400 via-teal-700 to-violet-900', {
    shadow: [0.06, 0.08, 0.22, 0.64],
    high: [0.58, 1.0, 0.82, 0.50],
    params: [1.18, 1.18, 1.0, 0.02],
    gain: [0.94, 1.08, 1.06, 0.26],
  }),

  // ── ⚫ B&N / NOIR ADICIONAL (246..258) ─────────────────────────────────────
  def('silverNitrate', 246, 'Nitrato de Plata', 'B&N brillante con negros puros', 'bw', 'from-white via-zinc-500 to-black', {
    matrix: BW_MAT,
    shadow: [0.0, 0.0, 0.0, 0.45],
    high: [1.0, 1.0, 1.0, 0.35],
    params: [1.32, 0.0, 1.0, 0.0],
    gain: [1.02, 1.02, 1.02, 0.36],
  }),
  def('carbonNoir', 247, 'Carbón Noir', 'Sombras densas estilo detective', 'bw', 'from-stone-400 via-zinc-800 to-black', {
    matrix: BW_MAT,
    shadow: [0.02, 0.02, 0.03, 0.60],
    high: [0.92, 0.92, 0.92, 0.25],
    params: [1.40, 0.0, 1.10, 0.0],
    gain: [1.0, 1.0, 1.0, 0.44],
  }),
  def('platinumPrint', 248, 'Impresión Platino', 'Grises medios suaves y cálidos', 'bw', 'from-stone-200 via-stone-500 to-stone-900', {
    matrix: BW_MAT,
    shadow: [0.06, 0.05, 0.04, 0.32],
    high: [0.98, 0.96, 0.92, 0.32],
    params: [1.08, 0.0, 0.96, 0.04],
    gain: [1.02, 1.0, 0.96, 0.14],
  }),
  def('fadedGraphite', 249, 'Grafito Lavado', 'B&N mate con negros suaves', 'bw', 'from-zinc-300 via-zinc-500 to-zinc-800', {
    matrix: BW_MAT,
    shadow: [0.10, 0.10, 0.12, 0.40],
    high: [0.90, 0.90, 0.92, 0.26],
    params: [0.96, 0.0, 0.98, 0.10],
    gain: [0.98, 0.98, 1.0, 0.06],
  }),
  def('seleniumTone', 250, 'Tono Selenio', 'Monocromo frío púrpura sutil', 'bw', 'from-slate-200 via-purple-900 to-black', {
    matrix: BW_MAT,
    shadow: [0.06, 0.03, 0.10, 0.54],
    high: [0.96, 0.94, 0.98, 0.30],
    params: [1.22, 0.0, 1.02, 0.02],
    gain: [1.0, 0.98, 1.04, 0.28],
  }),
  def('highContrastInk', 251, 'Tinta Extrema', 'Blanco y negro gráfico puro', 'bw', 'from-white via-neutral-600 to-black', {
    matrix: BW_MAT,
    shadow: [0.0, 0.0, 0.0, 0.65],
    high: [1.0, 1.0, 1.0, 0.45],
    params: [1.52, 0.0, 1.04, 0.0],
    gain: [1.04, 1.04, 1.04, 0.50],
  }),
  def('softSilver', 252, 'Plata Suave', 'Retrato monocromo luminoso', 'bw', 'from-neutral-100 via-neutral-400 to-neutral-800', {
    matrix: BW_MAT,
    shadow: [0.06, 0.06, 0.06, 0.25],
    high: [1.0, 1.0, 1.0, 0.36],
    params: [1.02, 0.0, 0.92, 0.06],
    gain: [1.02, 1.02, 1.02, 0.10],
  }),
  def('duotoneAmberBW', 253, 'Duotono Ámbar', 'Negro carbón + oro cálido', 'bw', 'from-amber-300 via-amber-700 to-black', {
    matrix: BW_MAT,
    shadow: [0.08, 0.04, 0.01, 0.72],
    high: [1.0, 0.78, 0.32, 0.70],
    params: [1.22, 0.0, 1.0, 0.02],
    gain: [1.06, 1.0, 0.90, 0.28],
    extra: [0.55, 0, 0, 0],
  }),
  def('duotoneCobaltBW', 254, 'Duotono Cobalto', 'Azul cobalto + blanco frío', 'bw', 'from-sky-300 via-blue-700 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.02, 0.06, 0.28, 0.78],
    high: [0.78, 0.92, 1.0, 0.68],
    params: [1.20, 0.0, 1.0, 0.02],
    gain: [0.94, 1.0, 1.10, 0.26],
    extra: [0.55, 0, 0, 0],
  }),
  def('duotoneRubyBW', 255, 'Duotono Rubí', 'Sombras vino + luces rosadas', 'bw', 'from-rose-300 via-red-700 to-black', {
    matrix: BW_MAT,
    shadow: [0.22, 0.02, 0.06, 0.78],
    high: [1.0, 0.62, 0.68, 0.68],
    params: [1.24, 0.0, 1.02, 0.01],
    gain: [1.08, 0.94, 0.96, 0.30],
    extra: [0.55, 0, 0, 0],
  }),
  def('duotoneJadeBW', 256, 'Duotono Jade', 'Verde jade oscuro + menta', 'bw', 'from-emerald-200 via-teal-700 to-black', {
    matrix: BW_MAT,
    shadow: [0.02, 0.16, 0.12, 0.78],
    high: [0.72, 1.0, 0.86, 0.68],
    params: [1.20, 0.0, 1.0, 0.02],
    gain: [0.94, 1.08, 1.0, 0.26],
    extra: [0.55, 0, 0, 0],
  }),
  def('classicNewspaper', 257, 'Prensa Clásica', 'Gris papel periódico vintage', 'bw', 'from-stone-300 via-stone-500 to-stone-900', {
    matrix: BW_MAT,
    shadow: [0.12, 0.11, 0.09, 0.45],
    high: [0.94, 0.90, 0.82, 0.38],
    params: [1.14, 0.0, 1.02, 0.08],
    gain: [1.02, 1.0, 0.96, 0.18],
  }),
  def('moonlitMono', 258, 'Monocromo Lunar', 'Plata azulada nocturna', 'bw', 'from-sky-200 via-slate-600 to-slate-950', {
    matrix: BW_MAT,
    shadow: [0.04, 0.08, 0.18, 0.62],
    high: [0.88, 0.94, 1.0, 0.40],
    params: [1.24, 0.0, 1.04, 0.02],
    gain: [0.96, 1.0, 1.08, 0.30],
  }),

  // ── 👤 RETRATO / EDITORIAL ADICIONAL (259..272) ────────────────────────────
  def('velvetSkin', 259, 'Piel Terciopelo', 'Suavizado cálido para rostro', 'portrait', 'from-rose-200 via-amber-200 to-stone-500', {
    shadow: [0.10, 0.06, 0.06, 0.26],
    high: [1.0, 0.92, 0.86, 0.40],
    params: [0.96, 1.04, 0.92, 0.04],
    gain: [1.04, 1.0, 0.96, 0.08],
    extra: [0, 0.15, 0, 0],
  }),
  def('peachEditorial', 260, 'Editorial Durazno', 'Tonos melocotón revista moda', 'portrait', 'from-orange-200 via-rose-300 to-amber-500', {
    shadow: [0.12, 0.08, 0.08, 0.30],
    high: [1.0, 0.86, 0.76, 0.46],
    params: [1.04, 1.08, 0.94, 0.04],
    gain: [1.06, 1.0, 0.94, 0.12],
  }),
  def('bronzeGlow', 261, 'Bronceado Solar', 'Piel dorada y luminosa', 'portrait', 'from-amber-300 via-orange-500 to-stone-800', {
    shadow: [0.12, 0.07, 0.04, 0.34],
    high: [1.0, 0.84, 0.64, 0.48],
    params: [1.08, 1.12, 0.96, 0.03],
    gain: [1.08, 1.0, 0.90, 0.16],
  }),
  def('milkCream', 262, 'Leche y Crema', 'Tonos claros limpios y suaves', 'portrait', 'from-white via-amber-100 to-stone-400', {
    shadow: [0.10, 0.09, 0.08, 0.22],
    high: [1.0, 0.96, 0.92, 0.42],
    params: [0.94, 0.96, 0.88, 0.07],
    gain: [1.02, 1.01, 0.98, 0.04],
  }),
  def('cleanStudioPro', 263, 'Estudio Pro', 'Balance neutro de alta definición', 'portrait', 'from-slate-100 via-slate-300 to-slate-600', {
    shadow: [0.02, 0.02, 0.04, 0.20],
    high: [1.0, 1.0, 1.0, 0.25],
    params: [1.10, 1.04, 0.96, 0.01],
    gain: [1.01, 1.01, 1.01, 0.16],
  }),
  def('roseGoldSkin', 264, 'Oro Rosa Retrato', 'Destellos rosados elegantes', 'portrait', 'from-rose-200 via-pink-400 to-amber-300', {
    shadow: [0.12, 0.06, 0.10, 0.28],
    high: [1.0, 0.86, 0.84, 0.46],
    params: [1.02, 1.06, 0.93, 0.04],
    gain: [1.06, 0.98, 0.98, 0.10],
  }),
  def('honeySun', 265, 'Miel de Sol', 'Iluminación cálida natural', 'portrait', 'from-yellow-200 via-amber-400 to-orange-600', {
    shadow: [0.10, 0.08, 0.04, 0.30],
    high: [1.0, 0.90, 0.68, 0.48],
    params: [1.04, 1.10, 0.94, 0.04],
    gain: [1.06, 1.02, 0.90, 0.14],
  }),
  def('ivoryMatte', 266, 'Marfil Mate', 'Acabado suave sin brillos duros', 'portrait', 'from-stone-100 via-stone-300 to-stone-600', {
    shadow: [0.10, 0.10, 0.10, 0.28],
    high: [0.98, 0.95, 0.90, 0.36],
    params: [0.96, 0.92, 0.94, 0.07],
    gain: [1.02, 1.0, 0.98, 0.06],
  }),
  def('silkPortrait', 267, 'Retrato Seda', 'Contrastes delicados y piel viva', 'portrait', 'from-rose-100 via-amber-200 to-slate-500', {
    shadow: [0.08, 0.06, 0.08, 0.24],
    high: [1.0, 0.94, 0.88, 0.38],
    params: [1.0, 1.06, 0.92, 0.04],
    gain: [1.04, 1.0, 0.97, 0.10],
  }),
  def('caramelWarm', 268, 'Caramelo Cálido', 'Sombras chocolate y luz cálida', 'portrait', 'from-amber-700 via-orange-400 to-amber-100', {
    shadow: [0.14, 0.08, 0.04, 0.42],
    high: [1.0, 0.88, 0.72, 0.44],
    params: [1.10, 1.04, 0.98, 0.03],
    gain: [1.06, 1.0, 0.90, 0.20],
  }),
  def('freshDaylight', 269, 'Luz de Día Fresca', 'Claridad natural para vlogs', 'portrait', 'from-sky-100 via-white to-amber-100', {
    shadow: [0.04, 0.06, 0.10, 0.20],
    high: [1.0, 0.99, 0.98, 0.30],
    params: [1.06, 1.08, 0.94, 0.02],
    gain: [1.0, 1.02, 1.02, 0.12],
    extra: [0, 0.18, 0, 0],
  }),
  def('champagneSoft', 270, 'Champán Suave', 'Tono dorado pálido de lujo', 'portrait', 'from-amber-100 via-yellow-200 to-stone-500', {
    shadow: [0.08, 0.08, 0.06, 0.26],
    high: [1.0, 0.94, 0.80, 0.44],
    params: [1.02, 0.98, 0.93, 0.05],
    gain: [1.04, 1.02, 0.94, 0.10],
  }),
  def('satinBlush', 271, 'Rubor Satén', 'Frescura rosada en altas luces', 'portrait', 'from-pink-200 via-rose-300 to-stone-600', {
    shadow: [0.10, 0.06, 0.08, 0.26],
    high: [1.0, 0.88, 0.90, 0.42],
    params: [1.02, 1.06, 0.93, 0.04],
    gain: [1.05, 0.99, 1.0, 0.10],
  }),
  def('fashionEditorial', 272, 'Moda Editorial', 'Contraste nítido de pasarela', 'portrait', 'from-stone-200 via-stone-600 to-black', {
    shadow: [0.04, 0.05, 0.08, 0.42],
    high: [1.0, 0.96, 0.92, 0.34],
    params: [1.22, 0.94, 0.98, 0.01],
    gain: [1.02, 1.0, 0.98, 0.28],
  }),

  // ── 🎭 ATMÓSFERA / ARTE ADICIONAL (273..285) ───────────────────────────────
  def('velvetCrimson', 273, 'Terciopelo Carmesí', 'Rojos oscuros y atmósfera dramática', 'mood', 'from-rose-700 via-red-900 to-black', {
    shadow: [0.16, 0.02, 0.06, 0.64],
    high: [1.0, 0.68, 0.64, 0.42],
    params: [1.20, 1.04, 1.04, 0.02],
    gain: [1.08, 0.94, 0.94, 0.28],
  }),
  def('mysticIndigo', 274, 'Índigo Místico', 'Noche profunda con toque violeta', 'mood', 'from-indigo-500 via-indigo-900 to-black', {
    shadow: [0.06, 0.04, 0.24, 0.68],
    high: [0.84, 0.82, 1.0, 0.44],
    params: [1.18, 1.02, 1.03, 0.02],
    gain: [0.96, 0.96, 1.12, 0.26],
  }),
  def('dreamyLavender', 275, 'Lavanda Soñadora', 'Bruma violeta suave y poética', 'mood', 'from-purple-200 via-violet-400 to-indigo-700', {
    shadow: [0.14, 0.10, 0.24, 0.42],
    high: [1.0, 0.90, 1.0, 0.44],
    params: [0.94, 1.04, 0.90, 0.08],
    gain: [1.02, 0.98, 1.06, 0.06],
  }),
  def('emberHaze', 276, 'Bruma de Brasas', 'Calor rojizo envuelto en humo', 'mood', 'from-orange-500 via-stone-700 to-black', {
    shadow: [0.12, 0.06, 0.04, 0.56],
    high: [1.0, 0.72, 0.44, 0.50],
    params: [1.14, 0.96, 1.02, 0.04],
    gain: [1.08, 0.98, 0.88, 0.24],
  }),
  def('arcticSilence', 277, 'Silencio Ártico', 'Quietud azulada minimalista', 'mood', 'from-sky-100 via-slate-400 to-slate-800', {
    shadow: [0.06, 0.12, 0.20, 0.52],
    high: [0.92, 0.96, 1.0, 0.40],
    params: [1.06, 0.68, 0.98, 0.06],
    gain: [0.94, 1.0, 1.06, 0.16],
  }),
  def('emeraldDream', 278, 'Sueño Esmeralda', 'Fantasía bosque verde profundo', 'mood', 'from-emerald-400 via-teal-800 to-black', {
    shadow: [0.02, 0.16, 0.12, 0.64],
    high: [0.76, 1.0, 0.84, 0.44],
    params: [1.16, 1.08, 1.0, 0.02],
    gain: [0.92, 1.08, 0.98, 0.24],
  }),
  def('obsidianGold', 279, 'Obsidiana y Oro', 'Negros densos con reflejo dorado', 'mood', 'from-amber-400 via-stone-800 to-black', {
    shadow: [0.04, 0.03, 0.02, 0.68],
    high: [1.0, 0.84, 0.42, 0.48],
    params: [1.30, 0.92, 1.06, 0.0],
    gain: [1.06, 1.0, 0.88, 0.36],
  }),
  def('pastelCloud', 280, 'Nube Pastel', 'Tonos etéreos de baja saturación', 'mood', 'from-pink-200 via-sky-200 to-amber-100', {
    shadow: [0.16, 0.16, 0.22, 0.34],
    high: [1.0, 0.96, 0.98, 0.40],
    params: [0.88, 0.92, 0.88, 0.10],
    gain: [1.02, 1.0, 1.02, 0.02],
  }),
  def('twilightViolet', 281, 'Crepúsculo Violeta', 'Última luz del día púrpura', 'mood', 'from-violet-400 via-rose-600 to-slate-950', {
    shadow: [0.10, 0.06, 0.22, 0.60],
    high: [1.0, 0.72, 0.86, 0.46],
    params: [1.14, 1.10, 1.0, 0.03],
    gain: [1.04, 0.96, 1.08, 0.22],
  }),
  def('goldenAura', 282, 'Aura Dorada', 'Resplandor cálido espiritual', 'mood', 'from-yellow-200 via-amber-400 to-stone-700', {
    shadow: [0.12, 0.08, 0.04, 0.36],
    high: [1.0, 0.92, 0.62, 0.54],
    params: [1.04, 1.08, 0.92, 0.05],
    gain: [1.08, 1.02, 0.88, 0.14],
  }),
  def('melancholicBlue', 283, 'Azul Melancólico', 'Gris azulado introspectivo', 'mood', 'from-sky-400 via-slate-700 to-slate-950', {
    shadow: [0.04, 0.10, 0.20, 0.62],
    high: [0.84, 0.90, 0.98, 0.38],
    params: [1.12, 0.70, 1.02, 0.04],
    gain: [0.94, 0.98, 1.08, 0.22],
  }),
  def('crimsonDusk', 284, 'Ocaso Carmesí', 'Cielo rojo profundo al anochecer', 'mood', 'from-red-500 via-purple-800 to-black', {
    shadow: [0.14, 0.04, 0.12, 0.62],
    high: [1.0, 0.60, 0.56, 0.50],
    params: [1.20, 1.10, 1.03, 0.02],
    gain: [1.08, 0.94, 0.98, 0.28],
  }),
  def('etherealMist', 285, 'Niebla Etérea', 'Luz blanca difusa y mística', 'mood', 'from-white via-teal-200 to-slate-500', {
    shadow: [0.10, 0.14, 0.16, 0.30],
    high: [0.98, 1.0, 0.98, 0.44],
    params: [0.92, 0.84, 0.88, 0.09],
    gain: [1.0, 1.02, 1.02, 0.04],
  }),
];

export const PARAMETRIC_FILTER_MAP: Readonly<Record<string, ParametricFilterMeta>> =
  Object.fromEntries(PARAMETRIC_FILTER_LIST.map((f) => [f.id, f]));

export const PARAMETRIC_FILTER_IDS: Readonly<Record<string, number>> =
  Object.fromEntries(PARAMETRIC_FILTER_LIST.map((f) => [f.id, f.numericId]));

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * CPU/Canvas2D equivalent of the GLSL parametric LUT block (preset >= 36).
 */
export function applyParametricLutRgb(
  r: number,
  g: number,
  b: number,
  gpu: ParametricFilterGpuParams
): [number, number, number] {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const m = gpu.matrix;
  let rr = r * m[0] + g * m[1] + b * m[2];
  let gg = r * m[3] + g * m[4] + b * m[5];
  let bb = r * m[6] + g * m[7] + b * m[8];

  const duotoneMix = gpu.extra[0];
  if (duotoneMix > 0) {
    const t = smoothstep(0.06, 0.94, luma);
    const dr = mix(gpu.shadow[0], gpu.high[0], t);
    const dg = mix(gpu.shadow[1], gpu.high[1], t);
    const db = mix(gpu.shadow[2], gpu.high[2], t);
    rr = mix(rr, dr, duotoneMix);
    gg = mix(gg, dg, duotoneMix);
    bb = mix(bb, db, duotoneMix);
  } else {
    const sMask = (1 - smoothstep(0, 0.55, luma)) * gpu.shadow[3];
    const hMask = smoothstep(0.45, 1, luma) * gpu.high[3];
    if (sMask > 0) {
      rr = mix(rr, rr * 0.85 + gpu.shadow[0] * 0.45, sMask);
      gg = mix(gg, gg * 0.85 + gpu.shadow[1] * 0.45, sMask);
      bb = mix(bb, bb * 0.85 + gpu.shadow[2] * 0.45, sMask);
    }
    if (hMask > 0) {
      rr = mix(rr, rr * 0.9 + gpu.high[0] * 0.35, hMask);
      gg = mix(gg, gg * 0.9 + gpu.high[1] * 0.35, hMask);
      bb = mix(bb, bb * 0.9 + gpu.high[2] * 0.35, hMask);
    }
  }

  const sat = gpu.params[1];
  if (sat !== 1) {
    const l2 = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    rr = mix(l2, rr, sat);
    gg = mix(l2, gg, sat);
    bb = mix(l2, bb, sat);
  }

  const vibrance = gpu.extra[1];
  if (vibrance !== 0) {
    const maxC = Math.max(rr, gg, bb);
    const minC = Math.min(rr, gg, bb);
    const vib = (1 - (maxC - minC)) * vibrance;
    const l3 = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    rr = mix(l3, rr, 1 + vib);
    gg = mix(l3, gg, 1 + vib);
    bb = mix(l3, bb, 1 + vib);
  }

  const gamma = gpu.params[2];
  if (gamma !== 1) {
    rr = Math.pow(clamp01(rr), gamma);
    gg = Math.pow(clamp01(gg), gamma);
    bb = Math.pow(clamp01(bb), gamma);
  }

  rr *= gpu.gain[0];
  gg *= gpu.gain[1];
  bb *= gpu.gain[2];

  const contrast = gpu.params[0];
  if (contrast !== 1) {
    rr = (rr - 0.5) * contrast + 0.5;
    gg = (gg - 0.5) * contrast + 0.5;
    bb = (bb - 0.5) * contrast + 0.5;
  }

  const sCurve = gpu.gain[3];
  if (sCurve > 0) {
    rr = mix(rr, smoothstep(0.02, 0.98, clamp01(rr)), sCurve);
    gg = mix(gg, smoothstep(0.02, 0.98, clamp01(gg)), sCurve);
    bb = mix(bb, smoothstep(0.02, 0.98, clamp01(bb)), sCurve);
  }

  const lift = gpu.params[3];
  if (lift !== 0) {
    const scale = 1 - lift * 0.5;
    rr = lift + rr * scale;
    gg = lift + gg * scale;
    bb = lift + bb * scale;
  }

  return [clamp01(rr), clamp01(gg), clamp01(bb)];
}
