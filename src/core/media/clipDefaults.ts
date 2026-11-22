// ============================================================================
// clipDefaults - Fresh, clean default properties for newly created/split clips
// ============================================================================

export function createDefaultVisualProperties() {
  return {
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal' as const,
      fitMode: 'contain' as const,
      freeResize: false,
    },
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
    filterPreset: 'none' as const,
    filterIntensity: 100,
    chromaKey: {
      enabled: false,
      color: '#00ff00',
      tolerance: 0.35,
      feather: 0.1,
      spillSuppression: 0.5,
    },
    mask: {
      type: 'none' as const,
      size: 50,
      feather: 10,
      rotation: 0,
      inverted: false,
    },
    effect: {
      type: 'none' as const,
      intensity: 50,
      speed: 50,
    },
    transition: {
      type: 'none' as const,
      duration: 0.6,
    },
    animations: {
      inType: 'none' as const,
      inDuration: 0.6,
      outType: 'none' as const,
      outDuration: 0.6,
      comboType: 'none' as const,
    },
    keyframes: [],
    audio: {
      volume: 100,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      voiceFilter: 'none' as const,
      noiseReduction: false,
      isMuted: false,
      preservesPitch: true,
    },
  };
}
