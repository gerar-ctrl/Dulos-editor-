// ============================================================================
// voiceFilters.ts - 50 Parametric Voice Filters & Web Audio DSP Engine
// Works identically in real-time AudioContext (playback & preview) and
// OfflineAudioContext (MP4 / MP3 / WAV export) on PC (Electron) & Android APK.
// ============================================================================

import { VoiceFilter } from '../../types/editor';

export type VoiceFilterCategory =
  | 'all'
  | 'people'
  | 'fun'
  | 'scifi'
  | 'fantasy'
  | 'devices'
  | 'spaces';

export interface VoiceFilterCategoryInfo {
  id: VoiceFilterCategory;
  label: string;
}

export const VOICE_FILTER_CATEGORIES: VoiceFilterCategoryInfo[] = [
  { id: 'all', label: 'Todos (50)' },
  { id: 'people', label: 'Personas' },
  { id: 'fun', label: 'Divertidos' },
  { id: 'scifi', label: 'Sci-Fi' },
  { id: 'fantasy', label: 'Fantasía' },
  { id: 'devices', label: 'Dispositivos' },
  { id: 'spaces', label: 'Espacios' },
];

export interface EqStage {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
  gain?: number;
}

export interface VoiceFilterDspParams {
  pitchSemitones?: number;
  eq?: EqStage[];
  vibrato?: {
    rateHz: number;
    depthSec: number;
    waveform?: OscillatorType;
  };
  tremolo?: {
    rateHz: number;
    depth: number;
    waveform?: OscillatorType;
    ringMod?: boolean;
  };
  distortion?: {
    amount: number;
  };
  comb?: {
    delaySec: number;
    feedback: number;
    mix?: number;
  };
  echo?: {
    delaySec: number;
    feedback: number;
    mix: number;
    secondTapSec?: number;
  };
  chorus?: {
    rateHz: number;
    depthSec: number;
    delaySec: number;
    mix: number;
  };
  outputGain?: number;
}

export interface VoiceFilterDefinition {
  id: VoiceFilter;
  label: string;
  emoji: string;
  category: Exclude<VoiceFilterCategory, 'all'>;
  description: string;
  dsp: VoiceFilterDspParams;
}

export const VOICE_FILTERS: VoiceFilterDefinition[] = [
  // ==========================================================================
  // 1. PERSONAS Y EDADES (10)
  // ==========================================================================
  {
    id: 'child',
    label: 'Niño',
    emoji: '🧒',
    category: 'people',
    description: 'Voz infantil aguda y brillante',
    dsp: {
      pitchSemitones: 5.5,
      eq: [
        { type: 'highpass', frequency: 180 },
        { type: 'peaking', frequency: 2800, Q: 1.4, gain: 4.5 },
        { type: 'highshelf', frequency: 5000, gain: 3 },
      ],
      outputGain: 1.05,
    },
  },
  {
    id: 'baby',
    label: 'Bebé',
    emoji: '👶',
    category: 'people',
    description: 'Voz muy aguda y tierna',
    dsp: {
      pitchSemitones: 8.0,
      eq: [
        { type: 'highpass', frequency: 260 },
        { type: 'peaking', frequency: 3200, Q: 1.6, gain: 6 },
      ],
      vibrato: { rateHz: 4.5, depthSec: 0.0012, waveform: 'sine' },
      outputGain: 1.08,
    },
  },
  {
    id: 'woman',
    label: 'Mujer',
    emoji: '👩',
    category: 'people',
    description: 'Tono femenino claro y cálido',
    dsp: {
      pitchSemitones: 3.8,
      eq: [
        { type: 'highpass', frequency: 140 },
        { type: 'peaking', frequency: 2400, Q: 1.2, gain: 4 },
        { type: 'lowshelf', frequency: 240, gain: -3.5 },
      ],
      outputGain: 1.05,
    },
  },
  {
    id: 'man',
    label: 'Hombre Grave',
    emoji: '👨',
    category: 'people',
    description: 'Voz masculina profunda y firme',
    dsp: {
      pitchSemitones: -3.5,
      eq: [
        { type: 'lowshelf', frequency: 220, gain: 6.5 },
        { type: 'peaking', frequency: 950, Q: 1.0, gain: -2 },
        { type: 'highshelf', frequency: 4500, gain: -2 },
      ],
      outputGain: 1.05,
    },
  },
  {
    id: 'elderly',
    label: 'Anciano',
    emoji: '👴',
    category: 'people',
    description: 'Voz mayor con temblor natural',
    dsp: {
      pitchSemitones: -2.2,
      eq: [
        { type: 'highpass', frequency: 130 },
        { type: 'peaking', frequency: 1250, Q: 2.2, gain: 5.5 },
        { type: 'lowpass', frequency: 3400 },
      ],
      vibrato: { rateHz: 5.8, depthSec: 0.0022, waveform: 'sine' },
      tremolo: { rateHz: 5.6, depth: 0.18, waveform: 'sine' },
      outputGain: 1.1,
    },
  },
  {
    id: 'elderly_woman',
    label: 'Anciana',
    emoji: '👵',
    category: 'people',
    description: 'Voz de abuela cálida y trémula',
    dsp: {
      pitchSemitones: 2.2,
      eq: [
        { type: 'highpass', frequency: 190 },
        { type: 'peaking', frequency: 1650, Q: 2.0, gain: 5 },
        { type: 'lowpass', frequency: 3800 },
      ],
      vibrato: { rateHz: 6.0, depthSec: 0.002, waveform: 'sine' },
      tremolo: { rateHz: 5.8, depth: 0.16, waveform: 'sine' },
      outputGain: 1.1,
    },
  },
  {
    id: 'teen',
    label: 'Adolescente',
    emoji: '🧑',
    category: 'people',
    description: 'Voz juvenil fresca y enérgica',
    dsp: {
      pitchSemitones: 2.0,
      eq: [
        { type: 'highpass', frequency: 120 },
        { type: 'peaking', frequency: 2600, Q: 1.1, gain: 3.5 },
      ],
      outputGain: 1.05,
    },
  },
  {
    id: 'drunk',
    label: 'Borracho',
    emoji: '🥴',
    category: 'people',
    description: 'Voz mareada con vaivén lento',
    dsp: {
      pitchSemitones: -1.8,
      eq: [
        { type: 'lowshelf', frequency: 280, gain: 4 },
        { type: 'lowpass', frequency: 2800 },
      ],
      vibrato: { rateHz: 1.5, depthSec: 0.0085, waveform: 'sine' },
      chorus: { rateHz: 0.9, depthSec: 0.005, delaySec: 0.025, mix: 0.3 },
      outputGain: 1.05,
    },
  },
  {
    id: 'sleepy',
    label: 'Somnoliento',
    emoji: '😴',
    category: 'people',
    description: 'Voz baja, suave y apagada',
    dsp: {
      pitchSemitones: -2.8,
      eq: [
        { type: 'lowshelf', frequency: 250, gain: 5 },
        { type: 'lowpass', frequency: 2100 },
      ],
      vibrato: { rateHz: 0.8, depthSec: 0.003, waveform: 'sine' },
      outputGain: 1.05,
    },
  },
  {
    id: 'nervous',
    label: 'Nervioso',
    emoji: '😬',
    category: 'people',
    description: 'Voz acelerada y temblorosa',
    dsp: {
      pitchSemitones: 2.5,
      eq: [
        { type: 'highpass', frequency: 180 },
        { type: 'peaking', frequency: 2200, Q: 1.8, gain: 4 },
      ],
      vibrato: { rateHz: 9.5, depthSec: 0.0024, waveform: 'sine' },
      tremolo: { rateHz: 9.5, depth: 0.25, waveform: 'sine' },
      outputGain: 1.08,
    },
  },

  // ==========================================================================
  // 2. DIVERTIDOS Y ANIMALES (9)
  // ==========================================================================
  {
    id: 'chipmunk',
    label: 'Ardilla',
    emoji: '🐿️',
    category: 'fun',
    description: 'Súper agudo estilo ardilla',
    dsp: {
      pitchSemitones: 9.5,
      eq: [
        { type: 'highpass', frequency: 320 },
        { type: 'peaking', frequency: 3400, Q: 1.5, gain: 5 },
      ],
      outputGain: 1.1,
    },
  },
  {
    id: 'helium',
    label: 'Helio',
    emoji: '🎈',
    category: 'fun',
    description: 'Efecto globo de helio agudo',
    dsp: {
      pitchSemitones: 7.5,
      eq: [
        { type: 'highpass', frequency: 280 },
        { type: 'peaking', frequency: 3800, Q: 2.0, gain: 7 },
      ],
      outputGain: 1.08,
    },
  },
  {
    id: 'minion',
    label: 'Mini Caricatura',
    emoji: '🟡',
    category: 'fun',
    description: 'Voz caricaturesca chistosa',
    dsp: {
      pitchSemitones: 6.5,
      eq: [
        { type: 'peaking', frequency: 1900, Q: 3.0, gain: 7.5 },
        { type: 'highpass', frequency: 220 },
      ],
      vibrato: { rateHz: 7.0, depthSec: 0.0018, waveform: 'sine' },
      outputGain: 1.08,
    },
  },
  {
    id: 'duck',
    label: 'Pato',
    emoji: '🦆',
    category: 'fun',
    description: 'Voz nasal graznante divertida',
    dsp: {
      pitchSemitones: 4.0,
      eq: [
        { type: 'bandpass', frequency: 1450, Q: 3.5 },
        { type: 'peaking', frequency: 2600, Q: 4.0, gain: 8 },
      ],
      distortion: { amount: 18 },
      outputGain: 1.35,
    },
  },
  {
    id: 'bee',
    label: 'Abeja',
    emoji: '🐝',
    category: 'fun',
    description: 'Zumbido agudo y vibrante',
    dsp: {
      pitchSemitones: 8.5,
      eq: [{ type: 'highpass', frequency: 350 }],
      tremolo: { rateHz: 42, depth: 0.55, waveform: 'sawtooth', ringMod: true },
      outputGain: 1.15,
    },
  },
  {
    id: 'frog',
    label: 'Rana',
    emoji: '🐸',
    category: 'fun',
    description: 'Voz grave y croante',
    dsp: {
      pitchSemitones: -4.5,
      eq: [
        { type: 'bandpass', frequency: 650, Q: 2.2 },
        { type: 'lowshelf', frequency: 280, gain: 8 },
      ],
      tremolo: { rateHz: 22, depth: 0.45, waveform: 'sine' },
      outputGain: 1.3,
    },
  },
  {
    id: 'giant',
    label: 'Gigante',
    emoji: '🗿',
    category: 'fun',
    description: 'Voz colosal y retumbante',
    dsp: {
      pitchSemitones: -7.0,
      eq: [
        { type: 'lowshelf', frequency: 180, gain: 10 },
        { type: 'lowpass', frequency: 2600 },
      ],
      echo: { delaySec: 0.14, feedback: 0.3, mix: 0.3 },
      outputGain: 1.1,
    },
  },
  {
    id: 'ogre',
    label: 'Ogro',
    emoji: '👹',
    category: 'fun',
    description: 'Voz ronca, pesada y gruñona',
    dsp: {
      pitchSemitones: -6.0,
      eq: [
        { type: 'lowshelf', frequency: 220, gain: 9 },
        { type: 'peaking', frequency: 700, Q: 1.8, gain: 5 },
      ],
      distortion: { amount: 28 },
      outputGain: 1.0,
    },
  },
  {
    id: 'clown',
    label: 'Payaso',
    emoji: '🤡',
    category: 'fun',
    description: 'Voz aguda, nasal y burlona',
    dsp: {
      pitchSemitones: 5.0,
      eq: [
        { type: 'peaking', frequency: 1700, Q: 3.2, gain: 8 },
        { type: 'highpass', frequency: 240 },
      ],
      vibrato: { rateHz: 5.5, depthSec: 0.0032, waveform: 'sine' },
      outputGain: 1.05,
    },
  },

  // ==========================================================================
  // 3. CIENCIA FICCIÓN Y ROBOTS (9)
  // ==========================================================================
  {
    id: 'robot',
    label: 'Robot',
    emoji: '🤖',
    category: 'scifi',
    description: 'Voz metálica y robótica clásica',
    dsp: {
      eq: [
        { type: 'peaking', frequency: 950, Q: 6.0, gain: 12 },
        { type: 'highpass', frequency: 180 },
      ],
      comb: { delaySec: 0.016, feedback: 0.68, mix: 0.85 },
      tremolo: { rateHz: 55, depth: 0.55, waveform: 'square', ringMod: true },
      outputGain: 1.05,
    },
  },
  {
    id: 'martian',
    label: 'Marciano',
    emoji: '👽',
    category: 'scifi',
    description: 'Modulación espacial vibrante',
    dsp: {
      pitchSemitones: 3.5,
      eq: [
        { type: 'peaking', frequency: 1800, Q: 3.5, gain: 7 },
        { type: 'highpass', frequency: 220 },
      ],
      vibrato: { rateHz: 14.0, depthSec: 0.0045, waveform: 'sine' },
      tremolo: { rateHz: 28, depth: 0.45, waveform: 'sine', ringMod: true },
      echo: { delaySec: 0.16, feedback: 0.35, mix: 0.3 },
      outputGain: 1.1,
    },
  },
  {
    id: 'alien',
    label: 'Alienígena',
    emoji: '🛸',
    category: 'scifi',
    description: 'Voz extraterrestre misteriosa',
    dsp: {
      pitchSemitones: -3.0,
      eq: [{ type: 'bandpass', frequency: 1300, Q: 1.8 }],
      vibrato: { rateHz: 9.0, depthSec: 0.0055, waveform: 'triangle' },
      comb: { delaySec: 0.022, feedback: 0.55, mix: 0.6 },
      echo: { delaySec: 0.22, feedback: 0.4, mix: 0.35 },
      outputGain: 1.2,
    },
  },
  {
    id: 'cyborg',
    label: 'Cyborg',
    emoji: '🦾',
    category: 'scifi',
    description: 'Mitad humano, mitad máquina',
    dsp: {
      pitchSemitones: -2.0,
      eq: [
        { type: 'lowshelf', frequency: 240, gain: 5 },
        { type: 'peaking', frequency: 1400, Q: 4.0, gain: 7 },
      ],
      comb: { delaySec: 0.012, feedback: 0.6, mix: 0.65 },
      distortion: { amount: 22 },
      outputGain: 1.0,
    },
  },
  {
    id: 'android',
    label: 'Androide',
    emoji: '🔋',
    category: 'scifi',
    description: 'Voz sintética limpia y fría',
    dsp: {
      pitchSemitones: 1.0,
      eq: [
        { type: 'highpass', frequency: 200 },
        { type: 'peaking', frequency: 2100, Q: 5.0, gain: 9 },
      ],
      comb: { delaySec: 0.009, feedback: 0.62, mix: 0.7 },
      outputGain: 1.05,
    },
  },
  {
    id: 'astronaut',
    label: 'Astronauta',
    emoji: '👨‍🚀',
    category: 'scifi',
    description: 'Comunicación de casco espacial',
    dsp: {
      eq: [
        { type: 'bandpass', frequency: 1650, Q: 2.6 },
        { type: 'peaking', frequency: 2500, Q: 3.0, gain: 6 },
      ],
      distortion: { amount: 25 },
      echo: { delaySec: 0.09, feedback: 0.22, mix: 0.22 },
      outputGain: 1.35,
    },
  },
  {
    id: 'transformer',
    label: 'Titán Mecánico',
    emoji: '⚙️',
    category: 'scifi',
    description: 'Robot gigante ultra grave',
    dsp: {
      pitchSemitones: -6.5,
      eq: [
        { type: 'lowshelf', frequency: 200, gain: 9 },
        { type: 'peaking', frequency: 1100, Q: 4.5, gain: 8 },
      ],
      comb: { delaySec: 0.019, feedback: 0.65, mix: 0.75 },
      tremolo: { rateHz: 35, depth: 0.4, waveform: 'sawtooth', ringMod: true },
      outputGain: 1.05,
    },
  },
  {
    id: 'hologram',
    label: 'Holograma',
    emoji: '💠',
    category: 'scifi',
    description: 'Transmisión futurista etérea',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 420 },
        { type: 'lowpass', frequency: 4200 },
        { type: 'peaking', frequency: 2200, Q: 3.5, gain: 6 },
      ],
      tremolo: { rateHz: 16, depth: 0.32, waveform: 'sine' },
      echo: { delaySec: 0.12, feedback: 0.35, mix: 0.32 },
      outputGain: 1.2,
    },
  },
  {
    id: 'space',
    label: 'Espacial',
    emoji: '🌌',
    category: 'scifi',
    description: 'Voz flotando en el cosmos',
    dsp: {
      pitchSemitones: -1.0,
      chorus: { rateHz: 0.6, depthSec: 0.006, delaySec: 0.024, mix: 0.5 },
      echo: { delaySec: 0.32, feedback: 0.55, mix: 0.48, secondTapSec: 0.49 },
      outputGain: 1.0,
    },
  },

  // ==========================================================================
  // 4. TERROR Y FANTASÍA (8)
  // ==========================================================================
  {
    id: 'demon',
    label: 'Demonio',
    emoji: '😈',
    category: 'fantasy',
    description: 'Voz infernal grave y distorsionada',
    dsp: {
      pitchSemitones: -8.0,
      eq: [
        { type: 'lowshelf', frequency: 190, gain: 11 },
        { type: 'peaking', frequency: 1400, Q: 2.0, gain: 5 },
      ],
      distortion: { amount: 45 },
      echo: { delaySec: 0.16, feedback: 0.38, mix: 0.35 },
      outputGain: 0.95,
    },
  },
  {
    id: 'monster',
    label: 'Monstruo',
    emoji: '👾',
    category: 'fantasy',
    description: 'Voz bestial profunda y rugiente',
    dsp: {
      pitchSemitones: -7.5,
      eq: [
        { type: 'lowshelf', frequency: 210, gain: 10 },
        { type: 'lowpass', frequency: 2800 },
      ],
      tremolo: { rateHz: 26, depth: 0.45, waveform: 'sawtooth', ringMod: true },
      distortion: { amount: 30 },
      outputGain: 1.0,
    },
  },
  {
    id: 'ghost',
    label: 'Fantasma',
    emoji: '👻',
    category: 'fantasy',
    description: 'Voz espectral con eco fantasmal',
    dsp: {
      pitchSemitones: 1.5,
      eq: [
        { type: 'highpass', frequency: 320 },
        { type: 'lowpass', frequency: 3200 },
      ],
      vibrato: { rateHz: 2.8, depthSec: 0.005, waveform: 'sine' },
      echo: { delaySec: 0.28, feedback: 0.58, mix: 0.55, secondTapSec: 0.44 },
      outputGain: 1.1,
    },
  },
  {
    id: 'vampire',
    label: 'Vampiro',
    emoji: '🧛',
    category: 'fantasy',
    description: 'Voz oscura, hipnótica y elegante',
    dsp: {
      pitchSemitones: -3.2,
      eq: [
        { type: 'lowshelf', frequency: 240, gain: 7 },
        { type: 'highshelf', frequency: 3500, gain: 4 },
      ],
      chorus: { rateHz: 1.2, depthSec: 0.003, delaySec: 0.018, mix: 0.35 },
      echo: { delaySec: 0.2, feedback: 0.35, mix: 0.3 },
      outputGain: 1.05,
    },
  },
  {
    id: 'witch',
    label: 'Bruja',
    emoji: '🧙‍♀️',
    category: 'fantasy',
    description: 'Voz rasposa y hechicera',
    dsp: {
      pitchSemitones: 3.0,
      eq: [
        { type: 'highpass', frequency: 260 },
        { type: 'peaking', frequency: 2100, Q: 3.2, gain: 8 },
      ],
      vibrato: { rateHz: 6.5, depthSec: 0.003, waveform: 'triangle' },
      distortion: { amount: 22 },
      outputGain: 1.08,
    },
  },
  {
    id: 'zombie',
    label: 'Zombi',
    emoji: '🧟',
    category: 'fantasy',
    description: 'Voz cavernosa y tambaleante',
    dsp: {
      pitchSemitones: -5.5,
      eq: [
        { type: 'lowshelf', frequency: 260, gain: 7 },
        { type: 'lowpass', frequency: 2200 },
      ],
      vibrato: { rateHz: 2.2, depthSec: 0.007, waveform: 'sine' },
      distortion: { amount: 24 },
      outputGain: 1.05,
    },
  },
  {
    id: 'angel',
    label: 'Ángel',
    emoji: '👼',
    category: 'fantasy',
    description: 'Voz celestial brillante y coral',
    dsp: {
      pitchSemitones: 2.5,
      eq: [
        { type: 'highpass', frequency: 180 },
        { type: 'highshelf', frequency: 4000, gain: 6.5 },
      ],
      chorus: { rateHz: 1.1, depthSec: 0.0045, delaySec: 0.022, mix: 0.55 },
      echo: { delaySec: 0.26, feedback: 0.48, mix: 0.45, secondTapSec: 0.41 },
      outputGain: 1.05,
    },
  },
  {
    id: 'fairy',
    label: 'Hada',
    emoji: '🧚',
    category: 'fantasy',
    description: 'Voz mágica, aguda y cristalina',
    dsp: {
      pitchSemitones: 6.8,
      eq: [
        { type: 'highpass', frequency: 300 },
        { type: 'highshelf', frequency: 4200, gain: 6 },
      ],
      chorus: { rateHz: 2.5, depthSec: 0.003, delaySec: 0.015, mix: 0.45 },
      echo: { delaySec: 0.18, feedback: 0.4, mix: 0.35 },
      outputGain: 1.08,
    },
  },

  // ==========================================================================
  // 5. DISPOSITIVOS Y RETRO (7)
  // ==========================================================================
  {
    id: 'radio',
    label: 'Walkie-Talkie',
    emoji: '📻',
    category: 'devices',
    description: 'Radio policial y comunicaciones',
    dsp: {
      eq: [
        { type: 'bandpass', frequency: 1800, Q: 3.2 },
        { type: 'highpass', frequency: 500 },
      ],
      distortion: { amount: 30 },
      outputGain: 1.4,
    },
  },
  {
    id: 'telephone',
    label: 'Teléfono',
    emoji: '📞',
    category: 'devices',
    description: 'Llamada telefónica clásica',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 450 },
        { type: 'lowpass', frequency: 2900 },
        { type: 'peaking', frequency: 1600, Q: 2.0, gain: 6 },
      ],
      distortion: { amount: 14 },
      outputGain: 1.25,
    },
  },
  {
    id: 'megaphone',
    label: 'Megáfono',
    emoji: '📢',
    category: 'devices',
    description: 'Altavoz de calle potente',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 520 },
        { type: 'lowpass', frequency: 3600 },
        { type: 'peaking', frequency: 2000, Q: 3.2, gain: 10 },
      ],
      distortion: { amount: 52 },
      echo: { delaySec: 0.11, feedback: 0.25, mix: 0.22 },
      outputGain: 1.15,
    },
  },
  {
    id: 'vintage_radio',
    label: 'Radio 1940',
    emoji: '🎙️',
    category: 'devices',
    description: 'Locutor de radio antigua',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 380 },
        { type: 'lowpass', frequency: 3200 },
        { type: 'peaking', frequency: 1350, Q: 2.4, gain: 7.5 },
      ],
      distortion: { amount: 20 },
      outputGain: 1.25,
    },
  },
  {
    id: 'retro_8bit',
    label: 'Retro 8-Bit',
    emoji: '🕹️',
    category: 'devices',
    description: 'Consola arcade y videojuegos',
    dsp: {
      pitchSemitones: 2.0,
      eq: [{ type: 'bandpass', frequency: 1600, Q: 1.8 }],
      tremolo: { rateHz: 68, depth: 0.65, waveform: 'square', ringMod: true },
      distortion: { amount: 60 },
      outputGain: 1.05,
    },
  },
  {
    id: 'tv_static',
    label: 'TV Antigua',
    emoji: '📺',
    category: 'devices',
    description: 'Televisor viejo con interferencia',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 420 },
        { type: 'lowpass', frequency: 3100 },
      ],
      tremolo: { rateHz: 50, depth: 0.22, waveform: 'sawtooth' },
      distortion: { amount: 34 },
      outputGain: 1.2,
    },
  },
  {
    id: 'intercom',
    label: 'Intercomunicador',
    emoji: '🏢',
    category: 'devices',
    description: 'Anuncio de aeropuerto o edificio',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 480 },
        { type: 'lowpass', frequency: 3400 },
        { type: 'peaking', frequency: 1900, Q: 2.5, gain: 7 },
      ],
      distortion: { amount: 18 },
      echo: { delaySec: 0.19, feedback: 0.38, mix: 0.38 },
      outputGain: 1.25,
    },
  },

  // ==========================================================================
  // 6. ESPACIOS Y EFECTOS (7)
  // ==========================================================================
  {
    id: 'deep',
    label: 'Cine / Narrador',
    emoji: '🎬',
    category: 'spaces',
    description: 'Voz de tráiler épico de cine',
    dsp: {
      pitchSemitones: -2.6,
      eq: [
        { type: 'lowshelf', frequency: 240, gain: 9 },
        { type: 'peaking', frequency: 3200, Q: 1.2, gain: 3.5 },
      ],
      outputGain: 1.05,
    },
  },
  {
    id: 'echo',
    label: 'Eco Espacial',
    emoji: '🔁',
    category: 'spaces',
    description: 'Repetición de eco limpia',
    dsp: {
      echo: { delaySec: 0.25, feedback: 0.48, mix: 0.5 },
      outputGain: 1.0,
    },
  },
  {
    id: 'cave',
    label: 'Cueva',
    emoji: '🕳️',
    category: 'spaces',
    description: 'Reverberación oscura de caverna',
    dsp: {
      eq: [
        { type: 'lowshelf', frequency: 260, gain: 5 },
        { type: 'lowpass', frequency: 2800 },
      ],
      echo: { delaySec: 0.21, feedback: 0.56, mix: 0.55, secondTapSec: 0.35 },
      outputGain: 1.05,
    },
  },
  {
    id: 'cathedral',
    label: 'Catedral',
    emoji: '⛪',
    category: 'spaces',
    description: 'Eco majestuoso de gran salón',
    dsp: {
      eq: [{ type: 'highshelf', frequency: 3500, gain: 2.5 }],
      chorus: { rateHz: 0.7, depthSec: 0.003, delaySec: 0.02, mix: 0.3 },
      echo: { delaySec: 0.3, feedback: 0.62, mix: 0.58, secondTapSec: 0.47 },
      outputGain: 1.0,
    },
  },
  {
    id: 'stadium',
    label: 'Estadio',
    emoji: '🏟️',
    category: 'spaces',
    description: 'Altavoz de estadio multitudinario',
    dsp: {
      eq: [
        { type: 'highpass', frequency: 240 },
        { type: 'peaking', frequency: 2200, Q: 1.8, gain: 5.5 },
      ],
      echo: { delaySec: 0.36, feedback: 0.5, mix: 0.52, secondTapSec: 0.54 },
      outputGain: 1.08,
    },
  },
  {
    id: 'underwater',
    label: 'Bajo el Agua',
    emoji: '🌊',
    category: 'spaces',
    description: 'Sonido sumergido y burbujeante',
    dsp: {
      eq: [
        { type: 'lowpass', frequency: 680, Q: 2.2 },
        { type: 'lowshelf', frequency: 200, gain: 6 },
      ],
      vibrato: { rateHz: 4.2, depthSec: 0.006, waveform: 'sine' },
      outputGain: 1.25,
    },
  },
  {
    id: 'chorus',
    label: 'Coro / Doble Voz',
    emoji: '🎶',
    category: 'spaces',
    description: 'Efecto vocal coral armonizado',
    dsp: {
      chorus: { rateHz: 1.8, depthSec: 0.0045, delaySec: 0.02, mix: 0.65 },
      echo: { delaySec: 0.055, feedback: 0.2, mix: 0.25 },
      outputGain: 1.05,
    },
  },
];

const FILTER_MAP = new Map<VoiceFilter, VoiceFilterDefinition>();
for (const def of VOICE_FILTERS) {
  FILTER_MAP.set(def.id, def);
}

/** Resolve legacy IDs (e.g. 'high' -> 'chipmunk') and fetch definition */
export function getVoiceFilterDefinition(
  filterId: VoiceFilter | undefined
): VoiceFilterDefinition | null {
  if (!filterId || filterId === 'none') return null;
  if (filterId === 'high') {
    return FILTER_MAP.get('chipmunk') || null;
  }
  return FILTER_MAP.get(filterId) || null;
}

export interface VoiceFilterGraphHandle {
  output: AudioNode;
  dispose: () => void;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const k = Math.max(1, amount);
  const samples = 1024;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Dual-Delay-Line Pitch Shifter (Jungle / Harmonizer algorithm).
 * Shifts voice pitch in semitones WITHOUT changing playback duration/sync.
 * Uses only native Web Audio nodes so it works identically in AudioContext
 * and OfflineAudioContext on Desktop and Android WebView.
 */
function buildPitchShifterStage(
  ctx: BaseAudioContext,
  input: AudioNode,
  semitones: number,
  createdNodes: AudioNode[],
  activeSources: AudioScheduledSourceNode[]
): AudioNode {
  const ratio = Math.pow(2, semitones / 12);
  if (Math.abs(ratio - 1) < 0.005) {
    return input;
  }

  const windowSec = 0.08;
  const bufLen = 2048;
  const sr = ctx.sampleRate;
  const pitchUp = ratio > 1;
  const freqHz = Math.abs(1 - ratio) / windowSec;
  const playbackRate = freqHz * (bufLen / sr);

  const mod1Buf = ctx.createBuffer(1, bufLen, sr);
  const mod2Buf = ctx.createBuffer(1, bufLen, sr);
  const fade1Buf = ctx.createBuffer(1, bufLen, sr);
  const fade2Buf = ctx.createBuffer(1, bufLen, sr);

  const m1 = mod1Buf.getChannelData(0);
  const m2 = mod2Buf.getChannelData(0);
  const f1 = fade1Buf.getChannelData(0);
  const f2 = fade2Buf.getChannelData(0);
  const half = bufLen >> 1;

  for (let i = 0; i < bufLen; i++) {
    const phase1 = i / bufLen;
    const phase2 = ((i + half) % bufLen) / bufLen;

    m1[i] = pitchUp ? windowSec * (1 - phase1) : windowSec * phase1;
    m2[i] = pitchUp ? windowSec * (1 - phase2) : windowSec * phase2;

    // Linear triangle crossfade: f1[i] + f2[i] === 1.0 everywhere, 0 at wrap discontinuity
    f1[i] = 1 - Math.abs(2 * phase1 - 1);
    f2[i] = 1 - Math.abs(2 * phase2 - 1);
  }

  const delay1 = ctx.createDelay(0.25);
  const delay2 = ctx.createDelay(0.25);
  delay1.delayTime.setValueAtTime(0, 0);
  delay2.delayTime.setValueAtTime(0, 0);

  const fade1Gain = ctx.createGain();
  const fade2Gain = ctx.createGain();
  fade1Gain.gain.setValueAtTime(0, 0);
  fade2Gain.gain.setValueAtTime(0, 0);

  const outputMix = ctx.createGain();
  outputMix.gain.setValueAtTime(1, 0);

  const mod1Src = ctx.createBufferSource();
  mod1Src.buffer = mod1Buf;
  mod1Src.loop = true;
  mod1Src.playbackRate.setValueAtTime(playbackRate, 0);

  const mod2Src = ctx.createBufferSource();
  mod2Src.buffer = mod2Buf;
  mod2Src.loop = true;
  mod2Src.playbackRate.setValueAtTime(playbackRate, 0);

  const fade1Src = ctx.createBufferSource();
  fade1Src.buffer = fade1Buf;
  fade1Src.loop = true;
  fade1Src.playbackRate.setValueAtTime(playbackRate, 0);

  const fade2Src = ctx.createBufferSource();
  fade2Src.buffer = fade2Buf;
  fade2Src.loop = true;
  fade2Src.playbackRate.setValueAtTime(playbackRate, 0);

  input.connect(delay1);
  input.connect(delay2);

  mod1Src.connect(delay1.delayTime);
  mod2Src.connect(delay2.delayTime);

  delay1.connect(fade1Gain);
  delay2.connect(fade2Gain);

  fade1Src.connect(fade1Gain.gain);
  fade2Src.connect(fade2Gain.gain);

  fade1Gain.connect(outputMix);
  fade2Gain.connect(outputMix);

  mod1Src.start(0);
  mod2Src.start(0);
  fade1Src.start(0);
  fade2Src.start(0);

  createdNodes.push(
    delay1,
    delay2,
    fade1Gain,
    fade2Gain,
    outputMix,
    mod1Src,
    mod2Src,
    fade1Src,
    fade2Src
  );
  activeSources.push(mod1Src, mod2Src, fade1Src, fade2Src);

  return outputMix;
}

/**
 * Builds the full Web Audio DSP chain for any of the 50 voice filters.
 * Returns { output, dispose } for clean teardown in real-time playback.
 */
export function buildVoiceFilterGraph(
  ctx: BaseAudioContext,
  inputNode: AudioNode,
  filterId: VoiceFilter
): VoiceFilterGraphHandle {
  const def = getVoiceFilterDefinition(filterId);
  if (!def) {
    return {
      output: inputNode,
      dispose: () => {},
    };
  }

  const createdNodes: AudioNode[] = [];
  const activeSources: AudioScheduledSourceNode[] = [];
  const dsp = def.dsp;

  let current: AudioNode = inputNode;

  // 1. Pitch Shifter (first so EQ/formants shape the shifted voice naturally)
  if (dsp.pitchSemitones && Math.abs(dsp.pitchSemitones) > 0.05) {
    current = buildPitchShifterStage(
      ctx,
      current,
      dsp.pitchSemitones,
      createdNodes,
      activeSources
    );
  }

  // 2. EQ / Formant Shaping
  if (dsp.eq && dsp.eq.length > 0) {
    for (const stage of dsp.eq) {
      const bq = ctx.createBiquadFilter();
      bq.type = stage.type;
      bq.frequency.setValueAtTime(stage.frequency, 0);
      if (stage.Q !== undefined) bq.Q.setValueAtTime(stage.Q, 0);
      if (stage.gain !== undefined) bq.gain.setValueAtTime(stage.gain, 0);
      current.connect(bq);
      createdNodes.push(bq);
      current = bq;
    }
  }

  // 3. Vibrato / Pitch Wobble (e.g. Borracho, Anciano, Marciano, Bajo el Agua)
  if (dsp.vibrato) {
    const vDelay = ctx.createDelay(0.1);
    const baseDelay = Math.max(0.012, dsp.vibrato.depthSec * 1.4);
    vDelay.delayTime.setValueAtTime(baseDelay, 0);

    const lfo = ctx.createOscillator();
    lfo.type = dsp.vibrato.waveform || 'sine';
    lfo.frequency.setValueAtTime(dsp.vibrato.rateHz, 0);

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(dsp.vibrato.depthSec, 0);

    lfo.connect(lfoDepth);
    lfoDepth.connect(vDelay.delayTime);
    current.connect(vDelay);
    lfo.start(0);

    createdNodes.push(vDelay, lfo, lfoDepth);
    activeSources.push(lfo);
    current = vDelay;
  }

  // 4. Distortion / Saturation (Megáfono, Demonio, Radio, 8-Bit)
  if (dsp.distortion && dsp.distortion.amount > 0) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeDistortionCurve(dsp.distortion.amount);
    shaper.oversample = '2x';
    current.connect(shaper);
    createdNodes.push(shaper);
    current = shaper;
  }

  // 5. Tremolo / Ring Modulation (Robot, Marciano, Abeja, 8-Bit)
  if (dsp.tremolo) {
    const modGain = ctx.createGain();
    const depth = Math.max(0.05, Math.min(1, dsp.tremolo.depth));
    const base = dsp.tremolo.ringMod ? 1 - depth * 0.75 : 1 - depth * 0.5;
    modGain.gain.setValueAtTime(base, 0);

    const osc = ctx.createOscillator();
    osc.type = dsp.tremolo.waveform || 'sine';
    osc.frequency.setValueAtTime(dsp.tremolo.rateHz, 0);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(depth * 0.5, 0);

    osc.connect(oscGain);
    oscGain.connect(modGain.gain);
    current.connect(modGain);
    osc.start(0);

    createdNodes.push(modGain, osc, oscGain);
    activeSources.push(osc);
    current = modGain;
  }

  // 6. Short Comb / Metallic Resonator (Robot, Cyborg, Androide)
  if (dsp.comb) {
    const combDelay = ctx.createDelay(0.1);
    combDelay.delayTime.setValueAtTime(dsp.comb.delaySec, 0);
    const combFb = ctx.createGain();
    combFb.gain.setValueAtTime(Math.min(0.85, dsp.comb.feedback), 0);

    const wetGain = ctx.createGain();
    const dryGain = ctx.createGain();
    const mix = dsp.comb.mix ?? 0.7;
    wetGain.gain.setValueAtTime(mix, 0);
    dryGain.gain.setValueAtTime(1 - mix * 0.65, 0);

    const sum = ctx.createGain();

    current.connect(dryGain);
    dryGain.connect(sum);

    current.connect(combDelay);
    combDelay.connect(combFb);
    combFb.connect(combDelay);
    combDelay.connect(wetGain);
    wetGain.connect(sum);

    createdNodes.push(combDelay, combFb, wetGain, dryGain, sum);
    current = sum;
  }

  // 7. Chorus / Doubler (Coro, Ángel, Hada, Espacial)
  if (dsp.chorus) {
    const cDelay = ctx.createDelay(0.1);
    cDelay.delayTime.setValueAtTime(dsp.chorus.delaySec, 0);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(dsp.chorus.rateHz, 0);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(dsp.chorus.depthSec, 0);

    const wet = ctx.createGain();
    wet.gain.setValueAtTime(dsp.chorus.mix, 0);
    const dry = ctx.createGain();
    dry.gain.setValueAtTime(1, 0);
    const sum = ctx.createGain();

    lfo.connect(lfoGain);
    lfoGain.connect(cDelay.delayTime);
    lfo.start(0);

    current.connect(dry);
    dry.connect(sum);
    current.connect(cDelay);
    cDelay.connect(wet);
    wet.connect(sum);

    createdNodes.push(cDelay, lfo, lfoGain, wet, dry, sum);
    activeSources.push(lfo);
    current = sum;
  }

  // 8. Echo / Space Multi-tap Delay (Eco, Cueva, Catedral, Estadio, Fantasma)
  if (dsp.echo) {
    const delay1 = ctx.createDelay(1.0);
    delay1.delayTime.setValueAtTime(dsp.echo.delaySec, 0);

    const fb = ctx.createGain();
    fb.gain.setValueAtTime(Math.min(0.75, dsp.echo.feedback), 0);

    const wet = ctx.createGain();
    wet.gain.setValueAtTime(dsp.echo.mix, 0);

    const sum = ctx.createGain();
    current.connect(sum);
    current.connect(delay1);
    delay1.connect(fb);
    fb.connect(delay1);
    delay1.connect(wet);
    wet.connect(sum);

    createdNodes.push(delay1, fb, wet, sum);

    if (dsp.echo.secondTapSec) {
      const delay2 = ctx.createDelay(1.0);
      delay2.delayTime.setValueAtTime(dsp.echo.secondTapSec, 0);
      const wet2 = ctx.createGain();
      wet2.gain.setValueAtTime(dsp.echo.mix * 0.65, 0);
      current.connect(delay2);
      delay2.connect(wet2);
      wet2.connect(sum);
      createdNodes.push(delay2, wet2);
    }

    current = sum;
  }

  // 9. Makeup Gain + Gentle Output Limiter (prevents harsh clipping on extreme filters)
  const outGain = ctx.createGain();
  outGain.gain.setValueAtTime(dsp.outputGain ?? 1.0, 0);
  current.connect(outGain);
  createdNodes.push(outGain);

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-3, 0);
  limiter.knee.setValueAtTime(12, 0);
  limiter.ratio.setValueAtTime(8, 0);
  limiter.attack.setValueAtTime(0.005, 0);
  limiter.release.setValueAtTime(0.12, 0);
  outGain.connect(limiter);
  createdNodes.push(limiter);

  return {
    output: limiter,
    dispose: () => {
      for (const src of activeSources) {
        try {
          src.stop();
        } catch {}
      }
      for (const node of createdNodes) {
        try {
          node.disconnect();
        } catch {}
      }
    },
  };
}
