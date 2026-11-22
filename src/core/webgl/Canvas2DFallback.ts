// ============================================================================
// Canvas2DFallback - Full-Featured 2D Software Pipeline for Filters, FX,
// Color Grading, Masks & Transitions when WebGL is unavailable.
// ============================================================================

import {
  ColorGrading,
  FilterPreset,
  MaskConfig,
  TransitionType,
  VideoClip,
  VisualEffectConfig,
} from '../../types/editor';
import {
  PARAMETRIC_FILTER_MAP,
  applyParametricLutRgb,
} from './parametricFilters';
import { PARAMETRIC_EFFECT_MAP } from './parametricEffects';

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

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

function hash1(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function applyLutRgb(
  r: number,
  g: number,
  b: number,
  preset: FilterPreset
): [number, number, number] {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let rr = r;
  let gg = g;
  let bb = b;

  switch (preset) {
    case 'tealOrange': {
      const sMask = 1 - smoothstep(0, 0.55, luma);
      const hMask = smoothstep(0.35, 1, luma);
      rr = clamp01(r + hMask * 0.22 - sMask * 0.06);
      gg = clamp01(g + hMask * 0.06 + sMask * 0.05);
      bb = clamp01(b + sMask * 0.2 - hMask * 0.14);
      break;
    }
    case 'cinematic':
    case 'blockbuster':
    case 'imax': {
      const sMask = 1 - smoothstep(0, 0.5, luma);
      const hMask = smoothstep(0.45, 1, luma);
      rr = clamp01((r - 0.5) * 1.15 + 0.5 + hMask * 0.08 - sMask * 0.04);
      gg = clamp01((g - 0.5) * 1.12 + 0.5 + sMask * 0.02);
      bb = clamp01((b - 0.5) * 1.15 + 0.5 + sMask * 0.1 - hMask * 0.05);
      if (preset === 'imax') {
        rr = clamp01(mix(luma, rr, 1.18));
        gg = clamp01(mix(luma, gg, 1.18));
        bb = clamp01(mix(luma, bb, 1.18));
      }
      break;
    }
    case 'vintage':
    case 'polaroid': {
      rr = clamp01(r * 0.96 + 0.06);
      gg = clamp01(g * 0.92 + 0.05);
      bb = clamp01(b * 0.8 + 0.08);
      rr = clamp01(mix(luma, rr, 0.85));
      gg = clamp01(mix(luma, gg, 0.85));
      bb = clamp01(mix(luma, bb, 0.85));
      break;
    }
    case 'fadedFilm': {
      rr = clamp01((r - 0.5) * 0.82 + 0.53);
      gg = clamp01((g - 0.5) * 0.82 + 0.52);
      bb = clamp01((b - 0.5) * 0.82 + 0.55);
      break;
    }
    case 'sepia': {
      rr = clamp01(r * 0.393 + g * 0.769 + b * 0.189);
      gg = clamp01(r * 0.349 + g * 0.686 + b * 0.168);
      bb = clamp01(r * 0.272 + g * 0.534 + b * 0.131);
      break;
    }
    case 'bw': {
      const bw = smoothstep(0.03, 0.97, 0.299 * r + 0.587 * g + 0.114 * b);
      rr = bw;
      gg = bw;
      bb = bw;
      break;
    }
    case 'noir': {
      const n = Math.pow(clamp01((0.25 * r + 0.65 * g + 0.1 * b - 0.12) * 1.35), 1.25);
      rr = clamp01(n * 0.96);
      gg = clamp01(n * 0.98);
      bb = clamp01(n * 1.03);
      break;
    }
    case 'highContrastBW': {
      const hc = clamp01((luma - 0.5) * 1.85 + 0.5);
      rr = hc;
      gg = hc;
      bb = hc;
      break;
    }
    case 'cyberpunk':
    case 'synthwave':
    case 'neonNoir': {
      rr = clamp01(r * 1.1 + b * 0.18);
      gg = clamp01(g * 0.82);
      bb = clamp01(b * 1.22 + 0.1);
      break;
    }
    case 'vaporwaveLUT': {
      rr = clamp01(mix(r, 0.95, 0.18) + 0.06);
      gg = clamp01(g * 0.86 + 0.08);
      bb = clamp01(mix(b, 0.98, 0.22));
      break;
    }
    case 'matrix': {
      const m = Math.pow(luma, 0.9);
      rr = clamp01(m * 0.25);
      gg = clamp01(m * 1.15 + 0.05);
      bb = clamp01(m * 0.32);
      break;
    }
    case 'emerald': {
      rr = clamp01(r * 0.82);
      gg = clamp01(g * 1.12 + 0.04);
      bb = clamp01(b * 0.92);
      break;
    }
    case 'vibrant':
    case 'fujiVelvia':
    case 'anime': {
      const sat = preset === 'anime' ? 1.4 : 1.35;
      rr = clamp01(mix(luma, r, sat));
      gg = clamp01(mix(luma, g, sat));
      bb = clamp01(mix(luma, b, sat));
      break;
    }
    case 'goldenHour':
    case 'warm':
    case 'warmCinema':
    case 'sunset':
    case 'desert': {
      rr = clamp01(r * 1.14 + 0.05);
      gg = clamp01(g * 1.03 + 0.02);
      bb = clamp01(b * 0.82);
      break;
    }
    case 'cool':
    case 'arctic':
    case 'night': {
      const mult = preset === 'night' ? 0.72 : 1.0;
      rr = clamp01(r * 0.84 * mult);
      gg = clamp01(g * 0.98 * mult);
      bb = clamp01((b * 1.18 + 0.05) * mult);
      break;
    }
    case 'bleachBypass': {
      const sat = mix(luma, 1, 0.35);
      rr = clamp01((mix(luma, r, 0.45) - 0.5) * 1.4 + 0.5 + sat * 0.02);
      gg = clamp01((mix(luma, g, 0.45) - 0.5) * 1.4 + 0.5 + sat * 0.02);
      bb = clamp01((mix(luma, b, 0.45) - 0.5) * 1.4 + 0.5 + sat * 0.02);
      break;
    }
    case 'pastel':
    case 'softPortrait': {
      rr = clamp01(r * 0.85 + 0.14);
      gg = clamp01(g * 0.85 + 0.13);
      bb = clamp01(b * 0.85 + 0.15);
      break;
    }
    case 'moodyDark': {
      rr = clamp01((r - 0.5) * 1.2 + 0.42);
      gg = clamp01((g - 0.5) * 1.2 + 0.43);
      bb = clamp01((b - 0.5) * 1.2 + 0.46);
      break;
    }
    case 'kodachrome': {
      rr = clamp01(r * 1.12);
      gg = clamp01(g * 1.02);
      bb = clamp01(b * 0.88);
      break;
    }
    case 'infrared': {
      rr = clamp01(g * 1.1 + 0.12);
      gg = clamp01(r * 0.55);
      bb = clamp01(b * 0.7 + r * 0.25);
      break;
    }
    case 'duotoneGold': {
      rr = clamp01(luma * 1.15 + 0.08);
      gg = clamp01(luma * 0.88 + 0.04);
      bb = clamp01(luma * 0.35);
      break;
    }
    default: {
      const paramMeta = PARAMETRIC_FILTER_MAP[preset];
      if (paramMeta) {
        return applyParametricLutRgb(r, g, b, paramMeta.gpu);
      }
      break;
    }
  }

  return [rr, gg, bb];
}

function hasAnyPixelGrading(cg: ColorGrading | undefined): boolean {
  if (!cg) return false;
  return Boolean(
    cg.brightness ||
      cg.contrast ||
      cg.saturation ||
      cg.exposure ||
      cg.highlights ||
      cg.shadows ||
      cg.temperature ||
      cg.tint ||
      cg.vignette ||
      cg.sharpness ||
      cg.hslRed?.hue ||
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
      cg.hslBlue?.lum
  );
}

const PIXEL_FX_SET = new Set<string>([
  'pixelate',
  'halftone',
  'thermal',
  'xray',
  'nightVision',
  'edgeSketch',
  'duotoneCyber',
  'invertFlash',
  'chromaticAberration',
  'rgbPulse',
  'glitch',
  'datamosh',
  'kaleidoscope',
  'mirrorClone',
  'mirrorVertical',
  'fisheye',
  'underwater',
  'heatHaze',
]);

export class Canvas2DFallbackEngine {
  private workCanvas: HTMLCanvasElement;
  private workCtx: CanvasRenderingContext2D;
  private transPrevCanvas: HTMLCanvasElement;
  private transPrevCtx: CanvasRenderingContext2D;
  private transCurrCanvas: HTMLCanvasElement;
  private transCurrCtx: CanvasRenderingContext2D;

  constructor() {
    this.workCanvas = document.createElement('canvas');
    this.workCtx = this.workCanvas.getContext('2d', {
      willReadFrequently: true,
    })!;
    this.transPrevCanvas = document.createElement('canvas');
    this.transPrevCtx = this.transPrevCanvas.getContext('2d')!;
    this.transCurrCanvas = document.createElement('canvas');
    this.transCurrCtx = this.transCurrCanvas.getContext('2d')!;
  }

  public prepareProcessedSource(
    source: CanvasImageSource,
    srcW: number,
    srcH: number,
    clip: VideoClip,
    currentTime: number
  ): CanvasImageSource {
    const preset = clip.filterPreset || 'none';
    const filterAmt = clamp01((clip.filterIntensity ?? 100) / 100);
    const hasFilter = preset !== 'none' && filterAmt > 0;
    const cg = clip.colorGrading;
    const hasCg = hasAnyPixelGrading(cg);
    const fx = clip.effect;
    const fxType = fx?.type || 'none';
    const fxAmt = clamp01((fx?.intensity ?? 60) / 100);
    const fxSpeed = 0.2 + ((fx?.speed ?? 50) / 100) * 2.2;
    const hasPixelFx = fxType !== 'none' && fxAmt > 0 && PIXEL_FX_SET.has(fxType);

    if (!hasFilter && !hasCg && !hasPixelFx) {
      return source;
    }

    // Cap pixel-processing resolution so software 2D runs smoothly at 30-60 FPS
    const maxDim = 420;
    let w = Math.max(2, Math.round(srcW));
    let h = Math.max(2, Math.round(srcH));
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.max(2, Math.round(w * s));
      h = Math.max(2, Math.round(h * s));
    }

    if (this.workCanvas.width !== w || this.workCanvas.height !== h) {
      this.workCanvas.width = w;
      this.workCanvas.height = h;
    }

    const ctx = this.workCtx;
    ctx.clearRect(0, 0, w, h);

    // Handle geometric/UV pixel FX before pixel loop
    if (fxType === 'mirrorClone' && fxAmt > 0) {
      const halfW = Math.floor(w / 2);
      ctx.drawImage(source, 0, 0, halfW, h);
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, halfW, h);
      ctx.restore();
    } else if (fxType === 'mirrorVertical' && fxAmt > 0) {
      const halfH = Math.floor(h / 2);
      ctx.drawImage(source, 0, 0, w, halfH);
      ctx.save();
      ctx.translate(0, h);
      ctx.scale(1, -1);
      ctx.drawImage(source, 0, 0, w, halfH);
      ctx.restore();
    } else if (fxType === 'kaleidoscope' && fxAmt > 0) {
      const hw = Math.floor(w / 2);
      const hh = Math.floor(h / 2);
      ctx.drawImage(source, 0, 0, hw, hh);
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, hw, hh);
      ctx.restore();
      ctx.save();
      ctx.translate(0, h);
      ctx.scale(1, -1);
      ctx.drawImage(source, 0, 0, hw, hh);
      ctx.restore();
      ctx.save();
      ctx.translate(w, h);
      ctx.scale(-1, -1);
      ctx.drawImage(source, 0, 0, hw, hh);
      ctx.restore();
    } else if (fxType === 'pixelate' && fxAmt > 0) {
      const blocks = Math.max(8, Math.round(mix(80, 12, fxAmt)));
      const pw = Math.max(4, blocks);
      const ph = Math.max(4, Math.round((blocks * h) / w));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0, pw, ph);
      ctx.drawImage(this.workCanvas, 0, 0, pw, ph, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.drawImage(source, 0, 0, w, h);
    }

    const needsPixelPass =
      hasFilter ||
      hasCg ||
      (fxType !== 'none' &&
        fxAmt > 0 &&
        [
          'thermal',
          'xray',
          'nightVision',
          'edgeSketch',
          'duotoneCyber',
          'invertFlash',
          'chromaticAberration',
          'rgbPulse',
          'glitch',
          'datamosh',
          'halftone',
        ].includes(fxType));

    if (!needsPixelPass) {
      return this.workCanvas;
    }

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const orig =
      fxType === 'chromaticAberration' ||
      fxType === 'rgbPulse' ||
      fxType === 'glitch' ||
      fxType === 'datamosh' ||
      fxType === 'edgeSketch'
        ? new Uint8ClampedArray(data)
        : null;

    const bright = (cg?.brightness || 0) / 100;
    const expMult = Math.pow(2, (cg?.exposure || 0) / 50);
    const cont = (cg?.contrast || 0) / 100;
    const sat = (cg?.saturation || 0) / 100;
    const temp = (cg?.temperature || 0) / 100;
    const tint = (cg?.tint || 0) / 100;
    const highlights = (cg?.highlights || 0) / 100;
    const shadows = (cg?.shadows || 0) / 100;
    const vignette = (cg?.vignette || 0) / 100;

    const tSec = currentTime * fxSpeed;
    const pulse = 0.5 + 0.5 * Math.sin(tSec * 6.0);
    const caShift =
      fxType === 'chromaticAberration'
        ? Math.max(1, Math.round(fxAmt * 10))
        : fxType === 'rgbPulse'
          ? Math.max(1, Math.round(fxAmt * 12 * pulse))
          : fxType === 'glitch' || fxType === 'datamosh'
            ? Math.max(1, Math.round(fxAmt * 14 * (hash1(Math.floor(tSec * 12)) > 0.4 ? 1 : 0.2)))
            : 0;

    for (let y = 0; y < h; y++) {
      const ny = y / h - 0.5;
      const rowGlitchShift =
        orig && (fxType === 'glitch' || fxType === 'datamosh')
          ? Math.round(
              (hash1(Math.floor(y / 12) + Math.floor(tSec * 15)) - 0.5) *
                fxAmt *
                w *
                0.12 *
                (hash1(Math.floor(y / 18) * 3.1 + Math.floor(tSec * 10)) > 0.72 ? 1 : 0)
            )
          : 0;

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let r = data[idx] / 255;
        let g = data[idx + 1] / 255;
        let b = data[idx + 2] / 255;

        // Chromatic aberration / Glitch / Edge Sketch
        if (orig) {
          if (fxType === 'edgeSketch') {
            const x1 = Math.min(w - 1, x + 1);
            const y1 = Math.min(h - 1, y + 1);
            const iR = (y * w + x1) * 4;
            const iD = (y1 * w + x) * 4;
            const l0 = (orig[idx] + orig[idx + 1] + orig[idx + 2]) / 765;
            const lR = (orig[iR] + orig[iR + 1] + orig[iR + 2]) / 765;
            const lD = (orig[iD] + orig[iD + 1] + orig[iD + 2]) / 765;
            const edge = clamp01(1 - (Math.abs(l0 - lR) + Math.abs(l0 - lD)) * 6.5);
            r = mix(r, edge, fxAmt);
            g = mix(g, edge, fxAmt);
            b = mix(b, edge, fxAmt);
          } else {
            const sx = Math.max(0, Math.min(w - 1, x + rowGlitchShift));
            const rx = Math.max(0, Math.min(w - 1, sx - caShift));
            const bx = Math.max(0, Math.min(w - 1, sx + caShift));
            r = orig[(y * w + rx) * 4] / 255;
            g = orig[(y * w + sx) * 4 + 1] / 255;
            b = orig[(y * w + bx) * 4 + 2] / 255;
          }
        }

        // Pixel FX color transforms
        if (fxType === 'thermal' && fxAmt > 0) {
          const l = clamp01(0.299 * r + 0.587 * g + 0.114 * b);
          const tr = smoothstep(0.35, 0.85, l);
          const tg = Math.sin(l * Math.PI);
          const tb = 1 - smoothstep(0.15, 0.65, l);
          r = mix(r, tr, fxAmt);
          g = mix(g, tg, fxAmt);
          b = mix(b, tb, fxAmt);
        } else if (fxType === 'xray' && fxAmt > 0) {
          const inv = 1 - (0.299 * r + 0.587 * g + 0.114 * b);
          r = mix(r, inv * 0.78, fxAmt);
          g = mix(g, inv * 0.94, fxAmt);
          b = mix(b, clamp01(inv * 1.15), fxAmt);
        } else if (fxType === 'nightVision' && fxAmt > 0) {
          const l = clamp01((0.299 * r + 0.587 * g + 0.114 * b) * 1.35);
          const noise = (hash1(x * 1.7 + y * 3.1 + tSec * 20) - 0.5) * 0.15;
          r = mix(r, clamp01(l * 0.25 + noise), fxAmt);
          g = mix(g, clamp01(l * 1.15 + noise), fxAmt);
          b = mix(b, clamp01(l * 0.3 + noise), fxAmt);
        } else if (fxType === 'duotoneCyber' && fxAmt > 0) {
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          r = mix(r, mix(0.08, 1.0, l), fxAmt);
          g = mix(g, mix(0.92, 0.12, l), fxAmt);
          b = mix(b, mix(0.98, 0.78, l), fxAmt);
        } else if (fxType === 'invertFlash' && fxAmt > 0) {
          const fl = Math.sin(tSec * 8) > 0.2 ? fxAmt : 0;
          r = mix(r, 1 - r, fl);
          g = mix(g, 1 - g, fl);
          b = mix(b, 1 - b, fl);
        } else if (fxType === 'halftone' && fxAmt > 0) {
          const cell = 6;
          const dx = (x % cell) / cell - 0.5;
          const dy = (y % cell) / cell - 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          const dotMask = dist < l * 0.65 ? 1 : 0.18;
          r = mix(r, r * dotMask, fxAmt);
          g = mix(g, g * dotMask, fxAmt);
          b = mix(b, b * dotMask, fxAmt);
        }

        // Studio LUT Filter
        if (hasFilter) {
          const [lr, lg, lb] = applyLutRgb(r, g, b, preset);
          r = mix(r, lr, filterAmt);
          g = mix(g, lg, filterAmt);
          b = mix(b, lb, filterAmt);
        }

        // Manual Color Grading
        if (hasCg) {
          r += bright * 0.55;
          g += bright * 0.55;
          b += bright * 0.55;

          r *= expMult;
          g *= expMult;
          b *= expMult;

          r = (r - 0.5) * (1 + cont) + 0.5;
          g = (g - 0.5) * (1 + cont) + 0.5;
          b = (b - 0.5) * (1 + cont) + 0.5;

          r += temp * 0.18;
          b -= temp * 0.18;
          g += tint * 0.15;

          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = mix(lum, r, 1 + sat);
          g = mix(lum, g, 1 + sat);
          b = mix(lum, b, 1 + sat);

          if (highlights !== 0 || shadows !== 0) {
            const l = (r + g + b) * 0.333;
            const sMask = 1 - smoothstep(0, 0.55, l);
            const hMask = smoothstep(0.45, 1, l);
            const delta = shadows * sMask * 0.35 + highlights * hMask * 0.35;
            r += delta;
            g += delta;
            b += delta;
          }

          if (vignette > 0) {
            const nx = x / w - 0.5;
            const dist = Math.sqrt(nx * nx + ny * ny) * 2;
            const vig = smoothstep(0.45, 1.45, dist * (1 + vignette * 0.8));
            const vm = 1 - vig * vignette;
            r *= vm;
            g *= vm;
            b *= vm;
          }
        }

        data[idx] = clamp255(r * 255);
        data[idx + 1] = clamp255(g * 255);
        data[idx + 2] = clamp255(b * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return this.workCanvas;
  }

  public apply2DMaskPath(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    mask: MaskConfig | undefined
  ) {
    if (!mask || mask.type === 'none') return;
    const cx = w / 2;
    const cy = h / 2;
    const size = Math.max(0.05, (mask.size ?? 50) / 100);
    const minDim = Math.min(w, h);
    const rad = ((mask.rotation ?? 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    ctx.beginPath();
    if (mask.inverted) {
      ctx.rect(-w * 2, -h * 2, w * 4, h * 4);
    }

    switch (mask.type) {
      case 'linear': {
        const yCut = (size - 0.5) * h;
        ctx.rect(-w, -h, w * 2, h + yCut);
        break;
      }
      case 'mirror': {
        const half = (size * h) / 2;
        ctx.rect(-w, -half, w * 2, half * 2);
        break;
      }
      case 'circle': {
        ctx.arc(0, 0, size * minDim * 0.5, 0, Math.PI * 2, Boolean(mask.inverted));
        break;
      }
      case 'rectangle': {
        const rw = size * w;
        const rh = size * h;
        ctx.rect(-rw / 2, -rh / 2, rw, rh);
        break;
      }
      case 'roundedRect': {
        const rw = size * w * 0.9;
        const rh = size * h * 0.9;
        const r = Math.min(rw, rh) * 0.15;
        ctx.roundRect(-rw / 2, -rh / 2, rw, rh, r);
        break;
      }
      case 'diamond': {
        const r = size * minDim * 0.55;
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        break;
      }
      case 'triangle': {
        const r = size * minDim * 0.52;
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.866, r * 0.5);
        ctx.lineTo(-r * 0.866, r * 0.5);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        const r = size * minDim * 0.5;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'star': {
        const outer = size * minDim * 0.5;
        const inner = outer * 0.42;
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'heart': {
        const s = size * minDim * 0.03;
        ctx.moveTo(0, 6 * s);
        ctx.bezierCurveTo(-18 * s, -6 * s, -12 * s, -22 * s, 0, -10 * s);
        ctx.bezierCurveTo(12 * s, -22 * s, 18 * s, -6 * s, 0, 6 * s);
        ctx.closePath();
        break;
      }
    }

    ctx.restore();
    ctx.clip(mask.inverted ? 'evenodd' : 'nonzero');
  }

  public drawOverlayEffect(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    effect: VisualEffectConfig | undefined,
    time: number
  ) {
    if (!effect || effect.type === 'none') return;
    const amt = clamp01((effect.intensity ?? 60) / 100);
    if (amt <= 0) return;
    const speed = 0.2 + ((effect.speed ?? 50) / 100) * 2.2;
    const t = time * speed;

    ctx.save();
    switch (effect.type) {
      case 'vhs':
      case 'crtMonitor': {
        // Scanlines
        ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * amt})`;
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1.5);
        }
        // Moving VHS tracking bar
        const barY = ((t * 0.35) % 1) * h;
        const grad = ctx.createLinearGradient(0, barY - 24, 0, barY + 24);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.5, `rgba(255,255,255,${0.22 * amt})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, barY - 24, w, 48);

        if (effect.type === 'crtMonitor') {
          const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.72);
          vg.addColorStop(0, 'rgba(0,0,0,0)');
          vg.addColorStop(1, `rgba(0,0,0,${0.65 * amt})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, w, h);
        }
        break;
      }
      case 'filmGrain': {
        const count = Math.round(140 * amt);
        for (let i = 0; i < count; i++) {
          const gx = hash1(i * 1.3 + Math.floor(t * 24)) * w;
          const gy = hash1(i * 2.9 + Math.floor(t * 24)) * h;
          const lum = hash1(i * 5.1 + t) > 0.5 ? 255 : 0;
          ctx.fillStyle = `rgba(${lum},${lum},${lum},${0.2 * amt})`;
          ctx.fillRect(gx, gy, 2, 2);
        }
        break;
      }
      case 'rain': {
        ctx.strokeStyle = `rgba(180, 220, 255, ${0.55 * amt})`;
        ctx.lineWidth = 1.5;
        const drops = Math.round(70 * amt);
        for (let i = 0; i < drops; i++) {
          const rx = hash1(i * 13.7) * w;
          const ry = ((hash1(i * 7.3) + t * (1.4 + hash1(i) * 0.6)) % 1.1) * h;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 6, ry + 26);
          ctx.stroke();
        }
        break;
      }
      case 'snow': {
        const flakes = Math.round(65 * amt);
        for (let i = 0; i < flakes; i++) {
          const sx = (hash1(i * 11.1) * w + Math.sin(t * 2 + i) * 18 + w) % w;
          const sy = ((hash1(i * 5.7) + t * (0.25 + hash1(i) * 0.25)) % 1.05) * h;
          const r = 1.5 + hash1(i * 3.3) * 3.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * amt})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'sparks': {
        ctx.globalCompositeOperation = 'lighter';
        const sparks = Math.round(50 * amt);
        for (let i = 0; i < sparks; i++) {
          const sx = (hash1(i * 9.3) * w + Math.sin(t * 3 + i) * 24 + w) % w;
          const sy = h - ((hash1(i * 4.1) + t * 0.65) % 1.1) * h;
          const r = 1.5 + hash1(i * 2.1) * 3;
          ctx.fillStyle = `rgba(255, ${120 + Math.round(hash1(i) * 120)}, 40, ${0.85 * amt})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'confetti': {
        const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#a855f7'];
        const pieces = Math.round(55 * amt);
        for (let i = 0; i < pieces; i++) {
          const cx = (hash1(i * 17.3) * w + Math.sin(t * 2.5 + i) * 20 + w) % w;
          const cy = ((hash1(i * 6.9) + t * 0.45) % 1.1) * h;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 4 + i);
          ctx.fillStyle = colors[i % colors.length];
          ctx.globalAlpha = 0.85 * amt;
          ctx.fillRect(-4, -2.5, 8, 5);
          ctx.restore();
        }
        break;
      }
      case 'bokehLights': {
        ctx.globalCompositeOperation = 'lighter';
        const orbs = Math.round(18 * amt);
        for (let i = 0; i < orbs; i++) {
          const bx = hash1(i * 19.1) * w + Math.sin(t + i) * 15;
          const by = hash1(i * 23.7) * h + Math.cos(t * 0.8 + i) * 15;
          const br = 18 + hash1(i * 3.7) * 36;
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, `rgba(255, ${160 + (i % 3) * 30}, 120, ${0.28 * amt})`);
          g.addColorStop(1, 'rgba(255, 160, 120, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'starfield': {
        ctx.globalCompositeOperation = 'lighter';
        const stars = Math.round(70 * amt);
        for (let i = 0; i < stars; i++) {
          const angle = hash1(i * 12.3) * Math.PI * 2;
          const dist = ((hash1(i * 8.1) + t * 0.5) % 1) * Math.max(w, h) * 0.7;
          const sx = w / 2 + Math.cos(angle) * dist;
          const sy = h / 2 + Math.sin(angle) * dist;
          ctx.fillStyle = `rgba(220, 240, 255, ${0.8 * amt})`;
          ctx.fillRect(sx, sy, 2.5, 2.5);
        }
        break;
      }
      case 'matrixRain': {
        ctx.font = 'bold 14px monospace';
        const cols = Math.max(8, Math.floor(w / 24));
        for (let c = 0; c < cols; c++) {
          const x = c * 24 + 4;
          const y = ((hash1(c * 9.7) + t * (0.6 + hash1(c) * 0.4)) % 1.2) * h;
          ctx.fillStyle = `rgba(34, 197, 94, ${0.7 * amt})`;
          ctx.fillText(hash1(c + Math.floor(t * 8)) > 0.5 ? '1' : '0', x, y);
          ctx.fillStyle = `rgba(187, 247, 208, ${0.85 * amt})`;
          ctx.fillText(hash1(c * 2 + Math.floor(t * 10)) > 0.5 ? '0' : '1', x, y + 16);
        }
        break;
      }
      case 'lightLeakFX':
      case 'sunFlare':
      case 'auroraGlow':
      case 'prismRainbow': {
        ctx.globalCompositeOperation = 'screen';
        const lx = w * (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.8)));
        const ly = h * 0.25;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(w, h) * 0.65);
        if (effect.type === 'auroraGlow') {
          g.addColorStop(0, `rgba(34, 211, 238, ${0.45 * amt})`);
          g.addColorStop(0.5, `rgba(168, 85, 247, ${0.3 * amt})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else if (effect.type === 'prismRainbow') {
          g.addColorStop(0, `rgba(244, 63, 94, ${0.38 * amt})`);
          g.addColorStop(0.45, `rgba(56, 189, 248, ${0.32 * amt})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          g.addColorStop(0, `rgba(255, 190, 90, ${0.55 * amt})`);
          g.addColorStop(0.5, `rgba(249, 115, 22, ${0.28 * amt})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'strobeLight': {
        const flash = Math.sin(t * 18) > 0.35 ? 0.55 * amt : 0;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flash})`;
          ctx.fillRect(0, 0, w, h);
        }
        break;
      }
      case 'speedLines': {
        ctx.strokeStyle = `rgba(255,255,255,${0.45 * amt})`;
        ctx.lineWidth = 2;
        const lines = 32;
        for (let i = 0; i < lines; i++) {
          const a = (i / lines) * Math.PI * 2 + Math.floor(t * 16) * 0.1;
          const r1 = Math.min(w, h) * (0.28 + hash1(i + Math.floor(t * 12)) * 0.15);
          const r2 = Math.max(w, h) * 0.85;
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1);
          ctx.lineTo(w / 2 + Math.cos(a) * r2, h / 2 + Math.sin(a) * r2);
          ctx.stroke();
        }
        break;
      }
      case 'cinematicBars': {
        const barH = h * 0.13 * amt;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
        break;
      }
      case 'dreamyBloom':
      case 'neonGlow': {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.35 * amt;
        ctx.filter = `blur(${Math.round(8 + amt * 12)}px) brightness(1.3)`;
        ctx.drawImage(ctx.canvas, 0, 0, w, h);
        break;
      }
      case 'tiltShift': {
        const vg = ctx.createLinearGradient(0, 0, 0, h);
        vg.addColorStop(0, `rgba(0,0,0,${0.32 * amt})`);
        vg.addColorStop(0.25, 'rgba(0,0,0,0)');
        vg.addColorStop(0.75, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${0.32 * amt})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'fireFlames':
      case 'hellfire':
      case 'fireRing': {
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createLinearGradient(0, h, 0, h * 0.25);
        g.addColorStop(0, `rgba(255, 95, 15, ${0.65 * amt})`);
        g.addColorStop(0.5, `rgba(255, 175, 40, ${0.32 * amt})`);
        g.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'sunnyDay':
      case 'goldenHour':
      case 'godRays':
      case 'candlelight': {
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(w * 0.8, h * 0.15, 0, w * 0.8, h * 0.15, Math.max(w, h) * 0.85);
        g.addColorStop(0, `rgba(255, 225, 140, ${0.48 * amt})`);
        g.addColorStop(0.5, `rgba(255, 165, 60, ${0.22 * amt})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'blueHour':
      case 'starryNight':
      case 'moonlight':
      case 'bloodMoon': {
        ctx.fillStyle =
          effect.type === 'bloodMoon'
            ? `rgba(120, 15, 20, ${0.38 * amt})`
            : `rgba(18, 32, 85, ${0.42 * amt})`;
        ctx.fillRect(0, 0, w, h);
        if (effect.type === 'starryNight') {
          ctx.fillStyle = `rgba(255,255,255,${0.75 * amt})`;
          for (let i = 0; i < 40; i++) {
            ctx.fillRect(hash1(i * 12.1) * w, hash1(i * 7.3) * h * 0.75, 2, 2);
          }
        }
        break;
      }
      case 'thunderstorm':
      case 'policeSiren':
      case 'discoLights': {
        ctx.globalCompositeOperation = 'screen';
        const phase = Math.sin(t * 8);
        ctx.fillStyle =
          effect.type === 'policeSiren'
            ? phase > 0
              ? `rgba(255, 30, 40, ${0.35 * amt})`
              : `rgba(30, 100, 255, ${0.35 * amt})`
            : `rgba(180, 215, 255, ${Math.max(0, phase) * 0.45 * amt})`;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'fogMist':
      case 'sandstorm':
      case 'frostEdge': {
        ctx.fillStyle =
          effect.type === 'sandstorm'
            ? `rgba(210, 160, 95, ${0.35 * amt})`
            : `rgba(215, 230, 245, ${0.32 * amt})`;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'sunsetSky':
      case 'vaporwave': {
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, `rgba(190, 60, 180, ${0.35 * amt})`);
        g.addColorStop(1, `rgba(255, 160, 60, ${0.30 * amt})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      case 'fireflies':
      case 'sparkles':
      case 'goldenSparkle':
      case 'bubbles': {
        ctx.globalCompositeOperation = 'lighter';
        const count = Math.round(28 * amt);
        for (let i = 0; i < count; i++) {
          const px = (hash1(i * 11.7) * w + Math.sin(t + i) * 20 + w) % w;
          const py = (hash1(i * 5.9) * h + Math.cos(t * 0.8 + i) * 20 + h) % h;
          ctx.fillStyle =
            effect.type === 'fireflies'
              ? `rgba(190, 255, 70, ${0.75 * amt})`
              : `rgba(255, 230, 150, ${0.75 * amt})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + hash1(i) * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'cherryBlossom':
      case 'autumnLeaves':
      case 'ashEmbers':
      case 'snowBlizzard': {
        const count = Math.round(45 * amt);
        for (let i = 0; i < count; i++) {
          const px = (hash1(i * 13.3) * w + t * 40 + w) % w;
          const py = ((hash1(i * 4.7) + t * 0.35) % 1.1) * h;
          ctx.fillStyle =
            effect.type === 'cherryBlossom'
              ? `rgba(255, 185, 210, ${0.8 * amt})`
              : effect.type === 'autumnLeaves'
              ? `rgba(240, 115, 30, ${0.8 * amt})`
              : effect.type === 'ashEmbers'
              ? `rgba(255, 90, 20, ${0.75 * amt})`
              : `rgba(240, 248, 255, ${0.8 * amt})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'laserRain':
      case 'digitalRainBlue':
      case 'hologram':
      case 'cyberScan':
      case 'laserGrid': {
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.45 * amt})`;
        ctx.lineWidth = 1.5;
        const scanY = ((t * 0.35) % 1) * h;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
        break;
      }
      case 'spotlight':
      case 'noirShadow':
      case 'projector8mm': {
        const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, `rgba(0,0,0,${0.65 * amt})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
        break;
      }
      default: {
        const meta = PARAMETRIC_EFFECT_MAP[effect.type];
        if (meta) {
          const { family, colA, colB } = meta.gpu;
          const rA = Math.round(colA[0] * 255);
          const gA = Math.round(colA[1] * 255);
          const bA = Math.round(colA[2] * 255);
          const rB = Math.round(colB[0] * 255);
          const gB = Math.round(colB[1] * 255);
          const bB = Math.round(colB[2] * 255);

          if (family === 1 || family === 2) {
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(
              w / 2,
              family === 1 ? h * 0.85 : h / 2,
              w * 0.05,
              w / 2,
              family === 1 ? h * 0.75 : h / 2,
              w * 0.65
            );
            grad.addColorStop(0, `rgba(${rA},${gA},${bA},${0.65 * amt})`);
            grad.addColorStop(0.5, `rgba(${rB},${gB},${bB},${0.45 * amt})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
          } else if (family === 3) {
            ctx.fillStyle = `rgba(${rA},${gA},${bA},${0.75 * amt})`;
            for (let i = 0; i < 28; i++) {
              const px = hash1(i * 7.1 + Math.floor(t * 2)) * w;
              const py = ((hash1(i * 13.3) * h + t * 80) % h);
              ctx.beginPath();
              ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (family === 4) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = `rgba(${rA},${gA},${bA},${0.22 * amt})`;
            for (let i = 0; i < 6; i++) {
              const gy = hash1(i * 19.7 + Math.floor(t * 10)) * h;
              ctx.fillRect(0, gy, w, 4 + (i % 8));
            }
          } else {
            ctx.fillStyle = `rgba(${rB},${gB},${bB},${0.22 * amt})`;
            ctx.fillRect(0, 0, w, h);
          }
        }
        break;
      }
    }
    ctx.restore();
  }

  public getPrevCanvas(w: number, h: number): HTMLCanvasElement {
    if (this.transPrevCanvas.width !== w || this.transPrevCanvas.height !== h) {
      this.transPrevCanvas.width = w;
      this.transPrevCanvas.height = h;
    }
    this.transPrevCtx.clearRect(0, 0, w, h);
    return this.transPrevCanvas;
  }

  public getCurrCanvas(w: number, h: number): HTMLCanvasElement {
    if (this.transCurrCanvas.width !== w || this.transCurrCanvas.height !== h) {
      this.transCurrCanvas.width = w;
      this.transCurrCanvas.height = h;
    }
    this.transCurrCtx.clearRect(0, 0, w, h);
    return this.transCurrCanvas;
  }

  public renderTransition2D(
    outCtx: CanvasRenderingContext2D,
    prevCanvas: HTMLCanvasElement | null,
    currCanvas: HTMLCanvasElement,
    w: number,
    h: number,
    type: TransitionType,
    p: number
  ) {
    const sp = smoothstep(0, 1, p);
    const drawPrev = (
      alpha = 1,
      dx = 0,
      dy = 0,
      scale = 1,
      rotDeg = 0
    ) => {
      if (!prevCanvas) return;
      outCtx.save();
      outCtx.globalAlpha = clamp01(alpha);
      outCtx.translate(w / 2 + dx, h / 2 + dy);
      if (rotDeg !== 0) outCtx.rotate((rotDeg * Math.PI) / 180);
      if (scale !== 1) outCtx.scale(scale, scale);
      outCtx.drawImage(prevCanvas, -w / 2, -h / 2, w, h);
      outCtx.restore();
    };

    const drawCurr = (
      alpha = 1,
      dx = 0,
      dy = 0,
      scaleX = 1,
      scaleY = 1,
      rotDeg = 0
    ) => {
      outCtx.save();
      outCtx.globalAlpha = clamp01(alpha);
      outCtx.translate(w / 2 + dx, h / 2 + dy);
      if (rotDeg !== 0) outCtx.rotate((rotDeg * Math.PI) / 180);
      if (scaleX !== 1 || scaleY !== 1) outCtx.scale(scaleX, scaleY);
      outCtx.drawImage(currCanvas, -w / 2, -h / 2, w, h);
      outCtx.restore();
    };

    switch (type) {
      case 'crossDissolve':
      case 'lumaFade':
      case 'dreamy':
      case 'radialBlurFade': {
        drawPrev(1 - sp);
        drawCurr(sp);
        break;
      }
      case 'directionalWipe':
      case 'wipeLeft':
      case 'wipeRight':
      case 'wipeUp':
      case 'wipeDown':
      case 'diagonalWipe': {
        drawPrev(1);
        outCtx.save();
        outCtx.beginPath();
        if (type === 'wipeRight' || type === 'directionalWipe') {
          outCtx.rect(0, 0, w * sp, h);
        } else if (type === 'wipeLeft') {
          outCtx.rect(w * (1 - sp), 0, w * sp, h);
        } else if (type === 'wipeUp') {
          outCtx.rect(0, h * (1 - sp), w, h * sp);
        } else if (type === 'wipeDown') {
          outCtx.rect(0, 0, w, h * sp);
        } else {
          outCtx.moveTo(0, 0);
          outCtx.lineTo(w * sp * 2, 0);
          outCtx.lineTo(0, h * sp * 2);
          outCtx.closePath();
        }
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'whipPanLeft':
      case 'whipPanRight':
      case 'slidePush':
      case 'rgbSplitSlide': {
        const dir = type === 'whipPanRight' ? 1 : -1;
        drawPrev(1, dir * w * sp);
        drawCurr(1, -dir * w * (1 - sp));
        break;
      }
      case 'whipPanUp':
      case 'whipPanDown':
      case 'slideDownPush': {
        const dir = type === 'whipPanDown' || type === 'slideDownPush' ? 1 : -1;
        drawPrev(1, 0, dir * h * sp);
        drawCurr(1, 0, -dir * h * (1 - sp));
        break;
      }
      case 'zoomInBlur':
      case 'dynamicZoom':
      case 'crossZoom':
      case 'dollyZoom': {
        if (p < 0.5) {
          const t = p * 2;
          drawPrev(1 - t * 0.4, 0, 0, 1 + t * 0.65);
        } else {
          const t = (p - 0.5) * 2;
          drawPrev(1 - t, 0, 0, 1.65);
          drawCurr(t, 0, 0, 1.5 - t * 0.5, 1.5 - t * 0.5);
        }
        break;
      }
      case 'zoomOutBlur':
      case 'zoomOutBounce': {
        const s = p < 0.5 ? 1 - p * 0.5 : 0.75 + (p - 0.5) * 0.5;
        if (p < 0.5) drawPrev(1, 0, 0, s);
        else drawCurr(1, 0, 0, s, s);
        break;
      }
      case 'spinTransition':
      case 'swirlWarp': {
        if (p < 0.5) {
          const t = p * 2;
          drawPrev(1 - t * 0.3, 0, 0, 1 + t * 0.3, t * 180);
        } else {
          const t = (p - 0.5) * 2;
          drawCurr(t, 0, 0, 1.3 - t * 0.3, 1.3 - t * 0.3, (1 - t) * -180);
        }
        break;
      }
      case 'rotate3D':
      case 'cube3D': {
        if (p < 0.5) {
          const sx = Math.max(0.02, Math.cos(p * Math.PI));
          outCtx.save();
          outCtx.translate(w / 2, h / 2);
          outCtx.scale(sx, 1);
          if (prevCanvas) outCtx.drawImage(prevCanvas, -w / 2, -h / 2, w, h);
          outCtx.restore();
        } else {
          const sx = Math.max(0.02, Math.cos((1 - p) * Math.PI));
          drawCurr(1, 0, 0, sx, 1);
        }
        break;
      }
      case 'flipVertical3D': {
        if (p < 0.5) {
          const sy = Math.max(0.02, Math.cos(p * Math.PI));
          outCtx.save();
          outCtx.translate(w / 2, h / 2);
          outCtx.scale(1, sy);
          if (prevCanvas) outCtx.drawImage(prevCanvas, -w / 2, -h / 2, w, h);
          outCtx.restore();
        } else {
          const sy = Math.max(0.02, Math.cos((1 - p) * Math.PI));
          drawCurr(1, 0, 0, 1, sy);
        }
        break;
      }
      case 'flashWhite':
      case 'prismFlash':
      case 'lightLeak': {
        if (p < 0.5) drawPrev(1);
        else drawCurr(1);
        const flash = Math.sin(p * Math.PI);
        outCtx.save();
        outCtx.fillStyle =
          type === 'lightLeak'
            ? `rgba(255, 165, 70, ${flash * 0.85})`
            : `rgba(255, 255, 255, ${flash * 0.95})`;
        outCtx.fillRect(0, 0, w, h);
        outCtx.restore();
        break;
      }
      case 'flashBlack':
      case 'burnDark':
      case 'vignetteFade': {
        if (p < 0.5) drawPrev(1);
        else drawCurr(1);
        const dark = Math.sin(p * Math.PI);
        outCtx.save();
        outCtx.fillStyle = `rgba(0, 0, 0, ${dark * 0.98})`;
        outCtx.fillRect(0, 0, w, h);
        outCtx.restore();
        break;
      }
      case 'filmBurn': {
        drawPrev(1 - sp);
        drawCurr(sp);
        const burn = Math.sin(p * Math.PI);
        outCtx.save();
        outCtx.globalCompositeOperation = 'screen';
        outCtx.fillStyle = `rgba(255, 110, 30, ${burn * 0.85})`;
        outCtx.fillRect(0, 0, w, h);
        outCtx.restore();
        break;
      }
      case 'circleOpen':
      case 'diamondOpen':
      case 'heartOpen':
      case 'starOpen': {
        drawPrev(1);
        outCtx.save();
        outCtx.beginPath();
        const maxR = Math.hypot(w, h) * 0.6;
        const r = maxR * sp;
        if (type === 'circleOpen') {
          outCtx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        } else if (type === 'diamondOpen') {
          outCtx.moveTo(w / 2, h / 2 - r);
          outCtx.lineTo(w / 2 + r, h / 2);
          outCtx.lineTo(w / 2, h / 2 + r);
          outCtx.lineTo(w / 2 - r, h / 2);
          outCtx.closePath();
        } else {
          outCtx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        }
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'clockWipe': {
        drawPrev(1);
        outCtx.save();
        outCtx.beginPath();
        outCtx.moveTo(w / 2, h / 2);
        outCtx.arc(
          w / 2,
          h / 2,
          Math.hypot(w, h),
          -Math.PI / 2,
          -Math.PI / 2 + sp * Math.PI * 2
        );
        outCtx.closePath();
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'blinds': {
        drawPrev(1);
        const count = 8;
        const bh = h / count;
        outCtx.save();
        outCtx.beginPath();
        for (let i = 0; i < count; i++) {
          outCtx.rect(0, i * bh, w, bh * sp);
        }
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'barnDoorOpen':
      case 'barnDoorClose': {
        drawPrev(1);
        outCtx.save();
        outCtx.beginPath();
        if (type === 'barnDoorOpen') {
          const half = (w / 2) * sp;
          outCtx.rect(w / 2 - half, 0, half * 2, h);
        } else {
          const side = (w / 2) * sp;
          outCtx.rect(0, 0, side, h);
          outCtx.rect(w - side, 0, side, h);
        }
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'shakeImpact':
      case 'shakeZoom':
      case 'glitch': {
        const amp = Math.sin(p * Math.PI) * 18;
        const sx = (hash1(p * 97) - 0.5) * amp;
        const sy = (hash1(p * 53) - 0.5) * amp;
        drawPrev(1 - sp, sx, sy, 1 + (1 - sp) * 0.08);
        drawCurr(sp, -sx, -sy, 1 + (1 - sp) * 0.08, 1 + (1 - sp) * 0.08);
        break;
      }
      case 'crtShutdown': {
        if (p < 0.5) {
          const t = p * 2;
          drawPrev(1, 0, 0, Math.max(0.02, 1 - t));
        } else {
          const t = (p - 0.5) * 2;
          drawCurr(1, 0, 0, 1, Math.max(0.02, t));
        }
        break;
      }
      case 'panDiagonalTL':
      case 'panDiagonalTR': {
        const dx = type === 'panDiagonalTL' ? -1 : 1;
        drawPrev(1, dx * w * sp, -h * sp);
        drawCurr(1, -dx * w * (1 - sp), h * (1 - sp));
        break;
      }
      case 'snapZoomIn':
      case 'crashZoom':
      case 'hyperLapse': {
        if (p < 0.5) {
          const t = p * 2;
          drawPrev(1 - t * 0.4, 0, 0, 1 + t * 0.7);
        } else {
          const t = (p - 0.5) * 2;
          drawCurr(t, 0, 0, 1.4 - t * 0.4, 1.4 - t * 0.4);
        }
        break;
      }
      case 'snapZoomOut':
      case 'boxZoom3D': {
        if (p < 0.5) {
          drawPrev(1 - p, 0, 0, 1 - p * 0.5);
        } else {
          drawCurr(1, 0, 0, 0.75 + (p - 0.5) * 0.5, 0.75 + (p - 0.5) * 0.5);
        }
        break;
      }
      case 'tiltLeft':
      case 'tiltRight':
      case 'pullBackRotate':
      case 'liquidSwirl': {
        const dir = type === 'tiltLeft' ? -1 : 1;
        const deg = Math.sin(p * Math.PI) * 18 * dir;
        if (p < 0.5) drawPrev(1 - sp, 0, 0, 1 + Math.sin(p * Math.PI) * 0.2, deg);
        else drawCurr(sp, 0, 0, 1 + Math.sin(p * Math.PI) * 0.2, 1 + Math.sin(p * Math.PI) * 0.2, -deg);
        break;
      }
      case 'bounceDrop':
      case 'bounceRise': {
        const dir = type === 'bounceDrop' ? -1 : 1;
        drawPrev(1 - sp);
        drawCurr(1, 0, dir * h * (1 - sp));
        break;
      }
      case 'solarFlare':
      case 'neonPulse':
      case 'warmSunset':
      case 'arcticFreeze':
      case 'goldenBokeh':
      case 'strobeFlash':
      case 'auroraGlow':
      case 'haloBurst': {
        drawPrev(1 - sp);
        drawCurr(sp);
        const glow = Math.sin(p * Math.PI) * 0.6;
        outCtx.save();
        outCtx.fillStyle =
          type === 'arcticFreeze'
            ? `rgba(120, 200, 255, ${glow})`
            : type === 'neonPulse'
            ? `rgba(220, 60, 255, ${glow})`
            : `rgba(255, 220, 150, ${glow})`;
        outCtx.fillRect(0, 0, w, h);
        outCtx.restore();
        break;
      }
      case 'cinemaCurtain':
      case 'splitVertical': {
        drawCurr(1);
        const half = (w / 2) * (1 - sp);
        if (prevCanvas && half > 1) {
          outCtx.drawImage(prevCanvas, 0, 0, w / 2, h, 0, 0, half, h);
          outCtx.drawImage(prevCanvas, w / 2, 0, w / 2, h, w - half, 0, half, h);
        }
        break;
      }
      case 'splitHorizontal': {
        drawCurr(1);
        const half = (h / 2) * (1 - sp);
        if (prevCanvas && half > 1) {
          outCtx.drawImage(prevCanvas, 0, 0, w, h / 2, 0, 0, w, half);
          outCtx.drawImage(prevCanvas, 0, h / 2, w, h / 2, 0, h - half, w, half);
        }
        break;
      }
      case 'squeezeHorizontal': {
        if (p < 0.5) drawPrev(1, 0, 0, Math.max(0.02, 1 - p * 2), 1);
        else drawCurr(1, 0, 0, Math.max(0.02, (p - 0.5) * 2), 1);
        break;
      }
      case 'squeezeVertical': {
        if (p < 0.5) drawPrev(1, 0, 0, 1, Math.max(0.02, 1 - p * 2));
        else drawCurr(1, 0, 0, 1, Math.max(0.02, (p - 0.5) * 2));
        break;
      }
      case 'verticalBlinds': {
        drawPrev(1);
        const count = 10;
        const bw = w / count;
        outCtx.save();
        outCtx.beginPath();
        for (let i = 0; i < count; i++) {
          outCtx.rect(i * bw, 0, bw * sp, h);
        }
        outCtx.clip();
        drawCurr(1);
        outCtx.restore();
        break;
      }
      case 'whipZoomLeft':
      case 'smoothPanLeft': {
        drawPrev(1 - sp * 0.4, -sp * w, 0);
        drawCurr(1, (1 - sp) * w, 0);
        break;
      }
      case 'whipZoomRight':
      case 'smoothPanRight': {
        drawPrev(1 - sp * 0.4, sp * w, 0);
        drawCurr(1, -(1 - sp) * w, 0);
        break;
      }
      case 'whipZoomUp':
      case 'smoothPanUp': {
        drawPrev(1 - sp * 0.4, 0, -sp * h);
        drawCurr(1, 0, (1 - sp) * h);
        break;
      }
      case 'whipZoomDown':
      case 'smoothPanDown': {
        drawPrev(1 - sp * 0.4, 0, sp * h);
        drawCurr(1, 0, -(1 - sp) * h);
        break;
      }
      case 'spiralZoomIn':
      case 'elasticZoomIn':
      case 'vertigoPull': {
        drawPrev(1 - sp, 0, 0, 1 + sp * 0.6, 1 + sp * 0.6);
        drawCurr(sp, 0, 0, 0.7 + sp * 0.3, 0.7 + sp * 0.3);
        break;
      }
      case 'spiralZoomOut':
      case 'elasticZoomOut': {
        drawPrev(1 - sp, 0, 0, 1 - sp * 0.4, 1 - sp * 0.4);
        drawCurr(sp, 0, 0, 1.4 - sp * 0.4, 1.4 - sp * 0.4);
        break;
      }
      case 'warmFlash':
      case 'coolFlash':
      case 'goldLeak':
      case 'crimsonFlare':
      case 'blueFlare':
      case 'amberBurn':
      case 'whiteBloom':
      case 'filmFlash':
      case 'neonFlash':
      case 'sunsetWash':
      case 'auroraSweep': {
        drawPrev(1 - sp);
        drawCurr(sp);
        const glow = Math.sin(p * Math.PI) * 0.65;
        outCtx.save();
        outCtx.fillStyle =
          type === 'coolFlash' || type === 'blueFlare'
            ? `rgba(100, 190, 255, ${glow})`
            : type === 'crimsonFlare'
            ? `rgba(255, 60, 80, ${glow})`
            : type === 'neonFlash'
            ? `rgba(220, 60, 255, ${glow})`
            : `rgba(255, 220, 140, ${glow})`;
        outCtx.fillRect(0, 0, w, h);
        outCtx.restore();
        break;
      }
      case 'flipHorizontal3D':
      case 'cardFlipLeft':
      case 'cardFlipRight': {
        const scX = Math.max(0.03, Math.abs(Math.cos(sp * Math.PI)));
        if (p < 0.5) drawPrev(1, 0, 0, scX, 1);
        else drawCurr(1, 0, 0, scX, 1);
        break;
      }
      case 'curtainPart': {
        drawCurr(1);
        const half = (w / 2) * (1 - sp);
        if (prevCanvas && half > 1) {
          outCtx.drawImage(prevCanvas, 0, 0, w / 2, h, 0, 0, half, h);
          outCtx.drawImage(prevCanvas, w / 2, 0, w / 2, h, w - half, 0, half, h);
        }
        break;
      }
      default: {
        drawPrev(1 - sp);
        drawCurr(sp);
        break;
      }
    }
  }
}
