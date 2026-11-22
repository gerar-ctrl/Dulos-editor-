// ============================================================================
// WebGL GLSL Shaders - Modular Studio-Grade 60FPS Video Processing, LUTs & FX
// Each combination compiles a tiny specialized shader (~45-110 lines, < 1.5ms)
// instead of a 1,836-line monolithic uber-shader that stalls ANGLE/D3D11 & Mobile.
// ============================================================================

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform vec2 u_scale;
uniform float u_rotation;
uniform vec2 u_flip;

varying vec2 v_texCoord;

void main() {
  float rad = radians(u_rotation);
  float s = sin(rad);
  float c = cos(rad);
  mat2 rotationMatrix = mat2(c, -s, s, c);

  // Rotate and flip around the exact center of the quad in pixel space
  vec2 center = u_translation + u_scale * 0.5;
  vec2 offset = (a_position - 0.5) * u_scale * u_flip;
  vec2 rotatedOffset = rotationMatrix * offset;
  vec2 finalPos = center + rotatedOffset;

  // Map to clip space (-1.0 to 1.0)
  vec2 zeroToOne = finalPos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export interface CompositeShaderSpec {
  /** 0 = none, 1..35 = preset ID, 36 = parametric LUT (for presets >= 36) */
  filterPreset: number;
  /** 0 = none, 1..90 = effect ID, 91 = parametric effect family */
  effectType: number;
  /** 0 = none, 1..7 = parametric family when effectType === 91 */
  fxFamily: number;
  hasColorGrading: boolean;
  hasSharpness: boolean;
  hasHsl: boolean;
  hasChroma: boolean;
  /** 0 = none, 1..10 = mask shape ID */
  maskType: number;
  hasPerspective: boolean;
  hasAnimBlur: boolean;
}

export function getCompositeShaderKey(spec: CompositeShaderSpec): string {
  const normFilter = spec.filterPreset >= 36 ? 36 : spec.filterPreset;
  const normEffect = spec.effectType >= 91 ? 91 : spec.effectType;
  const normFamily = normEffect === 91 ? spec.fxFamily : 0;
  return [
    normFilter,
    normEffect,
    normFamily,
    spec.hasColorGrading ? 1 : 0,
    spec.hasSharpness ? 1 : 0,
    spec.hasHsl ? 1 : 0,
    spec.hasChroma ? 1 : 0,
    spec.maskType,
    spec.hasPerspective ? 1 : 0,
    spec.hasAnimBlur ? 1 : 0,
  ].join(':');
}

function getFilterPresetGlsl(preset: number): string {
  switch (preset) {
    case 1:
      return `
  vec3 shadows = vec3(0.05, 0.32, 0.42);
  vec3 highlights = vec3(1.0, 0.62, 0.28);
  float sMask = 1.0 - smoothstep(0.0, 0.55, luma);
  float hMask = smoothstep(0.35, 1.0, luma);
  res = mix(res, res * vec3(0.85, 1.02, 1.18) + shadows * 0.18, sMask * 0.75);
  res = mix(res, res * vec3(1.16, 1.02, 0.84) + highlights * 0.1, hMask * 0.75);
  res = smoothstep(-0.04, 1.04, res);`;
    case 2:
      return `
  vec3 sCurve = smoothstep(0.02, 0.98, res);
  res = mix(vec3(luma), sCurve, 0.88);
  res.r = res.r * 1.05 + 0.02;
  res.g = res.g * 0.99 + 0.01;
  res.b = res.b * 1.08 + 0.04 * (1.0 - luma);
  res = max(vec3(0.03, 0.035, 0.05), res * 0.96);`;
    case 3:
      return `
  vec3 c = (res - 0.5) * 1.28 + 0.5;
  float satBoost = 1.32 - 0.15 * smoothstep(0.6, 1.0, luma);
  res = mix(vec3(luma), clamp(c, 0.0, 1.0), satBoost);`;
    case 4:
      return `
  res = vec3(
    dot(rgb, vec3(0.52, 0.38, 0.12)),
    dot(rgb, vec3(0.22, 0.64, 0.14)),
    dot(rgb, vec3(0.10, 0.22, 0.52))
  );
  res = mix(rgb, res, 0.68);
  res += vec3(0.06, 0.03, -0.02);
  res = vec3(0.06, 0.04, 0.07) + res * 0.88;`;
    case 5:
      return `
  vec3 desat = mix(vec3(luma), res, 0.75);
  res = vec3(0.09, 0.085, 0.10) + desat * 0.82;
  res.r += 0.03 * luma;`;
    case 6:
      return `
  res = vec3(
    dot(rgb, vec3(0.393, 0.769, 0.189)),
    dot(rgb, vec3(0.349, 0.686, 0.168)),
    dot(rgb, vec3(0.272, 0.534, 0.131))
  );
  res = (res - 0.5) * 1.12 + 0.5;`;
    case 7:
      return `
  float bw = dot(rgb, vec3(0.299, 0.587, 0.114));
  bw = smoothstep(0.03, 0.97, bw);
  res = vec3(bw);`;
    case 8:
      return `
  float noir = dot(rgb, vec3(0.25, 0.65, 0.10));
  noir = pow(clamp((noir - 0.12) * 1.35, 0.0, 1.0), 1.25);
  res = vec3(noir * 0.96, noir * 0.98, noir * 1.03);`;
    case 9:
      return `
  vec3 shadowCol = vec3(0.14, 0.02, 0.35);
  vec3 midCol = vec3(0.95, 0.15, 0.75);
  vec3 highCol = vec3(0.15, 0.95, 1.0);
  vec3 grade = mix(shadowCol, midCol, smoothstep(0.0, 0.55, luma));
  grade = mix(grade, highCol, smoothstep(0.45, 1.0, luma));
  res = mix(res * 1.15, grade, 0.48);
  res = (res - 0.5) * 1.22 + 0.5;`;
    case 10:
      return `
  vec3 m = mix(vec3(luma), res, 0.45);
  res = vec3(m.r * 0.65, pow(m.g, 0.85) * 1.18 + 0.03, m.b * 0.72);
  res = (res - 0.5) * 1.18 + 0.5;`;
    case 11:
      return `
  float maxC = max(res.r, max(res.g, res.b));
  float minC = min(res.r, min(res.g, res.b));
  float curSat = maxC - minC;
  float vib = (1.0 - curSat) * 0.65 + 0.25;
  res = mix(vec3(luma), res, 1.0 + vib);
  res = (res - 0.5) * 1.15 + 0.5;`;
    case 12:
      return `
  res = mix(vec3(luma), res, 1.42);
  res.b = pow(clamp(res.b, 0.0, 1.0), 0.86) * 1.12;
  res.g = pow(clamp(res.g, 0.0, 1.0), 0.92) * 1.06;
  res = smoothstep(-0.02, 0.96, res);`;
    case 13:
      return `
  res.r = pow(clamp(res.r, 0.0, 1.0), 0.85) * 1.12;
  res.g = res.g * 1.02 + 0.02;
  res.b = res.b * 0.78;
  res += vec3(0.08, 0.04, -0.03) * smoothstep(0.2, 0.9, luma);`;
    case 14:
      return `
  res += vec3(0.09, 0.04, -0.07);
  res = mix(vec3(luma), res, 1.15);`;
    case 15:
      return `
  res = mix(vec3(luma), res, 0.85);
  res += vec3(-0.07, 0.01, 0.11);
  res = (res - 0.5) * 1.12 + 0.5;`;
    case 16:
      return `
  vec3 night = mix(vec3(luma), res, 0.55) * 0.72;
  night *= vec3(0.62, 0.82, 1.28);
  res = (night - 0.4) * 1.2 + 0.35;`;
    case 17:
      return `
  vec3 silver = vec3(luma);
  vec3 base = mix(res, silver, 0.65);
  vec3 overlay = mix(
    2.0 * base * silver,
    1.0 - 2.0 * (1.0 - base) * (1.0 - silver),
    step(0.5, base)
  );
  res = mix(base, overlay, 0.65);`;
    case 18:
      return `
  vec3 p = mix(vec3(luma), res, 0.82);
  p = pow(clamp(p, 0.0, 1.0), vec3(0.82));
  p += vec3(0.06, 0.03, 0.07) * (1.0 - luma * 0.5);
  res = vec3(0.06) + p * 0.90;`;
    case 19:
      return `
  vec3 topTint = vec3(1.08, 0.75, 0.95);
  vec3 botTint = vec3(1.15, 0.88, 0.65);
  vec3 gradTint = mix(topTint, botTint, uv.y);
  res = res * gradTint;
  res = (res - 0.5) * 1.15 + 0.5;`;
    case 20:
      return `
  vec3 sh = vec3(0.08, 0.20, 0.35);
  vec3 hi = vec3(1.08, 0.78, 0.45);
  res = mix(res * 0.92 + sh * 0.25, res * hi, smoothstep(0.25, 0.85, luma));
  res = (res - 0.5) * 1.24 + 0.5;`;
    case 21:
      return `
  res = pow(clamp(res, 0.0, 1.0), vec3(0.95, 0.98, 1.06));
  res *= vec3(1.09, 1.01, 0.90);
  res = vec3(0.03, 0.02, 0.01) + res * 0.95;`;
    case 22:
      return `
  res = mix(vec3(luma), res, 0.72);
  res = pow(clamp(res, 0.0, 1.0), vec3(1.22));
  res *= vec3(0.94, 0.97, 1.04);`;
    case 23:
      return `
  res = vec3(0.06, 0.07, 0.05) + res * 0.88;
  res += vec3(0.04, 0.05, -0.02) * (1.0 - luma);
  res *= vec3(1.04, 1.02, 0.94);`;
    case 24:
      return `
  res = mix(vec3(luma), res, 1.42);
  res = (res - 0.5) * 1.20 + 0.5;
  res *= vec3(1.02, 1.05, 1.04);`;
    case 25:
      return `
  res.r = pow(clamp(res.r, 0.0, 1.0), 0.90) * 1.08;
  res.g = pow(clamp(res.g, 0.0, 1.0), 1.02);
  res.b = pow(clamp(res.b, 0.0, 1.0), 1.12) * 0.92;
  res = (res - 0.5) * 1.22 + 0.5;`;
    case 26:
      return `
  vec3 sh = vec3(0.22, 0.02, 0.35);
  vec3 hi = vec3(0.15, 0.95, 1.0);
  res = mix(sh + res * 0.65, res * hi + vec3(0.2, 0.0, 0.25), smoothstep(0.2, 0.85, luma));`;
    case 27:
      return `
  res = mix(vec3(luma), res, 0.88);
  res = vec3(0.12, 0.08, 0.16) + res * 0.82;
  res *= mix(vec3(1.08, 0.86, 1.05), vec3(0.85, 1.06, 1.08), uv.x);`;
    case 28:
      return `
  float cLuma = smoothstep(0.15, 0.85, luma);
  vec3 tint = mix(vec3(0.05, 0.15, 0.35), vec3(1.0, 0.2, 0.75), cLuma);
  res = mix(vec3(luma * 0.6), res * tint * 1.25, 0.65);
  res = (res - 0.5) * 1.32 + 0.5;`;
    case 29:
      return `
  res *= vec3(0.88, 1.10, 0.96);
  res += vec3(-0.02, 0.04, 0.02) * (1.0 - luma);
  res = (res - 0.5) * 1.12 + 0.5;`;
    case 30:
      return `
  res *= vec3(0.86, 0.98, 1.14);
  res = pow(clamp(res, 0.0, 1.0), vec3(0.92));
  res = (res - 0.5) * 1.16 + 0.5;`;
    case 31:
      return `
  res *= vec3(1.16, 0.98, 0.76);
  res += vec3(0.05, 0.02, -0.03);
  res = (res - 0.5) * 1.14 + 0.5;`;
    case 32:
      return `
  float bw = smoothstep(0.08, 0.92, luma);
  bw = (bw - 0.5) * 1.55 + 0.5;
  res = vec3(clamp(bw, 0.0, 1.0));`;
    case 33:
      return `
  float greenDom = max(0.0, res.g - max(res.r, res.b) * 0.7);
  res = mix(res, vec3(0.95, 0.18, 0.42) * (0.6 + luma * 0.7), clamp(greenDom * 3.5, 0.0, 1.0));
  res = (res - 0.5) * 1.18 + 0.5;`;
    case 34:
      return `
  vec3 black = vec3(0.04, 0.03, 0.02);
  vec3 gold = vec3(1.0, 0.80, 0.30);
  res = mix(black, gold, smoothstep(0.08, 0.92, luma));`;
    case 35:
      return `
  res = pow(clamp(res, 0.0, 1.0), vec3(0.90));
  res *= vec3(1.06, 1.01, 0.97);
  res = vec3(0.03) + res * 0.95;`;
    default:
      // Parametric Studio LUTs (36..85): single branch-free vector math path
      return `
  res = vec3(
    dot(res, u_lutMatR),
    dot(res, u_lutMatG),
    dot(res, u_lutMatB)
  );
  if (u_lutExtra.x > 0.0) {
    vec3 duo = mix(u_lutShadow.rgb, u_lutHigh.rgb, smoothstep(0.06, 0.94, luma));
    res = mix(res, duo, u_lutExtra.x);
  } else {
    float sMask = (1.0 - smoothstep(0.0, 0.55, luma)) * u_lutShadow.a;
    float hMask = smoothstep(0.45, 1.0, luma) * u_lutHigh.a;
    res = mix(res, res * 0.85 + u_lutShadow.rgb * 0.45, sMask);
    res = mix(res, res * 0.90 + u_lutHigh.rgb * 0.35, hMask);
  }
  float luma2 = dot(res, vec3(0.2126, 0.7152, 0.0722));
  res = mix(vec3(luma2), res, u_lutParams.y);
  if (u_lutExtra.y != 0.0) {
    float maxC = max(res.r, max(res.g, res.b));
    float minC = min(res.r, min(res.g, res.b));
    float vib = (1.0 - (maxC - minC)) * u_lutExtra.y;
    float luma3 = dot(res, vec3(0.2126, 0.7152, 0.0722));
    res = mix(vec3(luma3), res, 1.0 + vib);
  }
  res = pow(clamp(res, 0.0, 1.0), vec3(u_lutParams.z));
  res *= u_lutGain.rgb;
  res = (res - 0.5) * u_lutParams.x + 0.5;
  if (u_lutGain.a > 0.0) {
    res = mix(res, smoothstep(0.02, 0.98, clamp(res, 0.0, 1.0)), u_lutGain.a);
  }
  res = vec3(u_lutParams.w) + res * (1.0 - u_lutParams.w * 0.5);`;
  }
}

function getEffectPreUvGlsl(effectType: number): string {
  switch (effectType) {
    case 2:
      return `
  float shakeAmp = amt * 0.038;
  vec2 offset = vec2(
    sin(t * 28.0) * cos(t * 13.0) + sin(t * 53.0) * 0.4,
    cos(t * 31.0) * sin(t * 19.0) + cos(t * 47.0) * 0.4
  ) * shakeAmp;
  float safeZoom = 1.0 - amt * 0.12;
  uv = (uv - 0.5) * safeZoom + 0.5 + offset;`;
    case 11:
      return `
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x) + t * 0.6;
  float segments = 6.0 + floor(amt * 6.0);
  float tau = 2.0 * PI / segments;
  a = mod(a, tau);
  a = abs(a - tau * 0.5);
  vec2 kp = vec2(cos(a), sin(a)) * r / vec2(aspect, 1.0);
  uv = mix(uv, clamp(kp + 0.5, 0.0, 1.0), min(1.0, amt * 1.25));`;
    case 12:
      return `
  float cells = amt > 0.65 ? 3.0 : 2.0;
  vec2 cellUv = fract(uv * cells);
  float pulse = 1.0 - 0.08 * amt * abs(sin(t * 4.5));
  uv = (cellUv - 0.5) * pulse + 0.5;`;
    case 13:
      return `
  float blocks = mix(140.0, 18.0, pow(amt, 0.7));
  vec2 grid = vec2(blocks * aspect, blocks);
  uv = (floor(uv * grid) + 0.5) / grid;`;
    case 15:
      return `
  vec2 p = uv - 0.5;
  float r2 = dot(p, p);
  float k = amt * 1.65;
  uv = 0.5 + p * (1.0 + k * r2) / (1.0 + k * 0.22);`;
    case 17:
      return `
  vec2 p = uv - 0.5;
  float r2 = dot(p, p);
  uv = 0.5 + p * (1.0 + r2 * 0.35 * amt);`;
    case 19:
      return `
  float bSize = mix(24.0, 8.0, amt);
  vec2 bId = floor(uv * vec2(bSize * aspect, bSize));
  float trigger = step(0.55 - amt * 0.3, rand(bId + floor(t * 6.0)));
  vec2 shift = (hash2(bId + floor(t * 4.0)) - 0.5) * 0.14 * amt * trigger;
  uv = clamp(uv + shift, 0.0, 1.0);`;
    case 34:
      return `
  uv.x += sin(uv.y * 14.0 + t * 3.5) * 0.015 * amt;
  uv.y += cos(uv.x * 12.0 + t * 2.8) * 0.012 * amt;`;
    case 35:
      return `
  float shimmer = sin(uv.y * 38.0 + t * 14.0) * cos(uv.x * 18.0 - t * 6.0);
  uv.x += shimmer * 0.012 * amt * smoothstep(0.0, 0.8, uv.y);`;
    case 40:
      return `
  uv.x = mix(uv.x, abs(uv.x - 0.5) * 2.0, clamp(amt * 1.5, 0.0, 1.0));`;
    case 66:
      return `
  float waveMask = step(0.25, sin(uv.y * 6.0 - t * 7.0));
  uv.x = clamp(uv.x + sin(uv.y * 28.0 + t * 14.0) * 0.025 * amt * waveMask, 0.0, 1.0);`;
    case 67:
      return `
  float band = floor(uv.y * 16.0);
  float trig = step(0.65 - amt * 0.35, rand(vec2(band, floor(t * 10.0))));
  uv.x = fract(uv.x + trig * (rand(vec2(floor(t * 14.0), band)) - 0.5) * 0.25 * amt);`;
    case 69:
      return `
  float crease = exp(-pow((uv.y - fract(t * 0.4)) * 18.0, 2.0));
  uv.x = clamp(uv.x + (rand(vec2(uv.y, t)) - 0.5) * 0.07 * amt * crease, 0.0, 1.0);`;
    case 72:
      return `
  vec2 dp = uv - 0.5;
  float dist = length(dp * vec2(aspect, 1.0));
  float waveR = fract(t * 0.45) * 0.9;
  float ring = exp(-pow((dist - waveR) * 14.0, 2.0));
  uv = clamp(uv + normalize(dp + vec2(0.0001)) * ring * 0.035 * amt, 0.0, 1.0);`;
    case 85:
      return `
  float scale = mix(42.0, 14.0, amt);
  vec2 grid = vec2(scale * aspect, scale);
  vec2 mid = floor(uv * grid);
  vec2 mh = hash2(mid) * 0.6 + 0.2;
  uv = clamp((mid + mh) / grid, 0.0, 1.0);`;
    case 86:
      return `
  vec2 sp = uv - 0.5;
  float sr = length(sp);
  float sa = atan(sp.y, sp.x + 0.0001) + (1.0 - smoothstep(0.0, 0.58, sr)) * amt * 3.0 * (0.6 + 0.4 * sin(t * 1.2));
  uv = clamp(0.5 + vec2(cos(sa), sin(sa)) * sr, 0.0, 1.0);`;
    case 87:
      return `
  vec2 tp = uv - 0.5;
  float tr = max(0.001, length(tp));
  float tz = pow(tr, 1.0 - 0.35 * amt);
  uv = clamp(0.5 + tp * (tz / tr), 0.0, 1.0);`;
    case 88:
      return `
  uv = mix(uv, abs(uv - 0.5) * 2.0, clamp(amt * 1.4, 0.0, 1.0));`;
    default:
      return '';
  }
}

function getParametricFamilyGlsl(family: number): string {
  switch (family) {
    case 1:
      return `
  vec2 fUv = uv;
  float shapeMask = 1.0;
  vec2 noiseUv = vec2(uv.x * aspect, uv.y) * pScale;

  if (pMode < 0.5) {
    shapeMask = clamp(1.0 - uv.y * 1.15, 0.0, 1.0);
    noiseUv += vec2(sin(uv.y * 5.0 + t * 2.0) * 0.25, -t * 2.2);
  } else if (pMode < 1.5) {
    shapeMask = clamp(uv.y * 1.15, 0.0, 1.0);
    noiseUv += vec2(cos(uv.y * 4.5 - t * 2.0) * 0.25, t * 2.0);
  } else if (pMode < 2.5) {
    shapeMask = clamp(1.0 - uv.x * 1.1, 0.0, 1.0) * (1.0 - abs(uv.y - 0.5) * 1.4);
    noiseUv += vec2(-t * 3.0, sin(uv.x * 6.0 + t * 2.0) * 0.3);
  } else if (pMode < 3.5) {
    vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
    float r = length(d);
    float ang = atan(d.y, d.x);
    shapeMask = smoothstep(0.68, 0.12, r) * (0.65 + 0.35 * sin(ang * 5.0 + t * 2.5));
    noiseUv = vec2(cos(ang) * r, sin(ang) * r) * pScale - normalize(d + 0.001) * t * 1.8;
  } else if (pMode < 4.5) {
    float edgeX = min(uv.x, 1.0 - uv.x);
    float edgeY = min(uv.y, 1.0 - uv.y);
    shapeMask = smoothstep(0.32, 0.0, min(edgeX, edgeY));
    noiseUv += vec2(0.0, -t * 2.4);
  } else if (pMode < 5.5) {
    float diag = (uv.x * 0.7 + (1.0 - uv.y) * 0.7);
    shapeMask = smoothstep(0.95, 0.15, diag);
    noiseUv += vec2(-t * 2.4 * pAngle, t * 2.2);
  } else {
    vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
    float r = length(d);
    float ang = atan(d.y, d.x) + r * 4.5 * (pAngle >= 0.0 ? 1.0 : -1.0) - t * 2.5;
    shapeMask = smoothstep(0.75, 0.05, r);
    noiseUv = vec2(cos(ang), sin(ang)) * r * pScale + vec2(0.0, -t * 1.6);
  }

  float n1 = fbm(noiseUv);
  float n2 = fbm(noiseUv * 1.8 + vec2(3.1, -t * 1.7));
  float flick = 1.0 + pFlick * 0.35 * sin(t * 11.0 + uv.y * 6.0);
  float flame = smoothstep(1.0 - pDens, 1.0, (n1 * 0.65 + n2 * 0.45) * shapeMask * 1.65 * flick);

  vec2 heatUv = clamp(uv + vec2((n1 - 0.5), (n2 - 0.5)) * pDist * amt * (0.4 + flame), 0.0, 1.0);
  color = sampleCurr(heatUv);

  float spk = step(0.988 - 0.015 * pExtra, rand(floor(uv * 90.0 + vec2(0.0, floor(t * 14.0)))));
  vec3 fireCol = mix(colB, colA, smoothstep(0.2, 0.9, flame));
  color.rgb = clamp(color.rgb + fireCol * flame * pGlow * amt + colA * spk * shapeMask * amt * pExtra, 0.0, 1.0);`;

    case 2:
      return `
  vec3 lightAdd = vec3(0.0);
  float flick = 1.0 - pFlick * 0.4 * (0.5 + 0.5 * sin(t * 16.0));
  if (pMode < 0.5) {
    float dy = abs(uv.y - (0.5 + pAngle * 0.2));
    float streak = exp(-dy * 18.0 * pScale) * (0.6 + 0.4 * sin(uv.x * 3.14159));
    lightAdd = mix(colA, colB, streak) * streak;
  } else if (pMode < 1.5) {
    vec2 orig = vec2(pAngle > 0.5 ? 1.0 : 0.0, pAngle > 0.0 ? 0.0 : 1.0);
    float d = length((uv - orig) * vec2(aspect, 1.0));
    float leak = smoothstep(0.95 * pScale, 0.0, d);
    lightAdd = mix(colB, colA, leak) * leak;
  } else if (pMode < 2.5) {
    vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
    float r = length(d);
    float a = atan(d.y, d.x);
    float ring = exp(-pow((r - 0.28 * pScale) * 9.0, 2.0));
    float rays = pDist > 0.05 ? pow(abs(cos(a * 3.0 + t)), 6.0) * smoothstep(0.7, 0.0, r) : 0.0;
    float spot = smoothstep(0.65 * pScale, 0.0, r) * 0.45;
    lightAdd = mix(colB, colA, clamp(ring + rays, 0.0, 1.0)) * (ring + rays + spot);
  } else if (pMode < 3.5) {
    float pos = fract(t * 0.35 + pAngle);
    float beam = exp(-abs(uv.y - pos) * 35.0 * pScale);
    lightAdd = mix(colB, colA, beam) * beam * 1.3;
  } else if (pMode < 4.5) {
    float ex = min(uv.x, 1.0 - uv.x);
    float ey = min(uv.y, 1.0 - uv.y);
    float rim = smoothstep(0.18 * pScale, 0.0, min(ex, ey));
    lightAdd = mix(colB, colA, uv.x) * rim;
  } else {
    float wave = 0.5 + 0.5 * sin(t * 14.0 + uv.x * 3.0);
    lightAdd = mix(colA, colB, wave) * 0.65;
  }
  color.rgb = clamp(color.rgb + lightAdd * pGlow * flick * amt, 0.0, 1.0);`;

    case 3:
      return `
  vec3 pAcc = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i) + 1.0;
    vec2 vel = pMode < 0.5 ? vec2(pAngle * 0.35, -0.45 * fi)
             : pMode < 1.5 ? vec2(sin(t + fi) * 0.15, 0.45 * fi)
             : pMode < 2.5 ? vec2(pAngle * 0.6, -1.1 * fi)
             : vec2(sin(t * 0.7 + fi) * 0.12, cos(t * 0.5 + fi) * 0.12);
    vec2 gridUv = uv * vec2(aspect, 1.0) * (pScale * (0.7 + 0.45 * fi)) - vel * t;
    vec2 id = floor(gridUv);
    vec2 f = fract(gridUv) - 0.5;
    vec2 h = hash2(id + fi * 13.7);
    vec2 pos = (h - 0.5) * 0.6;
    float dist = pMode > 1.5 && pMode < 2.5
      ? length(vec2((f.x - pos.x) * 2.5, (f.y - pos.y) * 0.35))
      : length(f - pos);
    float sz = mix(0.05, 0.18, h.x) * (1.0 + pDist);
    float dotMask = smoothstep(sz, sz * 0.2, dist) * step(1.0 - pDens, h.y);
    float tw = 0.65 + 0.35 * sin(t * 5.0 * pFlick + h.x * 20.0);
    pAcc += mix(colB, colA, h.x) * dotMask * tw;
  }
  color.rgb = clamp(color.rgb + pAcc * pGlow * amt, 0.0, 1.0);`;

    case 4:
      return `
  float flick = step(1.0 - pFlick * 0.45, rand(vec2(floor(t * 14.0), 3.1)));
  float band = step(0.68, rand(vec2(floor(uv.y * pScale), floor(t * 12.0))));
  vec2 gUv = uv;
  if (pMode < 0.5 || pMode >= 3.5) {
    gUv.x = fract(uv.x + band * pDist * amt * (rand(vec2(floor(t * 15.0), 1.0)) - 0.5) * 2.0);
  } else if (pMode < 1.5) {
    gUv.x = fract(uv.x + sin(uv.y * pScale + t * 12.0) * pDist * 0.4 * amt);
  }
  if (pMode >= 3.5) {
    float res = max(8.0, pScale);
    gUv = mix(gUv, floor(gUv * res) / res, amt * 0.7);
  }
  float split = pDist * 0.5 * amt * (0.4 + flick);
  float r = sampleCurr(clamp(gUv + vec2(split, 0.0), 0.0, 1.0)).r;
  float g = sampleCurr(clamp(gUv, 0.0, 1.0)).g;
  float b = sampleCurr(clamp(gUv - vec2(split, 0.0), 0.0, 1.0)).b;
  vec3 gCol = vec3(r, g, b);
  if (pMode >= 1.5 && pMode < 3.5) {
    float scan = 0.82 + 0.18 * sin(uv.y * pScale * 4.0 + t * 6.0);
    gCol *= scan;
    if (pMode >= 2.5) {
      float code = step(0.75, rand(floor(uv * vec2(pScale, pScale * 0.5) + vec2(0.0, floor(t * 8.0)))));
      gCol += colA * code * 0.45 * amt;
    }
  }
  color.rgb = mix(color.rgb, gCol + colB * band * flick * 0.25, amt);`;

    case 5:
      return `
  vec2 d = uv - 0.5;
  float r = length(d);
  vec2 oUv = uv;
  if (pMode < 0.5) {
    vec3 acc = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
      float s = float(i) * pDist * amt;
      vec2 sUv = pAngle > 0.5
        ? 0.5 + vec2(d.x * cos(s) - d.y * sin(s), d.x * sin(s) + d.y * cos(s))
        : 0.5 + d * (1.0 - s);
      acc += sampleCurr(clamp(sUv, 0.0, 1.0)).rgb;
    }
    color.rgb = mix(color.rgb, acc / 3.0, amt);
  } else if (pMode < 1.5) {
    vec2 off = vec2(pDist * amt, pDist * 0.5 * amt * pAngle);
    color.r = sampleCurr(clamp(uv + off, 0.0, 1.0)).r;
    color.b = sampleCurr(clamp(uv - off, 0.0, 1.0)).b;
  } else if (pMode < 2.5) {
    oUv = clamp(0.5 + d * (1.0 + r * r * pDist * amt * 2.0), 0.0, 1.0);
    color = sampleCurr(oUv);
  } else if (pMode < 3.5) {
    float w = sin(r * pScale - t * 6.0) * pDist * amt;
    oUv = clamp(uv + normalize(d + 0.0001) * w, 0.0, 1.0);
    color = sampleCurr(oUv);
  } else {
    float ang = atan(d.y, d.x) + r * pAngle * 2.0 * amt;
    float seg = 2.0 * PI / max(2.0, pScale);
    ang = abs(mod(ang, seg) - seg * 0.5);
    oUv = clamp(0.5 + vec2(cos(ang), sin(ang)) * r, 0.0, 1.0);
    color = sampleCurr(oUv);
  }
  if (pGlow > 0.05) {
    color.rgb = clamp(color.rgb + colA * pGlow * 0.18 * amt, 0.0, 1.0);
  }`;

    case 6:
      return `
  vec3 artCol = color.rgb;
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  if (pMode < 0.5) {
    vec2 cell = fract(uv * vec2(pScale * aspect, pScale)) - 0.5;
    float dotMask = step(length(cell), (1.0 - luma) * 0.55);
    artCol = mix(color.rgb * 1.1, colB, dotMask * 0.75);
  } else if (pMode < 1.5) {
    float levels = max(2.0, pScale);
    artCol = floor(color.rgb * levels + 0.5) / levels;
  } else if (pMode < 2.5) {
    vec2 px = pScale / max(u_textureSize, vec2(512.0));
    float l1 = dot(sampleCurr(clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb, vec3(0.333));
    float l2 = dot(sampleCurr(clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb, vec3(0.333));
    float edge = clamp((abs(luma - l1) + abs(luma - l2)) * 10.0, 0.0, 1.0);
    artCol = pAngle > 0.5 ? mix(colB, colA, edge) : mix(colA, colB, edge);
  } else if (pMode < 3.5) {
    artCol = mix(colB, colA, smoothstep(0.15, 0.85, luma));
  } else {
    vec2 gf = fract(uv * vec2(pScale * aspect, pScale));
    float border = smoothstep(0.08, 0.0, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y)));
    vec2 cUv = (floor(uv * vec2(pScale * aspect, pScale)) + 0.5) / vec2(pScale * aspect, pScale);
    artCol = mix(sampleCurr(clamp(cUv, 0.0, 1.0)).rgb, colB, border * 0.7);
  }
  color.rgb = mix(color.rgb, artCol, amt);`;

    default:
      return `
  if (pMode < 0.5) {
    float gr = (rand(uv * 180.0 + vec2(t * 23.0, t * 17.0)) - 0.5) * pDist * 0.6;
    float flick = 1.0 - pFlick * 0.18 * rand(vec2(floor(t * 16.0), 2.0));
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 tinted = mix(color.rgb, mix(colB, colA, luma), 0.55);
    color.rgb = mix(color.rgb, clamp(tinted * flick + gr, 0.0, 1.0), amt);
  } else if (pMode < 1.5) {
    float d = length((uv - 0.5) * vec2(aspect, 1.0));
    float vig = smoothstep(0.95, 0.25, d);
    vec3 res = mix(colB + colA * pDist * (1.0 - vig), color.rgb * (0.4 + 0.6 * vig), vig);
    color.rgb = mix(color.rgb, res, amt);
  } else if (pMode < 2.5) {
    float bar = step(0.11 * amt, uv.y) * step(uv.y, 1.0 - 0.11 * amt);
    color.rgb = mix(colB, color.rgb * mix(vec3(1.0), colA, 0.2 * amt), bar);
  } else {
    float fog = fbm(uv * pScale + vec2(t * 0.25, 0.0));
    color.rgb = mix(color.rgb, mix(colB, colA, fog), (0.35 + 0.45 * fog) * amt);
  }`;
  }
}

function getEffectPostGlsl(effectType: number, fxFamily: number): string {
  switch (effectType) {
    case 1:
      return `
  float band1 = floor(uv.y * 22.0);
  float band2 = floor(uv.y * 7.0);
  float trigger = step(0.45 - amt * 0.35, rand(vec2(floor(t * 14.0), band2)));
  float sliceShift = (rand(vec2(band1, floor(t * 20.0))) - 0.5) * 0.14 * amt * trigger;
  vec2 gUv = clamp(uv + vec2(sliceShift, 0.0), 0.0, 1.0);
  float rgbSplit = (0.008 + 0.028 * trigger) * amt;
  float r = sampleCurr(clamp(gUv + vec2(rgbSplit, 0.003 * trigger), 0.0, 1.0)).r;
  float g = sampleCurr(gUv).g;
  float b = sampleCurr(clamp(gUv - vec2(rgbSplit, 0.003 * trigger), 0.0, 1.0)).b;
  float a = sampleCurr(gUv).a;
  vec3 res = vec3(r, g, b);
  float scan = 0.94 + 0.06 * sin(uv.y * 420.0 + t * 30.0);
  res *= scan;
  if (trigger > 0.5 && rand(vec2(band1, floor(t * 28.0))) > 0.88) {
    res = vec3(res.b, res.r, res.g) * 1.15;
  }
  color = vec4(res, a);`;
    case 2:
      return `
  float split = amt * 0.012 * abs(sin(t * 25.0));
  color.r = sampleCurr(clamp(uv + vec2(split, 0.0), 0.0, 1.0)).r;
  color.b = sampleCurr(clamp(uv - vec2(split, 0.0), 0.0, 1.0)).b;`;
    case 3:
      return `
  vec2 dir = uv - 0.5;
  float dist = length(dir);
  float shift = amt * (0.012 + dist * 0.045) * (0.85 + 0.15 * sin(t * 4.0));
  vec2 off = normalize(dir + vec2(0.0001)) * shift;
  float r = sampleCurr(clamp(uv + off, 0.0, 1.0)).r;
  float g = color.g;
  float b = sampleCurr(clamp(uv - off, 0.0, 1.0)).b;
  color.rgb = vec3(r, g, b);`;
    case 4:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float grainWeight = 1.0 - pow(abs(luma - 0.5) * 1.8, 2.0);
  float gNoise = (rand(uv * vec2(320.0, 480.0) + vec2(fract(t * 1.37), fract(t * 2.19))) - 0.5);
  color.rgb += gNoise * amt * 0.32 * max(0.35, grainWeight);
  float scratchX = fract(sin(floor(t * 9.0) * 43.17) * 197.3);
  float scratch = smoothstep(0.0025, 0.0, abs(uv.x - scratchX)) * step(0.45, rand(vec2(floor(t * 9.0), uv.y)));
  color.rgb += vec3(0.35, 0.32, 0.25) * scratch * amt;`;
    case 5:
      return `
  vec2 px = (1.5 + amt * 2.0) / max(u_textureSize, vec2(512.0));
  vec3 tl = sampleCurr(clamp(uv + vec2(-px.x, -px.y), 0.0, 1.0)).rgb;
  vec3 tm = sampleCurr(clamp(uv + vec2(0.0, -px.y), 0.0, 1.0)).rgb;
  vec3 tr = sampleCurr(clamp(uv + vec2(px.x, -px.y), 0.0, 1.0)).rgb;
  vec3 ml = sampleCurr(clamp(uv + vec2(-px.x, 0.0), 0.0, 1.0)).rgb;
  vec3 mr = sampleCurr(clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb;
  vec3 bl = sampleCurr(clamp(uv + vec2(-px.x, px.y), 0.0, 1.0)).rgb;
  vec3 bm = sampleCurr(clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb;
  vec3 br = sampleCurr(clamp(uv + vec2(px.x, px.y), 0.0, 1.0)).rgb;
  vec3 gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  vec3 gy = -tl - 2.0 * tm - tr + bl + 2.0 * bm + br;
  float edge = smoothstep(0.15, 1.2, length(gx) + length(gy));
  vec3 neonCol = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.1, 0.85), 0.5 + 0.5 * sin(uv.y * 5.0 - t * 3.5 + uv.x * 3.0));
  vec3 bloom = (tl + tr + bl + br) * 0.25;
  vec3 baseDark = mix(color.rgb, color.rgb * 0.65 + bloom * 0.45, amt * 0.6);
  color.rgb = baseDark + neonCol * edge * (1.2 + amt * 1.4);`;
    case 6:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  float wind = 0.14;
  mat2 rot = mat2(cos(wind), -sin(wind), sin(wind), cos(wind));
  vec2 rp = rot * p;
  float rainAcc = 0.0;
  vec2 refractOff = vec2(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scaleX = 22.0 + fi * 14.0;
    float scaleY = 2.4 + fi * 1.1;
    float fallSpeed = (3.8 + fi * 1.4);
    vec2 st = rp * vec2(scaleX, scaleY) + vec2(fi * 13.7, -t * fallSpeed);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 71.3);
    float activeDrop = step(0.45, h.x);
    float xPos = (h.y - 0.5) * 0.55;
    float dx = (f.x - xPos) * 14.0;
    float dy = f.y * 2.2;
    float d = sqrt(dx * dx + dy * dy);
    float streak = smoothstep(0.45, 0.02, d) * smoothstep(-0.48, 0.35, f.y) * activeDrop;
    rainAcc += streak * (0.45 + 0.2 * fi);
    refractOff += vec2(dx, dy) * streak * 0.003;
  }
  vec4 refracted = sampleCurr(clamp(uv + refractOff * amt, 0.0, 1.0));
  vec3 rainyRgb = mix(refracted.rgb, refracted.rgb * vec3(0.88, 0.95, 1.08), amt * 0.35);
  rainyRgb += vec3(0.72, 0.86, 1.0) * clamp(rainAcc, 0.0, 1.2) * amt * 0.75;
  color = vec4(rainyRgb, refracted.a);`;
    case 7:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 emberGlow = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float density = 7.0 + fi * 5.0;
    float riseSpeed = (0.85 + fi * 0.55);
    vec2 st = p * density + vec2(sin(t * 0.8 + fi) * 0.4, t * riseSpeed + fi * 19.3);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 37.0);
    vec2 center = (h - 0.5) * 0.52;
    center.x += sin(t * 3.0 + h.x * 6.28) * 0.08;
    float d = length(f - center);
    float size = (0.045 + 0.065 * h.y) * (0.7 + 0.3 * sin(t * 6.0 + h.x * 12.0));
    float core = smoothstep(size, size * 0.1, d);
    float halo = smoothstep(size * 3.2, 0.0, d) * 0.45;
    vec3 pCol = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.85, 0.35), h.x);
    float activeMask = step(0.32, h.y);
    emberGlow += (pCol * halo + vec3(1.0, 0.95, 0.8) * core) * activeMask;
  }
  float bottomWarmth = smoothstep(0.2, 1.0, uv.y) * amt * 0.18;
  color.rgb += vec3(1.0, 0.4, 0.08) * bottomWarmth;
  color.rgb += emberGlow * amt * 1.15;`;
    case 8:
      return `
  float tapeWave = sin(uv.y * 12.0 + t * 6.0) * 0.0025 * amt;
  float barPos = fract(t * 0.25);
  float barDist = abs(uv.y - barPos);
  float trackingBar = smoothstep(0.06, 0.0, barDist) * amt;
  float barJitter = (rand(vec2(uv.y, t)) - 0.5) * 0.06 * trackingBar;
  vec2 vUv = clamp(vec2(uv.x + tapeWave + barJitter, uv.y), 0.0, 1.0);
  float bleed = (0.006 + 0.012 * amt);
  float r = sampleCurr(clamp(vUv + vec2(bleed, 0.0), 0.0, 1.0)).r;
  float g = sampleCurr(vUv).g;
  float b = sampleCurr(clamp(vUv - vec2(bleed * 1.4, 0.0), 0.0, 1.0)).b;
  vec3 vhs = vec3(r, g, b);
  float scanline = 0.90 + 0.10 * cos(uv.y * 520.0);
  vhs *= scanline;
  vhs += vec3(rand(uv + t) * 0.35) * trackingBar;
  vhs = mix(vhs, vec3(0.08, 0.06, 0.09) + vhs * 0.86, amt * 0.6);
  color.rgb = vhs;`;
    case 9:
      return `
  vec2 rad = (3.5 + amt * 5.0) / max(u_textureSize, vec2(512.0));
  vec3 bloom = (
    sampleCurr(clamp(uv + vec2(-rad.x, -rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(rad.x, -rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(-rad.x, rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(rad.x, rad.y), 0.0, 1.0)).rgb
  ) * 0.25;
  float bLuma = dot(bloom, vec3(0.299, 0.587, 0.114));
  vec3 softGlow = bloom * smoothstep(0.25, 0.95, bLuma);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - softGlow * amt * 0.95);`;
    case 10:
      return `
  vec2 p = uv - 0.5;
  float w1 = sin(p.x * 3.5 + t * 1.6) * cos(p.y * 2.8 - t * 1.2);
  float w2 = cos(p.x * 2.2 - t * 1.1 + p.y * 3.0);
  float leak1 = pow(clamp(0.5 + 0.5 * w1, 0.0, 1.0), 2.6);
  float leak2 = pow(clamp(0.5 + 0.5 * w2, 0.0, 1.0), 3.2);
  vec3 leakCol = vec3(1.0, 0.42, 0.12) * leak1 + vec3(0.95, 0.18, 0.55) * leak2 * 0.7;
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - clamp(leakCol * amt * 0.85, 0.0, 1.0));`;
    case 12:
      return `
  float cells = amt > 0.65 ? 3.0 : 2.0;
  vec2 f = fract(baseUv * cells);
  float border = smoothstep(0.025, 0.0, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  color.rgb = mix(color.rgb, vec3(0.45, 0.55, 1.0), border * 0.65);`;
    case 14:
      return `
  vec2 px = 1.5 / max(u_textureSize, vec2(512.0));
  vec3 rSample = sampleCurr(clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb;
  vec3 bSample = sampleCurr(clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb;
  float edge = length(color.rgb - rSample) + length(color.rgb - bSample);
  float ink = smoothstep(0.18, 0.42, edge * 2.8);
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec2 dotUv = uv * vec2(aspect, 1.0) * mix(110.0, 55.0, amt);
  mat2 rot45 = mat2(0.707, -0.707, 0.707, 0.707);
  vec2 cell = fract(rot45 * dotUv) - 0.5;
  float dotDist = length(cell);
  float radius = sqrt(1.0 - luma) * 0.62;
  float dots = smoothstep(radius - 0.08, radius + 0.08, dotDist);
  vec3 poster = floor(color.rgb * 5.0 + 0.5) / 5.0 * 1.12;
  vec3 comic = poster * mix(0.65, 1.05, dots) * (1.0 - ink * 0.85);
  color.rgb = mix(color.rgb, comic, amt);`;
    case 16:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 c0 = vec3(0.05, 0.02, 0.25);
  vec3 c1 = vec3(0.55, 0.05, 0.65);
  vec3 c2 = vec3(0.95, 0.20, 0.10);
  vec3 c3 = vec3(1.00, 0.95, 0.25);
  vec3 heat = mix(c0, c1, smoothstep(0.0, 0.35, luma));
  heat = mix(heat, c2, smoothstep(0.35, 0.70, luma));
  heat = mix(heat, c3, smoothstep(0.70, 1.0, luma));
  float scan = 0.92 + 0.08 * sin(uv.y * 400.0 + t * 15.0);
  color.rgb = mix(color.rgb, heat * scan, amt);`;
    case 17:
      return `
  float scan = 0.86 + 0.14 * sin(uv.y * 480.0);
  float grille = 0.92 + 0.08 * sin(uv.x * 640.0);
  float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.1 * amt;
  color.rgb = mix(color.rgb, color.rgb * scan * grille * vig, amt);`;
    case 18:
      return `
  float pulse = pow(abs(sin(t * 5.0)), 2.0) * 0.032 * amt;
  float r = sampleCurr(clamp(uv + vec2(pulse, 0.0), 0.0, 1.0)).r;
  float b = sampleCurr(clamp(uv - vec2(pulse, 0.0), 0.0, 1.0)).b;
  color.rgb = vec3(r, color.g, b);`;
    case 20:
      return `
  float pulse = step(0.65 - amt * 0.25, abs(sin(t * 6.0)));
  color.rgb = mix(color.rgb, 1.0 - color.rgb, pulse * amt);`;
    case 21:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float gn = (rand(uv * 350.0 + fract(t)) - 0.5) * 0.22;
  float vig = smoothstep(0.85, 0.25, length(uv - 0.5));
  vec3 nv = vec3(0.1, 1.0, 0.25) * clamp(luma * 1.45 + gn, 0.0, 1.0) * (0.45 + 0.55 * vig);
  color.rgb = mix(color.rgb, nv, amt);`;
    case 22:
      return `
  vec2 px = 1.4 / max(u_textureSize, vec2(512.0));
  float l0 = dot(color.rgb, vec3(0.3, 0.59, 0.11));
  float lx = dot(sampleCurr(clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb, vec3(0.3, 0.59, 0.11));
  float ly = dot(sampleCurr(clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb, vec3(0.3, 0.59, 0.11));
  float edge = clamp((abs(l0 - lx) + abs(l0 - ly)) * 5.5, 0.0, 1.0);
  vec3 sketch = mix(vec3(0.95, 0.93, 0.88), vec3(0.12, 0.12, 0.15), edge);
  color.rgb = mix(color.rgb, sketch, amt);`;
    case 23:
      return `
  vec3 spec = 0.5 + 0.5 * cos(t * 2.5 + uv.xyx * 5.0 + vec3(0.0, 2.0, 4.0));
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - spec * amt * 0.45);`;
    case 24:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 duo = mix(vec3(0.05, 0.02, 0.25), vec3(0.0, 0.95, 1.0), smoothstep(0.15, 0.55, luma));
  duo = mix(duo, vec3(1.0, 0.15, 0.75), smoothstep(0.55, 0.95, luma));
  color.rgb = mix(color.rgb, duo, amt);`;
    case 25:
      return `
  float wave = sin(uv.x * 4.0 + t * 1.5) * cos(uv.y * 3.0 - t * 1.1);
  vec3 aurora = mix(vec3(0.1, 0.95, 0.55), vec3(0.45, 0.25, 0.95), 0.5 + 0.5 * wave);
  float mask = smoothstep(0.85, 0.0, uv.y) * (0.4 + 0.6 * abs(wave));
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - aurora * mask * amt * 0.65);`;
    case 26:
      return `
  float beat = pow(max(0.0, sin(t * 14.0)), 6.0);
  color.rgb = mix(color.rgb, color.rgb * (1.0 + beat * 2.2) + vec3(beat * 0.45), amt);`;
    case 27:
      return `
  vec2 fPos = vec2(0.5 + 0.3 * sin(t * 0.6), 0.25);
  float d = length((uv - fPos) * vec2(aspect, 1.0));
  float core = exp(-d * 6.0);
  float streak = exp(-abs(uv.y - fPos.y) * 28.0) * exp(-abs(uv.x - fPos.x) * 2.5);
  vec3 flare = vec3(1.0, 0.75, 0.35) * core + vec3(1.0, 0.55, 0.2) * streak * 0.8;
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - flare * amt);`;
    case 28:
      return `
  float luma = 1.0 - dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 xr = vec3(0.15, 0.75, 1.0) * pow(luma, 1.25);
  color.rgb = mix(color.rgb, xr, amt);`;
    case 29:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  float snowAcc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (9.0 + fi * 6.0) + vec2(sin(t * 0.7 + fi) * 0.6, -t * (0.9 + fi * 0.45));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 41.0);
    float d = length(f - (h - 0.5) * 0.5);
    float flake = smoothstep(0.14 - fi * 0.02, 0.02, d) * step(0.45, h.x);
    snowAcc += flake;
  }
  color.rgb += vec3(0.95, 0.98, 1.0) * clamp(snowAcc, 0.0, 1.2) * amt;`;
    case 30:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 confAcc = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (8.0 + fi * 4.5) + vec2(sin(t * 1.5 + fi) * 0.4, -t * (1.3 + fi * 0.5));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 53.0);
    vec2 pos = f - (h - 0.5) * 0.5;
    float rot = t * 4.0 + h.x * 6.28;
    vec2 rp = vec2(pos.x * cos(rot) - pos.y * sin(rot), pos.x * sin(rot) + pos.y * cos(rot));
    float rect = step(abs(rp.x), 0.11) * step(abs(rp.y), 0.055) * step(0.55, h.y);
    vec3 cCol = 0.5 + 0.5 * cos(h.x * 6.28 + vec3(0.0, 2.1, 4.2));
    confAcc += cCol * rect;
  }
  color.rgb += confAcc * amt;`;
    case 31:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 bokeh = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (3.5 + fi * 2.0) + vec2(t * 0.15 * (fi + 1.0), sin(t * 0.4 + fi) * 0.3);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 29.0);
    float d = length(f - (h - 0.5) * 0.45);
    float rad = 0.18 + 0.12 * h.y;
    float orb = smoothstep(rad, rad * 0.65, d) * step(0.58, h.x);
    vec3 oCol = mix(vec3(1.0, 0.75, 0.3), vec3(0.4, 0.85, 1.0), h.y);
    bokeh += oCol * orb * 0.45;
  }
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - bokeh * amt);`;
    case 32:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  float stars = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 st = p * (14.0 + fi * 10.0) + vec2(t * 0.08 * (fi + 1.0), 0.0);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 91.0);
    float d = length(f - (h - 0.5) * 0.6);
    float twinkle = 0.5 + 0.5 * sin(t * 6.0 + h.x * 20.0);
    stars += smoothstep(0.08, 0.005, d) * twinkle * step(0.62, h.y);
  }
  color.rgb += vec3(0.9, 0.95, 1.0) * stars * amt;`;
    case 33:
      return `
  float cols = 38.0;
  float colId = floor(uv.x * cols);
  float speed = 0.8 + rand(vec2(colId, 1.0)) * 1.4;
  float yPos = fract(uv.y + t * speed + rand(vec2(colId, 2.0)));
  float streak = pow(1.0 - yPos, 4.0);
  float charCell = step(0.35, rand(vec2(colId, floor((uv.y + t * speed) * 28.0))));
  vec3 mCol = vec3(0.1, 1.0, 0.35) * streak * charCell;
  color.rgb = mix(color.rgb, color.rgb * vec3(0.4, 0.85, 0.45) + mCol * 1.2, amt * 0.85);`;
    case 34:
      return `
  float caustic = sin(uv.x * 16.0 + t * 2.5) * sin(uv.y * 16.0 - t * 2.0);
  vec3 water = color.rgb * vec3(0.75, 0.96, 1.12) + vec3(0.1, 0.3, 0.35) * max(0.0, caustic) * 0.4;
  color.rgb = mix(color.rgb, water, amt);`;
    case 36:
      return `
  vec2 p = uv - 0.5;
  float a = atan(p.y, p.x + 0.0001);
  float r = length(p);
  float line = pow(abs(sin(a * 42.0 + floor(t * 18.0) * 1.7)), 14.0);
  float mask = smoothstep(0.22, 0.65, r);
  color.rgb += vec3(1.0) * line * mask * amt * 0.85;`;
    case 37:
      return `
  float barH = 0.12 * amt;
  float barMask = step(barH, uv.y) * step(uv.y, 1.0 - barH);
  color.rgb *= barMask;`;
    case 38:
      return `
  float blurBand = smoothstep(0.15, 0.45, abs(uv.y - 0.5));
  vec2 rad = (blurBand * 6.0 * amt) / max(u_textureSize, vec2(512.0));
  vec3 b = (
    sampleCurr(clamp(uv + vec2(-rad.x, -rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(rad.x, -rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(-rad.x, rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(rad.x, rad.y), 0.0, 1.0)).rgb
  ) * 0.25;
  float luma = dot(b, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(luma), b, 1.0 + 0.35 * amt);`;
    case 39:
      return `
  vec2 dir = (uv - 0.5) * 0.035 * amt;
  vec3 acc = color.rgb * 0.4;
  acc += sampleCurr(clamp(uv - dir * 0.5, 0.0, 1.0)).rgb * 0.3;
  acc += sampleCurr(clamp(uv - dir, 0.0, 1.0)).rgb * 0.3;
  color.rgb = acc;`;
    case 41:
      return `
  vec2 fp = vec2(uv.x * aspect * 4.5, (1.0 - uv.y) * 3.5 - t * 2.2);
  float n = fbm(fp + vec2(sin(t * 1.4) * 0.4, 0.0));
  float flameShape = smoothstep(0.25, 0.95, uv.y) * smoothstep(0.22, 0.78, n + (uv.y - 0.35) * 0.75);
  vec3 fireCol = mix(vec3(0.9, 0.12, 0.02), vec3(1.0, 0.65, 0.08), smoothstep(0.2, 0.65, flameShape));
  fireCol = mix(fireCol, vec3(1.0, 0.95, 0.65), smoothstep(0.68, 0.98, flameShape));
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - fireCol * flameShape * amt * 1.15);`;
    case 42:
      return `
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float r = length(p);
  float ang = atan(p.y, p.x + 0.0001);
  float n = fbm(vec2(ang * 3.0 + t * 1.5, r * 8.0 - t * 2.5));
  float ring = exp(-pow((r - 0.36 + (n - 0.5) * 0.14) * 11.0, 2.0));
  vec3 fCol = mix(vec3(1.0, 0.2, 0.02), vec3(1.0, 0.85, 0.25), ring);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - fCol * ring * amt * 1.2);`;
    case 43:
      return `
  float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float n = fbm(uv * vec2(6.0 * aspect, 6.0) + vec2(0.0, t * 2.0));
  float burn = smoothstep(0.32, 0.0, edgeDist - (n - 0.5) * 0.18);
  vec3 hCol = mix(vec3(0.85, 0.1, 0.02), vec3(1.0, 0.55, 0.05), burn * n);
  color.rgb = mix(color.rgb, color.rgb * vec3(1.15, 0.78, 0.65), amt * 0.45);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - hCol * burn * amt * 1.1);`;
    case 44:
      return `
  vec2 sunPos = vec2(0.82, 0.14);
  float d = length((uv - sunPos) * vec2(aspect, 1.0));
  float rays = 0.5 + 0.5 * sin(atan(uv.y - sunPos.y, uv.x - sunPos.x + 0.0001) * 10.0 + t * 0.8);
  float glow = exp(-d * 2.2) * (0.75 + 0.25 * rays);
  vec3 dayCol = color.rgb * vec3(1.08, 1.04, 0.94) * (1.0 + 0.14 * amt);
  dayCol += vec3(1.0, 0.92, 0.68) * glow * amt * 0.55;
  color.rgb = mix(color.rgb, dayCol, amt);`;
    case 45:
      return `
  float grad = smoothstep(1.0, 0.0, uv.y * 0.7 + uv.x * 0.3);
  vec3 warm = color.rgb * vec3(1.16, 0.95, 0.74) + vec3(0.22, 0.10, 0.02) * grad;
  color.rgb = mix(color.rgb, clamp(warm, 0.0, 1.0), amt * 0.85);`;
    case 46:
      return `
  vec3 twilight = color.rgb * vec3(0.68, 0.80, 1.18) + vec3(0.04, 0.06, 0.18) * (1.0 - uv.y);
  color.rgb = mix(color.rgb, clamp(twilight, 0.0, 1.0), amt * 0.85);`;
    case 47:
      return `
  vec3 night = color.rgb * vec3(0.42, 0.50, 0.82);
  vec2 p = uv * vec2(aspect, 1.0) * 18.0;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 h = hash2(id + 13.7);
  float twinkle = 0.5 + 0.5 * sin(t * 4.5 + h.x * 25.0);
  float star = smoothstep(0.11, 0.01, length(f - (h - 0.5) * 0.5)) * step(0.68, h.y) * twinkle;
  night += vec3(0.9, 0.95, 1.0) * star * smoothstep(0.85, 0.0, uv.y) * 1.1;
  color.rgb = mix(color.rgb, night, amt);`;
    case 48:
      return `
  vec2 mPos = vec2(0.22, 0.20);
  float d = length((uv - mPos) * vec2(aspect, 1.0));
  float halo = exp(-d * 3.5) * 0.55 + smoothstep(0.075, 0.055, d) * 0.85;
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 silver = mix(color.rgb, vec3(luma), 0.45) * vec3(0.58, 0.72, 1.05);
  silver += vec3(0.75, 0.85, 1.0) * halo * 0.65;
  color.rgb = mix(color.rgb, silver, amt);`;
    case 49:
      return `
  float flash = pow(max(0.0, sin(t * 3.7) * sin(t * 11.3)), 8.0);
  float boltX = 0.5 + (fbm(vec2(uv.y * 8.0, floor(t * 5.0))) - 0.5) * 0.35;
  float bolt = exp(-abs(uv.x - boltX) * 65.0) * flash;
  vec3 storm = color.rgb * vec3(0.62, 0.68, 0.82);
  storm += vec3(0.8, 0.9, 1.0) * (flash * 0.55 + bolt * 1.4);
  color.rgb = mix(color.rgb, storm, amt);`;
    case 50:
      return `
  float f1 = fbm(uv * vec2(2.8 * aspect, 2.2) + vec2(t * 0.25, t * 0.08));
  float f2 = fbm(uv * vec2(4.2 * aspect, 3.5) - vec2(t * 0.18, -t * 0.05));
  float mist = smoothstep(0.32, 0.85, (f1 + f2) * 0.55);
  color.rgb = mix(color.rgb, vec3(0.84, 0.88, 0.94), mist * amt * 0.68);`;
    case 51:
      return `
  float dust = fbm(uv * vec2(3.5 * aspect, 5.0) + vec2(-t * 1.6, t * 0.2));
  vec3 sand = mix(color.rgb * vec3(1.1, 0.95, 0.75), vec3(0.82, 0.64, 0.38), dust * 0.65);
  color.rgb = mix(color.rgb, sand, amt * 0.8);`;
    case 52:
      return `
  vec3 topCol = vec3(0.55, 0.18, 0.62);
  vec3 midCol = vec3(0.98, 0.42, 0.22);
  vec3 botCol = vec3(1.00, 0.78, 0.28);
  vec3 sky = mix(topCol, midCol, smoothstep(0.0, 0.55, uv.y));
  sky = mix(sky, botCol, smoothstep(0.55, 1.0, uv.y));
  color.rgb = mix(color.rgb, 1.0 - (1.0 - color.rgb) * (1.0 - sky * 0.55), amt);`;
    case 53:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 bugs = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 st = p * (5.5 + fi * 3.5) + vec2(sin(t * 0.5 + fi) * 0.5, cos(t * 0.4 + fi) * 0.4);
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 43.0);
    vec2 pos = (h - 0.5) * 0.55 + vec2(sin(t * 1.8 + h.x * 6.28), cos(t * 1.5 + h.y * 6.28)) * 0.12;
    float d = length(f - pos);
    float pulse = 0.4 + 0.6 * sin(t * 3.5 + h.x * 15.0);
    float glow = exp(-d * 14.0) * pulse * step(0.52, h.x);
    bugs += vec3(0.75, 1.0, 0.25) * glow;
  }
  color.rgb = mix(color.rgb, color.rgb * 0.78, amt * 0.45) + bugs * amt * 1.2;`;
    case 54:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 petals = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (7.0 + fi * 4.0) + vec2(-t * (0.45 + fi * 0.2), -t * (0.7 + fi * 0.3));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 67.0);
    vec2 pos = f - (h - 0.5) * 0.45;
    float a = t * 2.5 + h.x * 6.28;
    vec2 rp = vec2(pos.x * cos(a) - pos.y * sin(a), pos.x * sin(a) + pos.y * cos(a));
    float d = length(rp * vec2(1.0, 1.8));
    float petal = smoothstep(0.14, 0.05, d) * step(0.55, h.y);
    petals += mix(vec3(1.0, 0.72, 0.82), vec3(1.0, 0.88, 0.92), h.x) * petal;
  }
  color.rgb += petals * amt * 0.9;`;
    case 55:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 leaves = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 st = p * (6.0 + fi * 3.5) + vec2(sin(t + fi) * 0.4, -t * (0.65 + fi * 0.3));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 83.0);
    vec2 pos = f - (h - 0.5) * 0.45;
    float a = t * 2.0 + h.y * 6.28;
    vec2 rp = vec2(pos.x * cos(a) - pos.y * sin(a), pos.x * sin(a) + pos.y * cos(a));
    float leaf = smoothstep(0.16, 0.06, length(rp * vec2(1.0, 1.6))) * step(0.58, h.x);
    vec3 lCol = mix(vec3(0.95, 0.35, 0.08), vec3(0.98, 0.75, 0.12), h.y);
    leaves += lCol * leaf;
  }
  color.rgb = mix(color.rgb, color.rgb * vec3(1.08, 0.96, 0.85), amt * 0.35) + leaves * amt;`;
    case 56:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 ash = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (8.0 + fi * 5.0) + vec2(sin(t * 0.9 + fi) * 0.5, t * (0.7 + fi * 0.4));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 31.0);
    float d = length(f - (h - 0.5) * 0.5);
    float speck = smoothstep(0.09, 0.01, d) * step(0.45, h.x);
    vec3 c = h.y > 0.68 ? vec3(1.0, 0.35, 0.05) : vec3(0.25, 0.22, 0.22);
    ash += c * speck;
  }
  color.rgb = mix(color.rgb, color.rgb * 0.85, amt * 0.3) + ash * amt;`;
    case 57:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 bub = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 st = p * (4.0 + fi * 2.5) + vec2(sin(t * 0.7 + fi) * 0.25, t * (0.4 + fi * 0.25));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 59.0);
    float rad = 0.16 + 0.10 * h.y;
    float d = length(f - (h - 0.5) * 0.35);
    float rim = smoothstep(rad, rad - 0.03, d) * smoothstep(rad - 0.06, rad - 0.01, d);
    vec3 iri = 0.5 + 0.5 * cos(h.x * 6.28 + d * 18.0 + vec3(0.0, 2.0, 4.0));
    bub += iri * rim * step(0.58, h.x);
  }
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - bub * amt * 1.1);`;
    case 58:
      return `
  vec2 p = uv * vec2(aspect, 1.0) * 9.0;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 h = hash2(id + 21.3);
  vec2 q = abs(f - (h - 0.5) * 0.45);
  float star = exp(-(q.x * 26.0 + q.y * 4.0)) + exp(-(q.y * 26.0 + q.x * 4.0));
  float tw = pow(max(0.0, sin(t * 5.0 + h.x * 18.0)), 4.0);
  color.rgb += vec3(1.0, 0.94, 0.75) * star * tw * step(0.55, h.y) * amt;`;
    case 59:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 lRain = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 st = p * vec2(26.0 + fi * 12.0, 2.5) + vec2(0.0, -t * (4.2 + fi * 1.5));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 47.0);
    float streak = smoothstep(0.18, 0.01, abs(f.x - (h.x - 0.5) * 0.4)) * smoothstep(0.5, -0.3, f.y) * step(0.62, h.y);
    vec3 lCol = h.x > 0.5 ? vec3(0.0, 0.95, 1.0) : vec3(1.0, 0.15, 0.85);
    lRain += lCol * streak;
  }
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - lRain * amt);`;
    case 60:
      return `
  vec2 p = uv * vec2(aspect, 1.0);
  float snowAcc = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 st = p * (11.0 + fi * 6.0) + vec2(-t * (2.6 + fi), -t * (1.8 + fi * 0.7));
    vec2 id = floor(st);
    vec2 f = fract(st) - 0.5;
    vec2 h = hash2(id + fi * 77.0);
    float d = length((f - (h - 0.5) * 0.5) * vec2(0.7, 1.4));
    snowAcc += smoothstep(0.16, 0.02, d) * step(0.38, h.x);
  }
  vec3 ice = mix(color.rgb, color.rgb * vec3(0.85, 0.95, 1.12), amt * 0.45);
  color.rgb = ice + vec3(0.95, 0.98, 1.0) * clamp(snowAcc, 0.0, 1.3) * amt;`;
    case 61:
      return `
  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float crystal = fbm(uv * vec2(14.0 * aspect, 14.0));
  float frost = smoothstep(0.34 * amt + 0.04, 0.0, edge - (crystal - 0.5) * 0.14);
  vec3 iceCol = mix(vec3(0.75, 0.92, 1.0), vec3(0.95, 0.99, 1.0), crystal);
  color.rgb = mix(color.rgb, iceCol, frost * 0.85);`;
    case 62:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 crimson = mix(vec3(0.08, 0.01, 0.02), vec3(0.92, 0.10, 0.08), pow(luma, 0.9));
  float vig = smoothstep(0.95, 0.2, length(uv - 0.5));
  color.rgb = mix(color.rgb, crimson * (0.55 + 0.55 * vig), amt);`;
    case 63:
      return `
  float scan = 0.72 + 0.28 * sin(uv.y * 340.0 - t * 18.0);
  float flicker = 0.88 + 0.12 * sin(t * 27.0);
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 holo = vec3(0.15, 0.88, 1.0) * (0.35 + luma * 1.1) * scan * flicker;
  color.rgb = mix(color.rgb, holo, amt * 0.85);`;
    case 64:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float n = rand(uv * vec2(320.0, 240.0) + fract(t * 7.3));
  float bar = smoothstep(0.08, 0.0, abs(uv.y - fract(t * 0.35)));
  vec3 stat = mix(vec3(luma), vec3(n), 0.55 + bar * 0.35);
  color.rgb = mix(color.rgb, stat, amt * 0.85);`;
    case 65:
      return `
  float scanY = fract(t * 0.35);
  float beam = exp(-abs(uv.y - scanY) * 45.0);
  float grid = step(0.94, fract(uv.x * 16.0)) + step(0.94, fract(uv.y * 9.0));
  vec3 scanCol = vec3(0.0, 1.0, 0.85) * (beam * 1.4 + grid * 0.18);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - scanCol * amt);`;
    case 66:
      return `
  float split = 0.015 * amt;
  color.r = sampleCurr(clamp(uv + vec2(split, 0.0), 0.0, 1.0)).r;
  color.b = sampleCurr(clamp(uv - vec2(split, 0.0), 0.0, 1.0)).b;`;
    case 67:
      return `
  float band2 = floor(uv.y * 16.0);
  float trig2 = step(0.65 - amt * 0.35, rand(vec2(band2, floor(t * 10.0))));
  float noiseVal = rand(uv * 200.0 + t);
  color.rgb = mix(color.rgb, vec3(noiseVal) * vec3(1.0, 0.8, 0.9), trig2 * amt * 0.6);`;
    case 68:
      return `
  vec2 cell = fract(uv * vec2(48.0 * aspect, 48.0));
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float mask = step(0.15, cell.x) * step(cell.x, 0.85) * step(0.15, cell.y) * step(cell.y, 0.85);
  float q = floor(luma * 5.0) / 5.0;
  vec3 term = vec3(0.15, 1.0, 0.45) * q * mask * 1.35;
  color.rgb = mix(color.rgb, term, amt);`;
    case 69:
      return `
  float crease2 = exp(-pow((uv.y - fract(t * 0.4)) * 18.0, 2.0));
  float r = sampleCurr(clamp(uv + vec2(0.018 * amt, 0.0), 0.0, 1.0)).r;
  float b = sampleCurr(clamp(uv - vec2(0.018 * amt, 0.0), 0.0, 1.0)).b;
  color.rgb = vec3(r, color.g, b) + vec3(rand(uv + t) * 0.45) * crease2 * amt;`;
    case 70:
      return `
  float cols = 36.0;
  float colId = floor(uv.x * cols);
  float spd2 = 0.9 + rand(vec2(colId, 3.0)) * 1.3;
  float yPos = fract(uv.y + t * spd2 + rand(vec2(colId, 5.0)));
  float streak = pow(1.0 - yPos, 4.0);
  float cell = step(0.35, rand(vec2(colId, floor((uv.y + t * spd2) * 26.0))));
  vec3 bCol = vec3(0.15, 0.65, 1.0) * streak * cell;
  color.rgb = mix(color.rgb, color.rgb * vec3(0.55, 0.78, 1.05) + bCol * 1.25, amt * 0.85);`;
    case 71:
      return `
  float gx = smoothstep(0.92, 0.98, fract(uv.x * 12.0));
  float gy = smoothstep(0.92, 0.98, fract(uv.y * 8.0 - t * 0.8));
  vec3 gridCol = mix(vec3(1.0, 0.1, 0.75), vec3(0.0, 0.95, 1.0), uv.y);
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - gridCol * max(gx, gy) * amt * 0.85);`;
    case 72:
      return `
  vec2 dp2 = uv - 0.5;
  float dist2 = length(dp2 * vec2(aspect, 1.0));
  float waveR2 = fract(t * 0.45) * 0.9;
  float ring2 = exp(-pow((dist2 - waveR2) * 14.0, 2.0));
  color.rgb += vec3(0.4, 0.85, 1.0) * ring2 * amt * 0.45;`;
    case 73:
      return `
  vec2 sPos = vec2(0.5 + 0.18 * sin(t * 0.9), 0.48 + 0.10 * cos(t * 0.7));
  float d = length((uv - sPos) * vec2(aspect, 1.0));
  float spot = smoothstep(0.58, 0.18, d);
  color.rgb = mix(color.rgb, color.rgb * (0.18 + 1.05 * spot), amt);`;
    case 74:
      return `
  vec2 p = uv - 0.5;
  float a = atan(p.y, p.x + 0.0001) + t * 1.8;
  float beam = pow(0.5 + 0.5 * sin(a * 6.0), 4.0);
  vec3 dCol = 0.5 + 0.5 * cos(a * 2.0 + t * 2.0 + vec3(0.0, 2.1, 4.2));
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - dCol * beam * amt * 0.65);`;
    case 75:
      return `
  float phase = sin(t * 9.0);
  float redMask = max(0.0, phase) * smoothstep(0.8, 0.0, uv.x);
  float blueMask = max(0.0, -phase) * smoothstep(0.2, 1.0, uv.x);
  vec3 siren = vec3(1.0, 0.1, 0.12) * redMask + vec3(0.1, 0.4, 1.0) * blueMask;
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - siren * amt * 0.75);`;
    case 76:
      return `
  float flicker = 0.88 + 0.12 * sin(t * 11.0) * cos(t * 7.0);
  float vig = smoothstep(0.95, 0.22, length(uv - 0.5));
  vec3 warm = color.rgb * vec3(1.18, 0.86, 0.54) * flicker * (0.45 + 0.65 * vig);
  color.rgb = mix(color.rgb, clamp(warm, 0.0, 1.0), amt);`;
    case 77:
      return `
  float flicker = 0.90 + 0.10 * rand(vec2(floor(t * 16.0), 1.0));
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 sepia = vec3(luma * 1.12, luma * 0.92, luma * 0.68);
  float vig = smoothstep(0.9, 0.25, length(uv - 0.5));
  color.rgb = mix(color.rgb, sepia * flicker * (0.45 + 0.55 * vig), amt);`;
    case 78:
      return `
  vec2 dir = uv - vec2(0.5, 0.05);
  float a = atan(dir.y, dir.x + 0.0001);
  float rays = pow(0.5 + 0.5 * sin(a * 14.0 + t * 0.6), 3.0);
  float falloff = smoothstep(1.1, 0.0, length(dir));
  vec3 rayCol = vec3(1.0, 0.94, 0.78) * rays * falloff * 0.75;
  color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - rayCol * amt);`;
    case 79:
      return `
  float scan = 0.94 + 0.06 * sin(uv.y * 360.0);
  vec3 vw = mix(vec3(1.0, 0.45, 0.82), vec3(0.32, 0.88, 1.0), uv.y);
  color.rgb = mix(color.rgb, color.rgb * 0.75 + vw * 0.45, amt * 0.75) * scan;`;
    case 80:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float highContrast = smoothstep(0.12, 0.88, luma);
  float vig = smoothstep(0.92, 0.22, length(uv - 0.5));
  color.rgb = mix(color.rgb, vec3(highContrast) * (0.35 + 0.70 * vig), amt);`;
    case 81:
      return `
  vec2 p = uv * vec2(aspect, 1.0) * 10.0;
  vec2 id = floor(p);
  vec2 f = fract(p) - 0.5;
  vec2 h = hash2(id + 33.1);
  float d = length(f - (h - 0.5) * 0.45);
  float tw = pow(max(0.0, sin(t * 4.5 + h.x * 20.0)), 3.0);
  float sp = smoothstep(0.14, 0.01, d) * tw * step(0.55, h.y);
  vec3 gold = color.rgb * vec3(1.08, 1.0, 0.86) + vec3(1.0, 0.85, 0.42) * sp * 1.1;
  color.rgb = mix(color.rgb, gold, amt);`;
    case 82:
      return `
  vec2 px = (2.5 + amt * 2.5) / max(u_textureSize, vec2(512.0));
  vec3 avg = (
    sampleCurr(clamp(uv + vec2(-px.x, 0.0), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(px.x, 0.0), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(0.0, -px.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(0.0, px.y), 0.0, 1.0)).rgb
  ) * 0.25;
  vec3 oil = floor(avg * 8.0 + 0.5) / 8.0;
  color.rgb = mix(color.rgb, oil * 1.06, amt);`;
    case 83:
      return `
  vec2 px = 3.0 / max(u_textureSize, vec2(512.0));
  vec3 soft = (color.rgb + sampleCurr(clamp(uv + px, 0.0, 1.0)).rgb + sampleCurr(clamp(uv - px, 0.0, 1.0)).rgb) / 3.0;
  float paper = 0.92 + 0.08 * noise(uv * vec2(80.0 * aspect, 80.0));
  vec3 wc = mix(soft, vec3(dot(soft, vec3(0.3, 0.59, 0.11))), -0.25) * paper;
  color.rgb = mix(color.rgb, clamp(wc, 0.0, 1.0), amt);`;
    case 84:
      return `
  vec2 px = 2.0 / max(u_textureSize, vec2(512.0));
  vec3 c1 = sampleCurr(clamp(uv - px, 0.0, 1.0)).rgb;
  vec3 c2 = sampleCurr(clamp(uv + px, 0.0, 1.0)).rgb;
  vec3 diff = (c2 - c1) * 2.5;
  float relief = clamp(0.5 + dot(diff, vec3(0.333)), 0.0, 1.0);
  color.rgb = mix(color.rgb, vec3(relief), amt);`;
    case 85:
      return `
  float scale2 = mix(42.0, 14.0, amt);
  vec2 gf = fract(baseUv * vec2(scale2 * aspect, scale2));
  float border = smoothstep(0.06, 0.0, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y)));
  color.rgb = mix(color.rgb, vec3(0.1, 0.12, 0.16), border * amt * 0.55);`;
    case 89:
      return `
  vec2 rad = (4.0 + amt * 5.0) / max(u_textureSize, vec2(512.0));
  vec3 b = (
    color.rgb +
    sampleCurr(clamp(uv + vec2(rad.x, 0.0), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv - vec2(rad.x, 0.0), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv + vec2(0.0, rad.y), 0.0, 1.0)).rgb +
    sampleCurr(clamp(uv - vec2(0.0, rad.y), 0.0, 1.0)).rgb
  ) * 0.2;
  color.rgb = mix(color.rgb, b, amt);`;
    case 90:
      return `
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 heat = mix(vec3(0.02, 0.05, 0.35), vec3(0.1, 0.9, 0.4), smoothstep(0.0, 0.4, luma));
  heat = mix(heat, vec3(1.0, 0.9, 0.1), smoothstep(0.4, 0.75, luma));
  heat = mix(heat, vec3(1.0, 0.15, 0.1), smoothstep(0.75, 1.0, luma));
  float d = length((uv - 0.5) * vec2(aspect, 1.0));
  float ret = smoothstep(0.005, 0.0, abs(d - 0.22));
  color.rgb = mix(color.rgb, heat + vec3(1.0, 0.2, 0.2) * ret * 0.6, amt);`;
    case 91:
      return `
  float pMode = u_fxParamA.x;
  float pScale = u_fxParamA.y;
  float pDens = u_fxParamA.z;
  float pDist = u_fxParamA.w;
  float pAngle = u_fxParamB.x;
  float pGlow = u_fxParamB.y;
  float pFlick = u_fxParamB.z;
  float pExtra = u_fxParamB.w;
  vec3 colA = u_fxColA.rgb;
  vec3 colB = u_fxColB.rgb;
  ${getParametricFamilyGlsl(fxFamily)}`;
    default:
      return '';
  }
}

function getMaskGlsl(maskType: number): { helpers: string; body: string } {
  switch (maskType) {
    case 1:
      return {
        helpers: '',
        body: `
    float proj = p.y + (u_maskSize - 0.5);
    maskVal = smoothstep(-feather, feather, proj);`,
      };
    case 2:
      return {
        helpers: '',
        body: `
    float dist = abs(p.y);
    float target = u_maskSize * 0.5;
    maskVal = 1.0 - smoothstep(target - feather, target + feather, dist);`,
      };
    case 3:
      return {
        helpers: '',
        body: `
    float r = length(p * vec2(aspect, 1.0));
    float targetR = u_maskSize * 0.5 * min(aspect, 1.0);
    maskVal = 1.0 - smoothstep(targetR - feather, targetR + feather, r);`,
      };
    case 4:
      return {
        helpers: '',
        body: `
    vec2 d = abs(p) - vec2(u_maskSize * 0.5);
    float dist = max(d.x, d.y);
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 5:
      return {
        helpers: `
float sdStar5(vec2 p, float r, float rf) {
  vec2 k1 = vec2(0.809016994375, -0.587785252292);
  vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}`,
        body: `
    float dist = sdStar5(p * vec2(aspect, -1.0), u_maskSize * 0.5 * min(aspect, 1.0), 0.42);
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 6:
      return {
        helpers: '',
        body: `
    vec2 ap = abs(p * vec2(aspect, 1.0));
    float dist = (ap.x + ap.y) - u_maskSize * 0.55 * min(aspect, 1.0);
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 7:
      return {
        helpers: `
float sdHeart(vec2 p, float r) {
  p = p / max(0.001, r);
  p.y = -p.y + 0.55;
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) {
    return (sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.35355339) * r;
  }
  return (sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                   dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) *
          sign(p.x - p.y)) * r;
}`,
        body: `
    float dist = sdHeart(p * vec2(aspect, -1.0), u_maskSize * 0.45 * min(aspect, 1.0));
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 8:
      return {
        helpers: `
float sdHexagon(vec2 p, float r) {
  vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}`,
        body: `
    float dist = sdHexagon(p * vec2(aspect, 1.0), u_maskSize * 0.45 * min(aspect, 1.0));
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 9:
      return {
        helpers: `
float sdTriangle(vec2 p, float r) {
  float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}`,
        body: `
    float dist = sdTriangle(p * vec2(aspect, -1.0), u_maskSize * 0.48 * min(aspect, 1.0));
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    case 10:
      return {
        helpers: '',
        body: `
    vec2 b = vec2(u_maskSize * 0.45);
    float r = u_maskSize * 0.12;
    vec2 q = abs(p) - b + vec2(r);
    float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    maskVal = 1.0 - smoothstep(-feather, feather, dist);`,
      };
    default:
      return { helpers: '', body: '' };
  }
}

export function buildCompositeFragmentShader(spec: CompositeShaderSpec): string {
  const normFilter = spec.filterPreset >= 36 ? 36 : spec.filterPreset;
  const normEffect = spec.effectType >= 91 ? 91 : spec.effectType;
  const normFamily = normEffect === 91 ? spec.fxFamily : 0;

  const maskGlsl = getMaskGlsl(spec.maskType);
  const preUvGlsl = normEffect > 0 ? getEffectPreUvGlsl(normEffect) : '';
  const postFxGlsl = normEffect > 0 ? getEffectPostGlsl(normEffect, normFamily) : '';
  const needsNoiseHelpers =
    normEffect > 0 &&
    ([41, 42, 43, 49, 50, 51, 61, 83].includes(normEffect) ||
      (normEffect === 91 && (normFamily === 1 || normFamily === 7)));

  const hslHelpers = spec.hasHsl
    ? `
vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;
  float d = maxC - minC;
  if (d > 0.0001) {
    s = l > 0.5 ? d / max(0.0001, 2.0 - maxC - minC) : d / max(0.0001, maxC + minC);
    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = fract(hsl.x);
  float s = clamp(hsl.y, 0.0, 1.0);
  float l = clamp(hsl.z, 0.0, 1.0);
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(
    hue2rgb(p, q, h + 1.0 / 3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0 / 3.0)
  );
}`
    : '';

  const filterFunc =
    normFilter > 0
      ? `
vec3 applyFilterLUT(vec3 rgb, vec2 uv) {
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 res = rgb;
  ${getFilterPresetGlsl(normFilter)}
  return clamp(res, 0.0, 1.0);
}`
      : '';

  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_texCoord;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_textureSize;
uniform float u_opacity;
uniform float u_time;
uniform int u_skipPremultiply;
uniform vec2 u_perspective;
uniform vec2 u_animBlur;
uniform float u_animFlash;

uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_exposure;
uniform float u_sharpness;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_temperature;
uniform float u_tint;
uniform float u_vignette;

uniform vec3 u_hslRed;
uniform vec3 u_hslGreen;
uniform vec3 u_hslBlue;
uniform vec3 u_hslYellow;

uniform int u_filterPreset;
uniform float u_filterIntensity;
uniform vec3 u_lutMatR;
uniform vec3 u_lutMatG;
uniform vec3 u_lutMatB;
uniform vec4 u_lutShadow;
uniform vec4 u_lutHigh;
uniform vec4 u_lutParams;
uniform vec4 u_lutGain;
uniform vec4 u_lutExtra;

uniform int u_chromaEnabled;
uniform vec3 u_chromaColor;
uniform float u_chromaTolerance;
uniform float u_chromaFeather;
uniform float u_chromaSpill;

uniform int u_maskType;
uniform float u_maskSize;
uniform float u_maskFeather;
uniform float u_maskRotation;
uniform int u_maskInverted;

uniform int u_effectType;
uniform float u_effectIntensity;
uniform float u_effectSpeed;
uniform int u_fxFamily;
uniform vec4 u_fxColA;
uniform vec4 u_fxColB;
uniform vec4 u_fxParamA;
uniform vec4 u_fxParamB;

#define PI 3.14159265359

float boxMask(vec2 uv) {
  vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return s.x * s.y;
}

vec4 sampleCurr(vec2 uv) {
  return texture2D(u_image, clamp(uv, 0.0, 1.0)) * boxMask(uv);
}

${
  normEffect > 0
    ? `
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
`
    : ''
}

${
  needsNoiseHelpers
    ? `
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(rand(i + vec2(0.0, 0.0)), rand(i + vec2(1.0, 0.0)), u.x),
    mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}
`
    : ''
}

${maskGlsl.helpers}
${hslHelpers}
${filterFunc}

vec4 sampleWithEffects(vec2 baseUv, float aspect) {
  vec2 uv = baseUv;
  ${
    normEffect > 0
      ? `
  float amt = u_effectIntensity;
  float spd = max(0.2, u_effectSpeed);
  float t = u_time * spd;
  if (amt > 0.0) {
    ${preUvGlsl}
  }
  float uvValid = boxMask(uv);
  vec4 color = sampleCurr(uv);
  if (amt > 0.0) {
    ${postFxGlsl}
  }
  `
      : `
  float uvValid = boxMask(uv);
  vec4 color = sampleCurr(uv);
  `
  }
  ${
    spec.hasAnimBlur
      ? `
  if (length(u_animBlur) > 0.001) {
    vec4 bAcc = color * 0.44;
    bAcc += sampleCurr(clamp(uv + u_animBlur * 0.6, 0.0, 1.0)) * 0.28;
    bAcc += sampleCurr(clamp(uv - u_animBlur * 0.6, 0.0, 1.0)) * 0.28;
    color = bAcc;
  }
  `
      : ''
  }
  return color * uvValid;
}

void main() {
  vec2 uv = v_texCoord;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  float shade3D = 1.0;

  ${
    spec.hasPerspective
      ? `
  if (abs(u_perspective.x) > 0.001 || abs(u_perspective.y) > 0.001) {
    vec2 p = uv - 0.5;
    if (abs(u_perspective.x) > 0.001) {
      float ry = u_perspective.x;
      float cosY = cos(ry);
      float sinY = sin(ry);
      float z = 1.0 + p.x * sinY * 1.15;
      p.x = p.x / max(0.06, abs(cosY));
      if (cosY < 0.0) p.x = -p.x;
      p.y = p.y / max(0.25, z);
      shade3D *= clamp(0.65 + 0.35 * abs(cosY) - p.x * sinY * 0.25, 0.35, 1.2);
    }
    if (abs(u_perspective.y) > 0.001) {
      float rx = u_perspective.y;
      float cosX = cos(rx);
      float sinX = sin(rx);
      float z = 1.0 + p.y * sinX * 1.15;
      p.y = p.y / max(0.06, abs(cosX));
      if (cosX < 0.0) p.y = -p.y;
      p.x = p.x / max(0.25, z);
      shade3D *= clamp(0.65 + 0.35 * abs(cosX) - p.y * sinX * 0.25, 0.35, 1.2);
    }
    uv = p + 0.5;
  }
  `
      : ''
  }

  float perspMask = boxMask(uv);
  vec4 color = sampleWithEffects(uv, aspect);

  ${
    spec.hasSharpness
      ? `
  if (u_sharpness > 0.0) {
    vec2 stepPx = 1.0 / max(u_textureSize, vec2(1.0));
    vec4 top = sampleCurr(uv + vec2(0.0, -stepPx.y));
    vec4 bottom = sampleCurr(uv + vec2(0.0, stepPx.y));
    vec4 left = sampleCurr(uv + vec2(-stepPx.x, 0.0));
    vec4 right = sampleCurr(uv + vec2(stepPx.x, 0.0));
    vec4 sharpened = color * (1.0 + 4.0 * u_sharpness) - (top + bottom + left + right) * u_sharpness;
    color.rgb = clamp(sharpened.rgb, 0.0, 1.0);
  }
  `
      : ''
  }

  ${
    spec.hasChroma
      ? `
  if (u_chromaEnabled == 1) {
    float y1  =  0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
    float cb1 = -0.168736 * color.r - 0.331264 * color.g + 0.5 * color.b;
    float cr1 =  0.5 * color.r - 0.418688 * color.g - 0.081312 * color.b;

    float y2  =  0.299 * u_chromaColor.r + 0.587 * u_chromaColor.g + 0.114 * u_chromaColor.b;
    float cb2 = -0.168736 * u_chromaColor.r - 0.331264 * u_chromaColor.g + 0.5 * u_chromaColor.b;
    float cr2 =  0.5 * u_chromaColor.r - 0.418688 * u_chromaColor.g - 0.081312 * u_chromaColor.b;

    float keyChromaMag = length(vec2(cb2, cr2));
    float dist = keyChromaMag > 0.08
      ? length(vec2(cb1 - cb2, cr1 - cr2)) * 1.15 + abs(y1 - y2) * 0.20
      : length(color.rgb - u_chromaColor);

    float edge0 = u_chromaTolerance;
    float edge1 = u_chromaTolerance + max(0.001, u_chromaFeather);
    float chromaMask = smoothstep(edge0, edge1, dist);

    if (u_chromaSpill > 0.0) {
      float spillRegion = 1.0 - smoothstep(edge0, edge1 + 0.22, dist);
      float maxKey = max(u_chromaColor.r, max(u_chromaColor.g, u_chromaColor.b));
      if (u_chromaColor.g >= maxKey - 0.01) {
        color.g = mix(color.g, min(color.g, (color.r + color.b) * 0.5), spillRegion * u_chromaSpill);
      } else if (u_chromaColor.b >= maxKey - 0.01) {
        color.b = mix(color.b, min(color.b, (color.r + color.g) * 0.5), spillRegion * u_chromaSpill);
      } else {
        color.r = mix(color.r, min(color.r, (color.g + color.b) * 0.5), spillRegion * u_chromaSpill);
      }
    }
    color.a *= chromaMask;
  }
  `
      : ''
  }

  ${
    normFilter > 0
      ? `
  if (u_filterIntensity > 0.0) {
    vec3 lutRgb = applyFilterLUT(color.rgb, uv);
    color.rgb = mix(color.rgb, lutRgb, clamp(u_filterIntensity, 0.0, 1.0));
  }
  `
      : ''
  }

  ${
    spec.hasColorGrading
      ? `
  color.rgb += u_brightness * 0.55;
  color.rgb *= pow(2.0, u_exposure);
  color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;
  color.r += u_temperature * 0.18;
  color.b -= u_temperature * 0.18;
  color.g += u_tint * 0.15;

  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luminance), color.rgb, 1.0 + u_saturation);

  if (u_highlights != 0.0 || u_shadows != 0.0) {
    float lum = dot(color.rgb, vec3(0.333));
    float shadowMask = 1.0 - smoothstep(0.0, 0.55, lum);
    float highlightMask = smoothstep(0.45, 1.0, lum);
    color.rgb += u_shadows * shadowMask * 0.35;
    color.rgb += u_highlights * highlightMask * 0.35;
  }

  if (u_vignette > 0.0) {
    vec2 coord = (uv - 0.5) * 2.0;
    float dist = length(coord);
    float vig = smoothstep(0.45, 1.45, dist * (1.0 + u_vignette * 0.8));
    color.rgb *= (1.0 - vig * u_vignette);
  }
  `
      : ''
  }

  ${
    spec.hasHsl
      ? `
  vec3 hsl = rgb2hsl(clamp(color.rgb, 0.0, 1.0));
  float h = hsl.x;
  float dRed = min(abs(h - 0.0), abs(h - 1.0));
  float dYellow = abs(h - 0.1667);
  float dGreen = abs(h - 0.3333);
  float dBlue = abs(h - 0.6111);

  float wRed = smoothstep(0.14, 0.0, dRed) * hsl.y;
  float wYellow = smoothstep(0.12, 0.0, dYellow) * hsl.y;
  float wGreen = smoothstep(0.15, 0.0, dGreen) * hsl.y;
  float wBlue = smoothstep(0.16, 0.0, dBlue) * hsl.y;

  hsl.x += (wRed * u_hslRed.x + wYellow * u_hslYellow.x + wGreen * u_hslGreen.x + wBlue * u_hslBlue.x) * 0.15;
  hsl.y += (wRed * u_hslRed.y + wYellow * u_hslYellow.y + wGreen * u_hslGreen.y + wBlue * u_hslBlue.y) * 0.6;
  hsl.z += (wRed * u_hslRed.z + wYellow * u_hslYellow.z + wGreen * u_hslGreen.z + wBlue * u_hslBlue.z) * 0.35;
  color.rgb = hsl2rgb(hsl);
  `
      : ''
  }

  if (u_animFlash > 0.0) {
    color.rgb = mix(color.rgb, vec3(1.0), clamp(u_animFlash, 0.0, 1.0));
  }

  color.rgb = clamp(color.rgb, 0.0, 1.0) * shade3D;
  color *= perspMask;

  ${
    spec.maskType > 0
      ? `
  float maskVal = 1.0;
  float rad = radians(u_maskRotation);
  float cs = cos(rad);
  float sn = sin(rad);
  mat2 rot = mat2(cs, -sn, sn, cs);
  vec2 p = rot * (v_texCoord - 0.5);
  float feather = max(0.002, u_maskFeather);
  ${maskGlsl.body}
  if (u_maskInverted == 1) {
    maskVal = 1.0 - maskVal;
  }
  color.a *= clamp(maskVal, 0.0, 1.0);
  `
      : ''
  }

  color.a *= u_opacity;
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  if (u_skipPremultiply == 0) {
    color.rgb *= color.a;
  }

  gl_FragColor = color;
}
`;
}

export const COMPOSITE_FRAGMENT_SHADER_SOURCE = buildCompositeFragmentShader({
  filterPreset: 36,
  effectType: 0,
  fxFamily: 0,
  hasColorGrading: true,
  hasSharpness: false,
  hasHsl: false,
  hasChroma: false,
  maskType: 0,
  hasPerspective: false,
  hasAnimBlur: false,
});
