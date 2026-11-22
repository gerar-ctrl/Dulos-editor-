// ============================================================================
// TransitionsTab - Studio GLSL Transitions & Real-Time GPU Visual FX
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  VideoClip,
  TransitionType,
  VisualEffectType,
} from '../../../types/editor';
import { useEditorStore } from '../../../store/useEditorStore';
import { globalAudioEngine } from '../../../core/audio/AudioEngine';
import {
  Layers,
  Wand2,
  Play,
  CheckCheck,
  Scissors,
  RotateCcw,
} from 'lucide-react';
import { HorizontalScrollRow } from '../../Editor/HorizontalScrollRow';
import {
  PARAMETRIC_EFFECT_LIST,
  FxCategory,
} from '../../../core/webgl/parametricEffects';

interface TransitionsTabProps {
  clip: VideoClip;
  initialSubTab?: 'transitions' | 'fx';
}

type TransCategory = 'all' | 'camera' | 'light' | '3d' | 'glitch' | 'wipe';

const TRANSITION_LIST: readonly {
  id: TransitionType;
  label: string;
  badge: string;
  category: TransCategory;
  gradient: string;
  icon: string;
}[] = [
    {
      id: 'none',
      label: 'Sin Transición',
      badge: 'Corte directo',
      category: 'all',
      gradient: 'from-slate-800 to-slate-900',
      icon: '⊘',
    },
    {
      id: 'zoomInBlur',
      label: 'Zoom In Radial',
      badge: 'Cámara Pro',
      category: 'camera',
      gradient: 'from-indigo-600 to-cyan-500',
      icon: '🔍',
    },
    {
      id: 'zoomOutBounce',
      label: 'Zoom Out Rebote',
      badge: 'Impacto',
      category: 'camera',
      gradient: 'from-blue-600 to-indigo-600',
      icon: '🎯',
    },
    {
      id: 'whipPanLeft',
      label: 'Whip Pan Izquierda',
      badge: 'Blur Rápido',
      category: 'camera',
      gradient: 'from-violet-600 to-fuchsia-600',
      icon: '💨',
    },
    {
      id: 'whipPanRight',
      label: 'Whip Pan Derecha',
      badge: 'Blur Rápido',
      category: 'camera',
      gradient: 'from-fuchsia-600 to-pink-600',
      icon: '⏩',
    },
    {
      id: 'whipPanUp',
      label: 'Whip Pan Vertical',
      badge: 'Blur Arriba',
      category: 'camera',
      gradient: 'from-purple-600 to-indigo-600',
      icon: '🚀',
    },
    {
      id: 'spinTransition',
      label: 'Giro Vórtice 360°',
      badge: 'Rotación',
      category: 'camera',
      gradient: 'from-cyan-600 to-blue-700',
      icon: '🌀',
    },
    {
      id: 'shakeImpact',
      label: 'Impacto Terremoto',
      badge: 'Acción RGB',
      category: 'camera',
      gradient: 'from-rose-600 to-orange-600',
      icon: '💥',
    },
    {
      id: 'crossDissolve',
      label: 'Disolución Suave',
      badge: 'Cine S-Curve',
      category: 'light',
      gradient: 'from-slate-600 to-indigo-600',
      icon: '✨',
    },
    {
      id: 'filmBurn',
      label: 'Quema de Película',
      badge: 'Light Leak',
      category: 'light',
      gradient: 'from-amber-500 to-rose-600',
      icon: '🔥',
    },
    {
      id: 'flashWhite',
      label: 'Flash Fotográfico',
      badge: 'Bloom Blanco',
      category: 'light',
      gradient: 'from-amber-300 to-sky-400',
      icon: '⚡',
    },
    {
      id: 'flashBlack',
      label: 'Fundido a Negro',
      badge: 'Dip to Black',
      category: 'light',
      gradient: 'from-zinc-700 to-black',
      icon: '🌑',
    },
    {
      id: 'lumaFade',
      label: 'Fusión Luminosa',
      badge: 'Luma Melt',
      category: 'light',
      gradient: 'from-yellow-500 to-purple-600',
      icon: '☀️',
    },
    {
      id: 'dreamy',
      label: 'Ensueño Suave',
      badge: 'Dreamy Wave',
      category: 'light',
      gradient: 'from-pink-500 to-violet-600',
      icon: '🌸',
    },
    {
      id: 'cube3D',
      label: 'Cubo 3D Real',
      badge: 'Perspectiva 3D',
      category: '3d',
      gradient: 'from-emerald-600 to-teal-700',
      icon: '🧊',
    },
    {
      id: 'rotate3D',
      label: 'Volteo Tarjeta 3D',
      badge: 'Flip 3D',
      category: '3d',
      gradient: 'from-teal-600 to-cyan-700',
      icon: '🔄',
    },
    {
      id: 'slidePush',
      label: 'Empuje de Escena',
      badge: 'Slide Push',
      category: '3d',
      gradient: 'from-blue-600 to-cyan-600',
      icon: '➡️',
    },
    {
      id: 'circleOpen',
      label: 'Iris Circular',
      badge: 'Apertura',
      category: '3d',
      gradient: 'from-indigo-500 to-purple-700',
      icon: '⭕',
    },
    {
      id: 'diamondOpen',
      label: 'Apertura Diamante',
      badge: 'Geométrico',
      category: '3d',
      gradient: 'from-fuchsia-500 to-indigo-700',
      icon: '💎',
    },
    {
      id: 'clockWipe',
      label: 'Barrido Reloj',
      badge: 'Radial 360°',
      category: '3d',
      gradient: 'from-sky-600 to-indigo-700',
      icon: '🕒',
    },
    {
      id: 'blinds',
      label: 'Persianas Venecianas',
      badge: 'Franjas',
      category: '3d',
      gradient: 'from-slate-600 to-cyan-700',
      icon: '🪟',
    },
    {
      id: 'directionalWipe',
      label: 'Barrido Izq → Der',
      badge: 'Wipe Suave',
      category: '3d',
      gradient: 'from-indigo-600 to-blue-800',
      icon: '▶️',
    },
    {
      id: 'wipeRight',
      label: 'Barrido Der → Izq',
      badge: 'Wipe Suave',
      category: '3d',
      gradient: 'from-blue-800 to-indigo-600',
      icon: '◀️',
    },
    {
      id: 'wipeUp',
      label: 'Barrido Vertical',
      badge: 'Wipe Arriba',
      category: '3d',
      gradient: 'from-violet-700 to-indigo-600',
      icon: '🔼',
    },
    {
      id: 'glitch',
      label: 'Glitch Cyberpunk',
      badge: 'Distorsión RGB',
      category: 'glitch',
      gradient: 'from-pink-600 via-purple-600 to-cyan-500',
      icon: '👾',
    },
    {
      id: 'liquidWave',
      label: 'Onda Líquida',
      badge: 'Refracción',
      category: 'glitch',
      gradient: 'from-cyan-500 to-blue-600',
      icon: '🌊',
    },
    {
      id: 'pixelate',
      label: 'Mosaico Digital',
      badge: 'Pixel 8-Bit',
      category: 'glitch',
      gradient: 'from-emerald-500 to-lime-600',
      icon: '🧱',
    },
    {
      id: 'whipPanDown',
      label: 'Whip Pan Abajo',
      badge: 'Blur Abajo',
      category: 'camera',
      gradient: 'from-indigo-600 to-purple-700',
      icon: '⬇️',
    },
    {
      id: 'zoomOutBlur',
      label: 'Zoom Out Radial',
      badge: 'Óptico',
      category: 'camera',
      gradient: 'from-sky-600 to-indigo-700',
      icon: '🔭',
    },
    {
      id: 'swirlWarp',
      label: 'Remolino Espacial',
      badge: 'Swirl',
      category: 'camera',
      gradient: 'from-teal-500 to-indigo-600',
      icon: '🌪️',
    },
    {
      id: 'dollyZoom',
      label: 'Efecto Vértigo',
      badge: 'Dolly Zoom',
      category: 'camera',
      gradient: 'from-amber-600 to-rose-600',
      icon: '🎥',
    },
    {
      id: 'shakeZoom',
      label: 'Impacto Zoom + Shake',
      badge: 'Acción',
      category: 'camera',
      gradient: 'from-red-600 to-orange-600',
      icon: '⚡',
    },
    {
      id: 'lensWarp',
      label: 'Ojo de Pez Warp',
      badge: 'Gran Angular',
      category: 'camera',
      gradient: 'from-cyan-600 to-blue-800',
      icon: '🐟',
    },
    {
      id: 'lightLeak',
      label: 'Fuga de Luz Dorada',
      badge: 'Light Leak',
      category: 'light',
      gradient: 'from-amber-400 via-orange-500 to-pink-500',
      icon: '☀️',
    },
    {
      id: 'prismFlash',
      label: 'Destello Prisma RGB',
      badge: 'Arcoíris',
      category: 'light',
      gradient: 'from-pink-500 via-cyan-400 to-indigo-500',
      icon: '🌈',
    },
    {
      id: 'vignetteFade',
      label: 'Viñeta Cine',
      badge: 'Iris Oscuro',
      category: 'light',
      gradient: 'from-slate-800 to-black',
      icon: '🎞️',
    },
    {
      id: 'radialBlurFade',
      label: 'Disolución Desenfocada',
      badge: 'Blur Suave',
      category: 'light',
      gradient: 'from-purple-500 to-slate-700',
      icon: '🌫️',
    },
    {
      id: 'crossZoom',
      label: 'Cross Zoom Suave',
      badge: 'Cine Óptico',
      category: 'light',
      gradient: 'from-blue-500 to-indigo-600',
      icon: '🔎',
    },
    {
      id: 'burnDark',
      label: 'Quemado Oscuro',
      badge: 'Contraste',
      category: 'light',
      gradient: 'from-stone-700 to-black',
      icon: '🔥',
    },
    {
      id: 'wipeLeft',
      label: 'Barrido Izq → Der',
      badge: 'Wipe Limpio',
      category: '3d',
      gradient: 'from-indigo-600 to-sky-500',
      icon: '➡️',
    },
    {
      id: 'wipeDown',
      label: 'Barrido Hacia Abajo',
      badge: 'Wipe Abajo',
      category: '3d',
      gradient: 'from-blue-600 to-cyan-600',
      icon: '🔽',
    },
    {
      id: 'diagonalWipe',
      label: 'Barrido Diagonal 45°',
      badge: 'Wipe Dinámico',
      category: '3d',
      gradient: 'from-fuchsia-600 to-indigo-600',
      icon: '📐',
    },
    {
      id: 'barnDoorOpen',
      label: 'Cortina Abrir',
      badge: 'Split Central',
      category: '3d',
      gradient: 'from-emerald-600 to-cyan-600',
      icon: '🚪',
    },
    {
      id: 'barnDoorClose',
      label: 'Cortina Cerrar',
      badge: 'Cierre Central',
      category: '3d',
      gradient: 'from-cyan-700 to-emerald-700',
      icon: '🎭',
    },
    {
      id: 'heartOpen',
      label: 'Apertura Corazón',
      badge: 'Forma SDF',
      category: '3d',
      gradient: 'from-rose-500 to-pink-600',
      icon: '❤️',
    },
    {
      id: 'starOpen',
      label: 'Apertura Estrella',
      badge: 'Forma SDF',
      category: '3d',
      gradient: 'from-amber-400 to-orange-600',
      icon: '⭐',
    },
    {
      id: 'flipVertical3D',
      label: 'Volteo 3D Vertical',
      badge: 'Eje X 3D',
      category: '3d',
      gradient: 'from-teal-600 to-indigo-700',
      icon: '🔃',
    },
    {
      id: 'pageCurl',
      label: 'Paso de Página',
      badge: 'Libro / Sombra',
      category: '3d',
      gradient: 'from-amber-600 to-stone-700',
      icon: '📖',
    },
    {
      id: 'slideDownPush',
      label: 'Empuje Vertical',
      badge: 'Push Abajo',
      category: '3d',
      gradient: 'from-violet-600 to-blue-600',
      icon: '⬇️',
    },
    {
      id: 'rgbSplitSlide',
      label: 'Desgarro RGB',
      badge: 'Separación RGB',
      category: 'glitch',
      gradient: 'from-rose-600 via-purple-600 to-cyan-500',
      icon: '🌈',
    },
    {
      id: 'kaleidoTransition',
      label: 'Caleidoscopio 6X',
      badge: 'Fractal',
      category: 'glitch',
      gradient: 'from-fuchsia-600 to-amber-500',
      icon: '❄️',
    },
    {
      id: 'crtShutdown',
      label: 'Apagado TV CRT',
      badge: 'Retro TV',
      category: 'glitch',
      gradient: 'from-slate-700 via-cyan-800 to-black',
      icon: '📺',
    },
    {
      id: 'vaporwave',
      label: 'Vaporwave Scan',
      badge: 'Neón 80s',
      category: 'glitch',
      gradient: 'from-pink-500 via-purple-600 to-cyan-400',
      icon: '🌴',
    },
    {
      id: 'rippleDrop',
      label: 'Gota de Agua',
      badge: 'Onda Concéntrica',
      category: 'glitch',
      gradient: 'from-sky-500 to-blue-700',
      icon: '💧',
    },
    {
      id: 'mosaicGrid',
      label: 'Mosaico Cuadrícula',
      badge: 'Bloques Aleatorios',
      category: 'glitch',
      gradient: 'from-indigo-500 to-emerald-500',
      icon: '🧩',
    },
    // 50 Nuevas Transiciones Studio
    // --- CÁMARA / BLUR (13) ---
    {
      id: 'panDiagonalTL',
      label: 'Paneo Diagonal ↘',
      badge: 'Barrido Rápido',
      category: 'camera',
      gradient: 'from-sky-600 to-indigo-600',
      icon: '↘️',
    },
    {
      id: 'panDiagonalTR',
      label: 'Paneo Diagonal ↙',
      badge: 'Barrido Rápido',
      category: 'camera',
      gradient: 'from-indigo-600 to-sky-600',
      icon: '↙️',
    },
    {
      id: 'snapZoomIn',
      label: 'Snap Zoom In',
      badge: 'Rebote Rápido',
      category: 'camera',
      gradient: 'from-blue-500 to-cyan-500',
      icon: '🔎',
    },
    {
      id: 'snapZoomOut',
      label: 'Snap Zoom Out',
      badge: 'Pulso Cámara',
      category: 'camera',
      gradient: 'from-cyan-600 to-blue-700',
      icon: '🔭',
    },
    {
      id: 'tiltLeft',
      label: 'Inclinación Izq.',
      badge: 'Giro Suave',
      category: 'camera',
      gradient: 'from-violet-600 to-indigo-600',
      icon: '↶',
    },
    {
      id: 'tiltRight',
      label: 'Inclinación Der.',
      badge: 'Giro Suave',
      category: 'camera',
      gradient: 'from-indigo-600 to-violet-600',
      icon: '↷',
    },
    {
      id: 'bounceDrop',
      label: 'Caída con Rebote',
      badge: 'Física Dinámica',
      category: 'camera',
      gradient: 'from-emerald-500 to-teal-600',
      icon: '⬇️',
    },
    {
      id: 'bounceRise',
      label: 'Subida con Rebote',
      badge: 'Física Dinámica',
      category: 'camera',
      gradient: 'from-teal-500 to-emerald-600',
      icon: '⬆️',
    },
    {
      id: 'crashZoom',
      label: 'Crash Zoom RGB',
      badge: 'Impacto Cine',
      category: 'camera',
      gradient: 'from-rose-600 to-indigo-700',
      icon: '💥',
    },
    {
      id: 'pullBackRotate',
      label: 'Pull Back + Giro',
      badge: 'Rotación 45°',
      category: 'camera',
      gradient: 'from-purple-600 to-blue-600',
      icon: '🔄',
    },
    {
      id: 'focusPull',
      label: 'Desenfoque Foco',
      badge: 'Rack Focus',
      category: 'camera',
      gradient: 'from-slate-600 to-indigo-500',
      icon: '📷',
    },
    {
      id: 'fisheyePop',
      label: 'Ojo de Pez Pop',
      badge: 'Lente Angular',
      category: 'camera',
      gradient: 'from-amber-500 to-rose-600',
      icon: '🐟',
    },
    {
      id: 'hyperLapse',
      label: 'Hyper-Lapse',
      badge: 'Velocidad Luz',
      category: 'camera',
      gradient: 'from-cyan-500 to-violet-600',
      icon: '🚀',
    },
    // --- LUZ Y CINE (12) ---
    {
      id: 'solarFlare',
      label: 'Destello Solar',
      badge: 'Flare Dorado',
      category: 'light',
      gradient: 'from-amber-400 to-orange-600',
      icon: '☀️',
    },
    {
      id: 'neonPulse',
      label: 'Pulso Neón',
      badge: 'Onda Eléctrica',
      category: 'light',
      gradient: 'from-fuchsia-500 to-cyan-500',
      icon: '🟣',
    },
    {
      id: 'warmSunset',
      label: 'Atardecer Cálido',
      badge: 'Golden Hour',
      category: 'light',
      gradient: 'from-orange-500 to-rose-500',
      icon: '🌅',
    },
    {
      id: 'arcticFreeze',
      label: 'Congelado Ártico',
      badge: 'Destello Frío',
      category: 'light',
      gradient: 'from-sky-300 to-blue-600',
      icon: '🧊',
    },
    {
      id: 'goldenBokeh',
      label: 'Bokeh Dorado',
      badge: 'Luces Suaves',
      category: 'light',
      gradient: 'from-yellow-400 to-amber-600',
      icon: '✨',
    },
    {
      id: 'strobeFlash',
      label: 'Flash Estrobo',
      badge: 'Doble Impacto',
      category: 'light',
      gradient: 'from-white via-slate-300 to-slate-700',
      icon: '⚡',
    },
    {
      id: 'cinemaCurtain',
      label: 'Telón de Cine',
      badge: 'Apertura Teatral',
      category: 'light',
      gradient: 'from-red-800 to-black',
      icon: '🎭',
    },
    {
      id: 'sepiaDream',
      label: 'Sueño Sepia',
      badge: 'Cine Vintage',
      category: 'light',
      gradient: 'from-amber-700 to-stone-800',
      icon: '🎞️',
    },
    {
      id: 'auroraGlow',
      label: 'Aurora Boreal',
      badge: 'Onda Luminosa',
      category: 'light',
      gradient: 'from-emerald-400 via-teal-500 to-purple-600',
      icon: '🌌',
    },
    {
      id: 'emberSpark',
      label: 'Brasas Ardientes',
      badge: 'Fuego Orgánico',
      category: 'light',
      gradient: 'from-orange-600 to-red-800',
      icon: '🔥',
    },
    {
      id: 'moonlightFade',
      label: 'Luz de Luna',
      badge: 'Nocturno Suave',
      category: 'light',
      gradient: 'from-indigo-800 to-slate-900',
      icon: '🌙',
    },
    {
      id: 'haloBurst',
      label: 'Estallido de Halo',
      badge: 'Anillo Blanco',
      category: 'light',
      gradient: 'from-amber-100 to-indigo-400',
      icon: '💫',
    },
    // --- 3D Y FORMAS (13) ---
    {
      id: 'hexGrid',
      label: 'Panal Hexagonal',
      badge: 'Mosaico Hex',
      category: '3d',
      gradient: 'from-amber-500 to-yellow-600',
      icon: '🐝',
    },
    {
      id: 'spiralWipe',
      label: 'Espiral Hipnótica',
      badge: 'Barrido Giro',
      category: '3d',
      gradient: 'from-purple-600 to-pink-500',
      icon: '🌀',
    },
    {
      id: 'radialSlices',
      label: 'Rebanadas Radiales',
      badge: 'Obturador 8x',
      category: '3d',
      gradient: 'from-teal-500 to-cyan-600',
      icon: '🎡',
    },
    {
      id: 'verticalBlinds',
      label: 'Persianas Vert.',
      badge: '10 Franjas',
      category: '3d',
      gradient: 'from-slate-600 to-indigo-700',
      icon: '▥',
    },
    {
      id: 'diagonalBlinds',
      label: 'Persianas Diag.',
      badge: 'Corte 45°',
      category: '3d',
      gradient: 'from-indigo-500 to-purple-700',
      icon: '▨',
    },
    {
      id: 'checkerboard',
      label: 'Tablero Ajedrez',
      badge: 'Cuadrícula Alterna',
      category: '3d',
      gradient: 'from-zinc-700 to-zinc-900',
      icon: '🏁',
    },
    {
      id: 'splitHorizontal',
      label: 'Corte Horizontal',
      badge: 'Apertura Central',
      category: '3d',
      gradient: 'from-blue-600 to-indigo-800',
      icon: '⇕',
    },
    {
      id: 'splitVertical',
      label: 'Corte Vertical',
      badge: 'Puerta Doble',
      category: '3d',
      gradient: 'from-indigo-600 to-blue-800',
      icon: '⇔',
    },
    {
      id: 'squeezeHorizontal',
      label: 'Compresión Horiz.',
      badge: 'Aplastado X',
      category: '3d',
      gradient: 'from-pink-600 to-rose-700',
      icon: '↔️',
    },
    {
      id: 'squeezeVertical',
      label: 'Compresión Vert.',
      badge: 'Aplastado Y',
      category: '3d',
      gradient: 'from-rose-600 to-pink-700',
      icon: '↕️',
    },
    {
      id: 'boxZoom3D',
      label: 'Cubo Zoom 3D',
      badge: 'Tarjeta Profunda',
      category: '3d',
      gradient: 'from-violet-600 to-fuchsia-700',
      icon: '📦',
    },
    {
      id: 'irisDiamondSpin',
      label: 'Diamante Giratorio',
      badge: 'Rombo 90°',
      category: '3d',
      gradient: 'from-cyan-500 to-blue-600',
      icon: '💠',
    },
    {
      id: 'crossHatch',
      label: 'Malla Cruzada',
      badge: 'Trama Geométrica',
      category: '3d',
      gradient: 'from-emerald-600 to-cyan-700',
      icon: '🕸️',
    },
    // --- GLITCH / ONDA (12) ---
    {
      id: 'pixelMelt',
      label: 'Derretido Píxel',
      badge: 'Cascada Digital',
      category: 'glitch',
      gradient: 'from-fuchsia-600 to-rose-600',
      icon: '🫠',
    },
    {
      id: 'chromaticBurst',
      label: 'Estallido RGB',
      badge: 'Aberración Radial',
      category: 'glitch',
      gradient: 'from-red-500 via-green-500 to-blue-500',
      icon: '🌈',
    },
    {
      id: 'staticNoise',
      label: 'Nieve Analógica',
      badge: 'Estática TV',
      category: 'glitch',
      gradient: 'from-slate-500 to-zinc-800',
      icon: '📡',
    },
    {
      id: 'scanlineTear',
      label: 'Desgarro Scanline',
      badge: 'Cortes de Línea',
      category: 'glitch',
      gradient: 'from-purple-600 to-cyan-500',
      icon: '〰️',
    },
    {
      id: 'vhsRewind',
      label: 'Rebobinado VHS',
      badge: 'Tracking 90s',
      category: 'glitch',
      gradient: 'from-indigo-700 to-rose-600',
      icon: '📼',
    },
    {
      id: 'cyberSlice',
      label: 'Corte Cyber',
      badge: 'Bloques Neón',
      category: 'glitch',
      gradient: 'from-cyan-500 to-fuchsia-600',
      icon: '🦾',
    },
    {
      id: 'datamosh',
      label: 'Datamosh',
      badge: 'Compresión Glitch',
      category: 'glitch',
      gradient: 'from-lime-500 to-purple-700',
      icon: '🧬',
    },
    {
      id: 'matrixRain',
      label: 'Lluvia Digital',
      badge: 'Código Verde',
      category: 'glitch',
      gradient: 'from-emerald-500 to-green-900',
      icon: '🟩',
    },
    {
      id: 'shockwave',
      label: 'Onda de Choque',
      badge: 'Anillo Expansivo',
      category: 'glitch',
      gradient: 'from-sky-500 to-indigo-700',
      icon: '⭕',
    },
    {
      id: 'mirrorFlip',
      label: 'Espejo Caleido',
      badge: 'Simetría Doble',
      category: 'glitch',
      gradient: 'from-violet-500 to-pink-600',
      icon: '🪞',
    },
    {
      id: 'liquidSwirl',
      label: 'Remolino Líquido',
      badge: 'Vórtice Fluido',
      category: 'glitch',
      gradient: 'from-blue-500 to-teal-500',
      icon: '🌊',
    },
    {
      id: 'quantumDissolve',
      label: 'Disolución Cuántica',
      badge: 'Partículas Finas',
      category: 'glitch',
      gradient: 'from-cyan-400 to-purple-600',
      icon: '⚛️',
    },
    // ── 100 NUEVAS TRANSICIONES CLASIFICADAS (105..204) ─────────────────────
    // 🎥 Cámara / Blur (20)
    { id: 'whipZoomLeft', label: 'Whip Zoom Izq', badge: 'Cámara Rápida', category: 'camera', gradient: 'from-sky-500 to-indigo-700', icon: '⬅️' },
    { id: 'whipZoomRight', label: 'Whip Zoom Der', badge: 'Cámara Rápida', category: 'camera', gradient: 'from-indigo-500 to-purple-700', icon: '➡️' },
    { id: 'whipZoomUp', label: 'Whip Zoom Arriba', badge: 'Cámara Rápida', category: 'camera', gradient: 'from-cyan-500 to-blue-700', icon: '⬆️' },
    { id: 'whipZoomDown', label: 'Whip Zoom Abajo', badge: 'Cámara Rápida', category: 'camera', gradient: 'from-blue-500 to-indigo-800', icon: '⬇️' },
    { id: 'smoothPanLeft', label: 'Paneo Suave Izq', badge: 'Deslizar Fluido', category: 'camera', gradient: 'from-emerald-500 to-teal-700', icon: '⏪' },
    { id: 'smoothPanRight', label: 'Paneo Suave Der', badge: 'Deslizar Fluido', category: 'camera', gradient: 'from-teal-500 to-cyan-700', icon: '⏩' },
    { id: 'smoothPanUp', label: 'Paneo Suave Arriba', badge: 'Deslizar Fluido', category: 'camera', gradient: 'from-sky-400 to-teal-700', icon: '🔼' },
    { id: 'smoothPanDown', label: 'Paneo Suave Abajo', badge: 'Deslizar Fluido', category: 'camera', gradient: 'from-indigo-400 to-cyan-700', icon: '🔽' },
    { id: 'spiralZoomIn', label: 'Zoom Espiral In', badge: 'Giro + Zoom', category: 'camera', gradient: 'from-violet-500 to-fuchsia-700', icon: '🌀' },
    { id: 'spiralZoomOut', label: 'Zoom Espiral Out', badge: 'Giro + Alejar', category: 'camera', gradient: 'from-fuchsia-500 to-purple-800', icon: '🌪️' },
    { id: 'elasticZoomIn', label: 'Zoom Elástico In', badge: 'Rebote Dinámico', category: 'camera', gradient: 'from-amber-400 to-orange-600', icon: '🔍' },
    { id: 'elasticZoomOut', label: 'Zoom Elástico Out', badge: 'Rebote Suave', category: 'camera', gradient: 'from-orange-400 to-rose-600', icon: '🔎' },
    { id: 'swayLeft', label: 'Balanceo Izq', badge: 'Inclinación', category: 'camera', gradient: 'from-sky-400 to-indigo-600', icon: '↙️' },
    { id: 'swayRight', label: 'Balanceo Der', badge: 'Inclinación', category: 'camera', gradient: 'from-indigo-400 to-violet-600', icon: '↘️' },
    { id: 'tiltDrop', label: 'Caída de Cámara', badge: 'Tilt Vertical', category: 'camera', gradient: 'from-slate-500 to-indigo-800', icon: '📉' },
    { id: 'tiltRise', label: 'Ascenso de Cámara', badge: 'Tilt Vertical', category: 'camera', gradient: 'from-cyan-500 to-sky-700', icon: '📈' },
    { id: 'microShake', label: 'Micro Impacto', badge: 'Vibración', category: 'camera', gradient: 'from-red-500 to-orange-600', icon: '💥' },
    { id: 'vertigoPull', label: 'Efecto Vértigo', badge: 'Dolly Zoom Pro', category: 'camera', gradient: 'from-purple-500 to-indigo-900', icon: '🎥' },
    { id: 'cinematicDrift', label: 'Deriva Cine', badge: 'Movimiento Sutil', category: 'camera', gradient: 'from-stone-500 to-slate-800', icon: '🎞️' },
    { id: 'speedRamp', label: 'Rampa Velocidad', badge: 'Aceleración', category: 'camera', gradient: 'from-amber-500 to-red-600', icon: '⚡' },

    // ✨ Luz y Cine (20)
    { id: 'warmFlash', label: 'Flash Cálido', badge: 'Destello Ámbar', category: 'light', gradient: 'from-amber-300 to-orange-600', icon: '☀️' },
    { id: 'coolFlash', label: 'Flash Frío', badge: 'Destello Azul', category: 'light', gradient: 'from-sky-300 to-blue-600', icon: '❄️' },
    { id: 'goldLeak', label: 'Fuga Dorada', badge: 'Light Leak Oro', category: 'light', gradient: 'from-yellow-300 to-amber-600', icon: '✨' },
    { id: 'crimsonFlare', label: 'Destello Carmesí', badge: 'Óptica Roja', category: 'light', gradient: 'from-red-400 to-rose-700', icon: '🔴' },
    { id: 'blueFlare', label: 'Destello Azul', badge: 'Anamórfico', category: 'light', gradient: 'from-cyan-400 to-blue-700', icon: '🔵' },
    { id: 'amberBurn', label: 'Quemado Ámbar', badge: 'Celuloide', category: 'light', gradient: 'from-orange-400 to-red-800', icon: '🔥' },
    { id: 'whiteBloom', label: 'Resplandor Blanco', badge: 'Bloom Suave', category: 'light', gradient: 'from-white to-slate-400', icon: '🤍' },
    { id: 'darkVignette', label: 'Viñeta Oscura', badge: 'Cierre Cine', category: 'light', gradient: 'from-zinc-600 to-black', icon: '🖤' },
    { id: 'filmFlash', label: 'Flash de Película', badge: 'Sobreexposición', category: 'light', gradient: 'from-amber-200 to-stone-600', icon: '📸' },
    { id: 'prismGlow', label: 'Brillo Prisma', badge: 'Refracción RGB', category: 'light', gradient: 'from-pink-400 to-cyan-400', icon: '🌈' },
    { id: 'sunsetWash', label: 'Baño Atardecer', badge: 'Luz Coral', category: 'light', gradient: 'from-orange-400 to-purple-700', icon: '🌅' },
    { id: 'neonFlash', label: 'Flash Neón', badge: 'Club Eléctrico', category: 'light', gradient: 'from-fuchsia-500 to-cyan-400', icon: '🪩' },
    { id: 'softOverexpose', label: 'Luz Etérea', badge: 'Sobreexposición', category: 'light', gradient: 'from-sky-100 to-indigo-400', icon: '☁️' },
    { id: 'shadowSweep', label: 'Barrido Sombra', badge: 'Dramático', category: 'light', gradient: 'from-stone-700 to-black', icon: '🌑' },
    { id: 'dreamyMist', label: 'Niebla Soñadora', badge: 'Bruma Suave', category: 'light', gradient: 'from-indigo-200 to-purple-500', icon: '🌫️' },
    { id: 'starburstFlash', label: 'Estrella Destello', badge: 'Rayos 6 Puntas', category: 'light', gradient: 'from-yellow-200 to-amber-500', icon: '🌟' },
    { id: 'candleFlicker', label: 'Luz de Vela', badge: 'Parpadeo Cálido', category: 'light', gradient: 'from-amber-400 to-stone-900', icon: '🕯️' },
    { id: 'cinemaFadeOut', label: 'Fundido a Negro Pro', badge: 'Fade Clásico', category: 'light', gradient: 'from-slate-700 to-black', icon: '🎬' },
    { id: 'retroBurn', label: 'Quemado Retro', badge: 'Película 70s', category: 'light', gradient: 'from-orange-500 to-stone-900', icon: '🎞️' },
    { id: 'auroraSweep', label: 'Barrido Aurora', badge: 'Luz Polar', category: 'light', gradient: 'from-emerald-400 to-violet-600', icon: '🌌' },

    // 🧊 3D y Formas (20)
    { id: 'cubeUp3D', label: 'Cubo 3D Arriba', badge: 'Rotación 3D', category: '3d', gradient: 'from-indigo-500 to-cyan-500', icon: '🧊' },
    { id: 'cubeDown3D', label: 'Cubo 3D Abajo', badge: 'Rotación 3D', category: '3d', gradient: 'from-purple-500 to-indigo-600', icon: '📦' },
    { id: 'flipHorizontal3D', label: 'Giro Horizontal 3D', badge: 'Volteo 180°', category: '3d', gradient: 'from-sky-500 to-blue-700', icon: '🔄' },
    { id: 'swingDoorLeft', label: 'Puerta Izquierda', badge: 'Apertura 3D', category: '3d', gradient: 'from-teal-500 to-emerald-700', icon: '🚪' },
    { id: 'swingDoorRight', label: 'Puerta Derecha', badge: 'Apertura 3D', category: '3d', gradient: 'from-emerald-500 to-cyan-700', icon: '🚪' },
    { id: 'foldVertical', label: 'Pliegue Vertical', badge: 'Acordeón', category: '3d', gradient: 'from-violet-500 to-purple-800', icon: '🪗' },
    { id: 'foldHorizontal', label: 'Pliegue Horizontal', badge: 'Acordeón', category: '3d', gradient: 'from-fuchsia-500 to-indigo-800', icon: '📐' },
    { id: 'zoomRotate3D', label: 'Zoom Giro 3D', badge: 'Vórtice 360°', category: '3d', gradient: 'from-cyan-400 to-indigo-700', icon: '🎡' },
    { id: 'cardFlipLeft', label: 'Carta 3D Izq', badge: 'Perspectiva', category: '3d', gradient: 'from-rose-400 to-purple-700', icon: '🃏' },
    { id: 'cardFlipRight', label: 'Carta 3D Der', badge: 'Perspectiva', category: '3d', gradient: 'from-amber-400 to-rose-700', icon: '🎴' },
    { id: 'triangleOpen', label: 'Iris Triángulo', badge: 'Forma Geométrica', category: '3d', gradient: 'from-emerald-400 to-teal-700', icon: '🔺' },
    { id: 'hexagonOpen', label: 'Iris Hexágono', badge: 'Forma Sci-Fi', category: '3d', gradient: 'from-cyan-400 to-blue-800', icon: '⬡' },
    { id: 'ovalOpen', label: 'Iris Óvalo', badge: 'Apertura Suave', category: '3d', gradient: 'from-pink-400 to-purple-700', icon: '🥚' },
    { id: 'crossOpen', label: 'Apertura en Cruz', badge: 'Geométrico', category: '3d', gradient: 'from-amber-400 to-orange-700', icon: '✚' },
    { id: 'plusWipe', label: 'Barrido Plus', badge: 'Estrella 4', category: '3d', gradient: 'from-sky-400 to-indigo-700', icon: '✦' },
    { id: 'bowtieOpen', label: 'Corbatín', badge: 'Forma Doble', category: '3d', gradient: 'from-rose-400 to-indigo-700', icon: '🎀' },
    { id: 'curtainPart', label: 'Telón Central', badge: 'Teatro', category: '3d', gradient: 'from-red-500 to-rose-900', icon: '🎭' },
    { id: 'shutterClose', label: 'Obturador Cámara', badge: 'Diafragma 6', category: '3d', gradient: 'from-zinc-400 to-slate-800', icon: '📷' },
    { id: 'spiralIris', label: 'Iris Espiral', badge: 'Remolino', category: '3d', gradient: 'from-purple-400 to-cyan-600', icon: '🌀' },
    { id: 'carousel3D', label: 'Carrusel 3D', badge: 'Deslizamiento', category: '3d', gradient: 'from-blue-400 to-indigo-800', icon: '🎠' },

    // ⚡ Glitch / Onda (20)
    { id: 'rgbJitter', label: 'Temblor RGB', badge: 'Desfase Color', category: 'glitch', gradient: 'from-red-500 to-cyan-500', icon: '⚡' },
    { id: 'vhsGlitch', label: 'Glitch VHS', badge: 'Bandas Cinta', category: 'glitch', gradient: 'from-slate-500 to-purple-800', icon: '📼' },
    { id: 'neonGlitch', label: 'Glitch Neón', badge: 'Cian Eléctrico', category: 'glitch', gradient: 'from-cyan-400 to-fuchsia-600', icon: '🟣' },
    { id: 'waveDistortH', label: 'Onda Horizontal', badge: 'Distorsión', category: 'glitch', gradient: 'from-blue-400 to-teal-600', icon: '〰️' },
    { id: 'waveDistortV', label: 'Onda Vertical', badge: 'Distorsión', category: 'glitch', gradient: 'from-teal-400 to-indigo-600', icon: '🌊' },
    { id: 'waterRipple', label: 'Onda de Agua', badge: 'Concéntrica', category: 'glitch', gradient: 'from-cyan-300 to-blue-700', icon: '💧' },
    { id: 'plasmaWave', label: 'Onda Plasma', badge: 'Energía', category: 'glitch', gradient: 'from-fuchsia-500 to-indigo-700', icon: '🔮' },
    { id: 'pixelBlocks', label: 'Bloques Píxel', badge: 'Pixelado', category: 'glitch', gradient: 'from-lime-400 to-emerald-700', icon: '👾' },
    { id: 'mosaicSpin', label: 'Mosaico Giratorio', badge: 'Rotación Píxel', category: 'glitch', gradient: 'from-amber-400 to-purple-700', icon: '🧩' },
    { id: 'scanlineWipe', label: 'Barrido Scanline', badge: 'Líneas TV', category: 'glitch', gradient: 'from-cyan-400 to-slate-800', icon: '📺' },
    { id: 'cyberGrid', label: 'Rejilla Cyber', badge: 'Matrix Grid', category: 'glitch', gradient: 'from-sky-400 to-indigo-900', icon: '🌐' },
    { id: 'analogNoise', label: 'Ruido Analógico', badge: 'Estática TV', category: 'glitch', gradient: 'from-zinc-400 to-stone-800', icon: '📡' },
    { id: 'signalDrop', label: 'Caída de Señal', badge: 'Interferencia', category: 'glitch', gradient: 'from-slate-500 to-black', icon: '📶' },
    { id: 'chromaWave', label: 'Onda Cromática', badge: 'Prismática', category: 'glitch', gradient: 'from-rose-400 to-cyan-500', icon: '🌈' },
    { id: 'echoSplit', label: 'Eco Doble', badge: 'Fantasma', category: 'glitch', gradient: 'from-indigo-400 to-purple-700', icon: '👥' },
    { id: 'prismShift', label: 'Desfase Prisma', badge: 'RGB Diagonal', category: 'glitch', gradient: 'from-pink-400 to-sky-500', icon: '💎' },
    { id: 'energyPulse', label: 'Pulso de Energía', badge: 'Anillo Láser', category: 'glitch', gradient: 'from-sky-400 to-blue-700', icon: '💠' },
    { id: 'warpTunnel', label: 'Túnel Warp', badge: 'Hiperespacio', category: 'glitch', gradient: 'from-purple-500 to-black', icon: '🕳️' },
    { id: 'acidRipple', label: 'Onda Ácida', badge: 'Psicodélico', category: 'glitch', gradient: 'from-lime-400 to-green-700', icon: '🧪' },
    { id: 'digitalDissolve', label: 'Disolución Digital', badge: 'Bloques Aleatorios', category: 'glitch', gradient: 'from-cyan-400 to-indigo-800', icon: '🧱' },

    // 📐 Cortes / Barridos (20)
    { id: 'wipeDiagBL', label: 'Diagonal Inf-Izq', badge: 'Barrido 45°', category: 'wipe', gradient: 'from-emerald-400 to-teal-700', icon: '↙️' },
    { id: 'wipeDiagBR', label: 'Diagonal Inf-Der', badge: 'Barrido 135°', category: 'wipe', gradient: 'from-teal-400 to-cyan-700', icon: '↘️' },
    { id: 'wedgeOpen', label: 'Cuña Abierta', badge: 'Abanico', category: 'wipe', gradient: 'from-amber-400 to-orange-700', icon: '🍕' },
    { id: 'venetian45', label: 'Persianas 45°', badge: 'Diagonal', category: 'wipe', gradient: 'from-sky-400 to-indigo-700', icon: '🪟' },
    { id: 'venetian135', label: 'Persianas 135°', badge: 'Diagonal Inv', category: 'wipe', gradient: 'from-indigo-400 to-purple-700', icon: '🪟' },
    { id: 'irisBox', label: 'Caja Iris', badge: 'Cuadrado Central', category: 'wipe', gradient: 'from-rose-400 to-red-700', icon: '⏹️' },
    { id: 'splitDiag', label: 'División Diagonal', badge: 'Corte en X', category: 'wipe', gradient: 'from-violet-400 to-fuchsia-700', icon: '✖️' },
    { id: 'barsSweepH', label: 'Barras Horizontales', badge: 'Escalonado', category: 'wipe', gradient: 'from-cyan-400 to-blue-700', icon: '📶' },
    { id: 'barsSweepV', label: 'Barras Verticales', badge: 'Escalonado', category: 'wipe', gradient: 'from-blue-400 to-indigo-700', icon: '📊' },
    { id: 'gridFade', label: 'Cuadrícula Fade', badge: 'Bloques Suaves', category: 'wipe', gradient: 'from-emerald-400 to-cyan-700', icon: '▦' },
    { id: 'radialSweepCCW', label: 'Reloj Antihorario', badge: 'Barrido 360°', category: 'wipe', gradient: 'from-amber-400 to-rose-700', icon: '🕒' },
    { id: 'doubleWipeH', label: 'Doble Barrido H', badge: 'Centro a Bordes', category: 'wipe', gradient: 'from-sky-400 to-teal-700', icon: '↔️' },
    { id: 'doubleWipeV', label: 'Doble Barrido V', badge: 'Centro a Bordes', category: 'wipe', gradient: 'from-purple-400 to-pink-700', icon: '↕️' },
    { id: 'cornerTL', label: 'Esquina Sup-Izq', badge: 'Radial Esquina', category: 'wipe', gradient: 'from-lime-400 to-emerald-700', icon: '↖️' },
    { id: 'cornerTR', label: 'Esquina Sup-Der', badge: 'Radial Esquina', category: 'wipe', gradient: 'from-cyan-400 to-sky-700', icon: '↗️' },
    { id: 'cornerBL', label: 'Esquina Inf-Izq', badge: 'Radial Esquina', category: 'wipe', gradient: 'from-orange-400 to-amber-700', icon: '↙️' },
    { id: 'cornerBR', label: 'Esquina Inf-Der', badge: 'Radial Esquina', category: 'wipe', gradient: 'from-rose-400 to-pink-700', icon: '↘️' },
    { id: 'zigzagH', label: 'Zigzag Horizontal', badge: 'Corte Dentado', category: 'wipe', gradient: 'from-fuchsia-400 to-purple-700', icon: '⚡' },
    { id: 'zigzagV', label: 'Zigzag Vertical', badge: 'Corte Dentado', category: 'wipe', gradient: 'from-indigo-400 to-blue-700', icon: '⚡' },
    { id: 'stepWipe', label: 'Barrido Escala', badge: 'Escalera', category: 'wipe', gradient: 'from-teal-400 to-emerald-800', icon: '🪜' },
  ];

const FX_LIST: readonly {
  id: VisualEffectType;
  label: string;
  desc: string;
  category: FxCategory;
  gradient: string;
  icon: string;
}[] = [
    {
      id: 'none',
      label: 'Sin Efecto',
      desc: 'Video original limpio',
      category: 'all',
      gradient: 'from-slate-800 to-slate-900',
      icon: '⊘',
    },
    {
      id: 'glitch',
      label: 'Glitch Cyberpunk Pro',
      desc: 'Cortes digitales + RGB Split',
      category: 'glitch',
      gradient: 'from-fuchsia-600 via-purple-600 to-cyan-500',
      icon: '⚡',
    },
    {
      id: 'vhs',
      label: 'VHS Retro 90s',
      desc: 'Cinta analógica + Scanlines CRT',
      category: 'glitch',
      gradient: 'from-indigo-700 via-rose-600 to-amber-500',
      icon: '📼',
    },
    {
      id: 'chromaticAberration',
      label: 'Lente 3D Cromático',
      desc: 'Dispersión óptica RGB radial',
      category: 'glitch',
      gradient: 'from-rose-600 to-cyan-500',
      icon: '🕶️',
    },
    {
      id: 'cameraShake',
      label: 'Terremoto / Impacto',
      desc: 'Vibración de cámara de acción',
      category: 'glitch',
      gradient: 'from-orange-600 to-red-600',
      icon: '📳',
    },
    {
      id: 'neonGlow',
      label: 'Bordes Neón Cyber',
      desc: 'Detector de bordes Sobel + Halo',
      category: 'light',
      gradient: 'from-cyan-500 via-fuchsia-500 to-indigo-600',
      icon: '🔮',
    },
    {
      id: 'dreamyBloom',
      label: 'Halo Angelical (Bloom)',
      desc: 'Resplandor suave Pro-Mist',
      category: 'light',
      gradient: 'from-pink-400 to-violet-500',
      icon: '✨',
    },
    {
      id: 'lightLeakFX',
      label: 'Fugas de Luz Cine',
      desc: 'Destellos cálidos orgánicos',
      category: 'light',
      gradient: 'from-amber-500 via-orange-500 to-pink-600',
      icon: '🌅',
    },
    {
      id: 'filmGrain',
      label: 'Película 35mm + Rayas',
      desc: 'Textura celuloide clásico',
      category: 'light',
      gradient: 'from-stone-600 to-amber-800',
      icon: '🎞️',
    },
    {
      id: 'rain',
      label: 'Lluvia Real + Gotas',
      desc: 'Lluvia diagonal y refracción',
      category: 'particles',
      gradient: 'from-sky-600 to-slate-800',
      icon: '🌧️',
    },
    {
      id: 'sparks',
      label: 'Brasas y Bokeh Fuego',
      desc: 'Partículas ígneas ascendentes',
      category: 'particles',
      gradient: 'from-amber-500 to-red-700',
      icon: '🔥',
    },
    {
      id: 'kaleidoscope',
      label: 'Caleidoscopio Espejo',
      desc: 'Simetría radial hipnótica',
      category: 'lens',
      gradient: 'from-violet-600 to-emerald-500',
      icon: '💠',
    },
    {
      id: 'mirrorClone',
      label: 'Clon Multicámara',
      desc: 'Mosaico 2x2 / 3x3 con pulso',
      category: 'lens',
      gradient: 'from-blue-600 to-indigo-700',
      icon: '🎛️',
    },
    {
      id: 'fisheye',
      label: 'Lente Ojo de Pez',
      desc: 'Gran angular extremo 180°',
      category: 'lens',
      gradient: 'from-teal-600 to-slate-800',
      icon: '👁️',
    },
    {
      id: 'halftone',
      label: 'Cómic / Pop-Art',
      desc: 'Tinta negra Sobel + trama CMYK',
      category: 'lens',
      gradient: 'from-yellow-500 to-rose-600',
      icon: '🗯️',
    },
    {
      id: 'pixelate',
      label: 'Pixel Art 16-Bit',
      desc: 'Mosaico arcade retro',
      category: 'lens',
      gradient: 'from-emerald-600 to-teal-800',
      icon: '👾',
    },
    {
      id: 'thermal',
      label: 'Visión Térmica IR',
      desc: 'Cámara infrarroja de calor',
      category: 'lens',
      gradient: 'from-blue-700 via-red-500 to-yellow-400',
      icon: '🌡️',
    },
    {
      id: 'crtMonitor',
      label: 'Monitor CRT Curvo',
      desc: 'Tubo retro + líneas de barrido',
      category: 'glitch',
      gradient: 'from-slate-700 via-cyan-700 to-zinc-900',
      icon: '📺',
    },
    {
      id: 'rgbPulse',
      label: 'Pulso RGB Rítmico',
      desc: 'Separación cromática pulsante',
      category: 'glitch',
      gradient: 'from-rose-600 via-indigo-600 to-cyan-500',
      icon: '🌈',
    },
    {
      id: 'datamosh',
      label: 'Datamosh Bloques',
      desc: 'Artefactos digitales de compresión',
      category: 'glitch',
      gradient: 'from-emerald-600 via-purple-700 to-pink-600',
      icon: '🧬',
    },
    {
      id: 'invertFlash',
      label: 'Negativo Estrobo',
      desc: 'Inversión de color rítmica',
      category: 'glitch',
      gradient: 'from-zinc-900 via-slate-400 to-white',
      icon: '🌗',
    },
    {
      id: 'nightVision',
      label: 'Visión Nocturna',
      desc: 'Fósforo verde militar + grano',
      category: 'glitch',
      gradient: 'from-emerald-500 to-green-950',
      icon: '🔭',
    },
    {
      id: 'edgeSketch',
      label: 'Boceto a Lápiz',
      desc: 'Dibujo a tinta sobre papel',
      category: 'glitch',
      gradient: 'from-stone-300 to-stone-700',
      icon: '✏️',
    },
    {
      id: 'prismRainbow',
      label: 'Prisma Arcoíris',
      desc: 'Reflejo espectral iridiscente',
      category: 'light',
      gradient: 'from-pink-500 via-amber-400 to-cyan-400',
      icon: '💎',
    },
    {
      id: 'duotoneCyber',
      label: 'Duotono Neón',
      desc: 'Cian eléctrico y magenta puro',
      category: 'light',
      gradient: 'from-cyan-400 to-fuchsia-600',
      icon: '🎨',
    },
    {
      id: 'auroraGlow',
      label: 'Aurora Boreal',
      desc: 'Ondas luminosas celestiales',
      category: 'light',
      gradient: 'from-emerald-400 via-teal-500 to-purple-700',
      icon: '🌌',
    },
    {
      id: 'strobeLight',
      label: 'Luz Estroboscópica',
      desc: 'Destellos de discoteca al ritmo',
      category: 'light',
      gradient: 'from-white via-indigo-400 to-slate-900',
      icon: '🚨',
    },
    {
      id: 'sunFlare',
      label: 'Destello Solar',
      desc: 'Flare anamórfico cálido',
      category: 'light',
      gradient: 'from-amber-300 via-orange-500 to-rose-700',
      icon: '☀️',
    },
    {
      id: 'xray',
      label: 'Rayos X',
      desc: 'Radiografía cian invertida',
      category: 'light',
      gradient: 'from-sky-400 to-slate-950',
      icon: '🩻',
    },
    {
      id: 'snow',
      label: 'Nieve Cayendo',
      desc: 'Copos suaves multicapa 3D',
      category: 'particles',
      gradient: 'from-sky-300 to-blue-700',
      icon: '❄️',
    },
    {
      id: 'confetti',
      label: 'Confeti Fiesta',
      desc: 'Lluvia de confeti multicolor',
      category: 'particles',
      gradient: 'from-rose-500 via-amber-400 to-cyan-500',
      icon: '🎉',
    },
    {
      id: 'bokehLights',
      label: 'Luces Bokeh',
      desc: 'Orbes luminosos desenfocados',
      category: 'particles',
      gradient: 'from-amber-400 to-sky-600',
      icon: '✨',
    },
    {
      id: 'starfield',
      label: 'Polvo Estelar',
      desc: 'Estrellas brillantes en el espacio',
      category: 'particles',
      gradient: 'from-indigo-900 via-purple-700 to-black',
      icon: '🌟',
    },
    {
      id: 'matrixRain',
      label: 'Lluvia Matrix',
      desc: 'Cascada de código verde digital',
      category: 'particles',
      gradient: 'from-emerald-500 to-black',
      icon: '💻',
    },
    {
      id: 'underwater',
      label: 'Bajo el Agua',
      desc: 'Refracción marina + cáusticas',
      category: 'lens',
      gradient: 'from-cyan-500 to-blue-800',
      icon: '🐠',
    },
    {
      id: 'heatHaze',
      label: 'Espejismo de Calor',
      desc: 'Distorsión térmica ascendente',
      category: 'lens',
      gradient: 'from-orange-500 to-amber-700',
      icon: '🏜️',
    },
    {
      id: 'speedLines',
      label: 'Líneas de Velocidad',
      desc: 'Acción estilo anime radial',
      category: 'lens',
      gradient: 'from-slate-600 to-indigo-700',
      icon: '💨',
    },
    {
      id: 'cinematicBars',
      label: 'Barras de Cine 2.39:1',
      desc: 'Encuadre anamórfico Hollywood',
      category: 'lens',
      gradient: 'from-zinc-800 to-black',
      icon: '🎬',
    },
    {
      id: 'tiltShift',
      label: 'Miniatura Tilt-Shift',
      desc: 'Desenfoque selectivo + color vivo',
      category: 'lens',
      gradient: 'from-teal-500 to-emerald-600',
      icon: '🏙️',
    },
    {
      id: 'radialBlurFX',
      label: 'Zoom Blur Radial',
      desc: 'Desenfoque de velocidad central',
      category: 'lens',
      gradient: 'from-blue-600 to-violet-700',
      icon: '🌀',
    },
    {
      id: 'mirrorVertical',
      label: 'Espejo Simétrico',
      desc: 'Reflejo bilateral perfecto',
      category: 'lens',
      gradient: 'from-indigo-500 to-cyan-600',
      icon: '🪞',
    },
    // --- 50 Nuevos Efectos: Fuego, Día, Noche, Clima, Sci-Fi, Luz y Arte ---
    {
      id: 'fireFlames',
      label: 'Llamas de Fuego',
      desc: 'Fuego vivo ascendente FBM',
      category: 'fire',
      gradient: 'from-amber-400 via-orange-600 to-red-700',
      icon: '🔥',
    },
    {
      id: 'fireRing',
      label: 'Anillo de Fuego',
      desc: 'Aro ardiente alrededor del centro',
      category: 'fire',
      gradient: 'from-yellow-500 via-red-600 to-rose-900',
      icon: '⭕',
    },
    {
      id: 'hellfire',
      label: 'Fuego Infernal',
      desc: 'Bordes en llamas y calor intenso',
      category: 'fire',
      gradient: 'from-red-600 via-orange-700 to-zinc-950',
      icon: '🌋',
    },
    {
      id: 'sunnyDay',
      label: 'Día Soleado',
      desc: 'Luz solar brillante y rayos cálidos',
      category: 'nature',
      gradient: 'from-amber-300 via-yellow-400 to-sky-400',
      icon: '☀️',
    },
    {
      id: 'goldenHour',
      label: 'Hora Dorada',
      desc: 'Baño cálido de atardecer dorado',
      category: 'nature',
      gradient: 'from-amber-400 via-orange-400 to-rose-400',
      icon: '🌇',
    },
    {
      id: 'blueHour',
      label: 'Hora Azul',
      desc: 'Crepúsculo azul cobalto profundo',
      category: 'nature',
      gradient: 'from-indigo-600 via-blue-700 to-slate-900',
      icon: '🌆',
    },
    {
      id: 'starryNight',
      label: 'Noche Estrellada',
      desc: 'Cielo nocturno y estrellas titilantes',
      category: 'nature',
      gradient: 'from-indigo-950 via-blue-900 to-slate-950',
      icon: '🌃',
    },
    {
      id: 'moonlight',
      label: 'Luz de Luna',
      desc: 'Brillo plateado nocturno y halo lunar',
      category: 'nature',
      gradient: 'from-slate-300 via-blue-500 to-slate-950',
      icon: '🌙',
    },
    {
      id: 'thunderstorm',
      label: 'Tormenta Eléctrica',
      desc: 'Relámpagos y atmósfera tormentosa',
      category: 'nature',
      gradient: 'from-slate-700 via-indigo-800 to-sky-400',
      icon: '⛈️',
    },
    {
      id: 'fogMist',
      label: 'Niebla Mística',
      desc: 'Bruma orgánica en movimiento',
      category: 'nature',
      gradient: 'from-slate-300 via-slate-500 to-slate-800',
      icon: '🌫️',
    },
    {
      id: 'sandstorm',
      label: 'Tormenta de Arena',
      desc: 'Polvo dorado del desierto al viento',
      category: 'nature',
      gradient: 'from-amber-600 via-yellow-700 to-stone-800',
      icon: '🏜️',
    },
    {
      id: 'sunsetSky',
      label: 'Atardecer Épico',
      desc: 'Degradado mágico magenta y oro',
      category: 'nature',
      gradient: 'from-purple-600 via-rose-500 to-amber-400',
      icon: '🌅',
    },
    {
      id: 'bloodMoon',
      label: 'Luna de Sangre',
      desc: 'Eclipse nocturno carmesí dramático',
      category: 'nature',
      gradient: 'from-red-700 via-rose-900 to-black',
      icon: '🌑',
    },
    {
      id: 'fireflies',
      label: 'Luciérnagas Nocturnas',
      desc: 'Luces vivas flotando en la noche',
      category: 'particles',
      gradient: 'from-lime-400 via-emerald-700 to-slate-950',
      icon: '🪲',
    },
    {
      id: 'cherryBlossom',
      label: 'Pétalos de Sakura',
      desc: 'Flores rosas cayendo con la brisa',
      category: 'particles',
      gradient: 'from-pink-300 via-rose-400 to-pink-700',
      icon: '🌸',
    },
    {
      id: 'autumnLeaves',
      label: 'Hojas de Otoño',
      desc: 'Hojas doradas y ámbar cayendo',
      category: 'particles',
      gradient: 'from-orange-500 via-amber-600 to-red-800',
      icon: '🍂',
    },
    {
      id: 'ashEmbers',
      label: 'Cenizas Volcánicas',
      desc: 'Pavesas rojas y ceniza flotante',
      category: 'particles',
      gradient: 'from-stone-700 via-orange-600 to-zinc-950',
      icon: '☄️',
    },
    {
      id: 'bubbles',
      label: 'Burbujas Flotantes',
      desc: 'Burbujas iridiscentes ascendentes',
      category: 'particles',
      gradient: 'from-cyan-300 via-sky-500 to-fuchsia-500',
      icon: '🫧',
    },
    {
      id: 'sparkles',
      label: 'Destellos Mágicos',
      desc: 'Estrellas de 4 puntas brillantes',
      category: 'particles',
      gradient: 'from-amber-200 via-yellow-400 to-indigo-700',
      icon: '🌟',
    },
    {
      id: 'laserRain',
      label: 'Lluvia Láser Neón',
      desc: 'Trazos cian y magenta cyberpunk',
      category: 'particles',
      gradient: 'from-cyan-400 via-fuchsia-500 to-slate-900',
      icon: '🌠',
    },
    {
      id: 'snowBlizzard',
      label: 'Ventisca Polar',
      desc: 'Tormenta de nieve rápida y fría',
      category: 'particles',
      gradient: 'from-sky-200 via-blue-400 to-slate-800',
      icon: '🌨️',
    },
    {
      id: 'frostEdge',
      label: 'Escarcha Helada',
      desc: 'Cristales de hielo en los bordes',
      category: 'particles',
      gradient: 'from-cyan-200 via-sky-500 to-blue-900',
      icon: '🧊',
    },
    {
      id: 'digitalRainBlue',
      label: 'Cascada Binaria',
      desc: 'Flujo de datos azul eléctrico',
      category: 'particles',
      gradient: 'from-sky-400 via-blue-600 to-slate-950',
      icon: '💠',
    },
    {
      id: 'hologram',
      label: 'Holograma Sci-Fi',
      desc: 'Proyección cian con líneas de barrido',
      category: 'glitch',
      gradient: 'from-cyan-400 via-teal-600 to-slate-900',
      icon: '🛸',
    },
    {
      id: 'tvStatic',
      label: 'Estática TV Antigua',
      desc: 'Ruido analógico blanco y negro',
      category: 'glitch',
      gradient: 'from-zinc-400 via-slate-600 to-zinc-900',
      icon: '📡',
    },
    {
      id: 'cyberScan',
      label: 'Escáner Láser Cyber',
      desc: 'Barrido láser neón y cuadrícula',
      category: 'glitch',
      gradient: 'from-emerald-400 via-cyan-600 to-slate-950',
      icon: '🔍',
    },
    {
      id: 'glitchWave',
      label: 'Onda Glitch Líquida',
      desc: 'Desgarro digital senoidal + RGB',
      category: 'glitch',
      gradient: 'from-fuchsia-500 via-indigo-600 to-cyan-400',
      icon: '〰️',
    },
    {
      id: 'badSignal',
      label: 'Señal Perdida',
      desc: 'Pérdida de sincronía horizontal',
      category: 'glitch',
      gradient: 'from-rose-600 via-slate-700 to-cyan-600',
      icon: '📶',
    },
    {
      id: 'asciiMatrix',
      label: 'Terminal Retro',
      desc: 'Matriz fósforo verde estilo consola',
      category: 'glitch',
      gradient: 'from-emerald-400 via-green-700 to-black',
      icon: '⌨️',
    },
    {
      id: 'vhsDamaged',
      label: 'VHS Dañado',
      desc: 'Pliegue de cinta y ruido magnético',
      category: 'glitch',
      gradient: 'from-purple-700 via-rose-600 to-zinc-900',
      icon: '📼',
    },
    {
      id: 'laserGrid',
      label: 'Rejilla Synthwave',
      desc: 'Cuadrícula láser retro de los 80',
      category: 'light',
      gradient: 'from-fuchsia-600 via-purple-700 to-cyan-500',
      icon: '🕸️',
    },
    {
      id: 'spotlight',
      label: 'Foco Teatral',
      desc: 'Luz de escenario móvil centrada',
      category: 'light',
      gradient: 'from-amber-200 via-slate-700 to-black',
      icon: '🔦',
    },
    {
      id: 'discoLights',
      label: 'Luces de Discoteca',
      desc: 'Haces multicolores giratorios',
      category: 'light',
      gradient: 'from-pink-500 via-amber-400 to-indigo-600',
      icon: '🪩',
    },
    {
      id: 'policeSiren',
      label: 'Sirena Policial',
      desc: 'Destellos alternos rojo y azul',
      category: 'light',
      gradient: 'from-red-600 via-slate-900 to-blue-600',
      icon: '🚓',
    },
    {
      id: 'candlelight',
      label: 'Luz de Vela',
      desc: 'Resplandor íntimo cálido parpadeante',
      category: 'light',
      gradient: 'from-amber-400 via-orange-700 to-stone-950',
      icon: '🕯️',
    },
    {
      id: 'projector8mm',
      label: 'Proyector 8mm',
      desc: 'Cine vintage sepia con parpadeo',
      category: 'light',
      gradient: 'from-amber-700 via-stone-700 to-zinc-950',
      icon: '📽️',
    },
    {
      id: 'godRays',
      label: 'Rayos Divinos',
      desc: 'Haces de luz celestial desde arriba',
      category: 'light',
      gradient: 'from-yellow-200 via-amber-400 to-slate-800',
      icon: '🌤️',
    },
    {
      id: 'vaporwave',
      label: 'Estética Vaporwave',
      desc: 'Tonos pastel rosa, cian y scanlines',
      category: 'light',
      gradient: 'from-pink-400 via-purple-500 to-cyan-400',
      icon: '🌴',
    },
    {
      id: 'noirShadow',
      label: 'Cine Noir',
      desc: 'Blanco y negro de alto contraste',
      category: 'light',
      gradient: 'from-zinc-200 via-zinc-600 to-black',
      icon: '🕵️',
    },
    {
      id: 'goldenSparkle',
      label: 'Lluvia de Oro',
      desc: 'Destellos champán y brillo lujo',
      category: 'light',
      gradient: 'from-yellow-300 via-amber-500 to-stone-900',
      icon: '🥂',
    },
    {
      id: 'pulseWave',
      label: 'Onda Expansiva',
      desc: 'Anillo de choque con refracción',
      category: 'lens',
      gradient: 'from-cyan-400 via-blue-600 to-indigo-900',
      icon: '💫',
    },
    {
      id: 'oilPainting',
      label: 'Pintura al Óleo',
      desc: 'Trazos artísticos suavizados',
      category: 'lens',
      gradient: 'from-amber-500 via-emerald-600 to-indigo-700',
      icon: '🖼️',
    },
    {
      id: 'watercolor',
      label: 'Acuarela Suave',
      desc: 'Difuminado pastel sobre papel',
      category: 'lens',
      gradient: 'from-rose-300 via-sky-300 to-teal-400',
      icon: '🖌️',
    },
    {
      id: 'emboss3D',
      label: 'Relieve 3D',
      desc: 'Esculpido metálico direccional',
      category: 'lens',
      gradient: 'from-slate-300 via-slate-500 to-slate-800',
      icon: '🗿',
    },
    {
      id: 'mosaicGlass',
      label: 'Vitral Mosaico',
      desc: 'Celdas de cristal facetado',
      category: 'lens',
      gradient: 'from-violet-500 via-sky-500 to-emerald-500',
      icon: '💠',
    },
    {
      id: 'swirlVortex',
      label: 'Vórtice Espiral',
      desc: 'Remolino hipnótico en el centro',
      category: 'lens',
      gradient: 'from-purple-600 via-indigo-700 to-cyan-600',
      icon: '🌀',
    },
    {
      id: 'tunnelZoom',
      label: 'Túnel Hiperespacio',
      desc: 'Distorsión radial de velocidad',
      category: 'lens',
      gradient: 'from-sky-500 via-indigo-700 to-black',
      icon: '🚀',
    },
    {
      id: 'mirrorQuad',
      label: 'Espejo Cuádruple',
      desc: 'Simetría perfecta en 4 cuadrantes',
      category: 'lens',
      gradient: 'from-teal-500 via-indigo-600 to-purple-700',
      icon: '🪟',
    },
    {
      id: 'miniatureBlur',
      label: 'Desenfoque Suave',
      desc: 'Lente soft-focus cinematográfico',
      category: 'lens',
      gradient: 'from-pink-400 via-purple-500 to-indigo-600',
      icon: '📷',
    },
    {
      id: 'thermalNight',
      label: 'Visión Depredador',
      desc: 'Mapa térmico + retícula HUD',
      category: 'lens',
      gradient: 'from-blue-700 via-emerald-500 to-red-600',
      icon: '🎯',
    },
  ...PARAMETRIC_EFFECT_LIST.map((fx) => ({
    id: fx.id,
    label: fx.label,
    desc: fx.badge,
    category: fx.category,
    gradient: fx.gradient,
    icon: fx.icon,
  })),
];

export const TransitionsTab: React.FC<TransitionsTabProps> = ({
  clip,
  initialSubTab = 'transitions',
}) => {
  const {
    updateClip,
    updateAllVisualClips,
    setCurrentTime,
    setIsPlaying,
    tracks,
    showToast,
    splitClip,
  } = useEditorStore(
    useShallow((s) => ({
      updateClip: s.updateClip,
      updateAllVisualClips: s.updateAllVisualClips,
      setCurrentTime: s.setCurrentTime,
      setIsPlaying: s.setIsPlaying,
      tracks: s.project.tracks,
      showToast: s.showToast,
      splitClip: s.splitClip,
    }))
  );

  const [subTab, setSubTab] = useState<'transitions' | 'fx'>(initialSubTab);
  const [transCategory, setTransCategory] = useState<TransCategory>('all');
  const [fxCategory, setFxCategory] = useState<FxCategory>('all');

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const transition = clip.transition || {
    type: 'none',
    duration: 0.7,
  };

  const effect = clip.effect || {
    type: 'none',
    intensity: 65,
    speed: 50,
  };

  const { sortedTrackClips, clipIdx } = useMemo(() => {
    const parentTrack = tracks.find((t) => t.id === clip.trackId);
    const sorted = parentTrack
      ? [...parentTrack.clips].sort((a, b) => a.startTime - b.startTime)
      : [];
    return {
      sortedTrackClips: sorted,
      clipIdx: sorted.findIndex((c) => c.id === clip.id),
    };
  }, [tracks, clip.trackId, clip.id]);

  const previewTransition = (
    newType: TransitionType,
    dur = transition.duration
  ) => {
    updateClip(clip.id, {
      transition: { type: newType, duration: dur },
    });

    if (newType !== 'none') {
      globalAudioEngine.init();
      const previewStart =
        clipIdx > 0 ? Math.max(0, clip.startTime - 0.5) : clip.startTime;
      setCurrentTime(previewStart);
      setIsPlaying(true);
      const found = TRANSITION_LIST.find((t) => t.id === newType);
      showToast(`✨ Transición "${found?.label || newType}" aplicada`);
    } else {
      showToast('Transición desactivada');
    }
  };

  const handleSplitAndApplyTransition = () => {
    const chosenType =
      transition.type !== 'none' ? transition.type : 'zoomInBlur';
    const chosenDur = transition.duration || 0.7;
    splitClip(clip.id);

    setTimeout(() => {
      const state = useEditorStore.getState();
      const newSelectedId = state.selectedClipId;
      if (newSelectedId) {
        state.updateClip(newSelectedId, {
          transition: { type: chosenType, duration: chosenDur },
        });
        const newClip = state.project.tracks
          .flatMap((t) => t.clips)
          .find((c) => c.id === newSelectedId);
        if (newClip) {
          globalAudioEngine.init();
          state.setCurrentTime(Math.max(0, newClip.startTime - 0.4));
          state.setIsPlaying(true);
          state.showToast('✂️ Clip dividido y transición aplicada en el corte');
        }
      }
    }, 30);
  };

  const applyTransitionToAllClips = () => {
    updateAllVisualClips({ transition: { ...transition } });
    showToast('✨ Transición aplicada a todos los clips del proyecto');
  };

  const handleEffectUpdate = (partial: Partial<typeof effect>) => {
    const updated = {
      type: partial.type ?? effect.type,
      intensity: partial.intensity ?? effect.intensity ?? 65,
      speed: partial.speed ?? effect.speed ?? 50,
    };
    updateClip(clip.id, { effect: updated });
    if (partial.type && partial.type !== 'none') {
      globalAudioEngine.init();
      const curT = useEditorStore.getState().currentTime;
      if (curT < clip.startTime || curT >= clip.startTime + clip.duration) {
        setCurrentTime(clip.startTime);
      }
      setIsPlaying(true);
      const found = FX_LIST.find((f) => f.id === partial.type);
      showToast(`⚡ Efecto "${found?.label || partial.type}" activado`);
    }
  };

  const applyEffectToAllClips = () => {
    updateAllVisualClips({ effect: { ...effect } });
    showToast('⚡ Efecto visual aplicado a todos los clips');
  };

  const visibleTransitions = useMemo(
    () =>
      TRANSITION_LIST.filter(
        (t) =>
          transCategory === 'all' ||
          t.id === 'none' ||
          t.category === transCategory
      ),
    [transCategory]
  );

  const visibleFx = useMemo(
    () =>
      FX_LIST.filter(
        (f) =>
          fxCategory === 'all' || f.id === 'none' || f.category === fxCategory
      ),
    [fxCategory]
  );

  return (
    <div className="space-y-2 p-2.5 text-xs text-slate-300">
      {/* Sub-navigation: Transiciones vs Efectos Visuales */}
      <div className="flex bg-[#141622] p-0.5 rounded-xl border border-white/10">
        <button
          onClick={() => setSubTab('transitions')}
          className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'transitions'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Transiciones ({TRANSITION_LIST.length - 1})</span>
        </button>
        <button
          onClick={() => setSubTab('fx')}
          className={`flex-1 py-1 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
            subTab === 'fx'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Efectos FX ({FX_LIST.length - 1})</span>
        </button>
      </div>

      {subTab === 'transitions' ? (
        <>
          {/* Smart Helper when user has only 1 clip or selected the first clip */}
          {sortedTrackClips.length <= 1 && (
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2">
              <span className="text-[11px] text-indigo-200 leading-tight">
                💡 <b>Tip Pro:</b> Divide tu clip en 2 partes para ver la transición fusionando ambas escenas.
              </span>
              <button
                onClick={handleSplitAndApplyTransition}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 shadow"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Dividir y Aplicar</span>
              </button>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'camera', label: '🎥 Cámara / Blur' },
              { id: 'light', label: '✨ Luz y Cine' },
              { id: '3d', label: '🧊 3D y Formas' },
              { id: 'glitch', label: '⚡ Glitch / Onda' },
              { id: 'wipe', label: '📐 Cortes / Barridos' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setTransCategory(cat.id as TransCategory)}
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] whitespace-nowrap transition-all ${
                  transCategory === cat.id
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Transitions Horizontal Strip */}
          <HorizontalScrollRow>
            {visibleTransitions.map((t) => {
              const isSelected = transition.type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => previewTransition(t.id)}
                  className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl font-medium text-left border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${t.gradient} flex items-center justify-center text-base shrink-0 shadow-inner border border-white/15`}
                  >
                    {t.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">
                      {t.label}
                    </div>
                    <div className="text-[9px] text-indigo-300/90 truncate">
                      {t.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </HorizontalScrollRow>

          {transition.type !== 'none' && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-300 font-semibold whitespace-nowrap">
                  Duración
                </span>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={transition.duration}
                  onChange={(e) =>
                    updateClip(clip.id, {
                      transition: {
                        type: transition.type,
                        duration: Number(e.target.value),
                      },
                    })
                  }
                  className="flex-1 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-indigo-400 font-bold text-[11px] w-8 text-right shrink-0">
                  {transition.duration.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => previewTransition(transition.type)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 font-bold flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Repetir Vista Previa</span>
                </button>
                <button
                  onClick={applyTransitionToAllClips}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Aplicar a Todos</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* FX Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'fire', label: '🔥 Fuego / Llamas' },
              { id: 'nature', label: '🌤️ Día, Noche y Clima' },
              { id: 'glitch', label: '⚡ Glitch / VHS' },
              { id: 'light', label: '🔮 Neón y Destellos' },
              { id: 'particles', label: '✨ Partículas' },
              { id: 'lens', label: '💠 Lentes y Óptica' },
              { id: 'art', label: '🎨 Arte y Cine Retro' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFxCategory(cat.id as FxCategory)}
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] whitespace-nowrap transition-all ${
                  fxCategory === cat.id
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Visual FX Horizontal Strip */}
          <HorizontalScrollRow>
            {visibleFx.map((fx) => {
              const isSelected = effect.type === fx.id;
              return (
                <button
                  key={fx.id}
                  onClick={() => handleEffectUpdate({ type: fx.id })}
                  className={`shrink-0 w-[138px] sm:w-[148px] snap-start p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-purple-600/30 border-purple-400 text-white shadow-lg ring-1 ring-purple-400'
                      : 'bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${fx.gradient} flex items-center justify-center text-base shrink-0 shadow-inner border border-white/15`}
                  >
                    {fx.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[11px] truncate">
                      {fx.label}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {fx.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </HorizontalScrollRow>

          {effect.type !== 'none' && (
            <div className="pt-2.5 border-t border-white/10 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>Intensidad del Efecto</span>
                    <span className="font-mono text-purple-400 font-bold">
                      {effect.intensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={effect.intensity}
                    onChange={(e) =>
                      handleEffectUpdate({ intensity: Number(e.target.value) })
                    }
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-semibold mb-1">
                    <span>Velocidad / Frecuencia</span>
                    <span className="font-mono text-pink-400 font-bold">
                      {effect.speed ?? 50}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={effect.speed ?? 50}
                    onChange={(e) =>
                      handleEffectUpdate({ speed: Number(e.target.value) })
                    }
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={applyEffectToAllClips}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600/25 border border-purple-500/40 text-purple-200 hover:bg-purple-600/40 font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Aplicar a Todos los Clips</span>
                </button>
                <button
                  onClick={() => handleEffectUpdate({ type: 'none' })}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-semibold flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Quitar</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
