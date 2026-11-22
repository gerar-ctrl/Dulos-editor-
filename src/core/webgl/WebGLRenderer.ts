// ============================================================================
// WebGLRenderer - Hybrid 2D + WebGL Hardware Accelerated Video Compositor
// Guarantees 100% Video & Image Rendering across Windows D3D11, macOS, iOS & Android
// ============================================================================

import {
  VERTEX_SHADER_SOURCE,
  COMPOSITE_FRAGMENT_SHADER_SOURCE,
  CompositeShaderSpec,
  buildCompositeFragmentShader,
  getCompositeShaderKey,
} from './shaders';
import { buildTransitionFragmentShader } from './transitionShaders';
import { Canvas2DFallbackEngine } from './Canvas2DFallback';
import {
  PARAMETRIC_FILTER_IDS,
  PARAMETRIC_FILTER_MAP,
} from './parametricFilters';
import {
  PARAMETRIC_EFFECT_IDS,
  PARAMETRIC_EFFECT_MAP,
} from './parametricEffects';
import {
  VideoClip,
  TextClip,
  CanvasBackground,
  ClipAnimations,
  TransformProperties,
} from '../../types/editor';
import { interpolateClipTransform } from '../keyframes/interpolateKeyframes';
import { evaluateNewTextAnimation } from './textAnimations';

const FILTER_PRESET_MAP: Readonly<Record<string, number>> = {
  none: 0,
  tealOrange: 1,
  cinematic: 2,
  imax: 3,
  vintage: 4,
  fadedFilm: 5,
  sepia: 6,
  bw: 7,
  noir: 8,
  cyberpunk: 9,
  matrix: 10,
  vibrant: 11,
  anime: 12,
  goldenHour: 13,
  warm: 14,
  cool: 15,
  night: 16,
  bleachBypass: 17,
  pastel: 18,
  sunset: 19,
  blockbuster: 20,
  warmCinema: 21,
  moodyDark: 22,
  polaroid: 23,
  fujiVelvia: 24,
  kodachrome: 25,
  synthwave: 26,
  vaporwaveLUT: 27,
  neonNoir: 28,
  emerald: 29,
  arctic: 30,
  desert: 31,
  highContrastBW: 32,
  infrared: 33,
  duotoneGold: 34,
  softPortrait: 35,
  ...PARAMETRIC_FILTER_IDS,
};

const MASK_MAP: Readonly<Record<string, number>> = {
  none: 0,
  linear: 1,
  mirror: 2,
  circle: 3,
  rectangle: 4,
  star: 5,
  diamond: 6,
  heart: 7,
  hexagon: 8,
  triangle: 9,
  roundedRect: 10,
};

const FX_MAP: Readonly<Record<string, number>> = {
  none: 0,
  glitch: 1,
  cameraShake: 2,
  chromaticAberration: 3,
  filmGrain: 4,
  neonGlow: 5,
  rain: 6,
  sparks: 7,
  vhs: 8,
  dreamyBloom: 9,
  lightLeakFX: 10,
  kaleidoscope: 11,
  mirrorClone: 12,
  pixelate: 13,
  halftone: 14,
  fisheye: 15,
  thermal: 16,
  crtMonitor: 17,
  rgbPulse: 18,
  datamosh: 19,
  invertFlash: 20,
  nightVision: 21,
  edgeSketch: 22,
  prismRainbow: 23,
  duotoneCyber: 24,
  auroraGlow: 25,
  strobeLight: 26,
  sunFlare: 27,
  xray: 28,
  snow: 29,
  confetti: 30,
  bokehLights: 31,
  starfield: 32,
  matrixRain: 33,
  underwater: 34,
  heatHaze: 35,
  speedLines: 36,
  cinematicBars: 37,
  tiltShift: 38,
  radialBlurFX: 39,
  mirrorVertical: 40,
  fireFlames: 41,
  fireRing: 42,
  hellfire: 43,
  sunnyDay: 44,
  goldenHour: 45,
  blueHour: 46,
  starryNight: 47,
  moonlight: 48,
  thunderstorm: 49,
  fogMist: 50,
  sandstorm: 51,
  sunsetSky: 52,
  fireflies: 53,
  cherryBlossom: 54,
  autumnLeaves: 55,
  ashEmbers: 56,
  bubbles: 57,
  sparkles: 58,
  laserRain: 59,
  snowBlizzard: 60,
  frostEdge: 61,
  bloodMoon: 62,
  hologram: 63,
  tvStatic: 64,
  cyberScan: 65,
  glitchWave: 66,
  badSignal: 67,
  asciiMatrix: 68,
  vhsDamaged: 69,
  digitalRainBlue: 70,
  laserGrid: 71,
  pulseWave: 72,
  spotlight: 73,
  discoLights: 74,
  policeSiren: 75,
  candlelight: 76,
  projector8mm: 77,
  godRays: 78,
  vaporwave: 79,
  noirShadow: 80,
  goldenSparkle: 81,
  oilPainting: 82,
  watercolor: 83,
  emboss3D: 84,
  mosaicGlass: 85,
  swirlVortex: 86,
  tunnelZoom: 87,
  mirrorQuad: 88,
  miniatureBlur: 89,
  thermalNight: 90,
  ...PARAMETRIC_EFFECT_IDS,
};

const TRANS_MAP: Readonly<Record<string, number>> = {
  none: 0,
  crossDissolve: 1,
  directionalWipe: 2,
  wipeRight: 3,
  wipeUp: 4,
  dynamicZoom: 5,
  zoomInBlur: 5,
  flashWhite: 6,
  flashBlack: 7,
  glitch: 8,
  rotate3D: 9,
  circleOpen: 10,
  motionBlur: 11,
  whipPanLeft: 11,
  whipPanRight: 12,
  whipPanUp: 13,
  zoomOutBounce: 14,
  spinTransition: 15,
  shakeImpact: 16,
  filmBurn: 17,
  lumaFade: 18,
  cube3D: 19,
  slidePush: 20,
  clockWipe: 21,
  blinds: 22,
  diamondOpen: 23,
  liquidWave: 24,
  pixelate: 25,
  dreamy: 26,
  whipPanDown: 27,
  zoomOutBlur: 28,
  swirlWarp: 29,
  dollyZoom: 30,
  shakeZoom: 31,
  lensWarp: 32,
  lightLeak: 33,
  prismFlash: 34,
  vignetteFade: 35,
  radialBlurFade: 36,
  crossZoom: 37,
  burnDark: 38,
  wipeLeft: 39,
  wipeDown: 40,
  diagonalWipe: 41,
  barnDoorOpen: 42,
  barnDoorClose: 43,
  heartOpen: 44,
  starOpen: 45,
  flipVertical3D: 46,
  pageCurl: 47,
  slideDownPush: 48,
  rgbSplitSlide: 49,
  kaleidoTransition: 50,
  crtShutdown: 51,
  vaporwave: 52,
  rippleDrop: 53,
  mosaicGrid: 54,
  panDiagonalTL: 55,
  panDiagonalTR: 56,
  snapZoomIn: 57,
  snapZoomOut: 58,
  tiltLeft: 59,
  tiltRight: 60,
  bounceDrop: 61,
  bounceRise: 62,
  crashZoom: 63,
  pullBackRotate: 64,
  focusPull: 65,
  fisheyePop: 66,
  hyperLapse: 67,
  solarFlare: 68,
  neonPulse: 69,
  warmSunset: 70,
  arcticFreeze: 71,
  goldenBokeh: 72,
  strobeFlash: 73,
  cinemaCurtain: 74,
  sepiaDream: 75,
  auroraGlow: 76,
  emberSpark: 77,
  moonlightFade: 78,
  haloBurst: 79,
  hexGrid: 80,
  spiralWipe: 81,
  radialSlices: 82,
  verticalBlinds: 83,
  diagonalBlinds: 84,
  checkerboard: 85,
  splitHorizontal: 86,
  splitVertical: 87,
  squeezeHorizontal: 88,
  squeezeVertical: 89,
  boxZoom3D: 90,
  irisDiamondSpin: 91,
  crossHatch: 92,
  pixelMelt: 93,
  chromaticBurst: 94,
  staticNoise: 95,
  scanlineTear: 96,
  vhsRewind: 97,
  cyberSlice: 98,
  datamosh: 99,
  matrixRain: 100,
  shockwave: 101,
  mirrorFlip: 102,
  liquidSwirl: 103,
  quantumDissolve: 104,
  whipZoomLeft: 105,
  whipZoomRight: 106,
  whipZoomUp: 107,
  whipZoomDown: 108,
  smoothPanLeft: 109,
  smoothPanRight: 110,
  smoothPanUp: 111,
  smoothPanDown: 112,
  spiralZoomIn: 113,
  spiralZoomOut: 114,
  elasticZoomIn: 115,
  elasticZoomOut: 116,
  swayLeft: 117,
  swayRight: 118,
  tiltDrop: 119,
  tiltRise: 120,
  microShake: 121,
  vertigoPull: 122,
  cinematicDrift: 123,
  speedRamp: 124,
  warmFlash: 125,
  coolFlash: 126,
  goldLeak: 127,
  crimsonFlare: 128,
  blueFlare: 129,
  amberBurn: 130,
  whiteBloom: 131,
  darkVignette: 132,
  filmFlash: 133,
  prismGlow: 134,
  sunsetWash: 135,
  neonFlash: 136,
  softOverexpose: 137,
  shadowSweep: 138,
  dreamyMist: 139,
  starburstFlash: 140,
  candleFlicker: 141,
  cinemaFadeOut: 142,
  retroBurn: 143,
  auroraSweep: 144,
  cubeUp3D: 145,
  cubeDown3D: 146,
  flipHorizontal3D: 147,
  swingDoorLeft: 148,
  swingDoorRight: 149,
  foldVertical: 150,
  foldHorizontal: 151,
  zoomRotate3D: 152,
  cardFlipLeft: 153,
  cardFlipRight: 154,
  triangleOpen: 155,
  hexagonOpen: 156,
  ovalOpen: 157,
  crossOpen: 158,
  plusWipe: 159,
  bowtieOpen: 160,
  curtainPart: 161,
  shutterClose: 162,
  spiralIris: 163,
  carousel3D: 164,
  rgbJitter: 165,
  vhsGlitch: 166,
  neonGlitch: 167,
  waveDistortH: 168,
  waveDistortV: 169,
  waterRipple: 170,
  plasmaWave: 171,
  pixelBlocks: 172,
  mosaicSpin: 173,
  scanlineWipe: 174,
  cyberGrid: 175,
  analogNoise: 176,
  signalDrop: 177,
  chromaWave: 178,
  echoSplit: 179,
  prismShift: 180,
  energyPulse: 181,
  warpTunnel: 182,
  acidRipple: 183,
  digitalDissolve: 184,
  wipeDiagBL: 185,
  wipeDiagBR: 186,
  wedgeOpen: 187,
  venetian45: 188,
  venetian135: 189,
  irisBox: 190,
  splitDiag: 191,
  barsSweepH: 192,
  barsSweepV: 193,
  gridFade: 194,
  radialSweepCCW: 195,
  doubleWipeH: 196,
  doubleWipeV: 197,
  cornerTL: 198,
  cornerTR: 199,
  cornerBL: 200,
  cornerBR: 201,
  zigzagH: 202,
  zigzagV: 203,
  stepWipe: 204,
};

const COMPOSITE_UNIFORM_NAMES = [
  'u_resolution',
  'u_translation',
  'u_scale',
  'u_rotation',
  'u_flip',
  'u_image',
  'u_textureSize',
  'u_opacity',
  'u_time',
  'u_skipPremultiply',
  'u_perspective',
  'u_animBlur',
  'u_animFlash',
  'u_brightness',
  'u_contrast',
  'u_saturation',
  'u_exposure',
  'u_sharpness',
  'u_highlights',
  'u_shadows',
  'u_temperature',
  'u_tint',
  'u_vignette',
  'u_hslRed',
  'u_hslGreen',
  'u_hslBlue',
  'u_hslYellow',
  'u_filterPreset',
  'u_filterIntensity',
  'u_lutMatR',
  'u_lutMatG',
  'u_lutMatB',
  'u_lutShadow',
  'u_lutHigh',
  'u_lutParams',
  'u_lutGain',
  'u_lutExtra',
  'u_chromaEnabled',
  'u_chromaColor',
  'u_chromaTolerance',
  'u_chromaFeather',
  'u_chromaSpill',
  'u_maskType',
  'u_maskSize',
  'u_maskFeather',
  'u_maskRotation',
  'u_maskInverted',
  'u_effectType',
  'u_effectIntensity',
  'u_effectSpeed',
  'u_fxFamily',
  'u_fxColA',
  'u_fxColB',
  'u_fxParamA',
  'u_fxParamB',
] as const;

function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = (hex || '#000000').replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const bigint = parseInt(cleanHex, 16) || 0;
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
}

export class WebGLRenderer {
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D | null = null;

  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private webglReady = false;
  private vertShader: WebGLShader | null = null;
  private compositePrograms = new Map<
    string,
    {
      program: WebGLProgram;
      posAttr: number;
      texAttr: number;
      uniforms: Record<string, WebGLUniformLocation | null>;
    }
  >();
  private transitionPrograms = new Map<
    number,
    {
      program: WebGLProgram;
      posAttr: number;
      texAttr: number;
      uniforms: Record<string, WebGLUniformLocation | null>;
    }
  >();
  private gradingFbo: WebGLFramebuffer | null = null;
  private gradingFboTex: WebGLTexture | null = null;
  private gradingFboW = 0;
  private gradingFboH = 0;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private emptyTexture: WebGLTexture | null = null;
  private textureCache = new Map<string, WebGLTexture>();
  private textureMetaCache = new Map<
    string,
    {
      source: unknown;
      mediaTime: number;
      width: number;
      height: number;
    }
  >();

  // 2D Staging & Frame Cache so hardware YUV videos & 12MP EXIF images never fail
  private stagingCanvas: HTMLCanvasElement;
  private stagingCtx: CanvasRenderingContext2D | null;
  private frameCache = new Map<string, HTMLCanvasElement>();

  // Secondary 2D canvas for high-quality text and subtitle rasterization
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D | null;
  private textCache = new Map<
    string,
    { canvas: HTMLCanvasElement; halfW: number; halfH: number }
  >();

  // Reusable canvas for manual tkhd rotation on browsers without VideoFrame.rotation
  private rotatedCanvas: HTMLCanvasElement | null = null;
  private rotatedCtx: CanvasRenderingContext2D | null = null;

  // Offscreen 2D chroma key buffers & static cache when WebGL is unavailable
  private chroma2DCanvas: HTMLCanvasElement | null = null;
  private chroma2DCtx: CanvasRenderingContext2D | null = null;
  private chroma2DCache = new Map<string, { sig: string; canvas: HTMLCanvasElement }>();
  private fallback2D = new Canvas2DFallbackEngine();

  private maxTextureSize = 4096;
  private program: WebGLProgram | null = null;
  private posAttr = -1;
  private texAttr = -1;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private contextListenersAttached = false;
  private webglInitAttempted = false;
  private preserveDrawingBuffer = false;
  private isMobileDevice =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  private static resolveShadowColor(color?: string, opacity?: number): string {
    const raw = (color || '#000000').trim();
    if (opacity === undefined) {
      return raw || 'rgba(0,0,0,0.85)';
    }
    const alpha = Math.max(0, Math.min(1, opacity));
    const shortHex = /^#([0-9a-f]{3})$/i.exec(raw);
    if (shortHex) {
      const [r, g, b] = shortHex[1].split('').map((ch) => parseInt(ch + ch, 16));
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    }
    const fullHex = /^#([0-9a-f]{6})$/i.exec(raw);
    if (fullHex) {
      const r = parseInt(fullHex[1].slice(0, 2), 16);
      const g = parseInt(fullHex[1].slice(2, 4), 16);
      const b = parseInt(fullHex[1].slice(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    }
    const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(raw);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${alpha.toFixed(3)})`;
    }
    return raw || `rgba(0,0,0,${alpha.toFixed(3)})`;
  }

  private static isTextShadowEnabled(textConfig: TextClip['textConfig']): boolean {
    if (textConfig.hasShadow === false) return false;
    const opacity = textConfig.shadowOpacity ?? 0.85;
    if (opacity <= 0.001) return false;
    return (textConfig.shadowBlur || 0) > 0 || (textConfig.shadowDistance || 0) > 0;
  }

  constructor(
    canvas: HTMLCanvasElement,
    options?: { preserveDrawingBuffer?: boolean }
  ) {
    this.outputCanvas = canvas;
    this.outputCtx = canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d');
    this.preserveDrawingBuffer = Boolean(options?.preserveDrawingBuffer);

    this.glCanvas = document.createElement('canvas');
    this.stagingCanvas = document.createElement('canvas');
    this.stagingCtx = this.stagingCanvas.getContext('2d');

    this.textCanvas = document.createElement('canvas');
    this.textCtx = this.textCanvas.getContext('2d');
  }

  public getWebGLCanvas(): HTMLCanvasElement | null {
    return this.webglReady && this.gl && !this.gl.isContextLost()
      ? this.glCanvas
      : null;
  }

  private ensureWebGLContext(): boolean {
    if (this.webglReady && this.gl && !this.gl.isContextLost()) {
      return true;
    }
    if (!this.webglInitAttempted) {
      this.webglInitAttempted = true;
      this.attachContextListeners();
      this.initWebGL();
    }
    return Boolean(this.webglReady && this.gl && !this.gl.isContextLost());
  }

  private getCompositeProgram(spec: CompositeShaderSpec) {
    if (!this.ensureWebGLContext() || !this.gl) return null;
    const key = getCompositeShaderKey(spec);
    const cached = this.compositePrograms.get(key);
    if (cached) return cached;

    const gl = this.gl;
    try {
      const vertShader =
        this.vertShader ||
        this.createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      this.vertShader = vertShader;

      const fragSrc = buildCompositeFragmentShader(spec);
      const fragShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragSrc);

      const program = gl.createProgram()!;
      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);
      gl.deleteShader(fragShader);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }

      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      for (const name of COMPOSITE_UNIFORM_NAMES) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }

      const entry = {
        program,
        posAttr: gl.getAttribLocation(program, 'a_position'),
        texAttr: gl.getAttribLocation(program, 'a_texCoord'),
        uniforms,
      };
      this.compositePrograms.set(key, entry);
      return entry;
    } catch (err) {
      console.warn('WebGL composite shader compile fallback to Canvas 2D:', err);
      return null;
    }
  }

  private attachContextListeners() {
    if (this.contextListenersAttached) return;
    this.contextListenersAttached = true;

    this.glCanvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.webglReady = false;
      this.vertShader = null;
      this.compositePrograms.clear();
      this.transitionPrograms.clear();
      this.gradingFbo = null;
      this.gradingFboTex = null;
      this.gradingFboW = 0;
      this.gradingFboH = 0;
      this.textureCache.clear();
      this.textureMetaCache.clear();
    });

    this.glCanvas.addEventListener('webglcontextrestored', () => {
      this.vertShader = null;
      this.compositePrograms.clear();
      this.transitionPrograms.clear();
      this.gradingFbo = null;
      this.gradingFboTex = null;
      this.gradingFboW = 0;
      this.gradingFboH = 0;
      this.textureCache.clear();
      this.textureMetaCache.clear();
      this.initWebGL();
    });
  }

  private initWebGL() {
    try {
      const gl =
        this.glCanvas.getContext('webgl', {
          alpha: true,
          premultipliedAlpha: true,
          preserveDrawingBuffer: this.preserveDrawingBuffer,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: 'high-performance',
        }) ||
        (this.glCanvas.getContext(
          'experimental-webgl'
        ) as WebGLRenderingContext | null);

      if (!gl) {
        this.webglReady = false;
        return;
      }

      this.gl = gl;
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
      this.vertShader = this.createShader(
        gl,
        gl.VERTEX_SHADER,
        VERTEX_SHADER_SOURCE
      );
      this.initBuffers();

      // Create 1x1 fallback texture so texture units are always complete
      this.emptyTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      );

      this.webglReady = true;
    } catch (err) {
      console.warn('WebGL shader init fallback to Canvas 2D:', err);
      this.webglReady = false;
    }
  }

  private createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private ensureBaseProgram(): boolean {
    if (this.program) return true;
    const gl = this.gl;
    if (!gl || !this.vertShader) return false;
    try {
      const fragShader = this.createShader(
        gl,
        gl.FRAGMENT_SHADER,
        COMPOSITE_FRAGMENT_SHADER_SOURCE
      );
      const program = gl.createProgram()!;
      gl.attachShader(program, this.vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);
      gl.deleteShader(fragShader);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return false;
      }

      this.program = program;
      this.posAttr = gl.getAttribLocation(program, 'a_position');
      this.texAttr = gl.getAttribLocation(program, 'a_texCoord');

      const uniformNames = [
        'u_resolution',
        'u_translation',
        'u_scale',
        'u_rotation',
        'u_flip',
        'u_image',
        'u_prevImage',
        'u_hasPrevImage',
        'u_opacity',
        'u_filterType',
        'u_filterIntensity',
        'u_effectType',
        'u_effectIntensity',
        'u_effectSpeed',
        'u_fxFamily',
        'u_fxColA',
        'u_fxColB',
        'u_fxParamA',
        'u_fxParamB',
        'u_brightness',
        'u_contrast',
        'u_saturation',
        'u_temperature',
        'u_tint',
        'u_vignette',
        'u_grain',
        'u_highlights',
        'u_shadows',
        'u_sharpen',
        'u_exposure',
        'u_time',
        'u_chromaKeyEnabled',
        'u_chromaColor',
        'u_chromaSimilarity',
        'u_chromaSmoothness',
        'u_maskType',
        'u_maskParams',
        'u_maskInvert',
        'u_maskFeather',
        'u_lutType',
        'u_lutIntensity',
        'u_lutTexture',
        'u_hasLut',
        'u_hasCustomLut',
        'u_customLutTexture',
        'u_customLutIntensity',
      ];
      this.uniforms = {};
      for (const name of uniformNames) {
        this.uniforms[name] = gl.getUniformLocation(program, name);
      }
      return true;
    } catch {
      return false;
    }
  }

  private getTransitionProgram(transTypeId: number) {
    const cached = this.transitionPrograms.get(transTypeId);
    if (cached) return cached;

    const gl = this.gl;
    if (!gl || !this.vertShader) return null;

    try {
      const fragSrc = buildTransitionFragmentShader(transTypeId);
      const fragShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
      const program = gl.createProgram()!;
      gl.attachShader(program, this.vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);
      gl.deleteShader(fragShader);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }

      const entry = {
        program,
        posAttr: gl.getAttribLocation(program, 'a_position'),
        texAttr: gl.getAttribLocation(program, 'a_texCoord'),
        uniforms: {
          u_resolution: gl.getUniformLocation(program, 'u_resolution'),
          u_translation: gl.getUniformLocation(program, 'u_translation'),
          u_scale: gl.getUniformLocation(program, 'u_scale'),
          u_rotation: gl.getUniformLocation(program, 'u_rotation'),
          u_flip: gl.getUniformLocation(program, 'u_flip'),
          u_image: gl.getUniformLocation(program, 'u_image'),
          u_prevImage: gl.getUniformLocation(program, 'u_prevImage'),
          u_hasPrevImage: gl.getUniformLocation(program, 'u_hasPrevImage'),
          u_opacity: gl.getUniformLocation(program, 'u_opacity'),
          u_transitionProgress: gl.getUniformLocation(program, 'u_transitionProgress'),
        },
      };
      this.transitionPrograms.set(transTypeId, entry);
      return entry;
    } catch (err) {
      console.warn(`Transition shader ${transTypeId} compile fallback:`, err);
      return null;
    }
  }

  private ensureGradingFbo(width: number, height: number): boolean {
    const gl = this.gl;
    if (!gl) return false;
    if (
      this.gradingFbo &&
      this.gradingFboTex &&
      this.gradingFboW === width &&
      this.gradingFboH === height
    ) {
      return true;
    }

    if (!this.gradingFboTex) {
      this.gradingFboTex = gl.createTexture();
    }
    if (!this.gradingFbo) {
      this.gradingFbo = gl.createFramebuffer();
    }
    if (!this.gradingFboTex || !this.gradingFbo) return false;

    gl.bindTexture(gl.TEXTURE_2D, this.gradingFboTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.gradingFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.gradingFboTex,
      0
    );
    const complete =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (complete) {
      this.gradingFboW = width;
      this.gradingFboH = height;
    }
    return complete;
  }

  private initBuffers() {
    const gl = this.gl!;
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]),
      gl.STATIC_DRAW
    );
  }

  private isVideoFrame(source: unknown): source is VideoFrame {
    return typeof VideoFrame !== 'undefined' && source instanceof VideoFrame;
  }

  private isSourceReady(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame
  ): boolean {
    if (this.isVideoFrame(source)) {
      return source.displayWidth > 0 && source.displayHeight > 0;
    }
    if (source instanceof HTMLCanvasElement) {
      return source.width > 0 && source.height > 0;
    }
    if (source instanceof HTMLImageElement) {
      return source.complete && source.naturalWidth > 0;
    }
    if (source instanceof HTMLVideoElement) {
      return source.readyState >= 2 && source.videoWidth > 0 && source.videoHeight > 0;
    }
    return false;
  }

  private getSourceDimensions(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame
  ): { width: number; height: number } {
    if (this.isVideoFrame(source)) {
      return { width: source.displayWidth, height: source.displayHeight };
    }
    if (source instanceof HTMLVideoElement) {
      return { width: source.videoWidth, height: source.videoHeight };
    }
    if (source instanceof HTMLImageElement) {
      return { width: source.naturalWidth, height: source.naturalHeight };
    }
    return { width: source.width, height: source.height };
  }

  // Ensure any Video / Image / Canvas / VideoFrame source is rasterized into a clean 2D Canvas when needed
  private getRenderableCanvasSource(
    id: string,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame
  ): HTMLCanvasElement | null {
    if (source instanceof HTMLCanvasElement) {
      return source.width > 0 && source.height > 0 ? source : null;
    }

    if (source instanceof HTMLImageElement) {
      if (!source.complete || source.naturalWidth === 0) {
        return this.frameCache.get(id) || null;
      }
      // Static image: rasterize once into frameCache (max 1920px) and reuse forever
      let cached = this.frameCache.get(id);
      if (!cached) {
        cached = document.createElement('canvas');
        const maxDim = 1920;
        let w = source.naturalWidth || 1080;
        let h = source.naturalHeight || 1080;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
        }
        cached.width = w;
        cached.height = h;
        const ctx = cached.getContext('2d');
        if (ctx) {
          try {
            ctx.drawImage(source, 0, 0, w, h);
            this.frameCache.set(id, cached);
          } catch {
            return null;
          }
        }
      }
      return cached;
    }

    if (source instanceof HTMLVideoElement || this.isVideoFrame(source)) {
      let cached = this.frameCache.get(id);
      const { width: srcW, height: srcH } = this.getSourceDimensions(source);
      if (srcW > 0 && srcH > 0) {
        const maxDim = this.isMobileDevice ? 720 : 1280;
        let w = srcW;
        let h = srcH;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.max(2, Math.round(w * scale));
          h = Math.max(2, Math.round(h * scale));
        }
        if (!cached) {
          cached = document.createElement('canvas');
          this.frameCache.set(id, cached);
        }
        const isSeekingVideo =
          source instanceof HTMLVideoElement && source.seeking;
        if (isSeekingVideo && cached.width > 0 && cached.height > 0) {
          return cached;
        }
        if (cached.width !== w || cached.height !== h) {
          cached.width = w;
          cached.height = h;
        }
        const ctx = cached.getContext('2d');
        if (ctx && !isSeekingVideo) {
          try {
            ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
          } catch {
            // Keep previous frame in cached canvas if seek is mid-flight
          }
        }
      }
      return cached && cached.width > 0 ? cached : null;
    }

    return null;
  }

  public getOrCreateTexture(id: string): WebGLTexture {
    const gl = this.gl!;
    let tex = this.textureCache.get(id);
    if (!tex) {
      tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // Initialize with 1x1 transparent pixel so texture is never incomplete
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      );
      this.textureCache.set(id, tex);
    }
    return tex;
  }

  public uploadMediaTexture(
    id: string,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame,
    textureUnit: number
  ): WebGLTexture {
    const gl = this.gl!;
    gl.activeTexture(textureUnit);
    const texture = this.getOrCreateTexture(id);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const prevMeta = this.textureMetaCache.get(id);

    // 1. Static HTMLImageElement: upload once and reuse GPU texture forever
    if (source instanceof HTMLImageElement) {
      if (!source.complete || source.naturalWidth === 0) {
        return texture;
      }
      if (
        prevMeta &&
        prevMeta.source === source &&
        prevMeta.width === source.naturalWidth &&
        prevMeta.height === source.naturalHeight
      ) {
        return texture;
      }
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      const safeCanvas = this.getRenderableCanvasSource(id, source);
      if (safeCanvas && safeCanvas.width > 0 && safeCanvas.height > 0) {
        try {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            safeCanvas
          );
          this.textureMetaCache.set(id, {
            source,
            mediaTime: 0,
            width: source.naturalWidth,
            height: source.naturalHeight,
          });
        } catch {}
      }
      return texture;
    }

    // 2. HTMLVideoElement: skip upload when seeking (keep previous frame) or when on the exact same decoded frame
    if (source instanceof HTMLVideoElement) {
      if (source.seeking || source.readyState < 2 || source.videoWidth === 0) {
        if (prevMeta) {
          return texture;
        }
      } else if (
        prevMeta &&
        prevMeta.source === source &&
        Math.abs(prevMeta.mediaTime - source.currentTime) < 0.0001 &&
        prevMeta.width === source.videoWidth &&
        prevMeta.height === source.videoHeight
      ) {
        return texture;
      }
    }

    // 3. HTMLCanvasElement (procedural scenes): skip upload if stamp hasn't changed
    if (source instanceof HTMLCanvasElement) {
      const stamp = (source as any).__renderStamp;
      if (
        typeof stamp === 'number' &&
        prevMeta &&
        prevMeta.source === source &&
        Math.abs(prevMeta.mediaTime - stamp) < 0.0001 &&
        prevMeta.width === source.width &&
        prevMeta.height === source.height
      ) {
        return texture;
      }
    }

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    // Fast path: upload VideoFrame or non-seeking HTMLVideoElement directly to GPU
    const canDirectUpload =
      this.isVideoFrame(source) ||
      (source instanceof HTMLVideoElement && !source.seeking);

    if (canDirectUpload && this.isSourceReady(source)) {
      const { width, height } = this.getSourceDimensions(source);
      if (width <= this.maxTextureSize && height <= this.maxTextureSize) {
        try {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            source as TexImageSource
          );
          this.textureMetaCache.set(id, {
            source,
            mediaTime:
              source instanceof HTMLVideoElement ? source.currentTime : 0,
            width,
            height,
          });
          return texture;
        } catch {
          // Fallback to 2D staging canvas below if direct upload is unsupported
        }
      }
    }

    const safeCanvas = this.getRenderableCanvasSource(id, source);
    if (safeCanvas && safeCanvas.width > 0 && safeCanvas.height > 0) {
      try {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          safeCanvas
        );
        const { width, height } = this.getSourceDimensions(source);
        const mediaTime =
          source instanceof HTMLVideoElement
            ? source.currentTime
            : source instanceof HTMLCanvasElement &&
                typeof (source as any).__renderStamp === 'number'
              ? (source as any).__renderStamp
              : 0;
        this.textureMetaCache.set(id, {
          source,
          mediaTime,
          width: width || safeCanvas.width,
          height: height || safeCanvas.height,
        });
      } catch {
        // Ignore transient upload errors
      }
    }
    return texture;
  }

  public clear(
    background: CanvasBackground,
    width: number,
    height: number,
    skip2D = false
  ) {
    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }

    if (skip2D && this.ensureWebGLContext() && this.gl) {
      if (this.glCanvas.width !== width || this.glCanvas.height !== height) {
        this.glCanvas.width = width;
        this.glCanvas.height = height;
      }
      const bgHex =
        background.type === 'color' && background.color
          ? background.color
          : '#0a0b10';
      const [r, g, b] = hexToRgb(bgHex);
      this.gl.viewport(0, 0, width, height);
      this.gl.clearColor(r, g, b, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      return;
    }

    if (this.outputCtx) {
      this.outputCtx.save();
      this.outputCtx.fillStyle =
        background.type === 'color' && background.color
          ? background.color
          : '#0a0b10';
      this.outputCtx.fillRect(0, 0, width, height);
      this.outputCtx.restore();
    }

    if (this.webglReady && this.gl && !this.gl.isContextLost()) {
      if (this.glCanvas.width !== width || this.glCanvas.height !== height) {
        this.glCanvas.width = width;
        this.glCanvas.height = height;
      }
    }
  }

  // Calculate Keyframe Interpolation
  private interpolateKeyframes(
    clip: VideoClip | TextClip,
    clipLocalTime: number
  ) {
    return interpolateClipTransform(clip, clipLocalTime);
  }

  // Calculate Studio-Grade In / Out / Combo Animations with 3D Perspective & Motion Blur
  public calculateAnimations(
    animations: ClipAnimations | undefined,
    localTime: number,
    duration: number,
    canvasWidth = 1080,
    canvasHeight = 1920
  ) {
    let animScaleX = 1.0;
    let animScaleY = 1.0;
    let animOpacity = 1.0;
    let animOffsetX = 0;
    let animOffsetY = 0;
    let animRotate = 0;
    let animPerspX = 0;
    let animPerspY = 0;
    let animBlurX = 0;
    let animBlurY = 0;
    let animFlash = 0;

    if (!animations) {
      return {
        animScaleX,
        animScaleY,
        animOpacity,
        animOffsetX,
        animOffsetY,
        animRotate,
        animPerspX,
        animPerspY,
        animBlurX,
        animBlurY,
        animFlash,
      };
    }

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
    const easeInCubic = (t: number) => t * t * t;
    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const easeOutElastic = (t: number) => {
      if (t === 0 || t === 1) return t;
      const c4 = (2 * Math.PI) / 3.2;
      return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };

    // 1. In Animation (Entrada)
    const inDur = Math.max(0.1, animations.inDuration || 0.6);
    if (animations.inType && animations.inType !== 'none' && localTime < inDur) {
      const pRaw = Math.max(0, Math.min(1, localTime / inDur));
      const p = easeOutCubic(pRaw);
      const pQuint = easeOutQuint(pRaw);
      const inv = 1.0 - p;
      const type = animations.inType as string;

      if (type === 'fadeIn') {
        animOpacity *= pRaw;
        const s = 0.96 + 0.04 * p;
        animScaleX *= s;
        animScaleY *= s;
      } else if (type === 'zoomIn') {
        const s = 0.2 + 0.8 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += (1.0 - pQuint) * 0.025;
        animBlurY += (1.0 - pQuint) * 0.025;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'zoomOut') {
        const s = 2.4 - 1.4 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += (1.0 - pQuint) * 0.03;
        animBlurY += (1.0 - pQuint) * 0.03;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'zoomBounce') {
        const b = easeOutBack(pRaw);
        const s = Math.max(0.1, b);
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'elasticPop') {
        const el = easeOutElastic(pRaw);
        animScaleX *= Math.max(0.1, el);
        animScaleY *= Math.max(0.1, 1.0 + (el - 1.0) * 0.85);
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'slideUp') {
        animOffsetY += (1.0 - pQuint) * (canvasHeight * 0.65);
        animBlurY += (1.0 - pQuint) * 0.028;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'slideDown') {
        animOffsetY -= (1.0 - pQuint) * (canvasHeight * 0.65);
        animBlurY += (1.0 - pQuint) * 0.028;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'slideLeft' || type === 'slideInLeft') {
        animOffsetX += (1.0 - pQuint) * (canvasWidth * 0.75);
        animBlurX += (1.0 - pQuint) * 0.028;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'slideRight' || type === 'slideInRight') {
        animOffsetX -= (1.0 - pQuint) * (canvasWidth * 0.75);
        animBlurX += (1.0 - pQuint) * 0.028;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'whipLeft') {
        const b = easeOutBack(pRaw);
        animOffsetX += (1.0 - b) * (canvasWidth * 0.95);
        animBlurX += Math.pow(1.0 - pRaw, 1.5) * 0.065;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'whipRight') {
        const b = easeOutBack(pRaw);
        animOffsetX -= (1.0 - b) * (canvasWidth * 0.95);
        animBlurX += Math.pow(1.0 - pRaw, 1.5) * 0.065;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'bounce') {
        const bounce = Math.abs(Math.sin(pRaw * Math.PI * 2.5)) * Math.pow(1 - pRaw, 1.6);
        const s = Math.max(0.15, p + bounce * 0.35);
        animScaleX *= s + bounce * 0.12;
        animScaleY *= s - bounce * 0.08;
        animOffsetY -= bounce * (canvasHeight * 0.25);
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'dropBounce') {
        const drop = 1.0 - easeOutBack(pRaw);
        animOffsetY -= drop * (canvasHeight * 0.65);
        const impact = Math.exp(-Math.pow((pRaw - 0.55) * 6.0, 2.0));
        animScaleX *= 1.0 + impact * 0.14;
        animScaleY *= 1.0 - impact * 0.12;
        animFlash += impact * 0.35;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'spin') {
        animRotate -= (1.0 - pQuint) * 360;
        const s = 0.15 + 0.85 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += inv * 0.025;
        animBlurY += inv * 0.025;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'vortexIn') {
        animRotate -= Math.pow(1.0 - pRaw, 2.2) * 720;
        const s = 0.08 + 0.92 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += inv * 0.04;
        animBlurY += inv * 0.04;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'flip3D') {
        animPerspX = (1.0 - pQuint) * Math.PI * 0.92;
        const s = 0.7 + 0.3 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'swing3D') {
        const swing = Math.cos(pRaw * Math.PI * 2.5) * Math.pow(1.0 - pRaw, 1.6);
        animPerspX = swing * 1.15;
        animPerspY = swing * 0.45;
        animRotate += swing * 18;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'tilt3D') {
        animPerspY = (1.0 - pQuint) * Math.PI * 0.88;
        animOffsetY += (1.0 - pQuint) * (canvasHeight * 0.18);
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'glitchIn') {
        const jitter = (Math.sin(localTime * 95.0) * Math.cos(localTime * 63.0)) * inv;
        animOffsetX += jitter * (canvasWidth * 0.18);
        animOffsetY += Math.sin(localTime * 120.0) * inv * (canvasHeight * 0.05);
        animScaleX *= 1.0 + Math.abs(jitter) * 0.25;
        animFlash += inv * 0.45 * Math.abs(Math.sin(localTime * 50.0));
        animBlurX += Math.abs(jitter) * 0.04;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'blurIn') {
        animBlurX += inv * 0.055;
        animBlurY += inv * 0.055;
        const s = 1.25 - 0.25 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= p;
      } else if (type === 'whipUp') {
        const b = easeOutBack(pRaw);
        animOffsetY += (1.0 - b) * (canvasHeight * 0.95);
        animBlurY += Math.pow(1.0 - pRaw, 1.5) * 0.065;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'whipDown') {
        const b = easeOutBack(pRaw);
        animOffsetY -= (1.0 - b) * (canvasHeight * 0.95);
        animBlurY += Math.pow(1.0 - pRaw, 1.5) * 0.065;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'popRotate') {
        const b = easeOutBack(pRaw);
        animScaleX *= 0.2 + 0.8 * b;
        animScaleY *= 0.2 + 0.8 * b;
        animRotate -= (1.0 - pQuint) * 45;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'flip3DY') {
        animPerspY = (1.0 - pQuint) * Math.PI * 0.92;
        const s = 0.72 + 0.28 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'rollInLeft') {
        animOffsetX -= (1.0 - pQuint) * (canvasWidth * 0.85);
        animRotate -= (1.0 - pQuint) * 180;
        animBlurX += inv * 0.03;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'rollInRight') {
        animOffsetX += (1.0 - pQuint) * (canvasWidth * 0.85);
        animRotate += (1.0 - pQuint) * 180;
        animBlurX += inv * 0.03;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'stretchInH') {
        const b = easeOutBack(pRaw);
        animScaleX *= 0.1 + 0.9 * b;
        animScaleY *= 1.35 - 0.35 * pQuint;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'stretchInV') {
        const b = easeOutBack(pRaw);
        animScaleY *= 0.1 + 0.9 * b;
        animScaleX *= 1.35 - 0.35 * pQuint;
        animOpacity *= Math.min(1, pRaw * 3.5);
      } else if (type === 'flashIn') {
        animFlash += Math.pow(inv, 1.5) * 1.1;
        const s = 1.15 - 0.15 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'shakeIn') {
        const decay = Math.pow(inv, 1.6);
        animOffsetX += Math.sin(localTime * 65.0) * decay * (canvasWidth * 0.08);
        animOffsetY += Math.cos(localTime * 58.0) * decay * (canvasHeight * 0.08);
        animRotate += Math.sin(localTime * 45.0) * decay * 6.0;
        animScaleX *= 1.0 + decay * 0.15;
        animScaleY *= 1.0 + decay * 0.15;
        animOpacity *= Math.min(1, pRaw * 4.0);
      } else if (type === 'pendulumIn') {
        const swing = Math.cos(pRaw * Math.PI * 2.0) * Math.pow(inv, 1.4);
        animRotate += swing * 28.0;
        animOffsetY -= inv * (canvasHeight * 0.35);
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'spiralZoom') {
        const s = 0.05 + 0.95 * pQuint;
        animScaleX *= s;
        animScaleY *= s;
        animRotate += (1.0 - pQuint) * 180;
        animBlurX += inv * 0.025;
        animBlurY += inv * 0.025;
        animOpacity *= Math.min(1, pRaw * 3.0);
      } else if (type === 'unfold3D') {
        animPerspX = (1.0 - pQuint) * 1.35;
        animPerspY = (1.0 - pQuint) * 0.85;
        animScaleX *= 0.4 + 0.6 * pQuint;
        animScaleY *= 0.4 + 0.6 * pQuint;
        animOpacity *= Math.min(1, pRaw * 2.5);
      } else if (type === 'cinemaZoomIn') {
        const s = 1.18 - 0.18 * p;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 2.0);
      }
    }

    // 2. Out Animation (Salida)
    const outDur = Math.max(0.1, animations.outDuration || 0.6);
    const timeRemaining = duration - localTime;
    if (animations.outType && animations.outType !== 'none' && timeRemaining < outDur) {
      const pRaw = Math.max(0, Math.min(1, timeRemaining / outDur));
      const outProgress = easeInCubic(1.0 - pRaw);
      const type = animations.outType as string;

      if (type === 'fadeOut') {
        animOpacity *= pRaw;
      } else if (type === 'zoomOut') {
        const s = 1.0 - 0.85 * outProgress;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += outProgress * 0.025;
        animBlurY += outProgress * 0.025;
        animOpacity *= pRaw;
      } else if (type === 'zoomIn') {
        const s = 1.0 + 1.45 * outProgress;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += outProgress * 0.035;
        animBlurY += outProgress * 0.035;
        animOpacity *= pRaw;
      } else if (type === 'slideDown') {
        animOffsetY += outProgress * (canvasHeight * 0.65);
        animBlurY += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'slideUp') {
        animOffsetY -= outProgress * (canvasHeight * 0.65);
        animBlurY += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'slideLeft') {
        animOffsetX -= outProgress * (canvasWidth * 0.75);
        animBlurX += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'slideRight') {
        animOffsetX += outProgress * (canvasWidth * 0.75);
        animBlurX += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'whipOutLeft') {
        animOffsetX -= outProgress * (canvasWidth * 0.95);
        animBlurX += outProgress * 0.065;
        animOpacity *= Math.min(1, pRaw * 2.0);
      } else if (type === 'whipOutRight') {
        animOffsetX += outProgress * (canvasWidth * 0.95);
        animBlurX += outProgress * 0.065;
        animOpacity *= Math.min(1, pRaw * 2.0);
      } else if (type === 'spin') {
        animRotate += outProgress * 360;
        const s = 1.0 - 0.85 * outProgress;
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= pRaw;
      } else if (type === 'vortexOut') {
        animRotate += outProgress * 720;
        const s = 1.0 - 0.9 * outProgress;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += outProgress * 0.04;
        animBlurY += outProgress * 0.04;
        animOpacity *= pRaw;
      } else if (type === 'flip3DOut') {
        animPerspX += outProgress * Math.PI * 0.9;
        animOpacity *= pRaw;
      } else if (type === 'glitchOut') {
        const jitter = Math.sin(localTime * 110.0) * outProgress;
        animOffsetX += jitter * (canvasWidth * 0.22);
        animFlash += outProgress * 0.4;
        animBlurX += outProgress * 0.04;
        animOpacity *= pRaw;
      } else if (type === 'blurOut') {
        animBlurX += outProgress * 0.055;
        animBlurY += outProgress * 0.055;
        animScaleX *= 1.0 + outProgress * 0.25;
        animScaleY *= 1.0 + outProgress * 0.25;
        animOpacity *= pRaw;
      } else if (type === 'whipOutUp') {
        animOffsetY -= outProgress * (canvasHeight * 0.95);
        animBlurY += outProgress * 0.065;
        animOpacity *= Math.min(1, pRaw * 2.0);
      } else if (type === 'whipOutDown') {
        animOffsetY += outProgress * (canvasHeight * 0.95);
        animBlurY += outProgress * 0.065;
        animOpacity *= Math.min(1, pRaw * 2.0);
      } else if (type === 'flip3DOutY') {
        animPerspY += outProgress * Math.PI * 0.9;
        animOpacity *= pRaw;
      } else if (type === 'rollOutLeft') {
        animOffsetX -= outProgress * (canvasWidth * 0.85);
        animRotate -= outProgress * 180;
        animBlurX += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'rollOutRight') {
        animOffsetX += outProgress * (canvasWidth * 0.85);
        animRotate += outProgress * 180;
        animBlurX += outProgress * 0.03;
        animOpacity *= pRaw;
      } else if (type === 'stretchOutH') {
        animScaleX *= Math.max(0.05, 1.0 - outProgress * 0.95);
        animScaleY *= 1.0 + outProgress * 0.35;
        animOpacity *= pRaw;
      } else if (type === 'stretchOutV') {
        animScaleY *= Math.max(0.05, 1.0 - outProgress * 0.95);
        animScaleX *= 1.0 + outProgress * 0.35;
        animOpacity *= pRaw;
      } else if (type === 'flashOut') {
        animFlash += outProgress * 1.1;
        animScaleX *= 1.0 + outProgress * 0.2;
        animScaleY *= 1.0 + outProgress * 0.2;
        animOpacity *= pRaw;
      } else if (type === 'shakeOut') {
        animOffsetX += Math.sin(localTime * 70.0) * outProgress * (canvasWidth * 0.09);
        animOffsetY += Math.cos(localTime * 62.0) * outProgress * (canvasHeight * 0.09);
        animRotate += Math.sin(localTime * 48.0) * outProgress * 7.0;
        animOpacity *= pRaw;
      } else if (type === 'dropOut') {
        animOffsetY += Math.pow(outProgress, 1.4) * (canvasHeight * 0.85);
        animRotate += outProgress * 15.0;
        animBlurY += outProgress * 0.035;
        animOpacity *= pRaw;
      } else if (type === 'popOut') {
        const bulge = Math.sin(Math.min(1, (1.0 - pRaw) * 2.2) * Math.PI) * 0.18;
        const s = Math.max(0.02, 1.0 - outProgress * 1.0 + bulge);
        animScaleX *= s;
        animScaleY *= s;
        animOpacity *= Math.min(1, pRaw * 1.8);
      } else if (type === 'spiralOut') {
        animRotate -= outProgress * 180;
        const s = Math.max(0.05, 1.0 - outProgress * 0.95);
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += outProgress * 0.03;
        animBlurY += outProgress * 0.03;
        animOpacity *= pRaw;
      }
    }

    // 3. Combo / Continuous Loop Animation
    const combo = animations.comboType as string;
    if (combo && combo !== 'none') {
      if (combo === 'heartbeat') {
        const cycle = (localTime * 1.4) % 1.0;
        const b1 = Math.exp(-Math.pow((cycle - 0.15) * 14.0, 2.0));
        const b2 = Math.exp(-Math.pow((cycle - 0.35) * 16.0, 2.0)) * 0.65;
        const beat = b1 + b2;
        const s = 1.0 + beat * 0.16;
        animScaleX *= s;
        animScaleY *= s;
        animFlash += beat * 0.12;
      } else if (combo === 'floating') {
        animOffsetY += Math.sin(localTime * 2.6) * (canvasHeight * 0.032);
        animOffsetX += Math.sin(localTime * 1.3) * (canvasWidth * 0.025);
        animRotate += Math.sin(localTime * 1.9) * 3.2;
        animPerspX += Math.cos(localTime * 1.9) * 0.15;
      } else if (combo === 'glitchFlash') {
        const tick = Math.floor(localTime * 14);
        const r = Math.sin(tick * 12.9898) * 43758.5453;
        const frac = r - Math.floor(r);
        if (frac > 0.62) {
          animOffsetX += (frac - 0.8) * (canvasWidth * 0.14);
          animOffsetY += Math.cos(tick) * (canvasHeight * 0.03);
          animScaleX *= 1.06;
          animScaleY *= 1.06;
          animFlash += 0.22;
          animBlurX += 0.025;
        }
      } else if (combo === 'pendulum') {
        const angle = Math.sin(localTime * 3.8);
        animRotate += angle * 14.0;
        animOffsetX += angle * (canvasWidth * 0.04);
      } else if (combo === 'shake') {
        animOffsetX += (Math.sin(localTime * 36.0) + Math.cos(localTime * 51.0) * 0.5) * (canvasWidth * 0.016);
        animOffsetY += (Math.cos(localTime * 42.0) + Math.sin(localTime * 59.0) * 0.5) * (canvasHeight * 0.016);
        animRotate += Math.sin(localTime * 32.0) * 1.8;
      } else if (combo === 'zoomPulse') {
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(localTime * 5.0), 2.0);
        const s = 1.0 + pulse * 0.16;
        animScaleX *= s;
        animScaleY *= s;
        animBlurX += pulse * 0.012;
        animBlurY += pulse * 0.012;
      } else if (combo === 'swing3DLoop') {
        animPerspX += Math.sin(localTime * 2.8) * 0.55;
        animPerspY += Math.cos(localTime * 2.1) * 0.28;
        const s = 1.0 + Math.sin(localTime * 2.8) * 0.06;
        animScaleX *= s;
        animScaleY *= s;
      } else if (combo === 'neonPulse') {
        const wave = Math.pow(0.5 + 0.5 * Math.sin(localTime * 6.0), 3.0);
        animScaleX *= 1.0 + wave * 0.08;
        animScaleY *= 1.0 + wave * 0.08;
        animFlash += wave * 0.28;
      } else if (combo === 'cinemaPan') {
        const progress = Math.min(1, localTime / Math.max(1, duration));
        const s = 1.12 + 0.12 * Math.sin(progress * Math.PI);
        animScaleX *= s;
        animScaleY *= s;
        animOffsetX += Math.cos(progress * Math.PI) * (canvasWidth * 0.045);
        animOffsetY += Math.sin(progress * Math.PI * 2.0) * (canvasHeight * 0.025);
      } else if (combo === 'rubberBand') {
        const stretch = Math.sin(localTime * 6.5) * 0.14;
        animScaleX *= 1.0 + stretch;
        animScaleY *= 1.0 - stretch * 0.85;
      } else if (combo === 'handheldCam') {
        animOffsetX += (Math.sin(localTime * 2.1) + Math.sin(localTime * 5.3) * 0.4) * (canvasWidth * 0.018);
        animOffsetY += (Math.cos(localTime * 1.7) + Math.cos(localTime * 4.7) * 0.4) * (canvasHeight * 0.018);
        animRotate += Math.sin(localTime * 2.9) * 1.5;
        animScaleX *= 1.04;
        animScaleY *= 1.04;
      } else if (combo === 'discoSpin') {
        animRotate += Math.sin(localTime * 4.5) * 22.0;
        const s = 0.92 + 0.16 * Math.abs(Math.cos(localTime * 4.5));
        animScaleX *= s;
        animScaleY *= s;
        animPerspX += Math.sin(localTime * 4.5) * 0.35;
      } else if (combo === 'breathe') {
        const b = 0.5 - 0.5 * Math.cos(localTime * 2.2);
        const s = 0.95 + 0.12 * b;
        animScaleX *= s;
        animScaleY *= s;
      } else if (combo === 'bounceLoop') {
        const b = Math.abs(Math.sin(localTime * 4.2));
        animOffsetY -= b * (canvasHeight * 0.08);
        animScaleX *= 1.0 + (1.0 - b) * 0.08;
        animScaleY *= 1.0 - (1.0 - b) * 0.06;
      } else if (combo === 'spin360Loop') {
        animRotate += (localTime * 120.0) % 360;
      } else if (combo === 'flip3DLoop') {
        animPerspX += localTime * 2.4;
      } else if (combo === 'figure8') {
        animOffsetX += Math.sin(localTime * 2.2) * (canvasWidth * 0.045);
        animOffsetY += Math.sin(localTime * 4.4) * (canvasHeight * 0.03);
        animRotate += Math.cos(localTime * 2.2) * 3.0;
      } else if (combo === 'orbit3D') {
        animPerspX += Math.sin(localTime * 2.2) * 0.45;
        animPerspY += Math.cos(localTime * 2.2) * 0.35;
        animOffsetX += Math.cos(localTime * 2.2) * (canvasWidth * 0.025);
        animOffsetY += Math.sin(localTime * 2.2) * (canvasHeight * 0.025);
      } else if (combo === 'strobeFlash') {
        const st = Math.pow(Math.max(0, Math.sin(localTime * 16.0)), 4.0);
        animFlash += st * 0.55;
        animOpacity *= 0.85 + 0.15 * st;
      } else if (combo === 'wobble') {
        const w = Math.sin(localTime * 7.0);
        animRotate += w * 7.5;
        animScaleX *= 1.0 + w * 0.08;
        animScaleY *= 1.0 - w * 0.08;
      } else if (combo === 'zoomInSlow') {
        const prog = Math.min(1, localTime / Math.max(0.5, duration));
        const s = 1.0 + prog * 0.28;
        animScaleX *= s;
        animScaleY *= s;
      } else if (combo === 'zoomOutSlow') {
        const prog = Math.min(1, localTime / Math.max(0.5, duration));
        const s = 1.28 - prog * 0.28;
        animScaleX *= s;
        animScaleY *= s;
      } else if (combo === 'panLeftSlow') {
        const prog = Math.min(1, localTime / Math.max(0.5, duration));
        animScaleX *= 1.15;
        animScaleY *= 1.15;
        animOffsetX += (0.5 - prog) * (canvasWidth * 0.12);
      } else if (combo === 'panRightSlow') {
        const prog = Math.min(1, localTime / Math.max(0.5, duration));
        animScaleX *= 1.15;
        animScaleY *= 1.15;
        animOffsetX -= (0.5 - prog) * (canvasWidth * 0.12);
      } else if (combo === 'flicker') {
        const fl = 0.78 + 0.22 * Math.sin(localTime * 38.0) * Math.cos(localTime * 23.0);
        animOpacity *= fl;
        animFlash += (1.0 - fl) * 0.2;
      } else if (combo === 'turbulence') {
        animOffsetX += Math.sin(localTime * 45.0) * (canvasWidth * 0.025);
        animOffsetY += Math.cos(localTime * 52.0) * (canvasHeight * 0.025);
        animRotate += Math.sin(localTime * 33.0) * 3.5;
        animScaleX *= 1.08;
        animScaleY *= 1.08;
        animBlurX += 0.015;
        animBlurY += 0.015;
      }
    }

    return {
      animScaleX,
      animScaleY,
      animOpacity,
      animOffsetX,
      animOffsetY,
      animRotate,
      animPerspX,
      animPerspY,
      animBlurX,
      animBlurY,
      animFlash,
    };
  }

  // Helper to get exact base dimensions of a media clip on canvas
  public static getClipBaseDimensions(
    clip: VideoClip,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame | undefined,
    canvasWidth: number,
    canvasHeight: number
  ): { baseW: number; baseH: number; sourceW: number; sourceH: number } {
    let sourceW = clip.naturalWidth || 1080;
    let sourceH = clip.naturalHeight || 1920;

    if (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame && source.displayWidth > 0) {
      sourceW = source.displayWidth;
      sourceH = source.displayHeight;
    } else if (source instanceof HTMLVideoElement && source.videoWidth > 0) {
      sourceW = source.videoWidth;
      sourceH = source.videoHeight;
    } else if (source instanceof HTMLImageElement && source.naturalWidth > 0) {
      sourceW = source.naturalWidth;
      sourceH = source.naturalHeight;
    } else if (source instanceof HTMLCanvasElement && source.width > 0) {
      sourceW = source.width;
      sourceH = source.height;
    }

    const fitMode = clip.transform.fitMode || 'contain';
    if (fitMode === 'fill') {
      return { baseW: canvasWidth, baseH: canvasHeight, sourceW, sourceH };
    }
    const scaleFactor =
      fitMode === 'cover'
        ? Math.max(canvasWidth / sourceW, canvasHeight / sourceH)
        : Math.min(canvasWidth / sourceW, canvasHeight / sourceH);

    return {
      baseW: sourceW * scaleFactor,
      baseH: sourceH * scaleFactor,
      sourceW,
      sourceH,
    };
  }

  // Pure Canvas 2D Fallback Renderer (Guaranteed to work even if WebGL is disabled/broken)
  private applyChromaKey2D(
    clip: VideoClip,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame
  ): HTMLCanvasElement | null {
    const chroma = clip.chromaKey;
    if (!chroma?.enabled) return null;

    const { width: srcW, height: srcH } = this.getSourceDimensions(source);
    if (srcW <= 0 || srcH <= 0) return null;

    const maxDim = this.isMobileDevice ? 720 : 1080;
    let w = srcW;
    let h = srcH;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.max(2, Math.round(w * scale));
      h = Math.max(2, Math.round(h * scale));
    }

    const sig = `${chroma.color}|${chroma.tolerance}|${chroma.feather}|${chroma.spillSuppression}|${w}x${h}`;
    const isStatic = clip.type === 'image';
    if (isStatic) {
      const cached = this.chroma2DCache.get(clip.id);
      if (cached && cached.sig === sig) {
        return cached.canvas;
      }
    }

    let targetCanvas: HTMLCanvasElement;
    let targetCtx: CanvasRenderingContext2D | null;
    if (isStatic) {
      targetCanvas = document.createElement('canvas');
      targetCanvas.width = w;
      targetCanvas.height = h;
      targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
    } else {
      if (!this.chroma2DCanvas) {
        this.chroma2DCanvas = document.createElement('canvas');
        this.chroma2DCtx = this.chroma2DCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (this.chroma2DCanvas.width !== w || this.chroma2DCanvas.height !== h) {
        this.chroma2DCanvas.width = w;
        this.chroma2DCanvas.height = h;
      }
      targetCanvas = this.chroma2DCanvas;
      targetCtx = this.chroma2DCtx;
    }

    if (!targetCtx) return null;

    try {
      targetCtx.clearRect(0, 0, w, h);
      targetCtx.drawImage(source as CanvasImageSource, 0, 0, w, h);
      const imgData = targetCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const [kr, kg, kb] = hexToRgb(chroma.color);
      const y2 = 0.299 * kr + 0.587 * kg + 0.114 * kb;
      const cb2 = -0.168736 * kr - 0.331264 * kg + 0.5 * kb;
      const cr2 = 0.5 * kr - 0.418688 * kg - 0.081312 * kb;
      const keyChromaMag = Math.hypot(cb2, cr2);
      const useYCbCr = keyChromaMag > 0.08;

      const edge0 = Number.isFinite(chroma.tolerance)
        ? Math.max(0.01, Math.min(1.0, chroma.tolerance))
        : 0.35;
      const feather = Number.isFinite(chroma.feather)
        ? Math.max(0.0, Math.min(1.0, chroma.feather))
        : 0.1;
      const edge1 = edge0 + Math.max(0.001, feather);
      const spill = Number.isFinite(chroma.spillSuppression)
        ? Math.max(0.0, Math.min(1.0, chroma.spillSuppression))
        : 0.5;
      const maxKey = Math.max(kr, kg, kb);
      const spillChannel = kg >= maxKey - 0.01 ? 1 : kb >= maxKey - 0.01 ? 2 : 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;

        let dist: number;
        if (useYCbCr) {
          const y1 = 0.299 * r + 0.587 * g + 0.114 * b;
          const cb1 = -0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr1 = 0.5 * r - 0.418688 * g - 0.081312 * b;
          dist = Math.hypot(cb1 - cb2, cr1 - cr2) * 1.15 + Math.abs(y1 - y2) * 0.2;
        } else {
          dist = Math.hypot(r - kr, g - kg, b - kb);
        }

        const t = Math.max(0, Math.min(1, (dist - edge0) / (edge1 - edge0)));
        const chromaMask = t * t * (3 - 2 * t);

        if (spill > 0) {
          const st = Math.max(0, Math.min(1, (dist - edge0) / (edge1 + 0.22 - edge0)));
          const spillRegion = 1 - st * st * (3 - 2 * st);
          const mixAmt = spillRegion * spill;
          if (spillChannel === 1) {
            const avg = (r + b) * 0.5;
            if (g > avg) data[i + 1] = Math.round((g + (avg - g) * mixAmt) * 255);
          } else if (spillChannel === 2) {
            const avg = (r + g) * 0.5;
            if (b > avg) data[i + 2] = Math.round((b + (avg - b) * mixAmt) * 255);
          } else {
            const avg = (g + b) * 0.5;
            if (r > avg) data[i] = Math.round((r + (avg - r) * mixAmt) * 255);
          }
        }

        data[i + 3] = Math.round(a * chromaMask);
      }

      targetCtx.putImageData(imgData, 0, 0);
      if (isStatic) {
        this.chroma2DCache.set(clip.id, { sig, canvas: targetCanvas });
      }
      return targetCanvas;
    } catch {
      return null;
    }
  }

  private renderVideoClip2DFallback(
    clip: VideoClip,
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number,
    prevClipSource?: {
      id: string;
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame;
    } | null
  ) {
    const ctx = this.outputCtx;
    if (!ctx) return;

    const baseDrawable = this.getRenderableCanvasSource(clip.id, source) || source;
    const chromaDrawable =
      (clip.chromaKey?.enabled ? this.applyChromaKey2D(clip, baseDrawable) : null) ||
      baseDrawable;
    const { width: rawW, height: rawH } = this.getSourceDimensions(chromaDrawable);
    const drawable = this.fallback2D.prepareProcessedSource(
      chromaDrawable as CanvasImageSource,
      rawW || canvasWidth,
      rawH || canvasHeight,
      clip,
      currentTime
    );

    const localTime = Math.max(0, currentTime - clip.startTime);
    const transform = this.interpolateKeyframes(clip, localTime);
    const anim = this.calculateAnimations(
      clip.animations,
      localTime,
      clip.duration,
      canvasWidth,
      canvasHeight
    );

    const { baseW, baseH } = WebGLRenderer.getClipBaseDimensions(
      clip,
      chromaDrawable,
      canvasWidth,
      canvasHeight
    );

    const sx = transform.scaleX ?? 1;
    const sy = transform.scaleY ?? 1;
    const drawW =
      baseW *
      transform.scale *
      sx *
      anim.animScaleX *
      Math.max(0.15, Math.abs(Math.cos(anim.animPerspX)));
    const drawH =
      baseH *
      transform.scale *
      sy *
      anim.animScaleY *
      Math.max(0.15, Math.abs(Math.cos(anim.animPerspY)));

    let shakeX = 0;
    let shakeY = 0;
    if (clip.effect?.type === 'cameraShake' && (clip.effect.intensity ?? 60) > 0) {
      const amt = Math.max(0, Math.min(1, (clip.effect.intensity ?? 60) / 100));
      const spd = 0.2 + ((clip.effect.speed ?? 50) / 100) * 2.2;
      const t = currentTime * spd * 14;
      shakeX = Math.sin(t * 1.7) * amt * 18;
      shakeY = Math.cos(t * 2.3) * amt * 14;
    }

    const centerX =
      canvasWidth / 2 +
      (transform.x / 100) * canvasWidth +
      anim.animOffsetX +
      shakeX;
    const centerY =
      canvasHeight / 2 +
      (transform.y / 100) * canvasHeight +
      anim.animOffsetY +
      shakeY;

    const drawClipToTarget = (targetCtx: CanvasRenderingContext2D) => {
      targetCtx.save();
      if (transform.blendMode === 'multiply') targetCtx.globalCompositeOperation = 'multiply';
      else if (transform.blendMode === 'screen') targetCtx.globalCompositeOperation = 'screen';
      else if (transform.blendMode === 'lighten') targetCtx.globalCompositeOperation = 'lighten';
      else if (transform.blendMode === 'overlay') targetCtx.globalCompositeOperation = 'overlay';
      else targetCtx.globalCompositeOperation = 'source-over';

      targetCtx.globalAlpha = Math.max(
        0,
        Math.min(1, transform.opacity * anim.animOpacity)
      );

      this.fallback2D.apply2DMaskPath(targetCtx, canvasWidth, canvasHeight, clip.mask);

      targetCtx.translate(centerX, centerY);
      targetCtx.rotate(((transform.rotation + anim.animRotate) * Math.PI) / 180);
      targetCtx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

      try {
        targetCtx.drawImage(drawable, -drawW / 2, -drawH / 2, drawW, drawH);
      } catch {
        // Ignore if media is not yet decoded
      }
      targetCtx.restore();

      this.fallback2D.drawOverlayEffect(
        targetCtx,
        canvasWidth,
        canvasHeight,
        clip.effect,
        currentTime
      );
    };

    const trans = clip.transition || { type: 'none', duration: 0.6 };
    const transDuration = Math.max(0.1, trans.duration || 0.6);
    const isTransitioning =
      trans.type && trans.type !== 'none' && localTime < transDuration;

    if (isTransitioning) {
      const transProgress = Math.max(0, Math.min(1, localTime / transDuration));
      const currCanvas = this.fallback2D.getCurrCanvas(canvasWidth, canvasHeight);
      const currCtx = currCanvas.getContext('2d')!;
      drawClipToTarget(currCtx);

      let prevCanvas: HTMLCanvasElement | null = null;
      if (prevClipSource) {
        const prevDrawable =
          this.getRenderableCanvasSource(prevClipSource.id, prevClipSource.element) ||
          prevClipSource.element;
        prevCanvas = this.fallback2D.getPrevCanvas(canvasWidth, canvasHeight);
        const prevCtx = prevCanvas.getContext('2d')!;
        prevCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        try {
          prevCtx.drawImage(
            prevDrawable as CanvasImageSource,
            0,
            0,
            canvasWidth,
            canvasHeight
          );
        } catch {
          prevCanvas = null;
        }
      }

      this.fallback2D.renderTransition2D(
        ctx,
        prevCanvas,
        currCanvas,
        canvasWidth,
        canvasHeight,
        trans.type,
        transProgress
      );
      return;
    }

    drawClipToTarget(ctx);
  }

  // Draw a Video or Image layer (with optional outgoing transition source)
  private applyManualSourceRotation(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame,
    rotation: number
  ): HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame {
    if (!rotation) return source;
    const { width: srcW, height: srcH } = this.getSourceDimensions(source);
    if (srcW <= 0 || srcH <= 0) return source;

    const swap = rotation === 90 || rotation === 270;
    const outW = swap ? srcH : srcW;
    const outH = swap ? srcW : srcH;

    if (!this.rotatedCanvas) {
      this.rotatedCanvas = document.createElement('canvas');
      this.rotatedCtx = this.rotatedCanvas.getContext('2d', { alpha: false });
    }
    if (this.rotatedCanvas.width !== outW || this.rotatedCanvas.height !== outH) {
      this.rotatedCanvas.width = outW;
      this.rotatedCanvas.height = outH;
    }
    if (!this.rotatedCtx) return source;

    const ctx = this.rotatedCtx;
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(source as CanvasImageSource, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();
    return this.rotatedCanvas;
  }

  public renderVideoClip(
    clip: VideoClip,
    rawSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number,
    prevClipSource?: {
      id: string;
      element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | VideoFrame;
    } | null,
    sourceRotation = 0,
    skip2DCopy = false
  ) {
    if (!this.outputCtx) {
      return;
    }

    const localTime = Math.max(0, currentTime - clip.startTime);
    const transform = this.interpolateKeyframes(clip, localTime);
    const anim = this.calculateAnimations(
      clip.animations,
      localTime,
      clip.duration,
      canvasWidth,
      canvasHeight
    );

    // Fast path: draw plain VideoFrame/HTMLVideoElement/Canvas directly onto outputCtx
    // without WebGL texture upload + shader + WebGL-to-2D readback (or manual rotation canvas copy)
    const fastTrans = clip.transition;
    const isTransitionActive = Boolean(
      fastTrans &&
        fastTrans.type &&
        fastTrans.type !== 'none' &&
        localTime < (fastTrans.duration || 0.6)
    );
    const fastCg = clip.colorGrading;
    const hasColorGrading = Boolean(
      fastCg &&
        (fastCg.brightness ||
          fastCg.contrast ||
          fastCg.saturation ||
          fastCg.exposure ||
          fastCg.sharpness ||
          fastCg.highlights ||
          fastCg.shadows ||
          fastCg.temperature ||
          fastCg.tint ||
          fastCg.vignette ||
          fastCg.hslRed?.hue ||
          fastCg.hslRed?.sat ||
          fastCg.hslRed?.lum ||
          fastCg.hslYellow?.hue ||
          fastCg.hslYellow?.sat ||
          fastCg.hslYellow?.lum ||
          fastCg.hslGreen?.hue ||
          fastCg.hslGreen?.sat ||
          fastCg.hslGreen?.lum ||
          fastCg.hslBlue?.hue ||
          fastCg.hslBlue?.sat ||
          fastCg.hslBlue?.lum)
    );
    const hasFilter = Boolean(
      clip.filterPreset && clip.filterPreset !== 'none' && (clip.filterIntensity ?? 100) > 0
    );
    const hasChroma = Boolean(clip.chromaKey?.enabled);
    const hasMask = Boolean(clip.mask && clip.mask.type !== 'none');
    const hasEffect = Boolean(clip.effect && clip.effect.type !== 'none');
    const hasShaderAnim =
      anim.animBlurX !== 0 ||
      anim.animBlurY !== 0 ||
      anim.animFlash !== 0 ||
      anim.animPerspX !== 0 ||
      anim.animPerspY !== 0;

    if (
      !skip2DCopy &&
      !isTransitionActive &&
      !hasColorGrading &&
      !hasFilter &&
      !hasChroma &&
      !hasMask &&
      !hasEffect &&
      !hasShaderAnim
    ) {
      const isDirectRaw =
        (this.isVideoFrame(rawSource) || rawSource instanceof HTMLVideoElement) &&
        this.isSourceReady(rawSource);
      const fastDrawable:
        | HTMLVideoElement
        | HTMLImageElement
        | HTMLCanvasElement
        | VideoFrame
        | null = isDirectRaw
        ? rawSource
        : this.getRenderableCanvasSource(clip.id, rawSource);
      if (!fastDrawable) {
        return;
      }

      const swapDims = sourceRotation === 90 || sourceRotation === 270;
      const { width: rawW, height: rawH } = this.getSourceDimensions(fastDrawable);
      const effW = swapDims ? rawH : rawW;
      const effH = swapDims ? rawW : rawH;
      const fitMode = clip.transform.fitMode || 'contain';
      let baseW = canvasWidth;
      let baseH = canvasHeight;
      if (fitMode !== 'fill' && effW > 0 && effH > 0) {
        const scaleFactor =
          fitMode === 'cover'
            ? Math.max(canvasWidth / effW, canvasHeight / effH)
            : Math.min(canvasWidth / effW, canvasHeight / effH);
        baseW = effW * scaleFactor;
        baseH = effH * scaleFactor;
      }

      const sx = transform.scaleX ?? 1;
      const sy = transform.scaleY ?? 1;
      const drawW = baseW * transform.scale * sx * anim.animScaleX;
      const drawH = baseH * transform.scale * sy * anim.animScaleY;
      const centerX =
        canvasWidth / 2 + (transform.x / 100) * canvasWidth + anim.animOffsetX;
      const centerY =
        canvasHeight / 2 + (transform.y / 100) * canvasHeight + anim.animOffsetY;

      const ctx = this.outputCtx;
      ctx.save();
      if (transform.blendMode === 'multiply') ctx.globalCompositeOperation = 'multiply';
      else if (transform.blendMode === 'screen') ctx.globalCompositeOperation = 'screen';
      else if (transform.blendMode === 'lighten') ctx.globalCompositeOperation = 'lighten';
      else if (transform.blendMode === 'overlay') ctx.globalCompositeOperation = 'overlay';
      else ctx.globalCompositeOperation = 'source-over';

      ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * anim.animOpacity));
      ctx.translate(centerX, centerY);
      const rotDeg = transform.rotation + anim.animRotate;
      if (rotDeg !== 0) {
        ctx.rotate((rotDeg * Math.PI) / 180);
      }
      if (transform.flipH || transform.flipV) {
        ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
      }
      if (sourceRotation !== 0) {
        ctx.rotate((sourceRotation * Math.PI) / 180);
      }
      const preW = swapDims ? drawH : drawW;
      const preH = swapDims ? drawW : drawH;
      try {
        ctx.drawImage(
          fastDrawable as CanvasImageSource,
          -preW / 2,
          -preH / 2,
          preW,
          preH
        );
      } catch {
        // Fallback if source cannot be drawn directly
      }
      ctx.restore();
      return;
    }

    const source =
      sourceRotation !== 0
        ? this.applyManualSourceRotation(rawSource, sourceRotation)
        : rawSource;

    // Check source readiness without forcing an expensive 2D canvas blit for video/VideoFrame
    const isDirectVideo =
      (this.isVideoFrame(source) || source instanceof HTMLVideoElement) &&
      this.isSourceReady(source);
    const drawableForDims:
      | HTMLVideoElement
      | HTMLImageElement
      | HTMLCanvasElement
      | VideoFrame
      | null = isDirectVideo
      ? source
      : this.getRenderableCanvasSource(clip.id, source);
    if (!drawableForDims) {
      return;
    }

    const fallback2DRender = () => {
      const safeDrawable = this.getRenderableCanvasSource(clip.id, source);
      if (!safeDrawable) return;
      this.renderVideoClip2DFallback(
        clip,
        safeDrawable,
        canvasWidth,
        canvasHeight,
        currentTime,
        prevClipSource
      );
    };

    if (!this.ensureWebGLContext() || !this.gl) {
      fallback2DRender();
      return;
    }

    const gl = this.gl;
    if (this.glCanvas.width !== canvasWidth || this.glCanvas.height !== canvasHeight) {
      this.glCanvas.width = canvasWidth;
      this.glCanvas.height = canvasHeight;
    }

    // Calculate Transition state
    const trans = clip.transition || { type: 'none', duration: 0.6 };
    const transTypeId = TRANS_MAP[trans.type] || 0;
    const transDuration = Math.max(0.1, trans.duration || 0.6);
    const isTransitioning = transTypeId > 0 && localTime < transDuration;
    const transProgress = isTransitioning
      ? Math.max(0, Math.min(1, localTime / transDuration))
      : 1.0;

    const needsGradingPass =
      hasColorGrading ||
      hasFilter ||
      hasChroma ||
      hasMask ||
      hasEffect ||
      hasShaderAnim;

    // Upload Primary Texture explicitly to TEXTURE0
    const rawTexture = this.uploadMediaTexture(clip.id, drawableForDims, gl.TEXTURE0);

    // Calculate layer placement (Fit, Cover, or Fill) + Free Finger Scale (scaleX, scaleY)
    const { baseW, baseH, sourceW, sourceH } =
      WebGLRenderer.getClipBaseDimensions(clip, drawableForDims, canvasWidth, canvasHeight);

    const sx = transform.scaleX ?? 1;
    const sy = transform.scaleY ?? 1;
    const drawW = baseW * transform.scale * sx * anim.animScaleX;
    const drawH = baseH * transform.scale * sy * anim.animScaleY;

    const posX =
      (canvasWidth - drawW) / 2 +
      (transform.x / 100) * canvasWidth +
      anim.animOffsetX;
    const posY =
      (canvasHeight - drawH) / 2 +
      (transform.y / 100) * canvasHeight +
      anim.animOffsetY;

    const presetKey = clip.filterPreset || 'none';
    const presetId =
      (clip.filterIntensity ?? 100) > 0 ? FILTER_PRESET_MAP[presetKey] || 0 : 0;

    const fx = clip.effect;
    const fxKey = fx?.type || 'none';
    const fxId = (fx?.intensity ?? 60) > 0 ? FX_MAP[fxKey] || 0 : 0;
    const fxMeta = fxId >= 91 ? PARAMETRIC_EFFECT_MAP[fxKey] : undefined;
    const fxFamily = fxMeta ? fxMeta.gpu.family : 0;

    const mask = clip.mask;
    const maskId = MASK_MAP[mask?.type || 'none'] || 0;

    const cg = clip.colorGrading;
    const hasBasicCg = Boolean(
      cg &&
        (cg.brightness ||
          cg.contrast ||
          cg.saturation ||
          cg.exposure ||
          cg.highlights ||
          cg.shadows ||
          cg.temperature ||
          cg.tint ||
          cg.vignette)
    );
    const hasSharpness = Boolean(cg && (cg.sharpness || 0) > 0);
    const hasHsl = Boolean(
      cg &&
        (cg.hslRed?.hue ||
          cg.hslRed?.sat ||
          cg.hslRed?.lum ||
          cg.hslYellow?.hue ||
          cg.hslYellow?.sat ||
          cg.hslYellow?.lum ||
          cg.hslGreen?.hue ||
          cg.hslGreen?.sat ||
          cg.hslGreen?.lum ||
          cg.hslBlue?.hue ||
          cg.hslBlue?.sat ||
          cg.hslBlue?.lum)
    );

    const shaderSpec: CompositeShaderSpec = {
      filterPreset: presetId,
      effectType: fxId,
      fxFamily,
      hasColorGrading: hasBasicCg,
      hasSharpness,
      hasHsl,
      hasChroma,
      maskType: maskId,
      hasPerspective: anim.animPerspX !== 0 || anim.animPerspY !== 0,
      hasAnimBlur: anim.animBlurX !== 0 || anim.animBlurY !== 0,
    };

    const bindBaseUniforms = (
      compProg: NonNullable<ReturnType<WebGLRenderer['getCompositeProgram']>>,
      uPosX: number,
      uPosY: number,
      uDrawW: number,
      uDrawH: number,
      uRot: number,
      uFlipX: number,
      uFlipY: number,
      uOpacity: number,
      skipPremultiply: number
    ) => {
      gl.useProgram(compProg.program);
      const u = compProg.uniforms;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(compProg.posAttr);
      gl.vertexAttribPointer(compProg.posAttr, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(compProg.texAttr);
      gl.vertexAttribPointer(compProg.texAttr, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, rawTexture);
      gl.uniform1i(u.u_image, 0);
      gl.uniform1i(u.u_skipPremultiply, skipPremultiply);

      gl.uniform2f(u.u_resolution, canvasWidth, canvasHeight);
      gl.uniform2f(u.u_translation, uPosX, uPosY);
      gl.uniform2f(u.u_scale, uDrawW, uDrawH);
      gl.uniform1f(u.u_rotation, uRot);
      gl.uniform2f(u.u_flip, uFlipX, uFlipY);
      gl.uniform2f(u.u_textureSize, sourceW, sourceH);
      gl.uniform1f(u.u_opacity, uOpacity);
      gl.uniform1f(u.u_time, currentTime);
      gl.uniform2f(u.u_perspective, anim.animPerspX, anim.animPerspY);
      gl.uniform2f(u.u_animBlur, anim.animBlurX, anim.animBlurY);
      gl.uniform1f(u.u_animFlash, anim.animFlash);

      if (presetId > 0) {
        gl.uniform1i(u.u_filterPreset, presetId);
        gl.uniform1f(
          u.u_filterIntensity,
          (clip.filterIntensity ?? 100) / 100
        );
        if (presetId >= 36) {
          const meta = PARAMETRIC_FILTER_MAP[presetKey];
          if (meta) {
            const g = meta.gpu;
            const m = g.matrix;
            gl.uniform3f(u.u_lutMatR, m[0], m[1], m[2]);
            gl.uniform3f(u.u_lutMatG, m[3], m[4], m[5]);
            gl.uniform3f(u.u_lutMatB, m[6], m[7], m[8]);
            gl.uniform4f(
              u.u_lutShadow,
              g.shadow[0],
              g.shadow[1],
              g.shadow[2],
              g.shadow[3]
            );
            gl.uniform4f(
              u.u_lutHigh,
              g.high[0],
              g.high[1],
              g.high[2],
              g.high[3]
            );
            gl.uniform4f(
              u.u_lutParams,
              g.params[0],
              g.params[1],
              g.params[2],
              g.params[3]
            );
            gl.uniform4f(
              u.u_lutGain,
              g.gain[0],
              g.gain[1],
              g.gain[2],
              g.gain[3]
            );
            gl.uniform4f(
              u.u_lutExtra,
              g.extra[0],
              g.extra[1],
              g.extra[2],
              g.extra[3]
            );
          }
        }
      }

      if (hasBasicCg || hasSharpness) {
        gl.uniform1f(u.u_brightness, (cg?.brightness || 0) / 100);
        gl.uniform1f(u.u_contrast, (cg?.contrast || 0) / 100);
        gl.uniform1f(u.u_saturation, (cg?.saturation || 0) / 100);
        gl.uniform1f(u.u_exposure, (cg?.exposure || 0) / 50);
        gl.uniform1f(u.u_sharpness, (cg?.sharpness || 0) / 100);
        gl.uniform1f(u.u_highlights, (cg?.highlights || 0) / 100);
        gl.uniform1f(u.u_shadows, (cg?.shadows || 0) / 100);
        gl.uniform1f(u.u_temperature, (cg?.temperature || 0) / 100);
        gl.uniform1f(u.u_tint, (cg?.tint || 0) / 100);
        gl.uniform1f(u.u_vignette, (cg?.vignette || 0) / 100);
      }

      if (hasHsl) {
        gl.uniform3f(
          u.u_hslRed,
          (cg?.hslRed?.hue || 0) / 100,
          (cg?.hslRed?.sat || 0) / 100,
          (cg?.hslRed?.lum || 0) / 100
        );
        gl.uniform3f(
          u.u_hslYellow,
          (cg?.hslYellow?.hue || 0) / 100,
          (cg?.hslYellow?.sat || 0) / 100,
          (cg?.hslYellow?.lum || 0) / 100
        );
        gl.uniform3f(
          u.u_hslGreen,
          (cg?.hslGreen?.hue || 0) / 100,
          (cg?.hslGreen?.sat || 0) / 100,
          (cg?.hslGreen?.lum || 0) / 100
        );
        gl.uniform3f(
          u.u_hslBlue,
          (cg?.hslBlue?.hue || 0) / 100,
          (cg?.hslBlue?.sat || 0) / 100,
          (cg?.hslBlue?.lum || 0) / 100
        );
      }

      const chroma = clip.chromaKey;
      if (hasChroma && chroma?.enabled) {
        gl.uniform1i(u.u_chromaEnabled, 1);
        const [cr, cgCol, cb] = hexToRgb(chroma.color);
        const tolerance = Number.isFinite(chroma.tolerance)
          ? Math.max(0.01, Math.min(1.0, chroma.tolerance))
          : 0.35;
        const feather = Number.isFinite(chroma.feather)
          ? Math.max(0.0, Math.min(1.0, chroma.feather))
          : 0.1;
        const spill = Number.isFinite(chroma.spillSuppression)
          ? Math.max(0.0, Math.min(1.0, chroma.spillSuppression))
          : 0.5;
        gl.uniform3f(u.u_chromaColor, cr, cgCol, cb);
        gl.uniform1f(u.u_chromaTolerance, tolerance);
        gl.uniform1f(u.u_chromaFeather, feather);
        gl.uniform1f(u.u_chromaSpill, spill);
      }

      if (maskId > 0) {
        gl.uniform1i(u.u_maskType, maskId);
        gl.uniform1f(u.u_maskSize, (mask?.size ?? 50) / 100);
        gl.uniform1f(u.u_maskFeather, (mask?.feather ?? 10) / 200);
        gl.uniform1f(u.u_maskRotation, mask?.rotation ?? 0);
        gl.uniform1i(u.u_maskInverted, mask?.inverted ? 1 : 0);
      }

      if (fxId > 0) {
        gl.uniform1i(u.u_effectType, fxId);
        gl.uniform1f(u.u_effectIntensity, (fx?.intensity ?? 60) / 100);
        gl.uniform1f(
          u.u_effectSpeed,
          0.2 + ((fx?.speed ?? 50) / 100) * 2.2
        );
        if (fxMeta) {
          const g = fxMeta.gpu;
          gl.uniform1i(u.u_fxFamily, g.family);
          gl.uniform4f(u.u_fxColA, g.colA[0], g.colA[1], g.colA[2], g.colA[3]);
          gl.uniform4f(u.u_fxColB, g.colB[0], g.colB[1], g.colB[2], g.colB[3]);
          gl.uniform4f(u.u_fxParamA, g.paramA[0], g.paramA[1], g.paramA[2], g.paramA[3]);
          gl.uniform4f(u.u_fxParamB, g.paramB[0], g.paramB[1], g.paramB[2], g.paramB[3]);
        }
      }
    };

    if (isTransitioning) {
      let currTexForTransition: WebGLTexture = rawTexture;

      if (needsGradingPass) {
        const compProg = this.getCompositeProgram(shaderSpec);
        if (!compProg || !this.ensureGradingFbo(canvasWidth, canvasHeight)) {
          fallback2DRender();
          return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.gradingFbo);
        gl.viewport(0, 0, canvasWidth, canvasHeight);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // FBO texture origin is bottom-left while VERTEX_SHADER_SOURCE flips Y for screen space;
        // pass uFlipY = -1.0 so gradingFboTex matches rawTexture's top-down orientation.
        bindBaseUniforms(compProg, 0, 0, canvasWidth, canvasHeight, 0, 1.0, -1.0, 1.0, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        currTexForTransition = this.gradingFboTex!;
      }

      const tProg = this.getTransitionProgram(transTypeId);
      if (!tProg) {
        fallback2DRender();
        return;
      }

      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(tProg.program);

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.enableVertexAttribArray(tProg.posAttr);
      gl.vertexAttribPointer(tProg.posAttr, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.enableVertexAttribArray(tProg.texAttr);
      gl.vertexAttribPointer(tProg.texAttr, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currTexForTransition);
      gl.uniform1i(tProg.uniforms.u_image, 0);

      if (prevClipSource) {
        const prevTexId =
          prevClipSource.id === clip.id
            ? `prev_${prevClipSource.id}`
            : prevClipSource.id;
        const prevTex = this.uploadMediaTexture(
          prevTexId,
          prevClipSource.element,
          gl.TEXTURE1
        );
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, prevTex);
        gl.uniform1i(tProg.uniforms.u_prevImage, 1);
        gl.uniform1i(tProg.uniforms.u_hasPrevImage, 1);
        gl.activeTexture(gl.TEXTURE0);
      } else {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.emptyTexture);
        gl.uniform1i(tProg.uniforms.u_prevImage, 1);
        gl.uniform1i(tProg.uniforms.u_hasPrevImage, 0);
        gl.activeTexture(gl.TEXTURE0);
      }

      gl.uniform2f(tProg.uniforms.u_resolution, canvasWidth, canvasHeight);
      gl.uniform2f(tProg.uniforms.u_translation, posX, posY);
      gl.uniform2f(tProg.uniforms.u_scale, drawW, drawH);
      gl.uniform1f(
        tProg.uniforms.u_rotation,
        transform.rotation + anim.animRotate
      );
      gl.uniform2f(
        tProg.uniforms.u_flip,
        transform.flipH ? -1.0 : 1.0,
        transform.flipV ? -1.0 : 1.0
      );
      gl.uniform1f(
        tProg.uniforms.u_opacity,
        Math.max(0, Math.min(1, transform.opacity * anim.animOpacity))
      );
      gl.uniform1f(tProg.uniforms.u_transitionProgress, transProgress);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      const compProg = this.getCompositeProgram(shaderSpec);
      if (!compProg) {
        fallback2DRender();
        return;
      }

      gl.viewport(0, 0, canvasWidth, canvasHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );

      bindBaseUniforms(
        compProg,
        posX,
        posY,
        drawW,
        drawH,
        transform.rotation + anim.animRotate,
        transform.flipH ? -1.0 : 1.0,
        transform.flipV ? -1.0 : 1.0,
        Math.max(0, Math.min(1, transform.opacity * anim.animOpacity)),
        0
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    if (skip2DCopy) {
      return;
    }

    this.outputCtx.save();
    if (transform.blendMode === 'multiply') {
      this.outputCtx.globalCompositeOperation = 'multiply';
    } else if (transform.blendMode === 'screen') {
      this.outputCtx.globalCompositeOperation = 'screen';
    } else if (transform.blendMode === 'lighten') {
      this.outputCtx.globalCompositeOperation = 'lighten';
    } else if (transform.blendMode === 'overlay') {
      this.outputCtx.globalCompositeOperation = 'overlay';
    } else {
      this.outputCtx.globalCompositeOperation = 'source-over';
    }
    this.outputCtx.drawImage(this.glCanvas, 0, 0, canvasWidth, canvasHeight);
    this.outputCtx.restore();
  }

  private static textMeasureCtx: CanvasRenderingContext2D | null = null;

  private static applyTextSpacing(
    ctx: CanvasRenderingContext2D,
    letterSpacing: number,
    wordSpacing: number
  ) {
    const anyCtx = ctx as CanvasRenderingContext2D & {
      letterSpacing?: string;
      wordSpacing?: string;
    };
    if ('letterSpacing' in anyCtx) {
      anyCtx.letterSpacing = `${letterSpacing}px`;
    }
    if ('wordSpacing' in anyCtx) {
      anyCtx.wordSpacing = `${wordSpacing}px`;
    }
  }

  public static measureTextClipMetrics(
    clip: TextClip,
    canvasWidth: number,
    canvasHeight: number,
    transform: TransformProperties
  ): { baseW: number; baseH: number; alignOffsetX: number } {
    if (!WebGLRenderer.textMeasureCtx && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      WebGLRenderer.textMeasureCtx = c.getContext('2d');
    }
    const ctx = WebGLRenderer.textMeasureCtx;
    const textConfig = clip.textConfig;
    const fontSize = textConfig.fontSize || 56;
    const resScale = Math.min(canvasWidth, canvasHeight) / 1080;
    const letterSpacing = textConfig.letterSpacing ?? 0;
    const wordSpacing = textConfig.wordSpacing ?? 0;
    const rawLines = (textConfig.text || '').split('\n');
    const lineHeightPx = fontSize * (textConfig.lineHeight || 1.2);
    const totalTextH = Math.max(fontSize, rawLines.length * lineHeightPx);

    let maxLineWidth = fontSize * 2;
    if (ctx) {
      ctx.save();
      ctx.font = `${textConfig.fontWeight || 800} ${fontSize}px "${
        textConfig.fontFamily || 'Inter'
      }", sans-serif`;
      WebGLRenderer.applyTextSpacing(ctx, letterSpacing, wordSpacing);
      let measured = 0;
      for (const line of rawLines) {
        const w = ctx.measureText(line).width;
        if (w > measured) measured = w;
      }
      ctx.restore();
      maxLineWidth = Math.max(fontSize * 1.5, measured);
    }

    const bgPad = textConfig.hasBackground ? textConfig.backgroundPadding || 16 : 0;
    const baseW = Math.max(60, (maxLineWidth + bgPad * 2 + 24) * resScale);
    const baseH = Math.max(36, (totalTextH + bgPad * 2 + 12) * resScale);

    const sx = transform.scaleX ?? 1;
    const textScaleX = (transform.scale || 1) * sx;
    const renderedHalfW = ((maxLineWidth + bgPad * 2) * Math.abs(textScaleX) * resScale) / 2;
    const safeMargin = canvasWidth * 0.06;
    const align = textConfig.alignment || 'center';
    let alignOffsetX = 0;
    if (align === 'left') {
      alignOffsetX = Math.min(0, -canvasWidth / 2 + safeMargin + renderedHalfW);
    } else if (align === 'right') {
      alignOffsetX = Math.max(0, canvasWidth / 2 - safeMargin - renderedHalfW);
    }

    return { baseW, baseH, alignOffsetX };
  }

  // Draw Vector Styled Text / Subtitles directly onto Output 2D Canvas
  public renderTextClip(
    clip: TextClip,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number
  ) {
    const ctx = this.outputCtx;
    if (!ctx) return;

    const localTime = Math.max(0, currentTime - clip.startTime);
    const { textConfig } = clip;
    const transform = this.interpolateKeyframes(clip, localTime);
    const clipAnim = this.calculateAnimations(
      clip.animations,
      localTime,
      clip.duration,
      canvasWidth,
      canvasHeight
    );

    const fontSize = textConfig.fontSize || 56;
    ctx.save();

    const sx = transform.scaleX ?? 1;
    const sy = transform.scaleY ?? 1;
    let textScaleX =
      transform.scale *
      sx *
      clipAnim.animScaleX *
      Math.max(0.15, Math.abs(Math.cos(clipAnim.animPerspX)));
    let textScaleY =
      transform.scale *
      sy *
      clipAnim.animScaleY *
      Math.max(0.15, Math.abs(Math.cos(clipAnim.animPerspY)));
    let textOffsetX = clipAnim.animOffsetX;
    let textOffsetY = clipAnim.animOffsetY;
    let textRotate = transform.rotation + clipAnim.animRotate;
    let textOpacity = transform.opacity * clipAnim.animOpacity;

    const animInDur = Math.max(0.1, textConfig.animInDuration || 0.8);
    let textBlur = 0;
    let textSkewX = 0;
    let clipMode: 'none' | 'left' | 'right' | 'up' | 'down' | 'curtain' | 'splitV' = 'none';
    let clipProgress = 1;
    let customDisplayText: string | null = null;
    const rawFullText = textConfig.text || '';

    if (textConfig.animIn && textConfig.animIn !== 'none' && localTime < animInDur) {
      const p = Math.max(0, Math.min(1, localTime / animInDur));
      const easeOut = 1 - Math.pow(1 - p, 3);
      if (textConfig.animIn === 'fadeIn' || textConfig.animIn === 'letterFade') {
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'bounce') {
        const b = Math.sin(p * Math.PI * 2.5) * (1 - p);
        textScaleX *= Math.max(0.05, p + b * 0.4);
        textScaleY *= Math.max(0.05, p + b * 0.4);
      } else if (textConfig.animIn === 'slide' || textConfig.animIn === 'slideUp') {
        textOffsetY += (1 - easeOut) * 140;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'slideDown') {
        textOffsetY -= (1 - easeOut) * 140;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'slideLeft') {
        textOffsetX += (1 - easeOut) * 180;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'slideRight') {
        textOffsetX -= (1 - easeOut) * 180;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'zoom') {
        textScaleX *= 0.2 + 0.8 * easeOut;
        textScaleY *= 0.2 + 0.8 * easeOut;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'zoomOut') {
        textScaleX *= 1.8 - 0.8 * easeOut;
        textScaleY *= 1.8 - 0.8 * easeOut;
        textOpacity *= easeOut;
      } else if (textConfig.animIn === 'flip') {
        textScaleY *= Math.max(0.08, Math.sin((p * Math.PI) / 2));
        textOpacity *= p;
      } else if (textConfig.animIn === 'pop') {
        const overshoot = p < 0.7 ? (p / 0.7) * 1.18 : 1.18 - ((p - 0.7) / 0.3) * 0.18;
        textScaleX *= Math.max(0.05, overshoot);
        textScaleY *= Math.max(0.05, overshoot);
        textOpacity *= Math.min(1, p * 2);
      } else if (textConfig.animIn === 'blurIn') {
        textBlur += (1 - easeOut) * 14;
        textOpacity *= easeOut;
      } else {
        const customIn = evaluateNewTextAnimation(textConfig.animIn, p, false, rawFullText);
        if (customIn) {
          textOffsetX += customIn.offsetX;
          textOffsetY += customIn.offsetY;
          textScaleX *= customIn.scaleX;
          textScaleY *= customIn.scaleY;
          textRotate += customIn.rotate;
          textSkewX += customIn.skewX;
          textOpacity *= customIn.opacity;
          textBlur += customIn.blur;
          if (customIn.clipMode && customIn.clipMode !== 'none') {
            clipMode = customIn.clipMode;
            clipProgress = Math.min(clipProgress, customIn.clipProgress ?? 1);
          }
          if (customIn.textOverride !== undefined) {
            customDisplayText = customIn.textOverride;
          }
        }
      }
    }

    const animOut = textConfig.animOut;
    const animOutDur = Math.max(0.1, textConfig.animOutDuration || 0.6);
    const outStart = Math.max(0, clip.duration - animOutDur);
    if (animOut && animOut !== 'none' && localTime > outStart) {
      const outP = Math.max(0, Math.min(1, (localTime - outStart) / animOutDur));
      const easeIn = outP * outP * outP;
      const inv = 1 - outP;
      if (animOut === 'fadeOut') {
        textOpacity *= inv;
      } else if (animOut === 'bounceOut') {
        const b = Math.sin(outP * Math.PI * 2.5) * inv;
        textScaleX *= Math.max(0.02, inv + b * 0.35);
        textScaleY *= Math.max(0.02, inv + b * 0.35);
        textOpacity *= Math.max(0, 1 - easeIn);
      } else if (animOut === 'slideUp') {
        textOffsetY -= easeIn * 140;
        textOpacity *= inv;
      } else if (animOut === 'slideDown') {
        textOffsetY += easeIn * 140;
        textOpacity *= inv;
      } else if (animOut === 'slideLeft') {
        textOffsetX -= easeIn * 180;
        textOpacity *= inv;
      } else if (animOut === 'slideRight') {
        textOffsetX += easeIn * 180;
        textOpacity *= inv;
      } else if (animOut === 'zoomOut') {
        textScaleX *= Math.max(0.05, 1 - 0.8 * easeIn);
        textScaleY *= Math.max(0.05, 1 - 0.8 * easeIn);
        textOpacity *= inv;
      } else if (animOut === 'zoomIn') {
        textScaleX *= 1 + 0.9 * easeIn;
        textScaleY *= 1 + 0.9 * easeIn;
        textOpacity *= inv;
      } else if (animOut === 'flipOut') {
        textScaleY *= Math.max(0.05, Math.cos((outP * Math.PI) / 2));
        textOpacity *= inv;
      } else if (animOut === 'popOut') {
        const popScale = outP < 0.3 ? 1 + (outP / 0.3) * 0.16 : 1.16 * (1 - (outP - 0.3) / 0.7);
        textScaleX *= Math.max(0.02, popScale);
        textScaleY *= Math.max(0.02, popScale);
        textOpacity *= outP < 0.3 ? 1 : Math.max(0, 1 - (outP - 0.3) / 0.7);
      } else if (animOut === 'blurOut') {
        textBlur += easeIn * 14;
        textOpacity *= inv;
      } else {
        const customOut = evaluateNewTextAnimation(animOut, outP, true, rawFullText);
        if (customOut) {
          textOffsetX += customOut.offsetX;
          textOffsetY += customOut.offsetY;
          textScaleX *= customOut.scaleX;
          textScaleY *= customOut.scaleY;
          textRotate += customOut.rotate;
          textSkewX += customOut.skewX;
          textOpacity *= customOut.opacity;
          textBlur += customOut.blur;
          if (customOut.clipMode && customOut.clipMode !== 'none') {
            clipMode = customOut.clipMode;
            clipProgress = Math.min(clipProgress, customOut.clipProgress ?? 1);
          }
          if (customOut.textOverride !== undefined) {
            customDisplayText = customOut.textOverride;
          }
        }
      }
    }

    if (textConfig.animLoop && textConfig.animLoop !== 'none') {
      const spd = textConfig.animLoopSpeed || 1;
      if (textConfig.animLoop === 'heartbeat') {
        const pulse = 1 + Math.max(0, Math.sin(localTime * 6 * spd)) * 0.12;
        textScaleX *= pulse;
        textScaleY *= pulse;
      } else if (textConfig.animLoop === 'float') {
        textOffsetY += Math.sin(localTime * 3 * spd) * 18;
      } else if (textConfig.animLoop === 'blink') {
        textOpacity *= 0.4 + 0.6 * Math.abs(Math.sin(localTime * 4 * spd));
      } else if (textConfig.animLoop === 'wiggle') {
        textRotate += Math.sin(localTime * 8 * spd) * 6;
      }
    }

    const letterSpacing = textConfig.letterSpacing ?? 0;
    const wordSpacing = textConfig.wordSpacing ?? 0;
    ctx.font = `${textConfig.fontWeight || 800} ${fontSize}px "${
      textConfig.fontFamily || 'Inter'
    }", sans-serif`;
    WebGLRenderer.applyTextSpacing(ctx, letterSpacing, wordSpacing);
    const align = textConfig.alignment || 'center';

    const resScale = Math.min(canvasWidth, canvasHeight) / 1080;
    const rawLines = rawFullText.split('\n');
    let rawMaxWidth = 0;
    for (const l of rawLines) {
      const w = ctx.measureText(l).width;
      if (w > rawMaxWidth) rawMaxWidth = w;
    }
    const rawLineH = fontSize * (textConfig.lineHeight || 1.2);
    const rawTotalH = Math.max(fontSize, rawLines.length * rawLineH);
    const bgPadForAlign = textConfig.hasBackground ? textConfig.backgroundPadding || 16 : 0;
    const renderedHalfW = ((rawMaxWidth + bgPadForAlign * 2) * Math.abs(textScaleX) * resScale) / 2;
    const safeMargin = canvasWidth * 0.06;
    let alignOffsetX = 0;
    if (align === 'left') {
      alignOffsetX = Math.min(0, -canvasWidth / 2 + safeMargin + renderedHalfW);
    } else if (align === 'right') {
      alignOffsetX = Math.max(0, canvasWidth / 2 - safeMargin - renderedHalfW);
    }

    const centerX =
      canvasWidth / 2 +
      alignOffsetX +
      (transform.x / 100) * canvasWidth +
      clipAnim.animOffsetX +
      (textOffsetX - clipAnim.animOffsetX) * resScale;
    const centerY =
      canvasHeight / 2 +
      (transform.y / 100) * canvasHeight +
      clipAnim.animOffsetY +
      (textOffsetY - clipAnim.animOffsetY) * resScale;
    ctx.translate(centerX, centerY);
    ctx.rotate((textRotate * Math.PI) / 180);
    if (Math.abs(textSkewX) > 0.001) {
      ctx.transform(1, 0, Math.tan(textSkewX), 1, 0, 0);
    }
    ctx.scale(
      textScaleX * resScale * (transform.flipH ? -1 : 1),
      textScaleY * resScale * (transform.flipV ? -1 : 1)
    );
    ctx.globalAlpha = Math.max(0, Math.min(1, textOpacity));
    if (textBlur > 0.2 && 'filter' in ctx) {
      ctx.filter = `blur(${(textBlur * resScale).toFixed(1)}px)`;
    }

    if (clipMode !== 'none' && clipProgress < 0.999) {
      const padClip = (textConfig.hasBackground ? textConfig.backgroundPadding || 16 : 0) + (textConfig.strokeWidth || 0) + (textConfig.shadowBlur || 0) * 2 + 40;
      const bw = Math.max(20, rawMaxWidth + padClip * 2);
      const bh = Math.max(20, rawTotalH + padClip * 2);
      const cp = Math.max(0, Math.min(1, clipProgress));
      ctx.beginPath();
      if (clipMode === 'left') {
        ctx.rect(-bw / 2, -bh / 2, bw * cp, bh);
      } else if (clipMode === 'right') {
        ctx.rect(bw / 2 - bw * cp, -bh / 2, bw * cp, bh);
      } else if (clipMode === 'up') {
        ctx.rect(-bw / 2, bh / 2 - bh * cp, bw, bh * cp);
      } else if (clipMode === 'down') {
        ctx.rect(-bw / 2, -bh / 2, bw, bh * cp);
      } else if (clipMode === 'curtain') {
        const hw = (bw * cp) / 2;
        ctx.rect(-hw, -bh / 2, hw * 2, bh);
      } else if (clipMode === 'splitV') {
        const hh = (bh * cp) / 2;
        ctx.rect(-bw / 2, -hh, bw, hh * 2);
      }
      ctx.clip();
    }

    ctx.textAlign = align;
    ctx.textBaseline = 'middle';

    let displayText = customDisplayText !== null ? customDisplayText : rawFullText;
    if (textConfig.animIn === 'typewriter' && localTime < animInDur) {
      const progress = Math.min(1.0, localTime / animInDur);
      const chars = Math.max(1, Math.floor(progress * displayText.length));
      displayText = displayText.substring(0, chars);
    } else if (animOut === 'typewriterOut' && localTime > outStart) {
      const outP = Math.max(0, Math.min(1, (localTime - outStart) / animOutDur));
      const chars = Math.max(0, Math.ceil((1 - outP) * displayText.length));
      displayText = displayText.substring(0, chars);
    }

    const isWaveAnim = textConfig.animIn === 'wave';
    const isFullText = displayText === (textConfig.text || '');

    if (!isWaveAnim && isFullText && displayText.length > 0) {
      const gradKey = textConfig.gradientFill
        ? `${textConfig.gradientFill.start}:${textConfig.gradientFill.end}`
        : '';
      const cacheKey = [
        displayText,
        fontSize,
        textConfig.fontWeight || 800,
        textConfig.fontFamily || 'Inter',
        align,
        textConfig.lineHeight || 1.2,
        letterSpacing,
        wordSpacing,
        textConfig.hasBackground ? 1 : 0,
        textConfig.backgroundColor || '',
        textConfig.backgroundOpacity ?? 0,
        textConfig.backgroundPadding || 16,
        textConfig.borderRadius || 8,
        textConfig.hasShadow === false ? 0 : 1,
        textConfig.shadowOpacity ?? 0.85,
        textConfig.shadowBlur || 0,
        textConfig.shadowColor || '',
        textConfig.shadowAngle ?? 45,
        textConfig.shadowDistance ?? 4,
        textConfig.strokeWidth || 0,
        textConfig.strokeColor || '',
        textConfig.color || '#ffffff',
        gradKey,
      ].join('|');

      let cached = this.textCache.get(cacheKey);
      if (!cached) {
        const lines = displayText.split('\n');
        const lineHeightPx = fontSize * (textConfig.lineHeight || 1.2);
        const totalTextH = lines.length * lineHeightPx;
        let maxLineWidth = 0;
        for (const line of lines) {
          const w = ctx.measureText(line).width;
          if (w > maxLineWidth) maxLineWidth = w;
        }

        const pad = textConfig.hasBackground ? textConfig.backgroundPadding || 16 : 0;
        const shadowMargin =
          (textConfig.shadowBlur || 0) * 2 +
          Math.abs(textConfig.shadowDistance || 4) +
          (textConfig.strokeWidth || 0) +
          16;
        const cw = Math.max(4, Math.ceil(maxLineWidth + pad * 2 + shadowMargin * 2));
        const ch = Math.max(4, Math.ceil(totalTextH + pad * 2 + shadowMargin * 2));
        const halfW = cw / 2;
        const halfH = ch / 2;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = cw;
        offCanvas.height = ch;
        const octx = offCanvas.getContext('2d');
        if (octx) {
          octx.translate(halfW, halfH);
          octx.font = ctx.font;
          WebGLRenderer.applyTextSpacing(octx, letterSpacing, wordSpacing);
          octx.textAlign = align;
          octx.textBaseline = 'middle';

          if (textConfig.hasBackground && maxLineWidth > 0) {
            octx.save();
            octx.globalAlpha = textConfig.backgroundOpacity ?? 0;
            octx.fillStyle = textConfig.backgroundColor || '#000000';
            const bgPad = textConfig.backgroundPadding || 16;
            const radius = textConfig.borderRadius || 8;
            const boxX = -maxLineWidth / 2 - bgPad;
            const boxY = -totalTextH / 2 - bgPad / 2;
            const boxW = maxLineWidth + bgPad * 2;
            const boxH = totalTextH + bgPad;
            octx.beginPath();
            if (typeof octx.roundRect === 'function') {
              octx.roundRect(boxX, boxY, boxW, boxH, radius);
            } else {
              octx.rect(boxX, boxY, boxW, boxH);
            }
            octx.fill();
            octx.restore();
          }

          if (WebGLRenderer.isTextShadowEnabled(textConfig)) {
            octx.shadowColor = WebGLRenderer.resolveShadowColor(
              textConfig.shadowColor,
              textConfig.shadowOpacity
            );
            octx.shadowBlur = Math.max(0, textConfig.shadowBlur || 0);
            const rad = ((textConfig.shadowAngle ?? 45) * Math.PI) / 180;
            const dist = textConfig.shadowDistance ?? 4;
            octx.shadowOffsetX = Math.cos(rad) * dist;
            octx.shadowOffsetY = Math.sin(rad) * dist;
          }

          const lineX =
            align === 'left'
              ? -maxLineWidth / 2
              : align === 'right'
              ? maxLineWidth / 2
              : 0;

          lines.forEach((line, idx) => {
            const lineY = -totalTextH / 2 + lineHeightPx / 2 + idx * lineHeightPx;
            if (textConfig.strokeWidth > 0) {
              octx.strokeStyle = textConfig.strokeColor || '#000000';
              octx.lineWidth = textConfig.strokeWidth;
              octx.lineJoin = 'round';
              octx.strokeText(line, lineX, lineY);
            }
            if (textConfig.gradientFill) {
              const grad = octx.createLinearGradient(
                -maxLineWidth / 2,
                lineY - fontSize / 2,
                maxLineWidth / 2,
                lineY + fontSize / 2
              );
              grad.addColorStop(0, textConfig.gradientFill.start);
              grad.addColorStop(1, textConfig.gradientFill.end);
              octx.fillStyle = grad;
            } else {
              octx.fillStyle = textConfig.color || '#ffffff';
            }
            octx.fillText(line, lineX, lineY);
          });

          if (this.textCache.size >= 32) {
            const oldestKey = this.textCache.keys().next().value;
            if (oldestKey !== undefined) this.textCache.delete(oldestKey);
          }
          cached = { canvas: offCanvas, halfW, halfH };
          this.textCache.set(cacheKey, cached);
        }
      }

      if (cached) {
        ctx.drawImage(cached.canvas, -cached.halfW, -cached.halfH);
        ctx.restore();
        return;
      }
    }

    const lines = displayText.split('\n');
    const lineHeightPx = fontSize * (textConfig.lineHeight || 1.2);
    const totalTextH = lines.length * lineHeightPx;
    let maxLineWidth = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }

    if (textConfig.hasBackground && maxLineWidth > 0) {
      ctx.save();
      ctx.globalAlpha =
        Math.max(0, Math.min(1, textOpacity)) *
        (textConfig.backgroundOpacity ?? 0);
      ctx.fillStyle = textConfig.backgroundColor || '#000000';
      const pad = textConfig.backgroundPadding || 16;
      const radius = textConfig.borderRadius || 8;
      const boxX = -maxLineWidth / 2 - pad;
      const boxY = -totalTextH / 2 - pad / 2;
      const boxW = maxLineWidth + pad * 2;
      const boxH = totalTextH + pad;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.restore();
    }

    if (WebGLRenderer.isTextShadowEnabled(textConfig)) {
      ctx.shadowColor = WebGLRenderer.resolveShadowColor(
        textConfig.shadowColor,
        textConfig.shadowOpacity
      );
      ctx.shadowBlur = Math.max(0, textConfig.shadowBlur || 0);
      const rad = ((textConfig.shadowAngle ?? 45) * Math.PI) / 180;
      const dist = textConfig.shadowDistance ?? 4;
      ctx.shadowOffsetX = Math.cos(rad) * dist;
      ctx.shadowOffsetY = Math.sin(rad) * dist;
    }

    const lineX =
      align === 'left'
        ? -maxLineWidth / 2
        : align === 'right'
        ? maxLineWidth / 2
        : 0;

    lines.forEach((line, idx) => {
      const lineY =
        -totalTextH / 2 +
        lineHeightPx / 2 +
        idx * lineHeightPx +
        (textConfig.animIn === 'wave'
          ? Math.sin(localTime * 6 + idx) * 12
          : 0);

      if (textConfig.strokeWidth > 0) {
        ctx.strokeStyle = textConfig.strokeColor || '#000000';
        ctx.lineWidth = textConfig.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, lineX, lineY);
      }

      if (textConfig.gradientFill) {
        const grad = ctx.createLinearGradient(
          -maxLineWidth / 2,
          lineY - fontSize / 2,
          maxLineWidth / 2,
          lineY + fontSize / 2
        );
        grad.addColorStop(0, textConfig.gradientFill.start);
        grad.addColorStop(1, textConfig.gradientFill.end);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = textConfig.color || '#ffffff';
      }

      ctx.fillText(line, lineX, lineY);
    });

    ctx.restore();
  }

  public pruneUnusedResources(activeIds: Set<string>) {
    const gl = this.gl;
    this.textureCache.forEach((tex, id) => {
      if (!activeIds.has(id)) {
        if (gl) {
          try {
            gl.deleteTexture(tex);
          } catch {}
        }
        this.textureCache.delete(id);
        this.textureMetaCache.delete(id);
      }
    });
    this.frameCache.forEach((canvas, id) => {
      if (!activeIds.has(id)) {
        canvas.width = 0;
        canvas.height = 0;
        this.frameCache.delete(id);
      }
    });
    this.chroma2DCache.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        if (entry?.canvas) {
          entry.canvas.width = 0;
          entry.canvas.height = 0;
        }
        this.chroma2DCache.delete(id);
      }
    });
    this.textCache.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        if (entry?.canvas) {
          entry.canvas.width = 0;
          entry.canvas.height = 0;
        }
        this.textCache.delete(id);
      }
    });
  }

  public dispose() {
    this.chroma2DCache.clear();
    this.textCache.clear();
    this.textureMetaCache.clear();
    const gl = this.gl;
    if (!gl) return;
    this.textureCache.forEach((tex) => gl.deleteTexture(tex));
    this.textureCache.clear();
    this.frameCache.clear();
    this.compositePrograms.forEach((entry) => gl.deleteProgram(entry.program));
    this.compositePrograms.clear();
    this.transitionPrograms.forEach((entry) => gl.deleteProgram(entry.program));
    this.transitionPrograms.clear();
    if (this.gradingFboTex) gl.deleteTexture(this.gradingFboTex);
    if (this.gradingFbo) gl.deleteFramebuffer(this.gradingFbo);
    if (this.emptyTexture) gl.deleteTexture(this.emptyTexture);
    if (this.vertShader) gl.deleteShader(this.vertShader);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
  }
}
