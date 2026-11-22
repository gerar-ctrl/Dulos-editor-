// ============================================================================
// Parametric Studio Visual FX (Effects 91..190)
// Single source of truth for WebGL uniforms, Canvas2D fallback, and UI cards.
// ============================================================================

import { VisualEffectType } from '../../types/editor';

export type FxCategory =
  | 'all'
  | 'fire'
  | 'nature'
  | 'glitch'
  | 'light'
  | 'particles'
  | 'lens'
  | 'art';

export type ParametricEffectId = Exclude<
  VisualEffectType,
  | 'none'
  | 'glitch'
  | 'vhs'
  | 'cameraShake'
  | 'chromaticAberration'
  | 'neonGlow'
  | 'dreamyBloom'
  | 'filmGrain'
  | 'lightLeakFX'
  | 'rain'
  | 'sparks'
  | 'kaleidoscope'
  | 'mirrorClone'
  | 'pixelate'
  | 'halftone'
  | 'fisheye'
  | 'thermal'
  | 'crtMonitor'
  | 'rgbPulse'
  | 'datamosh'
  | 'invertFlash'
  | 'nightVision'
  | 'edgeSketch'
  | 'prismRainbow'
  | 'duotoneCyber'
  | 'auroraGlow'
  | 'strobeLight'
  | 'sunFlare'
  | 'xray'
  | 'snow'
  | 'confetti'
  | 'bokehLights'
  | 'starfield'
  | 'matrixRain'
  | 'underwater'
  | 'heatHaze'
  | 'speedLines'
  | 'cinematicBars'
  | 'tiltShift'
  | 'radialBlurFX'
  | 'mirrorVertical'
  | 'fireFlames'
  | 'fireRing'
  | 'hellfire'
  | 'sunnyDay'
  | 'goldenHour'
  | 'blueHour'
  | 'starryNight'
  | 'moonlight'
  | 'thunderstorm'
  | 'fogMist'
  | 'sandstorm'
  | 'sunsetSky'
  | 'fireflies'
  | 'cherryBlossom'
  | 'autumnLeaves'
  | 'ashEmbers'
  | 'bubbles'
  | 'sparkles'
  | 'laserRain'
  | 'snowBlizzard'
  | 'frostEdge'
  | 'bloodMoon'
  | 'hologram'
  | 'tvStatic'
  | 'cyberScan'
  | 'glitchWave'
  | 'badSignal'
  | 'asciiMatrix'
  | 'vhsDamaged'
  | 'digitalRainBlue'
  | 'laserGrid'
  | 'pulseWave'
  | 'spotlight'
  | 'discoLights'
  | 'policeSiren'
  | 'candlelight'
  | 'projector8mm'
  | 'godRays'
  | 'vaporwave'
  | 'noirShadow'
  | 'goldenSparkle'
  | 'oilPainting'
  | 'watercolor'
  | 'emboss3D'
  | 'mosaicGlass'
  | 'swirlVortex'
  | 'tunnelZoom'
  | 'mirrorQuad'
  | 'miniatureBlur'
  | 'thermalNight'
>;

export interface ParametricEffectGpuParams {
  /** 1=Fire, 2=Light, 3=Particles, 4=Glitch, 5=Lens, 6=Art, 7=Retro */
  family: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  colA: readonly [number, number, number, number];
  colB: readonly [number, number, number, number];
  /** [mode, scale, density, distort] */
  paramA: readonly [number, number, number, number];
  /** [angle, glow, flicker, extra] */
  paramB: readonly [number, number, number, number];
}

export interface ParametricEffectMeta {
  id: ParametricEffectId;
  numericId: number;
  label: string;
  badge: string;
  icon: string;
  category: Exclude<FxCategory, 'all'>;
  gradient: string;
  gpu: ParametricEffectGpuParams;
}

function fx(
  id: ParametricEffectId,
  numericId: number,
  label: string,
  badge: string,
  icon: string,
  category: Exclude<FxCategory, 'all'>,
  gradient: string,
  family: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  colA: readonly [number, number, number, number],
  colB: readonly [number, number, number, number],
  paramA: readonly [number, number, number, number],
  paramB: readonly [number, number, number, number]
): ParametricEffectMeta {
  return {
    id,
    numericId,
    label,
    badge,
    icon,
    category,
    gradient,
    gpu: { family, colA, colB, paramA, paramB },
  };
}

export const PARAMETRIC_EFFECT_LIST: readonly ParametricEffectMeta[] = [
  // ── 🔥 FUEGO Y LLAMARADAS (14 tipos: 91..104) ─────────────────────────────
  // Family 1: mode 0=BottomWall, 1=TopCurtain, 2=SideDragon, 3=RadialSolar, 4=BorderRing, 5=MeteorTrail, 6=Vortex
  fx('flameInferno', 91, 'Llamarada Infernal', 'Fuego Clásico', '🔥', 'fire', 'from-orange-500 via-red-600 to-black',
    1, [1.0, 0.85, 0.25, 1.0], [0.95, 0.20, 0.02, 1.0], [0, 5.5, 0.62, 0.018], [0.0, 0.8, 0.25, 0.8]),
  fx('flameBluePlasma', 92, 'Llama Plasma Azul', 'Fuego Eléctrico', '💠', 'fire', 'from-cyan-400 via-blue-600 to-indigo-950',
    1, [0.70, 0.95, 1.0, 1.0], [0.08, 0.38, 1.0, 1.0], [0, 7.0, 0.58, 0.015], [0.0, 1.0, 0.35, 0.6]),
  fx('flameDragonBreath', 93, 'Aliento de Dragón', 'Llamarada Lateral', '🐉', 'fire', 'from-amber-400 via-orange-600 to-rose-900',
    1, [1.0, 0.90, 0.35, 1.0], [1.0, 0.22, 0.04, 1.0], [2, 6.0, 0.65, 0.024], [0.0, 0.9, 0.30, 1.0]),
  fx('flameSolarFlare', 94, 'Llamarada Solar', 'Corona Radial', '☀️', 'fire', 'from-yellow-300 via-orange-500 to-red-800',
    1, [1.0, 0.98, 0.72, 1.0], [1.0, 0.42, 0.05, 1.0], [3, 5.0, 0.55, 0.020], [0.0, 1.1, 0.20, 0.9]),
  fx('flamePhoenixWings', 95, 'Llamas Fénix', 'Alas de Fuego', '🦅', 'fire', 'from-amber-300 via-rose-500 to-purple-900',
    1, [1.0, 0.82, 0.22, 1.0], [0.92, 0.14, 0.28, 1.0], [4, 6.2, 0.52, 0.016], [0.0, 0.95, 0.28, 0.85]),
  fx('flameWildfire', 96, 'Fuego Salvaje', 'Llamas Esmeralda', '🟢', 'fire', 'from-lime-300 via-emerald-500 to-teal-950',
    1, [0.75, 1.0, 0.45, 1.0], [0.06, 0.78, 0.32, 1.0], [0, 6.4, 0.60, 0.017], [0.0, 0.9, 0.32, 0.7]),
  fx('flameArcaneViolet', 97, 'Fuego Arcano', 'Llama Mística', '🔮', 'fire', 'from-fuchsia-400 via-purple-600 to-indigo-950',
    1, [0.98, 0.65, 1.0, 1.0], [0.55, 0.10, 0.95, 1.0], [4, 6.8, 0.56, 0.015], [0.0, 1.0, 0.25, 0.8]),
  fx('flameTorchFlicker', 98, 'Antorcha Viva', 'Llama Cálida', '🕯️', 'fire', 'from-yellow-400 via-amber-600 to-stone-900',
    1, [1.0, 0.88, 0.40, 1.0], [0.92, 0.36, 0.06, 1.0], [0, 4.5, 0.42, 0.012], [0.0, 0.75, 0.55, 0.5]),
  fx('flameMeteorTrail', 99, 'Estela Meteoro', 'Llamarada Diagonal', '☄️', 'fire', 'from-orange-300 via-red-600 to-slate-900',
    1, [1.0, 0.92, 0.55, 1.0], [1.0, 0.28, 0.04, 1.0], [5, 6.5, 0.58, 0.022], [0.7, 0.95, 0.30, 1.0]),
  fx('flameVortex', 100, 'Torbellino de Fuego', 'Vórtice Ígneo', '🌀', 'fire', 'from-amber-400 via-red-600 to-zinc-950',
    1, [1.0, 0.80, 0.28, 1.0], [0.90, 0.16, 0.02, 1.0], [6, 5.5, 0.60, 0.024], [1.0, 0.95, 0.35, 0.9]),
  fx('flameLavaBurst', 101, 'Erupción de Lava', 'Magma & Brasas', '🌋', 'fire', 'from-orange-500 via-red-800 to-stone-950',
    1, [1.0, 0.55, 0.10, 1.0], [0.75, 0.08, 0.02, 1.0], [1, 4.8, 0.66, 0.020], [0.0, 0.85, 0.22, 1.1]),
  fx('flameWhiteHot', 102, 'Fuego Incandescente', 'Núcleo Blanco', '💥', 'fire', 'from-white via-amber-300 to-orange-700',
    1, [1.0, 1.0, 0.92, 1.0], [1.0, 0.55, 0.12, 1.0], [3, 7.2, 0.64, 0.022], [0.0, 1.25, 0.40, 0.9]),
  fx('flameNeonCyber', 103, 'Llama Neón Cyber', 'Fuego Magenta', '⚡', 'fire', 'from-pink-400 via-fuchsia-600 to-cyan-700',
    1, [1.0, 0.45, 0.92, 1.0], [0.10, 0.90, 1.0, 1.0], [2, 6.6, 0.56, 0.016], [0.0, 1.05, 0.45, 0.7]),
  fx('flameGhostSpirit', 104, 'Fuego Espectral', 'Llama Fantasma', '👻', 'fire', 'from-teal-200 via-cyan-500 to-slate-900',
    1, [0.75, 1.0, 0.92, 1.0], [0.12, 0.65, 0.72, 1.0], [6, 5.8, 0.52, 0.014], [-0.8, 0.9, 0.30, 0.6]),

  // ── 🔮 LUZ, DESTELLOS Y NEÓN (16 tipos: 105..120) ─────────────────────────
  // Family 2: mode 0=AnamorphicStreak, 1=CornerLeak, 2=HaloRing, 3=LaserScan, 4=BorderGlow, 5=StrobeWash
  fx('anamorphicBlue', 105, 'Destello Anamórfico', 'Óptica Azul', '🎥', 'light', 'from-cyan-400 via-blue-600 to-slate-900',
    2, [0.25, 0.72, 1.0, 1.0], [0.75, 0.95, 1.0, 1.0], [0, 1.0, 0.75, 0.0], [0.0, 1.0, 0.2, 0.5]),
  fx('anamorphicGold', 106, 'Destello Dorado', 'Óptica Cine', '✨', 'light', 'from-amber-300 via-orange-500 to-stone-900',
    2, [1.0, 0.75, 0.22, 1.0], [1.0, 0.95, 0.75, 1.0], [0, 1.1, 0.80, 0.0], [0.0, 1.0, 0.2, 0.5]),
  fx('prismHalo', 107, 'Halo Prismático', 'Arcoíris Óptico', '🌈', 'light', 'from-rose-400 via-amber-300 to-cyan-400',
    2, [1.0, 0.45, 0.78, 1.0], [0.25, 0.90, 1.0, 1.0], [2, 0.9, 0.85, 0.1], [0.4, 0.9, 0.25, 0.6]),
  fx('warmSunbeam', 108, 'Rayo de Sol', 'Luz Cálida', '🌞', 'light', 'from-yellow-300 via-amber-400 to-orange-700',
    2, [1.0, 0.84, 0.42, 1.0], [1.0, 0.55, 0.15, 1.0], [1, 1.2, 0.85, 0.0], [0.2, 0.9, 0.15, 0.8]),
  fx('crimsonLeak', 109, 'Fuga Carmesí', 'Light Leak Rojo', '🔴', 'light', 'from-red-500 via-rose-700 to-black',
    2, [1.0, 0.18, 0.22, 1.0], [1.0, 0.55, 0.15, 1.0], [1, 1.0, 0.80, 0.0], [0.8, 0.95, 0.3, 0.7]),
  fx('emeraldBeam', 110, 'Haz Esmeralda', 'Luz Verde Sci-Fi', '💚', 'light', 'from-emerald-400 via-green-600 to-black',
    2, [0.15, 1.0, 0.55, 1.0], [0.55, 1.0, 0.85, 1.0], [3, 1.4, 0.75, 0.0], [0.5, 0.9, 0.35, 0.5]),
  fx('violetAura', 111, 'Aura Violeta', 'Resplandor Mágico', '💜', 'light', 'from-violet-400 via-purple-700 to-indigo-950',
    2, [0.72, 0.30, 1.0, 1.0], [1.0, 0.45, 0.92, 1.0], [2, 1.1, 0.80, 0.0], [0.0, 0.85, 0.3, 0.6]),
  fx('strobeRGB', 112, 'Estrobo RGB', 'Club / Concierto', '🪩', 'light', 'from-fuchsia-500 via-cyan-400 to-yellow-400',
    2, [1.0, 0.15, 0.75, 1.0], [0.15, 0.95, 1.0, 1.0], [5, 1.0, 0.75, 0.0], [0.0, 1.0, 1.0, 0.8]),
  fx('neonBorderGlow', 113, 'Marco Neón', 'Borde Luminoso', '🟦', 'light', 'from-cyan-400 via-fuchsia-500 to-indigo-900',
    2, [0.08, 0.95, 1.0, 1.0], [1.0, 0.12, 0.82, 1.0], [4, 1.0, 0.85, 0.0], [0.0, 1.1, 0.35, 0.5]),
  fx('spotlightWarm', 114, 'Foco Escenario', 'Teatro Cálido', '🎭', 'light', 'from-amber-200 via-amber-600 to-black',
    2, [1.0, 0.90, 0.62, 1.0], [0.10, 0.08, 0.06, 1.0], [2, 0.85, 0.90, 0.0], [0.0, 0.8, 0.1, 0.9]),
  fx('cyberLaserScan', 115, 'Escáner Láser', 'Barrido Cyber', '📡', 'light', 'from-rose-500 via-red-600 to-slate-950',
    2, [1.0, 0.15, 0.32, 1.0], [0.15, 0.92, 1.0, 1.0], [3, 1.8, 0.85, 0.0], [0.0, 1.1, 0.4, 0.7]),
  fx('sunsetGradientFX', 116, 'Baño Atardecer', 'Luz Coral', '🌅', 'light', 'from-orange-400 via-rose-500 to-purple-800',
    2, [1.0, 0.48, 0.22, 1.0], [0.68, 0.18, 0.65, 1.0], [1, 1.3, 0.70, 0.0], [0.0, 0.75, 0.15, 0.6]),
  fx('moonHalo', 117, 'Halo Lunar', 'Luz Nocturna', '🌙', 'light', 'from-sky-300 via-blue-700 to-slate-950',
    2, [0.65, 0.85, 1.0, 1.0], [0.22, 0.42, 0.88, 1.0], [2, 1.15, 0.72, 0.0], [0.0, 0.8, 0.15, 0.7]),
  fx('pinkFlare', 118, 'Destello Rosa', 'Glamour Pop', '🌸', 'light', 'from-pink-300 via-rose-500 to-purple-900',
    2, [1.0, 0.50, 0.82, 1.0], [1.0, 0.85, 0.92, 1.0], [0, 1.0, 0.78, 0.0], [0.3, 0.95, 0.25, 0.6]),
  fx('goldenRim', 119, 'Borde Dorado', 'Contraluz Oro', '👑', 'light', 'from-yellow-300 via-amber-500 to-stone-900',
    2, [1.0, 0.84, 0.25, 1.0], [1.0, 0.55, 0.12, 1.0], [4, 1.0, 0.80, 0.0], [0.0, 1.0, 0.2, 0.6]),
  fx('starburstGlow', 120, 'Estrella Brillante', 'Destello 6 Puntas', '🌟', 'light', 'from-white via-sky-300 to-indigo-800',
    2, [1.0, 0.98, 0.85, 1.0], [0.45, 0.80, 1.0, 1.0], [2, 1.0, 0.92, 0.2], [0.5, 1.2, 0.4, 0.8]),

  // ── 🌧️ CLIMA Y PARTÍCULAS (16 tipos: 121..136) ────────────────────────────
  // Family 3: mode 0=FallingSnow/Dots, 1=RisingEmbers/Sparks, 2=DiagonalRain, 3=FloatingBokeh/Bubbles
  fx('blizzardHeavy', 121, 'Tormenta Polar', 'Nieve Densa', '❄️', 'particles', 'from-sky-100 via-slate-400 to-slate-800',
    3, [0.95, 0.98, 1.0, 1.0], [0.65, 0.85, 1.0, 1.0], [0, 28.0, 0.85, 0.35], [0.45, 0.9, 0.2, 1.0]),
  fx('goldDust', 122, 'Polvo de Oro', 'Partículas Lujo', '✨', 'particles', 'from-amber-200 via-yellow-500 to-stone-900',
    3, [1.0, 0.86, 0.35, 1.0], [1.0, 0.65, 0.18, 1.0], [3, 22.0, 0.72, 0.20], [0.0, 1.1, 0.4, 0.7]),
  fx('magicPollen', 123, 'Polen Mágico', 'Bosque Encantado', '🧚', 'particles', 'from-lime-200 via-emerald-400 to-teal-900',
    3, [0.75, 1.0, 0.55, 1.0], [0.40, 0.95, 0.85, 1.0], [3, 18.0, 0.68, 0.25], [0.1, 1.0, 0.5, 0.8]),
  fx('cyberSparks', 124, 'Chispas Cyber', 'Energía Eléctrica', '⚡', 'particles', 'from-cyan-300 via-blue-600 to-indigo-950',
    3, [0.35, 0.95, 1.0, 1.0], [0.85, 0.35, 1.0, 1.0], [1, 30.0, 0.82, 0.30], [0.2, 1.2, 0.6, 0.9]),
  fx('rosePetals', 125, 'Pétalos de Rosa', 'Romántico Suave', '🌹', 'particles', 'from-rose-300 via-pink-500 to-rose-950',
    3, [1.0, 0.32, 0.52, 1.0], [1.0, 0.68, 0.78, 1.0], [0, 14.0, 0.60, 0.40], [0.35, 0.7, 0.2, 0.6]),
  fx('emeraldSpores', 126, 'Esporas Verdes', 'Bioluminiscencia', '🦠', 'particles', 'from-emerald-300 via-green-600 to-black',
    3, [0.35, 1.0, 0.58, 1.0], [0.10, 0.85, 0.72, 1.0], [1, 20.0, 0.70, 0.25], [-0.15, 1.0, 0.4, 0.7]),
  fx('toxicRain', 127, 'Lluvia Ácida', 'Gotas Neón', '🧪', 'particles', 'from-lime-400 via-emerald-700 to-zinc-950',
    3, [0.65, 1.0, 0.20, 1.0], [0.20, 0.90, 0.40, 1.0], [2, 34.0, 0.85, 0.15], [0.18, 0.95, 0.3, 1.0]),
  fx('neonBubbles', 128, 'Burbujas Neón', 'Flotación Pop', '🫧', 'particles', 'from-fuchsia-400 via-cyan-400 to-indigo-950',
    3, [0.35, 0.95, 1.0, 1.0], [1.0, 0.32, 0.85, 1.0], [3, 14.0, 0.62, 0.30], [0.0, 0.95, 0.3, 0.8]),
  fx('ashStorm', 129, 'Tormenta Ceniza', 'Clima Volcánico', '🌋', 'nature', 'from-stone-400 via-zinc-700 to-orange-950',
    3, [0.78, 0.74, 0.70, 1.0], [1.0, 0.42, 0.12, 1.0], [0, 26.0, 0.78, 0.45], [0.55, 0.65, 0.35, 0.9]),
  fx('meteorShower', 130, 'Lluvia de Meteoros', 'Estrellas Fugaces', '🌠', 'particles', 'from-amber-200 via-indigo-600 to-slate-950',
    3, [1.0, 0.92, 0.65, 1.0], [0.45, 0.75, 1.0, 1.0], [2, 20.0, 0.72, 0.10], [0.65, 1.2, 0.4, 1.0]),
  fx('frostCrystals', 131, 'Cristales Hielo', 'Destellos Fríos', '🧊', 'nature', 'from-cyan-100 via-sky-400 to-blue-900',
    3, [0.85, 0.98, 1.0, 1.0], [0.38, 0.78, 1.0, 1.0], [3, 24.0, 0.76, 0.15], [0.1, 1.05, 0.5, 0.7]),
  fx('violetFireflies', 132, 'Luciérnagas Neón', 'Noche Violeta', '✨', 'nature', 'from-violet-300 via-purple-700 to-black',
    3, [0.82, 0.50, 1.0, 1.0], [0.45, 0.90, 1.0, 1.0], [1, 16.0, 0.65, 0.35], [0.0, 1.15, 0.65, 0.8]),
  fx('oceanSpray', 133, 'Brisa Marina', 'Espuma y Gotas', '🌊', 'nature', 'from-cyan-200 via-teal-500 to-blue-900',
    3, [0.85, 0.98, 1.0, 1.0], [0.25, 0.82, 0.95, 1.0], [2, 28.0, 0.75, 0.28], [-0.3, 0.85, 0.25, 0.8]),
  fx('autumnWind', 134, 'Viento de Otoño', 'Hojas Doradas', '🍂', 'nature', 'from-amber-400 via-orange-600 to-stone-900',
    3, [1.0, 0.58, 0.15, 1.0], [0.88, 0.28, 0.10, 1.0], [0, 15.0, 0.64, 0.42], [0.6, 0.75, 0.2, 0.7]),
  fx('cosmicDust', 135, 'Polvo Cósmico', 'Nebulosa Estelar', '🌌', 'particles', 'from-indigo-300 via-fuchsia-600 to-black',
    3, [0.75, 0.85, 1.0, 1.0], [1.0, 0.42, 0.88, 1.0], [3, 26.0, 0.80, 0.18], [0.05, 1.1, 0.45, 0.8]),
  fx('acidRain', 136, 'Lluvia Cyber', 'Láser Diagonal', '☔', 'particles', 'from-cyan-400 via-indigo-700 to-black',
    3, [0.20, 0.90, 1.0, 1.0], [0.85, 0.30, 1.0, 1.0], [2, 38.0, 0.88, 0.08], [0.25, 1.0, 0.3, 1.0]),

  // ── ⚡ GLITCH, VHS Y CYBER (14 tipos: 137..150) ───────────────────────────
  // Family 4: mode 0=RGBGlitch, 1=VHSTracking, 2=CRTArcade, 3=CyberMatrix, 4=PixelStorm
  fx('cyberGlitchPro', 137, 'Cyber Glitch Pro', 'Desfase Digital', '⚡', 'glitch', 'from-cyan-400 via-fuchsia-600 to-black',
    4, [0.0, 0.95, 1.0, 1.0], [1.0, 0.12, 0.72, 1.0], [0, 24.0, 0.75, 0.04], [0.0, 0.8, 0.6, 0.7]),
  fx('rgbWaveShift', 138, 'Onda RGB', 'Separación Cromática', '🌈', 'glitch', 'from-red-500 via-green-400 to-blue-600',
    4, [1.0, 0.2, 0.2, 1.0], [0.2, 0.8, 1.0, 1.0], [0, 12.0, 0.80, 0.03], [1.0, 0.7, 0.4, 0.5]),
  fx('vhsTrackingBad', 139, 'Tracking VHS', 'Cinta Dañada', '📼', 'glitch', 'from-slate-500 via-zinc-700 to-black',
    4, [0.9, 0.9, 0.95, 1.0], [0.4, 0.7, 1.0, 1.0], [1, 32.0, 0.85, 0.05], [0.0, 0.6, 0.8, 0.8]),
  fx('crtArcade', 140, 'Arcade CRT', 'Monitor Retro', '🕹️', 'glitch', 'from-emerald-400 via-cyan-700 to-slate-950',
    4, [0.3, 1.0, 0.7, 1.0], [0.2, 0.6, 1.0, 1.0], [2, 90.0, 0.70, 0.02], [0.0, 0.85, 0.2, 0.6]),
  fx('signalInterference', 141, 'Interferencia TV', 'Ruido Estático', '📺', 'glitch', 'from-zinc-400 via-stone-700 to-black',
    4, [1.0, 1.0, 1.0, 1.0], [0.5, 0.5, 0.6, 1.0], [1, 48.0, 0.90, 0.04], [0.0, 0.5, 1.0, 0.9]),
  fx('matrixCyan', 142, 'Matrix Cian', 'Código Azul', '💻', 'glitch', 'from-cyan-300 via-sky-700 to-black',
    4, [0.15, 0.95, 1.0, 1.0], [0.05, 0.45, 0.85, 1.0], [3, 36.0, 0.80, 0.02], [0.0, 1.0, 0.5, 0.8]),
  fx('datamoshWave', 143, 'Datamosh Onda', 'Bloques Móviles', '🧩', 'glitch', 'from-fuchsia-500 via-indigo-800 to-black',
    4, [1.0, 0.25, 0.85, 1.0], [0.2, 0.9, 1.0, 1.0], [4, 20.0, 0.75, 0.06], [0.0, 0.8, 0.7, 0.8]),
  fx('scanlinePulse', 144, 'Pulso Scanline', 'Líneas Neón', '📶', 'glitch', 'from-purple-400 via-indigo-700 to-black',
    4, [0.75, 0.35, 1.0, 1.0], [0.20, 0.95, 1.0, 1.0], [2, 60.0, 0.85, 0.025], [0.5, 0.95, 0.6, 0.7]),
  fx('pixelStorm', 145, 'Tormenta Píxel', 'Mosaico Dinámico', '👾', 'glitch', 'from-lime-400 via-cyan-600 to-purple-900',
    4, [0.4, 1.0, 0.5, 1.0], [1.0, 0.3, 0.8, 1.0], [4, 34.0, 0.85, 0.05], [0.2, 0.9, 0.8, 0.9]),
  fx('neonStatic', 146, 'Estática Neón', 'Nieve Digital', '🟣', 'glitch', 'from-pink-500 via-purple-800 to-black',
    4, [1.0, 0.25, 0.75, 1.0], [0.25, 0.95, 1.0, 1.0], [1, 55.0, 0.82, 0.03], [0.3, 0.9, 0.9, 0.7]),
  fx('holoGlitch', 147, 'Holo Glitch', 'Falla Holograma', '🪩', 'glitch', 'from-teal-300 via-cyan-700 to-slate-950',
    4, [0.3, 1.0, 0.92, 1.0], [0.6, 0.4, 1.0, 1.0], [3, 28.0, 0.75, 0.035], [0.0, 0.95, 0.65, 0.7]),
  fx('bitCrushFX', 148, 'Bit Crush', 'Baja Resolución', '🧱', 'glitch', 'from-amber-400 via-rose-600 to-slate-950',
    4, [1.0, 0.75, 0.25, 1.0], [0.9, 0.2, 0.5, 1.0], [4, 28.0, 0.80, 0.04], [0.0, 0.6, 0.5, 0.8]),
  fx('chromaTear', 149, 'Desgarro RGB', 'Corte Horizontal', '✂️', 'glitch', 'from-red-500 via-cyan-500 to-black',
    4, [1.0, 0.15, 0.25, 1.0], [0.15, 0.95, 1.0, 1.0], [0, 18.0, 0.88, 0.055], [0.4, 0.85, 0.75, 0.8]),
  fx('glitchMirror', 150, 'Espejo Glitch', 'Simetría Rota', '🪞', 'glitch', 'from-sky-400 via-violet-700 to-black',
    4, [0.45, 0.85, 1.0, 1.0], [0.95, 0.35, 1.0, 1.0], [0, 16.0, 0.75, 0.04], [0.8, 0.9, 0.55, 0.9]),

  // ── 💠 LENTES Y ÓPTICA (14 tipos: 151..164) ───────────────────────────────
  // Family 5: mode 0=ZoomBlur, 1=PrismSplit, 2=FishEyeWarp, 3=WaterRipple, 4=Kaleido6
  fx('zoomBurstFX', 151, 'Zoom Explosivo', 'Desenfoque Radial', '💥', 'lens', 'from-amber-400 via-indigo-600 to-black',
    5, [1.0, 0.85, 0.5, 1.0], [0.4, 0.7, 1.0, 1.0], [0, 1.0, 0.80, 0.04], [0.0, 0.8, 0.3, 0.6]),
  fx('prismSplitFX', 152, 'Prisma Óptico', 'Refracción Arcoíris', '💎', 'lens', 'from-pink-400 via-cyan-400 to-indigo-800',
    5, [1.0, 0.4, 0.8, 1.0], [0.2, 0.9, 1.0, 1.0], [1, 1.2, 0.85, 0.028], [0.5, 0.9, 0.2, 0.7]),
  fx('fishEyePro', 153, 'Ojo de Pez Pro', 'Gran Angular', '🐟', 'lens', 'from-sky-400 via-blue-700 to-slate-950',
    5, [0.5, 0.8, 1.0, 1.0], [0.2, 0.5, 0.9, 1.0], [2, 1.0, 0.85, 0.45], [0.0, 0.5, 0.1, 0.6]),
  fx('rippleWaterFX', 154, 'Ondas en Agua', 'Reflejo Líquido', '💧', 'lens', 'from-cyan-300 via-teal-600 to-blue-950',
    5, [0.3, 0.9, 1.0, 1.0], [0.1, 0.6, 0.9, 1.0], [3, 22.0, 0.80, 0.025], [0.0, 0.7, 0.2, 0.5]),
  fx('heatWavePro', 155, 'Onda de Calor', 'Distorsión Térmica', '🏜️', 'lens', 'from-amber-400 via-orange-600 to-stone-900',
    5, [1.0, 0.65, 0.2, 1.0], [1.0, 0.35, 0.1, 1.0], [3, 16.0, 0.75, 0.022], [1.0, 0.6, 0.3, 0.7]),
  fx('tunnelWarpFX', 156, 'Túnel Hiperespacio', 'Succión Central', '🕳️', 'lens', 'from-indigo-400 via-purple-800 to-black',
    5, [0.5, 0.6, 1.0, 1.0], [0.9, 0.3, 1.0, 1.0], [0, 1.4, 0.85, 0.05], [0.5, 0.9, 0.4, 0.8]),
  fx('dreamySoftFocus', 157, 'Enfoque Soñador', 'Glow Suave', '☁️', 'lens', 'from-rose-200 via-purple-300 to-indigo-600',
    5, [1.0, 0.9, 0.95, 1.0], [0.8, 0.85, 1.0, 1.0], [0, 0.6, 0.65, 0.015], [0.0, 1.0, 0.1, 0.4]),
  fx('radialSpinFX', 158, 'Giro Radial', 'Blur Rotacional', '🌀', 'lens', 'from-emerald-400 via-teal-700 to-slate-950',
    5, [0.4, 1.0, 0.8, 1.0], [0.2, 0.6, 1.0, 1.0], [0, 1.1, 0.85, 0.035], [1.0, 0.7, 0.2, 0.7]),
  fx('mirrorKaleido6', 159, 'Caleidoscopio 6x', 'Simetría Hexagonal', '💠', 'lens', 'from-fuchsia-400 via-indigo-600 to-cyan-500',
    5, [1.0, 0.4, 0.9, 1.0], [0.2, 0.9, 1.0, 1.0], [4, 6.0, 0.85, 0.02], [0.0, 0.8, 0.2, 0.6]),
  fx('tiltShiftPro', 160, 'Miniatura Tilt', 'Desenfoque Selectivo', '🏙️', 'lens', 'from-amber-300 via-sky-500 to-slate-800',
    5, [1.0, 0.9, 0.7, 1.0], [0.5, 0.8, 1.0, 1.0], [0, 0.8, 0.75, 0.02], [0.2, 0.6, 0.1, 0.5]),
  fx('anamorphicStretch', 161, 'Lente Panavision', 'Curvatura Cine', '🎬', 'lens', 'from-slate-400 via-blue-800 to-black',
    5, [0.4, 0.7, 1.0, 1.0], [1.0, 0.8, 0.5, 1.0], [2, 0.7, 0.80, 0.28], [0.5, 0.7, 0.1, 0.5]),
  fx('glassRefract', 162, 'Cristal Biselado', 'Refracción Vidrio', '🪟', 'lens', 'from-cyan-200 via-slate-500 to-slate-900',
    5, [0.85, 0.95, 1.0, 1.0], [0.5, 0.8, 1.0, 1.0], [1, 1.5, 0.82, 0.032], [0.8, 0.85, 0.15, 0.7]),
  fx('vortexPull', 163, 'Remolino Óptico', 'Torsión Central', '🌪️', 'lens', 'from-purple-400 via-blue-700 to-black',
    5, [0.6, 0.5, 1.0, 1.0], [0.2, 0.9, 1.0, 1.0], [4, 4.0, 0.80, 0.04], [0.6, 0.75, 0.25, 0.8]),
  fx('ghostTrail', 164, 'Estela Fantasma', 'Eco Óptico', '👻', 'lens', 'from-indigo-300 via-purple-600 to-black',
    5, [0.7, 0.8, 1.0, 1.0], [1.0, 0.5, 0.9, 1.0], [1, 1.0, 0.75, 0.035], [0.3, 0.9, 0.4, 0.7]),

  // ── 🎨 ARTE Y ESTILIZADO (14 tipos: 165..178) ─────────────────────────────
  // Family 6: mode 0=ComicHalftone, 1=CelShading, 2=InkOutline, 3=DuotonePop, 4=MosaicGlass
  fx('comicHalftone', 165, 'Cómic Semitono', 'Puntos Pop', '💥', 'art', 'from-yellow-400 via-rose-500 to-blue-700',
    6, [1.0, 0.85, 0.15, 1.0], [0.95, 0.18, 0.45, 1.0], [0, 48.0, 0.85, 0.2], [0.0, 0.8, 0.0, 0.6]),
  fx('celShading', 166, 'Cel Shading', 'Estilo Anime', '🎌', 'art', 'from-sky-400 via-indigo-500 to-rose-500',
    6, [1.0, 1.0, 1.0, 1.0], [0.1, 0.1, 0.2, 1.0], [1, 5.0, 0.90, 0.3], [0.0, 0.7, 0.0, 0.5]),
  fx('inkOutline', 167, 'Tinta y Contorno', 'Dibujo Manga', '✒️', 'art', 'from-stone-200 via-stone-500 to-black',
    6, [0.96, 0.95, 0.92, 1.0], [0.06, 0.06, 0.08, 1.0], [2, 1.5, 0.88, 0.4], [0.0, 0.6, 0.0, 0.7]),
  fx('popArtCyan', 168, 'Pop Art Cian', 'Warhol Neón', '🎨', 'art', 'from-cyan-300 via-fuchsia-500 to-yellow-400',
    6, [0.10, 0.95, 1.0, 1.0], [1.0, 0.15, 0.68, 1.0], [3, 4.0, 0.90, 0.2], [0.0, 0.9, 0.0, 0.6]),
  fx('popArtGold', 169, 'Pop Art Oro', 'Póster Retro', '🖼️', 'art', 'from-amber-300 via-red-600 to-indigo-900',
    6, [1.0, 0.82, 0.18, 1.0], [0.18, 0.12, 0.55, 1.0], [3, 4.0, 0.90, 0.2], [0.0, 0.9, 0.0, 0.6]),
  fx('oilBrushPro', 170, 'Óleo Artístico', 'Pintura Clásica', '🖌️', 'art', 'from-amber-400 via-emerald-600 to-indigo-900',
    6, [1.0, 0.95, 0.85, 1.0], [0.2, 0.15, 0.1, 1.0], [1, 7.0, 0.85, 0.5], [0.2, 0.8, 0.0, 0.5]),
  fx('pastelSketch', 171, 'Boceto Pastel', 'Lápiz Suave', '🖍️', 'art', 'from-pink-200 via-sky-300 to-amber-200',
    6, [1.0, 0.92, 0.95, 1.0], [0.35, 0.32, 0.45, 1.0], [2, 1.2, 0.75, 0.25], [0.5, 0.8, 0.0, 0.4]),
  fx('stainedGlassFX', 172, 'Vitral Gótico', 'Cristal Mosaico', '⛪', 'art', 'from-rose-500 via-amber-400 to-blue-700',
    6, [1.0, 0.75, 0.2, 1.0], [0.12, 0.12, 0.16, 1.0], [4, 24.0, 0.88, 0.3], [0.0, 0.85, 0.0, 0.7]),
  fx('duotoneFireArt', 173, 'Arte Fuego Pop', 'Bicolor Ardiente', '🔥', 'art', 'from-yellow-300 via-red-600 to-black',
    6, [1.0, 0.85, 0.20, 1.0], [0.18, 0.02, 0.04, 1.0], [3, 6.0, 0.92, 0.2], [0.0, 1.0, 0.1, 0.7]),
  fx('blueprintTech', 174, 'Plano Azul', 'Blueprint Técnico', '📐', 'art', 'from-sky-300 via-blue-700 to-blue-950',
    6, [0.82, 0.95, 1.0, 1.0], [0.04, 0.18, 0.52, 1.0], [2, 1.8, 0.90, 0.5], [1.0, 0.9, 0.0, 0.8]),
  fx('charcoalSketch', 175, 'Carboncillo', 'Trazos Oscuros', '✏️', 'art', 'from-zinc-200 via-stone-500 to-zinc-900',
    6, [0.92, 0.90, 0.86, 1.0], [0.10, 0.10, 0.12, 1.0], [2, 2.0, 0.92, 0.6], [0.0, 0.5, 0.0, 0.8]),
  fx('neonEdgeArt', 176, 'Contorno Neón', 'Bordes Eléctricos', '⚡', 'art', 'from-cyan-400 via-fuchsia-600 to-black',
    6, [0.15, 0.95, 1.0, 1.0], [0.04, 0.02, 0.08, 1.0], [2, 2.4, 0.95, 0.7], [1.0, 1.2, 0.2, 0.9]),
  fx('mosaicTiles', 177, 'Azulejos Arte', 'Mosaico Cuadrado', '🟦', 'art', 'from-teal-300 via-blue-600 to-indigo-900',
    6, [0.95, 0.95, 1.0, 1.0], [0.08, 0.12, 0.20, 1.0], [4, 32.0, 0.85, 0.25], [0.0, 0.8, 0.0, 0.6]),
  fx('retroPrint', 178, 'Impresión Retro', 'Serigrafía 70s', '🖨️', 'art', 'from-orange-300 via-amber-600 to-teal-900',
    6, [1.0, 0.78, 0.42, 1.0], [0.08, 0.28, 0.32, 1.0], [0, 38.0, 0.82, 0.35], [0.3, 0.75, 0.0, 0.6]),

  // ── 🎞️ CINE RETRO Y ATMÓSFERA (12 tipos: 179..190) ────────────────────────
  // Family 7: mode 0=FilmGrain/8mm, 1=LightBurnVignette, 2=CinemaScopeBars, 3=AtmosphericFog
  fx('film16mm', 179, 'Película 16mm', 'Grano & Parpadeo', '🎞️', 'art', 'from-amber-400 via-stone-700 to-black',
    7, [1.0, 0.90, 0.75, 1.0], [0.12, 0.10, 0.08, 1.0], [0, 1.2, 0.80, 0.35], [0.0, 0.7, 0.4, 0.6]),
  fx('sepiaProjector', 180, 'Proyector Sepia', 'Cine Antiguo', '📽️', 'art', 'from-amber-300 via-yellow-800 to-stone-950',
    7, [1.0, 0.84, 0.58, 1.0], [0.18, 0.12, 0.06, 1.0], [0, 1.4, 0.85, 0.45], [0.0, 0.65, 0.6, 0.7]),
  fx('super8Warm', 181, 'Super 8 Cálido', 'Nostalgia Vintage', '📼', 'art', 'from-orange-300 via-amber-600 to-stone-900',
    7, [1.0, 0.75, 0.42, 1.0], [0.22, 0.10, 0.05, 1.0], [1, 1.0, 0.80, 0.30], [0.2, 0.85, 0.35, 0.6]),
  fx('vintageDustFX', 182, 'Polvo & Rayones', 'Celuloide Usado', '🎞️', 'art', 'from-stone-300 via-stone-600 to-black',
    7, [0.95, 0.92, 0.88, 1.0], [0.10, 0.10, 0.10, 1.0], [0, 1.8, 0.88, 0.50], [0.0, 0.6, 0.5, 0.8]),
  fx('lightBurnEdge', 183, 'Quemado de Borde', 'Fuga Película', '🔥', 'art', 'from-orange-500 via-red-700 to-black',
    7, [1.0, 0.48, 0.12, 1.0], [0.95, 0.18, 0.04, 1.0], [1, 1.2, 0.85, 0.25], [0.5, 1.0, 0.3, 0.8]),
  fx('noirVignetteFX', 184, 'Viñeta Noir', 'Sombra Dramática', '🖤', 'art', 'from-zinc-500 via-zinc-900 to-black',
    7, [0.85, 0.88, 0.92, 1.0], [0.02, 0.02, 0.04, 1.0], [1, 0.9, 0.90, 0.10], [0.0, 0.4, 0.1, 0.9]),
  fx('cinemaScope21', 185, 'CinemaScope 21:9', 'Barras + Grano', '🎬', 'art', 'from-slate-600 via-slate-900 to-black',
    7, [1.0, 0.96, 0.90, 1.0], [0.0, 0.0, 0.0, 1.0], [2, 1.0, 0.85, 0.12], [0.0, 0.6, 0.1, 0.5]),
  fx('fadedPolaroidFX', 186, 'Polaroid Lavada', 'Brillo Retro', '📸', 'art', 'from-amber-200 via-stone-500 to-teal-900',
    7, [0.96, 0.90, 0.78, 1.0], [0.15, 0.18, 0.22, 1.0], [1, 0.8, 0.75, 0.20], [0.0, 0.8, 0.1, 0.5]),
  fx('silentFilmFX', 187, 'Cine Mudo 1920', 'B&N Parpadeante', '🎩', 'art', 'from-stone-200 via-zinc-600 to-black',
    7, [0.92, 0.90, 0.86, 1.0], [0.06, 0.06, 0.06, 1.0], [0, 1.6, 0.92, 0.60], [0.0, 0.5, 0.85, 0.9]),
  fx('amberNoir', 188, 'Ámbar Nocturno', 'Cine Suspense', '🌆', 'art', 'from-amber-500 via-stone-800 to-black',
    7, [1.0, 0.68, 0.22, 1.0], [0.06, 0.04, 0.03, 1.0], [1, 1.1, 0.82, 0.18], [0.0, 0.7, 0.2, 0.7]),
  fx('foggyMorning', 189, 'Niebla Matinal', 'Bruma Suave', '🌫️', 'nature', 'from-slate-200 via-sky-300 to-slate-600',
    7, [0.88, 0.92, 0.96, 1.0], [0.55, 0.65, 0.75, 1.0], [3, 3.5, 0.75, 0.15], [0.0, 0.85, 0.1, 0.6]),
  fx('midnightMist', 190, 'Bruma Medianoche', 'Niebla Azul Oscura', '🌌', 'nature', 'from-indigo-400 via-blue-900 to-slate-950',
    7, [0.35, 0.58, 0.92, 1.0], [0.04, 0.08, 0.20, 1.0], [3, 4.2, 0.80, 0.18], [0.0, 0.80, 0.15, 0.7]),

  // ── 🔥 FUEGO Y LLAMARADAS ADICIONAL (191..204) ───────────────────────────
  fx('flameEmeraldInferno', 191, 'Infierno Esmeralda', 'Fuego Químico', '💚', 'fire', 'from-lime-400 via-emerald-600 to-black',
    1, [0.55, 1.0, 0.42, 1.0], [0.05, 0.72, 0.28, 1.0], [0, 6.0, 0.64, 0.020], [0.0, 0.95, 0.28, 0.85]),
  fx('flameCrimsonTide', 192, 'Marea Carmesí', 'Llamarada Rubí', '❤️', 'fire', 'from-rose-400 via-red-600 to-black',
    1, [1.0, 0.45, 0.42, 1.0], [0.88, 0.06, 0.14, 1.0], [1, 5.6, 0.60, 0.018], [0.0, 0.90, 0.26, 0.8]),
  fx('flameGoldEmber', 193, 'Brasas Doradas', 'Fuego Real', '👑', 'fire', 'from-yellow-200 via-amber-500 to-stone-950',
    1, [1.0, 0.94, 0.50, 1.0], [0.95, 0.52, 0.08, 1.0], [0, 5.2, 0.54, 0.015], [0.0, 1.05, 0.30, 0.75]),
  fx('flameFrostBlue', 194, 'Llama Glacial', 'Fuego Helado', '❄️', 'fire', 'from-cyan-200 via-sky-500 to-blue-950',
    1, [0.85, 0.98, 1.0, 1.0], [0.12, 0.55, 0.98, 1.0], [2, 6.4, 0.56, 0.016], [0.0, 0.95, 0.24, 0.75]),
  fx('flameCyberPink', 195, 'Fuego Cyber Rosa', 'Llama Neón', '💖', 'fire', 'from-pink-300 via-fuchsia-600 to-purple-950',
    1, [1.0, 0.60, 0.88, 1.0], [0.92, 0.12, 0.68, 1.0], [4, 6.5, 0.58, 0.016], [0.0, 1.05, 0.35, 0.8]),
  fx('flameSolarCorona', 196, 'Corona Solar', 'Explosión Estelar', '🌟', 'fire', 'from-white via-yellow-400 to-orange-700',
    1, [1.0, 0.98, 0.78, 1.0], [1.0, 0.48, 0.08, 1.0], [3, 5.8, 0.62, 0.022], [0.0, 1.20, 0.25, 0.95]),
  fx('flameHellgate', 197, 'Portal Infernal', 'Anillo de Fuego', '🔥', 'fire', 'from-orange-400 via-red-700 to-black',
    1, [1.0, 0.72, 0.22, 1.0], [0.82, 0.10, 0.04, 1.0], [4, 6.0, 0.64, 0.020], [0.0, 0.90, 0.32, 0.9]),
  fx('flameTorchWind', 198, 'Llama al Viento', 'Fuego Lateral', '🌬️', 'fire', 'from-amber-300 via-orange-600 to-stone-900',
    1, [1.0, 0.86, 0.35, 1.0], [0.95, 0.32, 0.05, 1.0], [2, 5.4, 0.55, 0.024], [0.3, 0.85, 0.40, 0.8]),
  fx('flameMeteorRain', 199, 'Lluvia de Fuego', 'Impacto Ígneo', '☄️', 'fire', 'from-yellow-300 via-red-600 to-slate-950',
    1, [1.0, 0.88, 0.42, 1.0], [0.98, 0.24, 0.05, 1.0], [5, 7.0, 0.60, 0.022], [0.8, 1.0, 0.30, 0.95]),
  fx('flameCyclone', 200, 'Ciclón de Fuego', 'Espiral Ardiente', '🌪️', 'fire', 'from-amber-400 via-orange-700 to-black',
    1, [1.0, 0.78, 0.24, 1.0], [0.90, 0.18, 0.02, 1.0], [6, 6.2, 0.62, 0.025], [1.2, 0.95, 0.35, 0.9]),
  fx('flameMagmaCrack', 201, 'Grieta de Magma', 'Lava Ardiente', '🌋', 'fire', 'from-orange-400 via-red-800 to-stone-950',
    1, [1.0, 0.62, 0.14, 1.0], [0.72, 0.08, 0.02, 1.0], [1, 4.6, 0.68, 0.018], [0.0, 0.80, 0.20, 1.0]),
  fx('flameStarCore', 202, 'Núcleo Estelar', 'Plasma Blanco', '✨', 'fire', 'from-white via-sky-300 to-indigo-900',
    1, [1.0, 1.0, 0.96, 1.0], [0.35, 0.75, 1.0, 1.0], [3, 7.4, 0.60, 0.018], [0.0, 1.25, 0.30, 0.85]),
  fx('flameToxicGreen', 203, 'Fuego Tóxico', 'Llama Ácida', '🧪', 'fire', 'from-lime-300 via-green-600 to-zinc-950',
    1, [0.78, 1.0, 0.25, 1.0], [0.18, 0.72, 0.12, 1.0], [6, 6.0, 0.58, 0.018], [-0.9, 0.95, 0.35, 0.8]),
  fx('flameShadowWisp', 204, 'Llama Sombría', 'Fuego Oscuro', '🖤', 'fire', 'from-purple-400 via-indigo-900 to-black',
    1, [0.78, 0.55, 1.0, 1.0], [0.22, 0.08, 0.45, 1.0], [5, 5.8, 0.55, 0.016], [-0.6, 0.85, 0.28, 0.75]),

  // ── 🔮 LUZ, DESTELLOS Y NEÓN ADICIONAL (205..219) ────────────────────────
  fx('anamorphicCrimson', 205, 'Anamórfico Rojo', 'Óptica Acción', '🎬', 'light', 'from-red-400 via-rose-700 to-black',
    2, [1.0, 0.22, 0.28, 1.0], [1.0, 0.68, 0.68, 1.0], [0, 1.1, 0.80, 0.0], [0.0, 1.0, 0.25, 0.6]),
  fx('anamorphicViolet', 206, 'Anamórfico Violeta', 'Óptica Sci-Fi', '🔮', 'light', 'from-violet-400 via-purple-700 to-black',
    2, [0.68, 0.35, 1.0, 1.0], [0.92, 0.78, 1.0, 1.0], [0, 1.05, 0.78, 0.0], [0.0, 1.0, 0.2, 0.55]),
  fx('anamorphicEmerald', 207, 'Anamórfico Verde', 'Óptica Matrix', '💚', 'light', 'from-emerald-300 via-teal-700 to-black',
    2, [0.20, 1.0, 0.58, 1.0], [0.78, 1.0, 0.88, 1.0], [0, 1.0, 0.76, 0.0], [0.0, 0.95, 0.2, 0.5]),
  fx('prismRainbowPro', 208, 'Prisma Arcoíris', 'Refracción Total', '🌈', 'light', 'from-pink-400 via-yellow-300 to-cyan-400',
    2, [1.0, 0.38, 0.72, 1.0], [0.22, 0.92, 1.0, 1.0], [2, 1.1, 0.88, 0.2], [0.6, 1.05, 0.25, 0.7]),
  fx('sunbeamGolden', 209, 'Rayos Dorados', 'Sol de Tarde', '☀️', 'light', 'from-amber-200 via-yellow-500 to-orange-800',
    2, [1.0, 0.88, 0.44, 1.0], [1.0, 0.60, 0.16, 1.0], [1, 1.3, 0.88, 0.0], [0.3, 0.95, 0.15, 0.85]),
  fx('neonFramePink', 210, 'Marco Neón Rosa', 'Borde Synthwave', '💗', 'light', 'from-pink-400 via-fuchsia-600 to-indigo-950',
    2, [1.0, 0.22, 0.72, 1.0], [0.35, 0.85, 1.0, 1.0], [4, 1.0, 0.88, 0.0], [0.0, 1.15, 0.35, 0.55]),
  fx('neonFrameGold', 211, 'Marco Dorado', 'Borde Lujo', '🏆', 'light', 'from-yellow-300 via-amber-500 to-stone-900',
    2, [1.0, 0.85, 0.28, 1.0], [1.0, 0.62, 0.18, 1.0], [4, 1.0, 0.84, 0.0], [0.0, 1.05, 0.2, 0.6]),
  fx('laserSweepCyan', 212, 'Barrido Cian', 'Escáner Láser', '💠', 'light', 'from-cyan-300 via-sky-600 to-slate-950',
    2, [0.15, 0.95, 1.0, 1.0], [0.55, 0.98, 1.0, 1.0], [3, 1.6, 0.82, 0.0], [0.2, 1.0, 0.35, 0.65]),
  fx('laserSweepViolet', 213, 'Barrido Violeta', 'Láser Concierto', '🟣', 'light', 'from-purple-400 via-fuchsia-700 to-black',
    2, [0.78, 0.25, 1.0, 1.0], [1.0, 0.45, 0.88, 1.0], [3, 1.9, 0.84, 0.0], [-0.2, 1.05, 0.4, 0.7]),
  fx('haloSolar', 214, 'Halo Solar', 'Corona Cálida', '🌞', 'light', 'from-yellow-200 via-orange-500 to-stone-900',
    2, [1.0, 0.90, 0.50, 1.0], [1.0, 0.52, 0.12, 1.0], [2, 1.15, 0.82, 0.0], [0.0, 0.95, 0.18, 0.8]),
  fx('haloCyber', 215, 'Halo Cyber', 'Anillo Neón', '🔵', 'light', 'from-cyan-400 via-blue-700 to-black',
    2, [0.20, 0.85, 1.0, 1.0], [0.85, 0.30, 1.0, 1.0], [2, 1.0, 0.84, 0.0], [0.0, 1.05, 0.3, 0.65]),
  fx('strobeClubGold', 216, 'Estrobo Dorado', 'Flash Fiesta', '🪩', 'light', 'from-amber-300 via-yellow-500 to-black',
    2, [1.0, 0.86, 0.36, 1.0], [1.0, 0.98, 0.85, 1.0], [5, 1.1, 0.78, 0.0], [0.0, 1.1, 0.9, 0.75]),
  fx('auroraRibbonFX', 217, 'Cinta de Aurora', 'Luz Boreal', '🌌', 'light', 'from-emerald-300 via-cyan-500 to-violet-800',
    2, [0.25, 1.0, 0.72, 1.0], [0.68, 0.35, 1.0, 1.0], [1, 1.4, 0.75, 0.1], [0.4, 0.90, 0.2, 0.7]),
  fx('candleWarmLeak', 218, 'Fuga de Vela', 'Luz Íntima', '🕯️', 'light', 'from-amber-300 via-orange-600 to-stone-950',
    2, [1.0, 0.72, 0.28, 1.0], [0.95, 0.38, 0.10, 1.0], [1, 0.95, 0.78, 0.0], [0.0, 0.85, 0.45, 0.75]),
  fx('starlightBurst', 219, 'Estallido Estelar', 'Destello Blanco', '💫', 'light', 'from-white via-amber-200 to-indigo-900',
    2, [1.0, 0.98, 0.90, 1.0], [0.65, 0.85, 1.0, 1.0], [2, 1.05, 0.94, 0.25], [0.6, 1.25, 0.35, 0.85]),

  // ── ✨ PARTÍCULAS ADICIONAL (220..234) ────────────────────────────────────
  fx('sparkleDiamond', 220, 'Brillo Diamante', 'Destellos Puros', '💎', 'particles', 'from-white via-cyan-200 to-slate-800',
    3, [1.0, 1.0, 1.0, 1.0], [0.65, 0.92, 1.0, 1.0], [3, 24.0, 0.78, 0.15], [0.0, 1.25, 0.6, 0.8]),
  fx('emberFloatGold', 221, 'Brasas Flotantes', 'Chispas Doradas', '🔥', 'particles', 'from-amber-300 via-orange-600 to-black',
    3, [1.0, 0.82, 0.28, 1.0], [1.0, 0.42, 0.08, 1.0], [1, 22.0, 0.74, 0.28], [0.15, 1.1, 0.45, 0.85]),
  fx('cyberDustCyan', 222, 'Polvo Cyber', 'Partículas Cian', '💠', 'particles', 'from-cyan-300 via-blue-700 to-black',
    3, [0.25, 0.95, 1.0, 1.0], [0.45, 0.65, 1.0, 1.0], [3, 28.0, 0.76, 0.22], [0.0, 1.05, 0.4, 0.75]),
  fx('neonConfetti', 223, 'Confeti Neón', 'Fiesta Vibrante', '🎉', 'particles', 'from-fuchsia-400 via-yellow-400 to-cyan-400',
    3, [1.0, 0.28, 0.78, 1.0], [0.25, 0.95, 1.0, 1.0], [0, 18.0, 0.72, 0.38], [0.2, 1.0, 0.35, 0.8]),
  fx('plasmaOrbs', 224, 'Orbes de Plasma', 'Esferas Energía', '🔮', 'particles', 'from-violet-300 via-purple-600 to-indigo-950',
    3, [0.78, 0.45, 1.0, 1.0], [0.35, 0.85, 1.0, 1.0], [3, 14.0, 0.68, 0.25], [0.0, 1.15, 0.35, 0.85]),
  fx('sakuraDrift', 225, 'Brisa Sakura', 'Pétalos Flotando', '🌸', 'particles', 'from-pink-200 via-rose-400 to-rose-900',
    3, [1.0, 0.72, 0.84, 1.0], [1.0, 0.45, 0.62, 1.0], [0, 16.0, 0.65, 0.42], [0.4, 0.80, 0.2, 0.7]),
  fx('magicSporesViolet', 226, 'Esporas Mágicas', 'Polvo Violeta', '✨', 'particles', 'from-purple-300 via-fuchsia-600 to-black',
    3, [0.88, 0.55, 1.0, 1.0], [1.0, 0.42, 0.88, 1.0], [1, 20.0, 0.70, 0.30], [-0.1, 1.1, 0.5, 0.8]),
  fx('starDustGold', 227, 'Polvo Estelar Oro', 'Cielo Dorado', '🌟', 'particles', 'from-yellow-200 via-amber-500 to-stone-950',
    3, [1.0, 0.92, 0.55, 1.0], [1.0, 0.72, 0.22, 1.0], [3, 26.0, 0.76, 0.20], [0.05, 1.15, 0.45, 0.75]),
  fx('electricFireflies', 228, 'Luciérnagas Eléctricas', 'Chispas Azules', '⚡', 'particles', 'from-sky-300 via-blue-600 to-black',
    3, [0.45, 0.88, 1.0, 1.0], [0.75, 0.45, 1.0, 1.0], [1, 18.0, 0.68, 0.34], [0.0, 1.2, 0.65, 0.85]),
  fx('prismBubbles', 229, 'Burbujas Prisma', 'Esferas Arcoíris', '🫧', 'particles', 'from-pink-300 via-cyan-300 to-indigo-900',
    3, [0.65, 0.95, 1.0, 1.0], [1.0, 0.55, 0.88, 1.0], [3, 15.0, 0.64, 0.28], [0.0, 0.95, 0.3, 0.8]),
  fx('laserSparksRed', 230, 'Chispas Láser', 'Energía Roja', '🔴', 'particles', 'from-red-400 via-rose-700 to-black',
    3, [1.0, 0.32, 0.32, 1.0], [1.0, 0.65, 0.20, 1.0], [1, 32.0, 0.82, 0.28], [0.25, 1.2, 0.55, 0.9]),
  fx('snowflakesSoft', 231, 'Copos Suaves', 'Nieve Ligera', '❄️', 'particles', 'from-white via-sky-200 to-slate-700',
    3, [0.98, 0.99, 1.0, 1.0], [0.78, 0.90, 1.0, 1.0], [0, 20.0, 0.72, 0.30], [0.2, 0.85, 0.15, 0.75]),
  fx('glitterRain', 232, 'Lluvia de Glitter', 'Cascada Brillo', '✨', 'particles', 'from-amber-200 via-pink-400 to-purple-900',
    3, [1.0, 0.88, 0.62, 1.0], [1.0, 0.58, 0.88, 1.0], [2, 30.0, 0.80, 0.16], [0.1, 1.2, 0.5, 0.9]),
  fx('quantumParticles', 233, 'Partículas Cuánticas', 'Flujo Subatómico', '⚛️', 'particles', 'from-teal-300 via-cyan-600 to-slate-950',
    3, [0.30, 1.0, 0.88, 1.0], [0.35, 0.68, 1.0, 1.0], [3, 28.0, 0.78, 0.22], [-0.15, 1.1, 0.45, 0.8]),
  fx('fairyDust', 234, 'Polvo de Hadas', 'Magia Dorada', '🧚', 'particles', 'from-lime-200 via-amber-300 to-emerald-900',
    3, [0.92, 1.0, 0.65, 1.0], [1.0, 0.82, 0.45, 1.0], [1, 22.0, 0.70, 0.32], [0.05, 1.15, 0.55, 0.8]),

  // ── 🌤️ CLIMA Y NATURALEZA ADICIONAL (235..248) ────────────────────────────
  fx('blizzardArctic', 235, 'Ventisca Ártica', 'Viento y Nieve', '🌨️', 'nature', 'from-sky-100 via-slate-400 to-slate-900',
    3, [0.94, 0.98, 1.0, 1.0], [0.65, 0.82, 0.96, 1.0], [0, 32.0, 0.86, 0.38], [0.65, 0.85, 0.25, 1.0]),
  fx('tropicalRainFX', 236, 'Lluvia Tropical', 'Aguacero Intenso', '🌧️', 'nature', 'from-cyan-300 via-teal-700 to-slate-950',
    3, [0.72, 0.92, 1.0, 1.0], [0.42, 0.75, 0.90, 1.0], [2, 40.0, 0.88, 0.10], [0.22, 0.85, 0.2, 1.0]),
  fx('monsoonWind', 237, 'Viento Monzón', 'Lluvia Diagonal', '⛈️', 'nature', 'from-slate-300 via-blue-800 to-zinc-950',
    3, [0.80, 0.88, 0.98, 1.0], [0.48, 0.62, 0.82, 1.0], [2, 36.0, 0.85, 0.14], [0.48, 0.80, 0.3, 1.0]),
  fx('desertSandstormFX', 238, 'Tormenta Arena', 'Polvo Dorado', '🏜️', 'nature', 'from-amber-300 via-orange-600 to-stone-900',
    7, [0.95, 0.76, 0.44, 1.0], [0.68, 0.42, 0.18, 1.0], [3, 4.0, 0.82, 0.22], [0.4, 0.75, 0.2, 0.75]),
  fx('volcanicAshFX', 239, 'Ceniza Volcánica', 'Nube Oscura', '🌋', 'nature', 'from-stone-400 via-zinc-700 to-red-950',
    3, [0.70, 0.66, 0.64, 1.0], [0.95, 0.35, 0.10, 1.0], [0, 24.0, 0.78, 0.40], [0.4, 0.70, 0.3, 0.85]),
  fx('mistyForestFX', 240, 'Bosque Brumoso', 'Niebla Verde', '🌲', 'nature', 'from-emerald-200 via-teal-600 to-slate-900',
    7, [0.68, 0.92, 0.80, 1.0], [0.16, 0.42, 0.34, 1.0], [3, 3.2, 0.76, 0.16], [0.0, 0.80, 0.1, 0.65]),
  fx('iceCrystalEdge', 241, 'Borde Escarcha', 'Hielo Polar', '🧊', 'nature', 'from-cyan-100 via-sky-400 to-blue-900',
    7, [0.85, 0.96, 1.0, 1.0], [0.32, 0.68, 0.95, 1.0], [1, 1.1, 0.82, 0.18], [0.0, 0.85, 0.1, 0.7]),
  fx('autumnBreezeFX', 242, 'Brisa Otoñal', 'Hojas Cálidas', '🍁', 'nature', 'from-orange-300 via-amber-600 to-stone-900',
    3, [1.0, 0.62, 0.18, 1.0], [0.90, 0.32, 0.12, 1.0], [0, 16.0, 0.66, 0.44], [0.55, 0.80, 0.2, 0.75]),
  fx('oceanMistFX', 243, 'Bruma Oceánica', 'Rocío Marino', '🌊', 'nature', 'from-cyan-200 via-sky-600 to-blue-950',
    7, [0.75, 0.94, 1.0, 1.0], [0.18, 0.48, 0.72, 1.0], [3, 3.6, 0.78, 0.16], [0.0, 0.82, 0.12, 0.65]),
  fx('twilightFogFX', 244, 'Niebla Crepúsculo', 'Bruma Violeta', '🌆', 'nature', 'from-purple-300 via-indigo-700 to-slate-950',
    7, [0.78, 0.65, 0.95, 1.0], [0.22, 0.14, 0.45, 1.0], [3, 3.8, 0.80, 0.18], [0.0, 0.80, 0.12, 0.68]),
  fx('goldenPollenFX', 245, 'Polen Dorado', 'Luz de Primavera', '🌼', 'nature', 'from-yellow-200 via-amber-400 to-lime-800',
    3, [1.0, 0.92, 0.45, 1.0], [0.85, 0.95, 0.45, 1.0], [3, 18.0, 0.68, 0.26], [0.15, 1.05, 0.4, 0.75]),
  fx('stormLightningFX', 246, 'Tormenta Eléctrica', 'Relámpagos', '🌩️', 'nature', 'from-sky-200 via-indigo-700 to-black',
    2, [0.82, 0.92, 1.0, 1.0], [0.35, 0.55, 1.0, 1.0], [5, 1.2, 0.82, 0.0], [0.0, 1.1, 0.95, 0.85]),
  fx('auroraMistFX', 247, 'Bruma Boreal', 'Niebla Esmeralda', '🌌', 'nature', 'from-emerald-300 via-teal-700 to-indigo-950',
    7, [0.42, 0.96, 0.78, 1.0], [0.10, 0.28, 0.48, 1.0], [3, 4.0, 0.80, 0.18], [0.0, 0.85, 0.15, 0.7]),
  fx('sunsetHazeFX', 248, 'Bruma de Ocaso', 'Calima Dorada', '🌅', 'nature', 'from-amber-300 via-rose-500 to-purple-900',
    7, [1.0, 0.70, 0.42, 1.0], [0.55, 0.22, 0.35, 1.0], [3, 3.4, 0.76, 0.16], [0.0, 0.85, 0.1, 0.65]),

  // ── ⚡ GLITCH, VHS Y CYBER ADICIONAL (249..262) ─────────────────────────
  fx('glitchHyperRGB', 249, 'Hiper Glitch RGB', 'Desfase Extremo', '⚡', 'glitch', 'from-red-500 via-cyan-400 to-fuchsia-600',
    4, [1.0, 0.18, 0.35, 1.0], [0.15, 0.95, 1.0, 1.0], [0, 28.0, 0.85, 0.055], [0.2, 0.9, 0.75, 0.85]),
  fx('vhsTapeWarp', 250, 'Cinta VHS Gastada', 'Distorsión Analógica', '📼', 'glitch', 'from-amber-400 via-stone-600 to-cyan-700',
    4, [0.95, 0.88, 0.78, 1.0], [0.35, 0.75, 0.95, 1.0], [1, 36.0, 0.86, 0.048], [0.0, 0.65, 0.75, 0.85]),
  fx('crtPhosphorGreen', 251, 'CRT Fósforo Verde', 'Monitor Hacker', '🖥️', 'glitch', 'from-emerald-400 via-green-700 to-black',
    4, [0.22, 1.0, 0.45, 1.0], [0.10, 0.65, 0.25, 1.0], [2, 85.0, 0.78, 0.02], [0.0, 0.9, 0.25, 0.7]),
  fx('crtAmberTerminal', 252, 'Terminal Ámbar', 'CRT Retro 80s', '📟', 'glitch', 'from-amber-400 via-orange-700 to-black',
    4, [1.0, 0.72, 0.20, 1.0], [0.85, 0.45, 0.10, 1.0], [2, 80.0, 0.76, 0.02], [0.0, 0.85, 0.25, 0.7]),
  fx('matrixCrimson', 253, 'Matrix Carmesí', 'Código Rojo', '🔺', 'glitch', 'from-rose-400 via-red-700 to-black',
    4, [1.0, 0.22, 0.30, 1.0], [0.68, 0.08, 0.14, 1.0], [3, 38.0, 0.82, 0.025], [0.0, 1.0, 0.55, 0.8]),
  fx('matrixGold', 254, 'Matrix Dorado', 'Código Oro', '🟡', 'glitch', 'from-yellow-300 via-amber-600 to-black',
    4, [1.0, 0.86, 0.28, 1.0], [0.75, 0.52, 0.10, 1.0], [3, 34.0, 0.80, 0.022], [0.0, 1.0, 0.5, 0.8]),
  fx('datamoshBlock', 255, 'Bloques Datamosh', 'Compresión Rota', '🧱', 'glitch', 'from-fuchsia-400 via-cyan-500 to-slate-950',
    4, [0.95, 0.28, 0.88, 1.0], [0.22, 0.92, 1.0, 1.0], [4, 24.0, 0.82, 0.065], [0.0, 0.85, 0.75, 0.85]),
  fx('cyberScanViolet', 256, 'Escáner Violeta', 'Líneas Cyber', '👾', 'glitch', 'from-violet-400 via-purple-700 to-black',
    4, [0.78, 0.32, 1.0, 1.0], [0.25, 0.88, 1.0, 1.0], [2, 68.0, 0.84, 0.028], [0.4, 0.95, 0.55, 0.75]),
  fx('staticSnowTV', 257, 'Nieve Analógica', 'Sin Señal TV', '📺', 'glitch', 'from-zinc-300 via-zinc-600 to-black',
    4, [1.0, 1.0, 1.0, 1.0], [0.6, 0.6, 0.65, 1.0], [1, 56.0, 0.92, 0.045], [0.0, 0.55, 1.0, 0.92]),
  fx('rgbSplitJitter', 258, 'Temblor RGB', 'Vibración Cromática', '💥', 'glitch', 'from-rose-500 via-sky-500 to-black',
    4, [1.0, 0.25, 0.25, 1.0], [0.25, 0.85, 1.0, 1.0], [0, 14.0, 0.84, 0.038], [0.9, 0.8, 0.65, 0.65]),
  fx('holoProjectionFX', 259, 'Holograma Azul', 'Proyección Sci-Fi', '🛸', 'glitch', 'from-cyan-300 via-blue-600 to-indigo-950',
    4, [0.35, 0.92, 1.0, 1.0], [0.18, 0.55, 0.98, 1.0], [3, 30.0, 0.78, 0.03], [0.0, 0.95, 0.55, 0.72]),
  fx('pixelMosaicGlitch', 260, 'Mosaico Glitch', 'Píxeles Corruptos', '🟩', 'glitch', 'from-lime-400 via-teal-600 to-black',
    4, [0.45, 1.0, 0.45, 1.0], [0.95, 0.30, 0.78, 1.0], [4, 38.0, 0.86, 0.055], [0.3, 0.9, 0.8, 0.88]),
  fx('signalDropFX', 261, 'Caída de Señal', 'Corte Digital', '📡', 'glitch', 'from-red-500 via-stone-800 to-black',
    4, [1.0, 0.30, 0.35, 1.0], [0.30, 0.90, 0.95, 1.0], [1, 44.0, 0.88, 0.05], [0.2, 0.75, 0.9, 0.85]),
  fx('neonWaveGlitch', 262, 'Onda Glitch Neón', 'Falla Synthwave', '🌊', 'glitch', 'from-pink-500 via-purple-700 to-cyan-500',
    4, [1.0, 0.25, 0.78, 1.0], [0.18, 0.95, 1.0, 1.0], [0, 20.0, 0.82, 0.045], [0.7, 0.95, 0.6, 0.78]),

  // ── 💠 LENTES Y ÓPTICA ADICIONAL (263..276) ─────────────────────────────
  fx('zoomWarpSpeed', 263, 'Velocidad Warp', 'Zoom Hiperespacio', '🚀', 'lens', 'from-sky-400 via-indigo-700 to-black',
    5, [0.55, 0.85, 1.0, 1.0], [0.95, 0.55, 1.0, 1.0], [0, 1.35, 0.86, 0.05], [0.2, 0.9, 0.35, 0.75]),
  fx('prismTripleSplit', 264, 'Triple Prisma', 'Dispersión Óptica', '🔺', 'lens', 'from-rose-400 via-emerald-400 to-blue-600',
    5, [1.0, 0.35, 0.75, 1.0], [0.20, 0.95, 1.0, 1.0], [1, 1.4, 0.88, 0.034], [0.6, 0.95, 0.25, 0.75]),
  fx('fisheyeUltra', 265, 'Ojo de Pez Ultra', 'Curvatura Extrema', '🐡', 'lens', 'from-cyan-400 via-blue-700 to-slate-950',
    5, [0.55, 0.85, 1.0, 1.0], [0.25, 0.55, 0.95, 1.0], [2, 1.25, 0.88, 0.55], [0.0, 0.55, 0.1, 0.65]),
  fx('liquidRipplePro', 266, 'Onda Líquida Pro', 'Superficie de Agua', '💧', 'lens', 'from-teal-300 via-cyan-600 to-blue-950',
    5, [0.35, 0.92, 1.0, 1.0], [0.15, 0.65, 0.95, 1.0], [3, 26.0, 0.84, 0.028], [0.2, 0.75, 0.25, 0.6]),
  fx('heatDistortDesert', 267, 'Calor del Desierto', 'Espejismo Ondulante', '🌵', 'lens', 'from-yellow-300 via-orange-600 to-stone-900',
    5, [1.0, 0.72, 0.25, 1.0], [1.0, 0.40, 0.12, 1.0], [3, 18.0, 0.78, 0.025], [1.1, 0.65, 0.35, 0.75]),
  fx('kaleidoOctagon', 268, 'Caleidoscopio 8x', 'Espejo Octogonal', '❄️', 'lens', 'from-violet-400 via-fuchsia-600 to-cyan-500',
    5, [1.0, 0.45, 0.92, 1.0], [0.25, 0.92, 1.0, 1.0], [4, 8.0, 0.88, 0.022], [0.2, 0.85, 0.2, 0.65]),
  fx('softDreamHalo', 269, 'Halo de Ensueño', 'Difusión Suave', '☁️', 'lens', 'from-pink-200 via-amber-200 to-purple-500',
    5, [1.0, 0.92, 0.96, 1.0], [0.88, 0.90, 1.0, 1.0], [0, 0.65, 0.70, 0.018], [0.0, 1.05, 0.1, 0.45]),
  fx('spinBlurVortex', 270, 'Giro Vórtice', 'Rotación Dinámica', '🌀', 'lens', 'from-cyan-400 via-indigo-700 to-black',
    5, [0.45, 0.95, 1.0, 1.0], [0.35, 0.65, 1.0, 1.0], [0, 1.2, 0.86, 0.042], [1.2, 0.75, 0.25, 0.75]),
  fx('anamorphicCinema', 271, 'Óptica Anamórfica', 'Lente Panorámica', '🎥', 'lens', 'from-slate-300 via-blue-700 to-black',
    5, [0.45, 0.75, 1.0, 1.0], [1.0, 0.82, 0.55, 1.0], [2, 0.75, 0.82, 0.30], [0.4, 0.75, 0.1, 0.55]),
  fx('crystalRefractFX', 272, 'Refracción Cristal', 'Biselado Óptico', '💎', 'lens', 'from-sky-200 via-indigo-400 to-slate-900',
    5, [0.88, 0.96, 1.0, 1.0], [0.55, 0.82, 1.0, 1.0], [1, 1.6, 0.84, 0.035], [0.9, 0.90, 0.18, 0.72]),
  fx('tunnelHyperspace', 273, 'Túnel Cuántico', 'Profundidad Central', '🕳️', 'lens', 'from-fuchsia-400 via-indigo-800 to-black',
    5, [0.58, 0.65, 1.0, 1.0], [0.95, 0.35, 1.0, 1.0], [0, 1.5, 0.88, 0.055], [0.6, 0.95, 0.45, 0.85]),
  fx('ghostEchoRGB', 274, 'Eco Fantasma', 'Doble Exposición', '👻', 'lens', 'from-rose-300 via-purple-600 to-cyan-700',
    5, [1.0, 0.55, 0.88, 1.0], [0.35, 0.92, 1.0, 1.0], [1, 1.1, 0.78, 0.038], [0.4, 0.92, 0.42, 0.72]),
  fx('tiltShiftMacro', 275, 'Macro Tilt-Shift', 'Enfoque Maqueta', '🏙️', 'lens', 'from-amber-200 via-sky-500 to-slate-800',
    5, [1.0, 0.92, 0.75, 1.0], [0.55, 0.82, 1.0, 1.0], [0, 0.85, 0.78, 0.022], [0.2, 0.65, 0.1, 0.52]),
  fx('radialShockwave', 276, 'Onda de Choque', 'Pulso Expansivo', '💥', 'lens', 'from-orange-400 via-rose-600 to-indigo-950',
    5, [1.0, 0.75, 0.35, 1.0], [0.95, 0.32, 0.55, 1.0], [3, 20.0, 0.86, 0.036], [0.5, 0.85, 0.35, 0.78]),

  // ── 🎨 ARTE Y CINE RETRO ADICIONAL (277..290) ───────────────────────────
  fx('comicPopCyan', 277, 'Cómic Pop Cian', 'Trama Puntos', '💬', 'art', 'from-cyan-300 via-rose-500 to-yellow-400',
    6, [0.15, 0.92, 1.0, 1.0], [1.0, 0.20, 0.52, 1.0], [0, 52.0, 0.86, 0.22], [0.0, 0.85, 0.0, 0.65]),
  fx('animeCelPro', 278, 'Anime Cel Pro', 'Sombreado Plano', '🎌', 'art', 'from-sky-400 via-purple-500 to-pink-500',
    6, [1.0, 1.0, 1.0, 1.0], [0.12, 0.10, 0.22, 1.0], [1, 6.0, 0.92, 0.32], [0.0, 0.75, 0.0, 0.55]),
  fx('mangaInkPro', 279, 'Tinta Manga Pro', 'Blanco y Negro', '✒️', 'art', 'from-white via-stone-400 to-black',
    6, [0.98, 0.97, 0.95, 1.0], [0.04, 0.04, 0.06, 1.0], [2, 1.8, 0.90, 0.45], [0.0, 0.65, 0.0, 0.75]),
  fx('warholNeon', 280, 'Warhol Neón', 'Serigrafía Pop', '🎨', 'art', 'from-yellow-300 via-fuchsia-500 to-cyan-400',
    6, [1.0, 0.88, 0.18, 1.0], [0.95, 0.14, 0.72, 1.0], [3, 4.5, 0.92, 0.22], [0.0, 0.95, 0.0, 0.65]),
  fx('oilImpastoFX', 281, 'Óleo Impasto', 'Pincelada Gruesa', '🖌️', 'art', 'from-amber-400 via-teal-600 to-indigo-900',
    6, [1.0, 0.95, 0.88, 1.0], [0.22, 0.16, 0.12, 1.0], [1, 8.0, 0.86, 0.52], [0.2, 0.82, 0.0, 0.55]),
  fx('stainedGlassPro', 282, 'Vitral Catedral', 'Mosaico Color', '⛪', 'art', 'from-rose-500 via-amber-400 to-indigo-700',
    6, [1.0, 0.78, 0.25, 1.0], [0.10, 0.10, 0.14, 1.0], [4, 26.0, 0.90, 0.32], [0.0, 0.88, 0.0, 0.72]),
  fx('blueprintCyan', 283, 'Plano Arquitecto', 'Trazado Técnico', '📐', 'art', 'from-cyan-200 via-blue-700 to-blue-950',
    6, [0.85, 0.96, 1.0, 1.0], [0.03, 0.16, 0.48, 1.0], [2, 2.0, 0.92, 0.52], [1.0, 0.92, 0.0, 0.82]),
  fx('charcoalNoirFX', 284, 'Carboncillo Noir', 'Boceto Oscuro', '✏️', 'art', 'from-stone-200 via-zinc-600 to-black',
    6, [0.94, 0.92, 0.88, 1.0], [0.08, 0.08, 0.10, 1.0], [2, 2.2, 0.94, 0.62], [0.0, 0.55, 0.0, 0.82]),
  fx('neonOutlinePro', 285, 'Borde Neón Pro', 'Contorno Láser', '⚡', 'art', 'from-fuchsia-400 via-cyan-500 to-black',
    6, [0.18, 0.96, 1.0, 1.0], [0.04, 0.02, 0.08, 1.0], [2, 2.6, 0.96, 0.72], [1.0, 1.25, 0.25, 0.92]),
  fx('mosaicArtTiles', 286, 'Teselas Arte', 'Mosaico Fino', '🟦', 'art', 'from-sky-300 via-indigo-600 to-purple-900',
    6, [0.96, 0.96, 1.0, 1.0], [0.08, 0.12, 0.22, 1.0], [4, 36.0, 0.86, 0.26], [0.0, 0.82, 0.0, 0.62]),
  fx('film35mmGrain', 287, 'Película 35mm', 'Grano Orgánico', '🎞️', 'art', 'from-amber-300 via-stone-700 to-black',
    7, [1.0, 0.92, 0.80, 1.0], [0.12, 0.10, 0.08, 1.0], [0, 1.3, 0.82, 0.38], [0.0, 0.72, 0.42, 0.62]),
  fx('super8SepiaFX', 288, 'Super 8 Sepia', 'Proyector Dorado', '📽️', 'art', 'from-amber-200 via-yellow-800 to-stone-950',
    7, [1.0, 0.82, 0.54, 1.0], [0.20, 0.12, 0.05, 1.0], [0, 1.5, 0.86, 0.48], [0.0, 0.68, 0.62, 0.72]),
  fx('cinemaScopeGold', 289, 'Scope 21:9 Oro', 'Barras + Tinte', '🎬', 'art', 'from-amber-400 via-stone-800 to-black',
    7, [1.0, 0.88, 0.65, 1.0], [0.04, 0.03, 0.02, 1.0], [2, 1.0, 0.86, 0.12], [0.0, 0.65, 0.12, 0.55]),
  fx('vintageBurnRed', 290, 'Quemado Carmesí', 'Fuga Celuloide', '🔥', 'art', 'from-red-500 via-orange-700 to-black',
    7, [1.0, 0.38, 0.18, 1.0], [0.92, 0.14, 0.06, 1.0], [1, 1.25, 0.86, 0.26], [0.5, 1.0, 0.32, 0.82]),
];

export const PARAMETRIC_EFFECT_MAP: Readonly<Record<string, ParametricEffectMeta>> =
  Object.fromEntries(PARAMETRIC_EFFECT_LIST.map((f) => [f.id, f]));

export const PARAMETRIC_EFFECT_IDS: Readonly<Record<string, number>> =
  Object.fromEntries(PARAMETRIC_EFFECT_LIST.map((f) => [f.id, f.numericId]));
