// ============================================================================
// Modular Single-Transition GLSL Fragment Shaders
// Each transition compiles independently (~80-110 lines, < 2ms on ANGLE/D3D11)
// instead of a 1,878-line monolithic uber-shader.
// ============================================================================

const TRANSITION_COMMON_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_texCoord;

uniform sampler2D u_image;
uniform sampler2D u_prevImage;
uniform int u_hasPrevImage;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_transitionProgress;

#define PI 3.14159265359

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

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

float boxMask(vec2 uv) {
  vec2 s = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return s.x * s.y;
}

vec4 sampleCurr(vec2 uv) {
  return texture2D(u_image, clamp(uv, 0.0, 1.0)) * boxMask(uv);
}

vec4 samplePrev(vec2 uv) {
  vec4 prev = texture2D(u_prevImage, clamp(uv, 0.0, 1.0)) * boxMask(uv);
  return u_hasPrevImage == 1 ? prev : vec4(0.03, 0.03, 0.05, 0.0);
}
`;

const STAR_SDF = `
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
}
`;

const HEART_SDF = `
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
}
`;

function getWhipPanBody(dirX: number, dirY: number, cond: string): string {
  return `
    vec2 dir = vec2(${dirX.toFixed(1)}, ${dirY.toFixed(1)});
    float vel = sin(p * PI);
    vec2 blurStep = dir * vel * 0.03;
    vec2 shifted = uv + dir * sp;
    vec4 accCurr = vec4(0.0);
    vec4 accPrev = vec4(0.0);
    float wCurr = 0.0;
    float wPrev = 0.0;
    for (int i = -1; i <= 1; i++) {
      vec2 samplePos = shifted + blurStep * float(i);
      vec2 wrapped = fract(samplePos);
      bool inSecondTile = (${cond});
      if (inSecondTile || u_hasPrevImage == 0) {
        accCurr += sampleCurr(wrapped);
        wCurr += 1.0;
      } else {
        accPrev += samplePrev(wrapped);
        wPrev += 1.0;
      }
    }
    if (wCurr > 0.0) {
      currRaw = accCurr / wCurr;
      prevOut = wPrev > 0.0 ? accPrev / wPrev : vec4(0.0);
      blendMode = 2;
      mixFactor = wCurr / 3.0;
    } else {
      color = accPrev / 3.0;
    }
  `;
}

function getTransitionBody(transTypeId: number): string {
  switch (transTypeId) {
    case 1: // crossDissolve
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 2: // directionalWipe
      return `
        float edge = smoothstep(sp - 0.06, sp + 0.06, uv.x);
        float glow = (1.0 - abs(edge * 2.0 - 1.0)) * 0.25;
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
        postAdd = vec3(0.4, 0.5, 1.0) * glow;
      `;
    case 3: // wipeRight
      return `
        float edge = smoothstep(sp - 0.06, sp + 0.06, 1.0 - uv.x);
        float glow = (1.0 - abs(edge * 2.0 - 1.0)) * 0.25;
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
        postAdd = vec3(0.4, 0.5, 1.0) * glow;
      `;
    case 4: // wipeUp
      return `
        float edge = smoothstep(sp - 0.06, sp + 0.06, 1.0 - uv.y);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
      `;
    case 5: // dynamicZoom / zoomInBlur
      return `
        float intensity = sin(p * PI);
        vec2 center = vec2(0.5);
        if (p < 0.5 && u_hasPrevImage == 1) {
          float subP = p * 2.0;
          float zoom = 1.0 - subP * subP * 0.55;
          vec4 c0 = samplePrev((uv - center) * zoom + center);
          vec4 c1 = samplePrev((uv - center) * (zoom * (1.0 - intensity * 0.08)) + center);
          vec4 c2 = samplePrev((uv - center) * (zoom * (1.0 - intensity * 0.16)) + center);
          color = (c0 + c1 + c2) / 3.0;
        } else {
          float subP = u_hasPrevImage == 1 ? (p - 0.5) * 2.0 : p;
          float ease = 1.0 - pow(1.0 - subP, 3.0);
          float zoom = mix(1.8, 1.0, ease);
          vec2 zUv0 = clamp((uv - center) * zoom + center, 0.0, 1.0);
          vec2 zUv1 = clamp((uv - center) * (zoom * (1.0 + (1.0 - ease) * 0.1)) + center, 0.0, 1.0);
          currRaw = (sampleCurr(zUv0) * 0.6 + sampleCurr(zUv1) * 0.4);
          blendMode = 3;
          mixFactor = u_hasPrevImage == 0 ? smoothstep(0.0, 0.35, p) : 1.0;
        }
      `;
    case 6: // flashWhite
      return `
        float flash = pow(sin(p * PI), 1.4);
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(uv);
        } else {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        }
        postMul = vec3(1.0 + flash * 3.0);
        postAdd = vec3(flash * 0.95);
      `;
    case 7: // flashBlack
      return `
        float dip = pow(sin(p * PI), 1.2);
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(uv);
        } else {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        }
        postMul = vec3(1.0 - dip);
      `;
    case 8: // glitch
      return `
        float shake = sin(p * PI);
        float band = floor(uv.y * 24.0);
        float disp = (rand(vec2(band, floor(p * 18.0))) - 0.5) * 0.28 * shake;
        float rgbShift = 0.045 * shake;
        vec2 tUv = clamp(uv + vec2(disp, 0.0), 0.0, 1.0);
        bool useCurr = (p >= 0.5 || u_hasPrevImage == 0 || rand(vec2(band, p)) < p);
        if (useCurr) {
          float r = sampleCurr(clamp(tUv + vec2(rgbShift, 0.0), 0.0, 1.0)).r;
          vec4 g = sampleCurr(tUv);
          float b = sampleCurr(clamp(tUv - vec2(rgbShift, 0.0), 0.0, 1.0)).b;
          currRaw = vec4(r, g.g, b, g.a);
          blendMode = 1;
        } else {
          float r = samplePrev(clamp(tUv + vec2(rgbShift, 0.0), 0.0, 1.0)).r;
          vec4 g = samplePrev(tUv);
          float b = samplePrev(clamp(tUv - vec2(rgbShift, 0.0), 0.0, 1.0)).b;
          color = vec4(r, g.g, b, g.a);
        }
      `;
    case 9: // rotate3D
      return `
        bool secondHalf = (p >= 0.5 || u_hasPrevImage == 0);
        float localP = u_hasPrevImage == 1 ? p : (0.5 + p * 0.5);
        float angle = localP * PI;
        float cosA = cos(angle);
        float sinA = sin(angle);
        float absCos = max(0.04, abs(cosA));
        vec2 cp = uv - 0.5;
        float z = 1.0 + cp.x * sinA * (secondHalf ? -0.9 : 0.9);
        vec2 cardUv = vec2(cp.x / absCos, cp.y / max(0.3, z)) + 0.5;
        float cMask = boxMask(cardUv);
        float light = 0.45 + 0.55 * absCos;
        if (secondHalf) {
          currRaw = sampleCurr(cardUv);
          prevOut = vec4(0.03, 0.03, 0.06, 1.0);
          currMul = vec3(light);
          mixFactor = cMask;
          blendMode = 4;
        } else {
          vec4 sampled = samplePrev(cardUv);
          color = mix(vec4(0.03, 0.03, 0.06, 1.0), vec4(sampled.rgb * light, sampled.a), cMask);
        }
      `;
    case 10: // circleOpen
      return `
        vec2 diff = (uv - 0.5) * vec2(aspect, 1.0);
        float dist = length(diff);
        float maxR = length(vec2(aspect * 0.5, 0.5)) * 1.08;
        float radius = sp * maxR;
        float iris = 1.0 - smoothstep(radius - 0.035, radius + 0.035, dist);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = iris;
      `;
    case 11: // whipPanLeft / motionBlur
      return getWhipPanBody(1, 0, 'samplePos.x >= 1.0');
    case 12: // whipPanRight
      return getWhipPanBody(-1, 0, 'samplePos.x < 0.0');
    case 13: // whipPanUp
      return getWhipPanBody(0, -1, 'samplePos.y < 0.0');
    case 14: // zoomOutBounce
      return `
        float inv = 1.0 - p;
        float bounce = abs(cos(p * PI * 2.5)) * inv * 0.22;
        float s = max(0.1, sp - bounce);
        vec2 cUv = (uv - 0.5) / max(0.15, s) + 0.5;
        float cMask = boxMask(cUv);
        vec4 prevC = samplePrev((uv - 0.5) * (1.0 + sp * 0.8) + 0.5);
        prevOut = u_hasPrevImage == 1 ? prevC * (1.0 - sp) : vec4(0.0);
        currRaw = sampleCurr(cUv);
        blendMode = 2;
        mixFactor = cMask;
      `;
    case 15: // spinTransition
      return `
        bool secondHalf = (p >= 0.5 || u_hasPrevImage == 0);
        float subP = u_hasPrevImage == 1 ? (secondHalf ? (p - 0.5) * 2.0 : p * 2.0) : p;
        float rotAngle = secondHalf ? (1.0 - subP) * PI : -subP * PI;
        float zoom = secondHalf ? mix(1.8, 1.0, subP) : mix(1.0, 1.8, subP);
        vec2 cp = (uv - 0.5) * vec2(aspect, 1.0);
        float c = cos(rotAngle);
        float s = sin(rotAngle);
        vec2 rUv = (mat2(c, -s, s, c) * cp) / vec2(aspect, 1.0) * zoom + 0.5;
        vec2 clampedUv = abs(fract(rUv * 0.5 + 0.5) * 2.0 - 1.0);
        if (secondHalf) {
          currRaw = sampleCurr(clampedUv);
          blendMode = 1;
        } else {
          color = samplePrev(clampedUv);
        }
      `;
    case 16: // shakeImpact
      return `
        float impact = sin(p * PI);
        vec2 shake = vec2(sin(p * 55.0), cos(p * 48.0)) * 0.06 * impact;
        float zoom = 1.0 - impact * 0.18;
        vec2 sUv = clamp((uv - 0.5) * zoom + 0.5 + shake, 0.0, 1.0);
        float shift = 0.025 * impact;
        if (p < 0.5 && u_hasPrevImage == 1) {
          float r = samplePrev(clamp(sUv + vec2(shift, 0.0), 0.0, 1.0)).r;
          vec4 g = samplePrev(sUv);
          float b = samplePrev(clamp(sUv - vec2(shift, 0.0), 0.0, 1.0)).b;
          color = vec4(r, g.g, b, g.a);
        } else {
          float r = sampleCurr(clamp(sUv + vec2(shift, 0.0), 0.0, 1.0)).r;
          vec4 g = sampleCurr(sUv);
          float b = sampleCurr(clamp(sUv - vec2(shift, 0.0), 0.0, 1.0)).b;
          currRaw = vec4(r, g.g, b, g.a);
          blendMode = 1;
        }
        postAdd = vec3(1.0, 0.9, 0.85) * pow(impact, 3.0) * 0.65;
      `;
    case 17: // filmBurn
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float burnWave = noise(uv * 3.5 + vec2(p * 4.0, -p * 2.0));
        float burnIntensity = sin(p * PI) * smoothstep(0.15, 0.85, burnWave + sin(p * PI) * 0.45);
        vec3 burnColor = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.88, 0.35), burnIntensity);
        needScreen = true;
        screenCol = burnColor * burnIntensity * 1.35;
      `;
    case 18: // lumaFade
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        float luma = dot(u_hasPrevImage == 1 ? prevOut.rgb : currRaw.rgb, vec3(0.299, 0.587, 0.114));
        float pattern = luma * 0.75 + noise(uv * 8.0) * 0.25;
        float m = smoothstep(p * 1.3 - 0.3, p * 1.3, pattern);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 19: // cube3D
      return `
        float boundary = 1.0 - sp;
        if (uv.x < boundary && u_hasPrevImage == 1) {
          float localX = uv.x / max(0.001, boundary);
          float persp = 1.0 + (1.0 - localX) * sp * 0.35;
          vec2 cUv = vec2(localX, (uv.y - 0.5) * persp + 0.5);
          color = samplePrev(cUv) * (1.0 - sp * 0.45);
        } else {
          float startX = boundary;
          float localX = clamp((uv.x - startX) / max(0.001, sp), 0.0, 1.0);
          float persp = 1.0 + localX * (1.0 - sp) * 0.35;
          vec2 cUv = vec2(localX, (uv.y - 0.5) * persp + 0.5);
          if (uv.x < startX) {
            color = vec4(0.0);
          } else {
            currRaw = sampleCurr(cUv);
            float f = 0.55 + 0.45 * sp;
            prevOut = vec4(0.0);
            currMul = vec3(f);
            mixFactor = 1.0;
            blendMode = 4;
            postMul = vec3(1.0);
          }
        }
      `;
    case 20: // slidePush
      return `
        float boundary = 1.0 - sp;
        if (uv.x < boundary) {
          vec2 pUv = vec2(uv.x + sp, uv.y);
          float shadow = smoothstep(boundary - 0.08, boundary, uv.x) * 0.5;
          vec4 prevC = samplePrev(pUv);
          color = u_hasPrevImage == 1 ? vec4(prevC.rgb * (1.0 - shadow), prevC.a) : vec4(0.0);
        } else {
          vec2 cUv = vec2(uv.x - boundary, uv.y);
          currRaw = sampleCurr(cUv);
          blendMode = 1;
        }
      `;
    case 21: // clockWipe
      return `
        vec2 cp = uv - 0.5;
        float angle = fract((atan(cp.x, -cp.y) / (2.0 * PI)) + 1.0);
        float mask = smoothstep(sp - 0.04, sp + 0.04, angle);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - mask;
      `;
    case 22: // blinds
      return `
        float slats = fract(uv.y * 10.0);
        float mask = smoothstep(sp - 0.05, sp + 0.05, slats);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - mask;
      `;
    case 23: // diamondOpen
      return `
        vec2 cp = abs((uv - 0.5) * vec2(aspect, 1.0));
        float manhattan = cp.x + cp.y;
        float maxD = (aspect * 0.5 + 0.5) * 1.05;
        float edge = 1.0 - smoothstep(sp * maxD - 0.04, sp * maxD + 0.04, manhattan);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = edge;
      `;
    case 24: // liquidWave
      return `
        vec2 cp = (uv - 0.5) * vec2(aspect, 1.0);
        float dist = length(cp);
        float wave = sin(dist * 28.0 - p * 18.0) * 0.035 * sin(p * PI);
        vec2 wUv = clamp(uv + normalize(cp + vec2(0.0001)) * wave, 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 25: // pixelate
      return `
        float intensity = sin(p * PI);
        float blocks = mix(200.0, 10.0, pow(intensity, 0.65));
        vec2 grid = vec2(blocks * aspect, blocks);
        vec2 pUv = (floor(uv * grid) + 0.5) / grid;
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(pUv);
        } else {
          currRaw = sampleCurr(pUv);
          blendMode = 3;
          mixFactor = u_hasPrevImage == 0 ? smoothstep(0.0, 0.3, p) : 1.0;
        }
      `;
    case 26: // dreamy
      return `
        float wave = sin(uv.y * 10.0 + p * PI * 2.0) * 0.025 * sin(p * PI);
        vec2 dUv = clamp(uv + vec2(wave, -abs(wave) * 0.5), 0.0, 1.0);
        prevOut = samplePrev(dUv);
        currRaw = sampleCurr(dUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(0.18, 0.14, 0.25) * sin(p * PI);
      `;
    case 27: // whipPanDown
      return getWhipPanBody(0, 1, 'samplePos.y >= 1.0');
    case 28: // zoomOutBlur
      return `
        float intensity = sin(p * PI);
        vec2 center = vec2(0.5);
        if (p < 0.5 && u_hasPrevImage == 1) {
          float subP = p * 2.0;
          float zoom = 1.0 + subP * subP * 0.8;
          vec4 c0 = samplePrev(clamp((uv - center) * zoom + center, 0.0, 1.0));
          vec4 c1 = samplePrev(clamp((uv - center) * (zoom + intensity * 0.08) + center, 0.0, 1.0));
          color = (c0 + c1) * 0.5;
        } else {
          float subP = u_hasPrevImage == 1 ? (p - 0.5) * 2.0 : p;
          float ease = 1.0 - pow(1.0 - subP, 3.0);
          float zoom = mix(0.45, 1.0, ease);
          vec2 zUv = clamp((uv - center) * zoom + center, 0.0, 1.0);
          currRaw = sampleCurr(zUv);
          blendMode = 3;
          mixFactor = u_hasPrevImage == 0 ? smoothstep(0.0, 0.35, p) : 1.0;
        }
      `;
    case 29: // swirlWarp
      return `
        vec2 cp = uv - 0.5;
        float r = length(cp);
        float swirl = sin(p * PI) * 4.5 * max(0.0, 1.0 - r * 1.4);
        float cs = cos(swirl);
        float sn = sin(swirl);
        vec2 sUv = clamp(mat2(cs, -sn, sn, cs) * cp + 0.5, 0.0, 1.0);
        prevOut = samplePrev(sUv);
        currRaw = sampleCurr(sUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 30: // dollyZoom
      return `
        float z = 1.0 + sin(p * PI) * 0.45;
        vec2 pUv = clamp((uv - 0.5) * z + 0.5, 0.0, 1.0);
        vec2 cUv = clamp((uv - 0.5) / z + 0.5, 0.0, 1.0);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(cUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 31: // shakeZoom
      return `
        float impact = sin(p * PI);
        vec2 shake = vec2(sin(p * 65.0), cos(p * 57.0)) * 0.045 * impact;
        float zoom = 1.0 - impact * 0.25;
        vec2 zUv = clamp((uv - 0.5) * zoom + 0.5 + shake, 0.0, 1.0);
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(zUv);
        } else {
          currRaw = sampleCurr(zUv);
          blendMode = 1;
        }
      `;
    case 32: // lensWarp
      return `
        vec2 cp = uv - 0.5;
        float r2 = dot(cp, cp);
        float k = sin(p * PI) * 2.4;
        vec2 wUv = clamp(0.5 + cp * (1.0 + k * r2) / (1.0 + k * 0.25), 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 33: // lightLeak
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float leak = pow(sin(p * PI), 1.2) * smoothstep(0.0, 1.0, 1.0 - abs(uv.x - p));
        vec3 leakCol = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.25, 0.65), uv.y);
        needScreen = true;
        screenCol = leakCol * leak * 1.4;
      `;
    case 34: // prismFlash
      return `
        float fl = sin(p * PI);
        float shift = fl * 0.035;
        if (p < 0.5 && u_hasPrevImage == 1) {
          float r = samplePrev(clamp(uv + vec2(shift, 0.0), 0.0, 1.0)).r;
          vec4 g = samplePrev(uv);
          float b = samplePrev(clamp(uv - vec2(shift, 0.0), 0.0, 1.0)).b;
          color = vec4(r, g.g, b, g.a);
        } else {
          float r = sampleCurr(clamp(uv + vec2(shift, 0.0), 0.0, 1.0)).r;
          vec4 g = sampleCurr(uv);
          float b = sampleCurr(clamp(uv - vec2(shift, 0.0), 0.0, 1.0)).b;
          currRaw = vec4(r, g.g, b, g.a);
          blendMode = 1;
        }
        postAdd = vec3(0.4, 0.6, 1.0) * pow(fl, 2.0) * 0.55;
      `;
    case 35: // vignetteFade
      return `
        float d = length((uv - 0.5) * vec2(aspect, 1.0));
        float vig = smoothstep(0.95 - sin(p * PI) * 0.85, 0.1, d);
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(uv);
        } else {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        }
        postMul = vec3(vig);
      `;
    case 36: // radialBlurFade
      return `
        float bAmt = sin(p * PI) * 0.04;
        vec2 dir = (uv - 0.5) * bAmt;
        prevOut = (samplePrev(clamp(uv - dir, 0.0, 1.0)) + samplePrev(uv) + samplePrev(clamp(uv + dir, 0.0, 1.0))) / 3.0;
        currRaw = (sampleCurr(clamp(uv - dir, 0.0, 1.0)) + sampleCurr(uv) + sampleCurr(clamp(uv + dir, 0.0, 1.0))) / 3.0;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 37: // crossZoom
      return `
        float zP = mix(1.0, 0.55, sp);
        float zC = mix(1.55, 1.0, sp);
        prevOut = samplePrev(clamp((uv - 0.5) * zP + 0.5, 0.0, 1.0));
        currRaw = sampleCurr(clamp((uv - 0.5) * zC + 0.5, 0.0, 1.0));
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 38: // burnDark
      return `
        float dip = sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postGamma = 1.0 + dip * 2.5;
      `;
    case 39: // wipeLeft
      return `
        float edge = smoothstep(sp - 0.05, sp + 0.05, uv.x);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
      `;
    case 40: // wipeDown
      return `
        float edge = smoothstep(sp - 0.05, sp + 0.05, uv.y);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
      `;
    case 41: // diagonalWipe
      return `
        float diag = (uv.x + uv.y) * 0.5;
        float edge = smoothstep(sp - 0.06, sp + 0.06, diag);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
      `;
    case 42: // barnDoorOpen
      return `
        float dist = abs(uv.x - 0.5) * 2.0;
        float edge = smoothstep(sp - 0.04, sp + 0.04, dist);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - edge;
      `;
    case 43: // barnDoorClose
      return `
        float dist = abs(uv.x - 0.5) * 2.0;
        float edge = 1.0 - smoothstep((1.0 - sp) - 0.04, (1.0 - sp) + 0.04, dist);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = edge;
      `;
    case 44: // heartOpen
      return `
        vec2 cp = (uv - 0.5) * vec2(aspect, -1.0);
        float maxR = length(vec2(aspect * 0.5, 0.5)) * 1.6;
        float d = sdHeart(cp, max(0.001, sp * maxR));
        float mask = 1.0 - smoothstep(-0.02, 0.02, d);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = mask;
      `;
    case 45: // starOpen
      return `
        vec2 cp = (uv - 0.5) * vec2(aspect, -1.0);
        float maxR = length(vec2(aspect * 0.5, 0.5)) * 1.9;
        float d = sdStar5(cp, max(0.001, sp * maxR), 0.45);
        float mask = 1.0 - smoothstep(-0.02, 0.02, d);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = mask;
      `;
    case 46: // flipVertical3D
      return `
        bool secondHalf = (p >= 0.5 || u_hasPrevImage == 0);
        float localP = u_hasPrevImage == 1 ? p : (0.5 + p * 0.5);
        float angle = localP * PI;
        float cosA = cos(angle);
        float sinA = sin(angle);
        float absCos = max(0.04, abs(cosA));
        vec2 cp = uv - 0.5;
        float z = 1.0 + cp.y * sinA * (secondHalf ? -0.9 : 0.9);
        vec2 cardUv = vec2(cp.x / max(0.3, z), cp.y / absCos) + 0.5;
        float cMask = boxMask(cardUv);
        float light = 0.45 + 0.55 * absCos;
        if (secondHalf) {
          currRaw = sampleCurr(cardUv);
          prevOut = vec4(0.03, 0.03, 0.06, 1.0);
          currMul = vec3(light);
          mixFactor = cMask;
          blendMode = 4;
        } else {
          vec4 sampled = samplePrev(cardUv);
          color = mix(vec4(0.03, 0.03, 0.06, 1.0), vec4(sampled.rgb * light, sampled.a), cMask);
        }
      `;
    case 47: // pageCurl
      return `
        float fold = 1.0 - sp;
        if (uv.x < fold && u_hasPrevImage == 1) {
          float shadow = smoothstep(fold - 0.14, fold, uv.x) * 0.45;
          vec4 pBase = samplePrev(uv);
          color = vec4(pBase.rgb * (1.0 - shadow), pBase.a);
        } else {
          float curlZone = smoothstep(fold, fold + 0.12, uv.x);
          currRaw = sampleCurr(uv);
          blendMode = 1;
          postMul = vec3(0.65 + 0.35 * curlZone);
        }
      `;
    case 48: // slideDownPush
      return `
        float boundary = sp;
        if (uv.y < boundary) {
          vec2 cUv = vec2(uv.x, uv.y + (1.0 - sp));
          currRaw = sampleCurr(cUv);
          blendMode = 1;
        } else {
          vec2 pUv = vec2(uv.x, uv.y - sp);
          vec4 prevC = samplePrev(pUv);
          color = u_hasPrevImage == 1 ? prevC : vec4(0.0);
        }
      `;
    case 49: // rgbSplitSlide
      return `
        float s = sin(p * PI) * 0.08;
        if (p < 0.5 && u_hasPrevImage == 1) {
          float r = samplePrev(clamp(uv + vec2(s, 0.0), 0.0, 1.0)).r;
          vec4 g = samplePrev(uv);
          float b = samplePrev(clamp(uv - vec2(s, 0.0), 0.0, 1.0)).b;
          color = vec4(r, g.g, b, g.a);
        } else {
          float r = sampleCurr(clamp(uv + vec2(s, 0.0), 0.0, 1.0)).r;
          vec4 g = sampleCurr(uv);
          float b = sampleCurr(clamp(uv - vec2(s, 0.0), 0.0, 1.0)).b;
          currRaw = vec4(r, g.g, b, g.a);
          blendMode = 1;
        }
      `;
    case 50: // kaleidoTransition
      return `
        float kAmt = sin(p * PI);
        vec2 cp = (uv - 0.5) * vec2(aspect, 1.0);
        float r = length(cp);
        float a = atan(cp.y, cp.x + 0.0001) + p * 3.0;
        float tau = 2.0 * PI / 6.0;
        a = abs(mod(a, tau) - tau * 0.5);
        vec2 kUv = mix(uv, clamp(vec2(cos(a), sin(a)) * r / vec2(aspect, 1.0) + 0.5, 0.0, 1.0), kAmt);
        prevOut = samplePrev(kUv);
        currRaw = sampleCurr(kUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 51: // crtShutdown
      return `
        float sy = p < 0.5 ? max(0.02, 1.0 - p * 2.0) : max(0.02, (p - 0.5) * 2.0);
        float sx = p < 0.5 ? 1.0 - pow(p * 2.0, 3.0) * 0.8 : 0.2 + pow((p - 0.5) * 2.0, 0.5) * 0.8;
        vec2 tUv = (uv - 0.5) / vec2(sx, sy) + 0.5;
        float m = boxMask(tUv);
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = mix(vec4(0.0, 0.0, 0.0, 1.0), samplePrev(tUv), m);
        } else {
          prevOut = vec4(0.0, 0.0, 0.0, 1.0);
          currRaw = sampleCurr(tUv);
          blendMode = 2;
          mixFactor = m;
        }
        postAdd = vec3(0.6, 0.8, 1.0) * exp(-abs(uv.y - 0.5) * 60.0) * sin(p * PI);
      `;
    case 52: // vaporwave
      return `
        float line = sin(uv.y * 120.0 - p * 20.0) * 0.5 + 0.5;
        float mask = smoothstep(sp - 0.1, sp + 0.1, uv.y + (line - 0.5) * 0.08);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - mask;
        vec3 neon = mix(vec3(1.0, 0.2, 0.8), vec3(0.1, 0.9, 1.0), uv.x);
        postAdd = neon * sin(p * PI) * 0.35;
      `;
    case 53: // rippleDrop
      return `
        vec2 cp = (uv - 0.5) * vec2(aspect, 1.0);
        float d = length(cp);
        float wave = sin(d * 35.0 - p * 22.0) * 0.04 * sin(p * PI) * smoothstep(0.9, 0.0, d);
        vec2 rUv = clamp(uv + normalize(cp + vec2(0.0001)) * wave, 0.0, 1.0);
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 54: // mosaicGrid
      return `
        vec2 grid = vec2(8.0 * aspect, 8.0);
        vec2 cellId = floor(uv * grid);
        float delay = rand(cellId) * 0.5;
        float localP = clamp((p - delay) / 0.5, 0.0, 1.0);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = localP;
      `;
    case 55: // panDiagonalTL
      return getWhipPanBody(1.0, 1.0, 'samplePos.x >= 1.0 && samplePos.y >= 1.0');
    case 56: // panDiagonalTR
      return getWhipPanBody(-1.0, 1.0, 'samplePos.x < 0.0 && samplePos.y >= 1.0');
    case 57: // snapZoomIn
      return `
        float overshoot = sin(p * PI) * 0.18;
        float sPrev = 1.0 + sp * 1.4;
        float sCurr = max(0.25, 0.55 + sp * 0.45 + overshoot);
        vec2 pUv = (uv - 0.5) / sPrev + 0.5;
        vec2 cUv = (uv - 0.5) / sCurr + 0.5;
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(cUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.32, 0.68, p);
      `;
    case 58: // snapZoomOut
      return `
        float sPrev = max(0.25, 1.0 - sp * 0.65);
        float sCurr = 1.8 - sp * 0.8 + sin(p * PI) * 0.12;
        vec2 pUv = (uv - 0.5) / sPrev + 0.5;
        vec2 cUv = (uv - 0.5) / sCurr + 0.5;
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(cUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.32, 0.68, p);
      `;
    case 59: // tiltLeft
      return `
        float ang = (p < 0.5 ? -p * 0.55 : (1.0 - p) * 0.55);
        float s = 1.0 + sin(p * PI) * 0.25;
        float ca = cos(ang); float sa = sin(ang);
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0) / s;
        vec2 rUv = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) / vec2(aspect, 1.0) + 0.5;
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.35, 0.65, p);
      `;
    case 60: // tiltRight
      return `
        float ang = (p < 0.5 ? p * 0.55 : -(1.0 - p) * 0.55);
        float s = 1.0 + sin(p * PI) * 0.25;
        float ca = cos(ang); float sa = sin(ang);
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0) / s;
        vec2 rUv = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) / vec2(aspect, 1.0) + 0.5;
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.35, 0.65, p);
      `;
    case 61: // bounceDrop
      return `
        float t = p;
        float bounce = 1.0 - abs(cos(t * PI * 2.5)) * pow(max(0.0001, 1.0 - t), 1.6);
        float offsetY = (1.0 - bounce);
        vec2 cUv = vec2(uv.x, uv.y + offsetY);
        vec2 pUv = vec2(uv.x, uv.y - bounce * 0.35);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(cUv);
        blendMode = 2;
        mixFactor = boxMask(cUv) * smoothstep(0.0, 0.15, p);
      `;
    case 62: // bounceRise
      return `
        float t = p;
        float bounce = 1.0 - abs(cos(t * PI * 2.5)) * pow(max(0.0001, 1.0 - t), 1.6);
        float offsetY = (1.0 - bounce);
        vec2 cUv = vec2(uv.x, uv.y - offsetY);
        vec2 pUv = vec2(uv.x, uv.y + bounce * 0.35);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(cUv);
        blendMode = 2;
        mixFactor = boxMask(cUv) * smoothstep(0.0, 0.15, p);
      `;
    case 63: // crashZoom
      return `
        float burst = pow(max(0.0001, sin(p * PI)), 1.5);
        float s = p < 0.5 ? 1.0 + p * 3.0 : 2.5 - (p - 0.5) * 3.0;
        vec2 zUv = (uv - 0.5) / max(0.3, s) + 0.5;
        float ca = burst * 0.025;
        vec2 dir = uv - 0.5;
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = vec4(
            samplePrev(zUv + dir * ca).r,
            samplePrev(zUv).g,
            samplePrev(zUv - dir * ca).b,
            1.0
          );
        } else {
          currRaw = vec4(
            sampleCurr(zUv + dir * ca).r,
            sampleCurr(zUv).g,
            sampleCurr(zUv - dir * ca).b,
            sampleCurr(zUv).a
          );
          blendMode = u_hasPrevImage == 1 ? 1 : 3;
          mixFactor = smoothstep(0.0, 0.5, p);
        }
      `;
    case 64: // pullBackRotate
      return `
        float bell = sin(p * PI);
        float s = 1.0 - bell * 0.38;
        float ang = (p - 0.5) * 0.9;
        float ca = cos(ang); float sa = sin(ang);
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0) / s;
        vec2 rUv = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) / vec2(aspect, 1.0) + 0.5;
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 65: // focusPull
      return `
        float blurAmt = sin(p * PI) * 0.018;
        vec4 accP = vec4(0.0);
        vec4 accC = vec4(0.0);
        for (int i = -2; i <= 2; i++) {
          float fi = float(i);
          accP += samplePrev(uv + vec2(fi * blurAmt, fi * blurAmt * 0.5));
          accC += sampleCurr(uv + vec2(-fi * blurAmt, fi * blurAmt * 0.5));
        }
        prevOut = accP / 5.0;
        currRaw = accC / 5.0;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 66: // fisheyePop
      return `
        vec2 d = uv - 0.5;
        float r = length(d);
        float strength = sin(p * PI) * 1.4;
        float nr = r * (1.0 + strength * r * r);
        vec2 fUv = 0.5 + (r > 0.0001 ? d * (nr / r) : vec2(0.0));
        prevOut = samplePrev(fUv);
        currRaw = sampleCurr(fUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 67: // hyperLapse
      return `
        vec2 d = uv - 0.5;
        float bell = sin(p * PI);
        vec4 accP = vec4(0.0);
        vec4 accC = vec4(0.0);
        for (int i = 0; i < 6; i++) {
          float t = float(i) / 5.0;
          float z = 1.0 + t * bell * 0.45;
          vec2 zUv = 0.5 + d / z;
          accP += samplePrev(zUv);
          accC += sampleCurr(zUv);
        }
        prevOut = accP / 6.0;
        currRaw = accC / 6.0;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 68: // solarFlare
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float d = length((uv - 0.5) * vec2(aspect, 1.0));
        float flare = exp(-d * 3.2) * sin(p * PI) * 1.3;
        postAdd = vec3(1.0, 0.78, 0.35) * flare;
      `;
    case 69: // neonPulse
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float pulse = sin(p * PI);
        float ring = smoothstep(0.12, 0.0, abs(length((uv - 0.5) * vec2(aspect, 1.0)) - p * 0.9));
        postAdd = mix(vec3(1.0, 0.1, 0.85), vec3(0.0, 0.95, 1.0), uv.x) * (pulse * 0.3 + ring * 0.75);
      `;
    case 70: // warmSunset
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float glow = sin(p * PI);
        postMul = mix(vec3(1.0), vec3(1.15, 0.85, 0.65), glow * 0.6);
        postAdd = vec3(0.45, 0.18, 0.02) * glow * (1.0 - uv.y * 0.5);
      `;
    case 71: // arcticFreeze
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float ice = sin(p * PI);
        postMul = mix(vec3(1.0), vec3(0.8, 1.05, 1.25), ice * 0.65);
        postAdd = vec3(0.25, 0.55, 0.85) * ice * 0.45;
      `;
    case 72: // goldenBokeh
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float b = 0.0;
        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          vec2 pos = vec2(0.15 + fract(fi * 0.37) * 0.7, 0.2 + fract(fi * 0.61) * 0.6);
          float d = length((uv - pos) * vec2(aspect, 1.0));
          b += smoothstep(0.16, 0.05, d) * 0.35;
        }
        postAdd = vec3(1.0, 0.82, 0.38) * b * sin(p * PI);
      `;
    case 73: // strobeFlash
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = step(0.5, p);
        float s1 = pow(max(0.0001, sin(p * PI * 2.0)), 2.0);
        float s2 = sin(p * PI);
        postAdd = vec3(1.0) * max(s1 * 0.85, s2 * 0.45);
      `;
    case 74: // cinemaCurtain
      return `
        float open = smoothstep(0.0, 0.5, p);
        float close = 1.0 - smoothstep(0.5, 1.0, p);
        float dist = abs(uv.x - 0.5);
        float mask = p < 0.5 ? step(dist, 0.5 * (1.0 - open)) : step(dist, 0.5 * (1.0 - close));
        if (p < 0.5 && u_hasPrevImage == 1) {
          color = samplePrev(uv) * mask;
        } else {
          currRaw = sampleCurr(uv) * mask;
          blendMode = 1;
        }
        postAdd = vec3(0.35, 0.22, 0.08) * sin(p * PI) * 0.3;
      `;
    case 75: // sepiaDream
      return `
        vec4 pCol = samplePrev(uv);
        vec4 cCol = sampleCurr(uv);
        float bell = sin(p * PI);
        vec4 mixed = u_hasPrevImage == 1 ? mix(pCol, cCol, sp) : vec4(cCol.rgb, cCol.a * sp);
        float lum = dot(mixed.rgb, vec3(0.299, 0.587, 0.114));
        vec3 sep = vec3(lum * 1.15, lum * 0.95, lum * 0.72);
        color = vec4(mix(mixed.rgb, sep, bell * 0.85), mixed.a);
      `;
    case 76: // auroraGlow
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float wave = sin(uv.x * 8.0 + p * 6.0) * 0.5 + 0.5;
        float band = exp(-abs(uv.y - (0.3 + wave * 0.4)) * 6.0) * sin(p * PI);
        postAdd = mix(vec3(0.1, 0.95, 0.55), vec3(0.55, 0.2, 0.95), uv.x) * band * 0.85;
      `;
    case 77: // emberSpark
      return `
        vec4 pCol = samplePrev(uv);
        vec4 cCol = sampleCurr(uv);
        float n = noise(uv * 10.0) * 0.65 + dot(pCol.rgb, vec3(0.333)) * 0.35;
        float m = smoothstep(sp - 0.12, sp + 0.02, n);
        float edge = smoothstep(0.0, 0.08, m) * smoothstep(1.0, 0.92, m);
        prevOut = pCol;
        currRaw = cCol;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
        postAdd = vec3(1.0, 0.38, 0.05) * edge * 2.2;
      `;
    case 78: // moonlightFade
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float moon = sin(p * PI);
        postMul = mix(vec3(1.0), vec3(0.55, 0.68, 0.95), moon * 0.7);
        postAdd = vec3(0.08, 0.14, 0.28) * moon * 0.45;
      `;
    case 79: // haloBurst
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        float d = length((uv - 0.5) * vec2(aspect, 1.0));
        float halo = exp(-abs(d - sp * 0.85) * 14.0) * sin(p * PI);
        postAdd = vec3(1.0, 0.96, 0.88) * halo * 1.1;
      `;
    case 80: // hexGrid
      return `
        vec2 g = uv * vec2(10.0 * aspect, 10.0);
        g.x += mod(floor(g.y), 2.0) * 0.5;
        vec2 id = floor(g);
        float delay = rand(id) * 0.55;
        float lp = smoothstep(0.0, 0.45, p - delay);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = lp;
      `;
    case 81: // spiralWipe
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float r = length(d);
        float ang = (atan(d.y, d.x + 0.0001) + PI) / (2.0 * PI);
        float spiral = fract(ang + r * 2.5);
        float m = smoothstep(sp - 0.08, sp + 0.08, spiral);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 82: // radialSlices
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float ang = (atan(d.y, d.x + 0.0001) + PI) / (2.0 * PI);
        float slice = fract(ang * 8.0);
        float m = smoothstep(sp - 0.05, sp + 0.05, slice);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 83: // verticalBlinds
      return `
        float slat = fract(uv.x * 10.0);
        float m = smoothstep(sp - 0.05, sp + 0.05, slat);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 84: // diagonalBlinds
      return `
        float slat = fract((uv.x + uv.y) * 7.0);
        float m = smoothstep(sp - 0.05, sp + 0.05, slat);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 85: // checkerboard
      return `
        vec2 cell = floor(uv * vec2(8.0 * aspect, 8.0));
        float chk = mod(cell.x + cell.y, 2.0);
        float threshold = chk * 0.4;
        float lp = smoothstep(threshold, threshold + 0.6, sp);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = lp;
      `;
    case 86: // splitHorizontal
      return `
        float halfShift = sp * 0.55;
        vec2 pUv = uv.y < 0.5 ? vec2(uv.x, uv.y + halfShift) : vec2(uv.x, uv.y - halfShift);
        bool showPrev = (uv.y < 0.5 - halfShift || uv.y > 0.5 + halfShift) && u_hasPrevImage == 1;
        if (showPrev) {
          color = samplePrev(pUv);
        } else {
          currRaw = sampleCurr(uv);
          blendMode = u_hasPrevImage == 1 ? 1 : 3;
          mixFactor = smoothstep(0.0, 0.35, sp);
        }
      `;
    case 87: // splitVertical
      return `
        float halfShift = sp * 0.55;
        vec2 pUv = uv.x < 0.5 ? vec2(uv.x + halfShift, uv.y) : vec2(uv.x - halfShift, uv.y);
        bool showPrev = (uv.x < 0.5 - halfShift || uv.x > 0.5 + halfShift) && u_hasPrevImage == 1;
        if (showPrev) {
          color = samplePrev(pUv);
        } else {
          currRaw = sampleCurr(uv);
          blendMode = u_hasPrevImage == 1 ? 1 : 3;
          mixFactor = smoothstep(0.0, 0.35, sp);
        }
      `;
    case 88: // squeezeHorizontal
      return `
        if (p < 0.5 && u_hasPrevImage == 1) {
          float sx = max(0.02, 1.0 - p * 2.0);
          vec2 pUv = vec2((uv.x - 0.5) / sx + 0.5, uv.y);
          color = samplePrev(pUv) * boxMask(pUv);
        } else {
          float sx = max(0.02, (p - 0.5) * 2.0);
          vec2 cUv = vec2((uv.x - 0.5) / sx + 0.5, uv.y);
          currRaw = sampleCurr(cUv);
          blendMode = 1;
        }
      `;
    case 89: // squeezeVertical
      return `
        if (p < 0.5 && u_hasPrevImage == 1) {
          float sy = max(0.02, 1.0 - p * 2.0);
          vec2 pUv = vec2(uv.x, (uv.y - 0.5) / sy + 0.5);
          color = samplePrev(pUv) * boxMask(pUv);
        } else {
          float sy = max(0.02, (p - 0.5) * 2.0);
          vec2 cUv = vec2(uv.x, (uv.y - 0.5) / sy + 0.5);
          currRaw = sampleCurr(cUv);
          blendMode = 1;
        }
      `;
    case 90: // boxZoom3D
      return `
        float sPrev = max(0.2, 1.0 - sp * 0.55);
        vec2 pUv = (uv - 0.5) / sPrev + 0.5 - vec2(sp * 0.35, 0.0);
        vec2 cUv = (uv - 0.5) / (0.6 + sp * 0.4) + 0.5 + vec2((1.0 - sp) * 0.55, 0.0);
        if (boxMask(cUv) > 0.5 && sp > 0.25) {
          currRaw = sampleCurr(cUv);
          blendMode = 1;
        } else if (u_hasPrevImage == 1) {
          color = samplePrev(pUv) * boxMask(pUv);
        }
      `;
    case 91: // irisDiamondSpin
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float ang = sp * 1.5708;
        float ca = cos(ang); float sa = sin(ang);
        vec2 rd = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
        float manhattan = abs(rd.x) + abs(rd.y);
        float m = smoothstep(sp * 1.5 - 0.05, sp * 1.5 + 0.05, manhattan);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 92: // crossHatch
      return `
        float hx = abs(fract(uv.x * 12.0) - 0.5) * 2.0;
        float hy = abs(fract(uv.y * 12.0) - 0.5) * 2.0;
        float hatch = min(hx, hy);
        float m = smoothstep(sp - 0.08, sp + 0.08, hatch);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 93: // pixelMelt
      return `
        float col = floor(uv.x * 48.0);
        float drop = rand(vec2(col, 1.0)) * 0.65 * sp;
        vec2 pUv = vec2(uv.x, uv.y - drop * 1.5);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.0, 0.85, sp - rand(vec2(col, 2.0)) * 0.3);
      `;
    case 94: // chromaticBurst
      return `
        float split = sin(p * PI) * 0.045;
        vec2 dir = uv - 0.5;
        vec4 pCol = vec4(
          samplePrev(uv + dir * split).r,
          samplePrev(uv).g,
          samplePrev(uv - dir * split).b,
          1.0
        );
        vec4 cCol = vec4(
          sampleCurr(uv + dir * split).r,
          sampleCurr(uv).g,
          sampleCurr(uv - dir * split).b,
          sampleCurr(uv).a
        );
        prevOut = pCol;
        currRaw = cCol;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 95: // staticNoise
      return `
        float bell = sin(p * PI);
        float grain = rand(uv * 180.0 + vec2(p * 37.0, p * 53.0));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = step(0.5, p);
        float staticMix = smoothstep(0.15, 0.5, bell);
        postMul = vec3(1.0 - staticMix * 0.65);
        postAdd = vec3(grain) * staticMix * 0.85;
      `;
    case 96: // scanlineTear
      return `
        float band = floor(uv.y * 28.0);
        float dir = mod(band, 2.0) * 2.0 - 1.0;
        float tear = sin(p * PI) * 0.14 * dir * rand(vec2(band, floor(p * 12.0)));
        vec2 tUv = vec2(fract(uv.x + tear), uv.y);
        prevOut = samplePrev(tUv);
        currRaw = sampleCurr(tUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 97: // vhsRewind
      return `
        float roll = fract(uv.y + p * 1.5);
        float band = smoothstep(0.08, 0.0, abs(fract(uv.y * 3.0 - p * 4.0) - 0.5));
        float shift = (rand(vec2(floor(uv.y * 60.0), p)) - 0.5) * 0.06 * sin(p * PI);
        vec2 vUv = vec2(clamp(uv.x + shift + band * 0.04, 0.0, 1.0), roll);
        prevOut = samplePrev(vUv);
        currRaw = sampleCurr(vUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(0.75, 0.8, 0.9) * band * sin(p * PI) * 0.4;
      `;
    case 98: // cyberSlice
      return `
        float row = floor(uv.y * 14.0);
        float delay = rand(vec2(row, 4.0)) * 0.45;
        float lp = clamp((p - delay) / 0.55, 0.0, 1.0);
        float shift = (1.0 - lp) * sin(lp * PI) * 0.18 * (mod(row, 2.0) * 2.0 - 1.0);
        prevOut = samplePrev(vec2(clamp(uv.x - shift, 0.0, 1.0), uv.y));
        currRaw = sampleCurr(vec2(clamp(uv.x + shift, 0.0, 1.0), uv.y));
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = lp;
        postAdd = vec3(0.0, 0.9, 1.0) * sin(lp * PI) * 0.25;
      `;
    case 99: // datamosh
      return `
        vec2 block = floor(uv * vec2(16.0, 12.0));
        float n = rand(block);
        vec2 moshOffset = vec2(n - 0.5, rand(block + 7.0) - 0.5) * 0.18 * sin(p * PI);
        vec2 mUv = clamp(uv + moshOffset, 0.0, 1.0);
        prevOut = samplePrev(mUv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(n * 0.5, n * 0.5 + 0.5, p);
      `;
    case 100: // matrixRain
      return `
        float col = floor(uv.x * 36.0);
        float speed = 0.6 + rand(vec2(col, 3.0)) * 0.8;
        float head = 1.0 - p * speed * 1.4;
        float m = smoothstep(head - 0.08, head + 0.08, uv.y);
        float trail = smoothstep(0.18, 0.0, abs(uv.y - head)) * sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
        postAdd = vec3(0.1, 1.0, 0.35) * trail * 0.95;
      `;
    case 101: // shockwave
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float r = length(d);
        float ring = exp(-abs(r - sp * 0.95) * 18.0);
        vec2 dir = r > 0.0001 ? d / r : vec2(0.0);
        vec2 sUv = clamp(uv + dir * ring * 0.055 * sin(p * PI), 0.0, 1.0);
        prevOut = samplePrev(sUv);
        currRaw = sampleCurr(sUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(r - 0.08, r + 0.08, sp * 0.95);
        postAdd = vec3(0.5, 0.85, 1.0) * ring * sin(p * PI) * 0.35;
      `;
    case 102: // mirrorFlip
      return `
        float fold = sin(p * PI);
        vec2 mUv = mix(uv, abs(uv - 0.5) * 2.0, fold * 0.65);
        prevOut = samplePrev(mUv);
        currRaw = sampleCurr(mUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 103: // liquidSwirl
      return `
        vec2 d = uv - 0.5;
        float r = length(d);
        float ang = sin(p * PI) * 3.8 * smoothstep(0.75, 0.0, r);
        float ca = cos(ang); float sa = sin(ang);
        vec2 sUv = clamp(0.5 + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca), 0.0, 1.0);
        prevOut = samplePrev(sUv);
        currRaw = sampleCurr(sUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 104: // quantumDissolve
      return `
        float n = rand(floor(uv * vec2(120.0, 70.0)));
        float m = smoothstep(sp - 0.08, sp + 0.08, n);
        float spark = (1.0 - abs(m * 2.0 - 1.0)) * sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
        postAdd = mix(vec3(0.0, 0.95, 1.0), vec3(0.7, 0.25, 1.0), n) * spark * 0.9;
      `;

    // ── 105..124: CAMERA / BLUR (20) ───────────────────────────────────────
    case 105: // whipZoomLeft
    case 106: // whipZoomRight
    case 107: // whipZoomUp
    case 108: { // whipZoomDown
      const dirs: Record<number, [number, number]> = {
        105: [1, 0], 106: [-1, 0], 107: [0, 1], 108: [0, -1],
      };
      const [dx, dy] = dirs[transTypeId];
      return `
        float vel = sin(p * PI);
        float z = 1.0 + vel * 0.35;
        vec2 cUv = (uv - 0.5) / z + 0.5;
        vec2 shift = vec2(${dx.toFixed(1)}, ${dy.toFixed(1)}) * (p < 0.5 ? p * 2.0 : (p - 1.0) * 2.0) * 0.55;
        vec2 pUv = clamp(cUv + shift, 0.0, 1.0);
        vec2 nUv = clamp(cUv + shift, 0.0, 1.0);
        prevOut = (samplePrev(pUv) + samplePrev(pUv + vec2(${dx.toFixed(1)}, ${dy.toFixed(1)}) * vel * 0.025)) * 0.5;
        currRaw = (sampleCurr(nUv) + sampleCurr(nUv - vec2(${dx.toFixed(1)}, ${dy.toFixed(1)}) * vel * 0.025)) * 0.5;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.35, 0.65, p);
      `;
    }
    case 109: // smoothPanLeft
    case 110: // smoothPanRight
    case 111: // smoothPanUp
    case 112: { // smoothPanDown
      const dirs: Record<number, [number, number]> = {
        109: [1, 0], 110: [-1, 0], 111: [0, 1], 112: [0, -1],
      };
      const [dx, dy] = dirs[transTypeId];
      return `
        vec2 d = vec2(${dx.toFixed(1)}, ${dy.toFixed(1)});
        vec2 pUv = uv + d * sp;
        vec2 nUv = uv + d * (sp - 1.0);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(nUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = step(0.0, nUv.x) * step(nUv.x, 1.0) * step(0.0, nUv.y) * step(nUv.y, 1.0);
      `;
    }
    case 113: // spiralZoomIn
    case 114: { // spiralZoomOut
      const dir = transTypeId === 113 ? 1.0 : -1.0;
      return `
        vec2 d = uv - 0.5;
        float ang = sin(p * PI) * 2.4 * ${dir.toFixed(1)};
        float sc = 1.0 + sin(p * PI) * 0.65 * ${dir.toFixed(1)};
        float ca = cos(ang); float sa = sin(ang);
        vec2 rUv = 0.5 + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca) / max(0.25, sc);
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    }
    case 115: // elasticZoomIn
    case 116: { // elasticZoomOut
      const s = transTypeId === 115 ? 1.0 : -1.0;
      return `
        float bounce = sin(p * PI * 2.5) * (1.0 - p) * 0.25 * ${s.toFixed(1)};
        float zPrev = max(0.3, 1.0 + sp * 0.8 * ${s.toFixed(1)} + bounce);
        float zCurr = max(0.3, 1.0 - (1.0 - sp) * 0.5 * ${s.toFixed(1)} + bounce);
        prevOut = samplePrev(0.5 + (uv - 0.5) / zPrev);
        currRaw = sampleCurr(0.5 + (uv - 0.5) / zCurr);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    }
    case 117: // swayLeft
    case 118: { // swayRight
      const s = transTypeId === 117 ? -1.0 : 1.0;
      return `
        float ang = sin(p * PI) * 0.28 * ${s.toFixed(1)};
        vec2 d = uv - 0.5;
        float ca = cos(ang); float sa = sin(ang);
        vec2 rUv = 0.5 + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
        rUv.x += sin(p * PI) * 0.08 * ${s.toFixed(1)};
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    }
    case 119: // tiltDrop
    case 120: { // tiltRise
      const s = transTypeId === 119 ? 1.0 : -1.0;
      return `
        float yShift = sin(p * PI) * 0.22 * ${s.toFixed(1)};
        float z = 1.0 + sin(p * PI) * 0.18;
        vec2 tUv = 0.5 + (uv - 0.5) / z + vec2(0.0, yShift);
        prevOut = samplePrev(tUv);
        currRaw = sampleCurr(tUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    }
    case 121: // microShake
      return `
        float env = sin(p * PI);
        vec2 j = vec2(sin(p * 65.0), cos(p * 53.0)) * 0.025 * env;
        prevOut = samplePrev(uv + j);
        currRaw = sampleCurr(uv - j);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 122: // vertigoPull
      return `
        float z1 = 1.0 + sp * 0.7;
        float z2 = 1.4 - sp * 0.4;
        prevOut = samplePrev(0.5 + (uv - 0.5) / z1);
        currRaw = sampleCurr(0.5 + (uv - 0.5) / z2);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 123: // cinematicDrift
      return `
        vec2 pUv = uv + vec2(sp * 0.12, -sp * 0.04);
        vec2 nUv = uv - vec2((1.0 - sp) * 0.12, -(1.0 - sp) * 0.04);
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(nUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 124: // speedRamp
      return `
        float warp = pow(p, 0.55);
        float blur = sin(p * PI) * 0.04;
        vec2 sUv = 0.5 + (uv - 0.5) * (1.0 - sin(p * PI) * 0.25);
        prevOut = (samplePrev(sUv) + samplePrev(sUv + vec2(blur, 0.0))) * 0.5;
        currRaw = (sampleCurr(sUv) + sampleCurr(sUv - vec2(blur, 0.0))) * 0.5;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(0.0, 1.0, warp);
      `;

    // ── 125..144: LIGHT & CINEMA (20) ──────────────────────────────────────
    case 125: // warmFlash
    case 126: // coolFlash
    case 127: // goldLeak
    case 128: // crimsonFlare
    case 129: // blueFlare
    case 130: { // amberBurn
      const cols: Record<number, [number, number, number]> = {
        125: [1.0, 0.72, 0.35],
        126: [0.45, 0.82, 1.0],
        127: [1.0, 0.85, 0.25],
        128: [1.0, 0.22, 0.28],
        129: [0.22, 0.55, 1.0],
        130: [1.0, 0.45, 0.08],
      };
      const [r, g, b] = cols[transTypeId];
      return `
        float flash = pow(sin(p * PI), 1.6);
        float grad = smoothstep(1.2, 0.0, length(uv - vec2(0.5 + sin(p * 3.14) * 0.25, 0.5)));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = vec3(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}) * flash * (0.55 + 0.65 * grad);
      `;
    }
    case 131: // whiteBloom
      return `
        float bloom = pow(sin(p * PI), 1.4);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(bloom * 0.95);
      `;
    case 132: // darkVignette
      return `
        float d = length((uv - 0.5) * vec2(aspect, 1.0));
        float vig = smoothstep(1.0 - sin(p * PI) * 0.85, 0.1, d);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = step(0.5, p);
        postMul = vec3(mix(1.0, vig, sin(p * PI)));
      `;
    case 133: // filmFlash
      return `
        float f = pow(sin(p * PI), 2.2) * (0.8 + 0.3 * sin(p * 40.0));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(1.0, 0.95, 0.82) * f;
      `;
    case 134: // prismGlow
      return `
        float f = sin(p * PI);
        vec2 off = vec2(0.018 * f, 0.0);
        prevOut = vec4(samplePrev(uv + off).r, samplePrev(uv).g, samplePrev(uv - off).b, 1.0);
        currRaw = vec4(sampleCurr(uv + off).r, sampleCurr(uv).g, sampleCurr(uv - off).b, 1.0);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = vec3(0.4, 0.25, 0.6) * f * 0.5;
      `;
    case 135: // sunsetWash
      return `
        float f = sin(p * PI);
        vec3 wash = mix(vec3(1.0, 0.38, 0.18), vec3(0.62, 0.15, 0.55), uv.y);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = wash * f * 0.8;
      `;
    case 136: // neonFlash
      return `
        float f = pow(sin(p * PI), 1.5);
        vec3 neon = mix(vec3(0.0, 1.0, 0.95), vec3(1.0, 0.1, 0.85), uv.x);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = neon * f * 0.85;
      `;
    case 137: // softOverexpose
      return `
        float f = sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postGamma = mix(1.0, 0.35, f);
        postAdd = vec3(f * 0.35);
      `;
    case 138: // shadowSweep
      return `
        float edge = sp * 1.4 - 0.2;
        float sh = smoothstep(edge - 0.25, edge + 0.25, uv.x);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - sh;
        postMul = vec3(1.0 - 0.65 * exp(-pow((uv.x - edge) * 6.0, 2.0)) * sin(p * PI));
      `;
    case 139: // dreamyMist
      return `
        float f = sin(p * PI);
        float n = noise(uv * 6.0 + vec2(p * 2.0, 0.0));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = vec3(0.85, 0.88, 1.0) * f * n * 0.75;
      `;
    case 140: // starburstFlash
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float ang = atan(d.y, d.x);
        float rays = pow(abs(cos(ang * 6.0)), 6.0) * smoothstep(0.8, 0.0, length(d));
        float f = sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(1.0, 0.92, 0.7) * (rays + 0.35) * f;
      `;
    case 141: // candleFlicker
      return `
        float fl = 0.7 + 0.3 * sin(p * 38.0);
        float f = sin(p * PI) * fl;
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postMul = vec3(1.0 - 0.5 * f);
        postAdd = vec3(1.0, 0.55, 0.15) * f * 0.45;
      `;
    case 142: // cinemaFadeOut
      return `
        float dip = 1.0 - sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = step(0.5, p);
        postMul = vec3(dip * dip);
      `;
    case 143: // retroBurn
      return `
        float n = noise(uv * 5.0);
        float mask = smoothstep(sp - 0.15, sp + 0.15, n);
        float edge = smoothstep(0.0, 0.12, abs(n - sp));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - mask;
        postAdd = vec3(1.0, 0.35, 0.05) * (1.0 - edge) * sin(p * PI) * 1.1;
      `;
    case 144: // auroraSweep
      return `
        float f = sin(p * PI);
        float wave = 0.5 + 0.5 * sin(uv.x * 8.0 + uv.y * 4.0 + p * 6.0);
        vec3 aur = mix(vec3(0.1, 0.95, 0.65), vec3(0.55, 0.25, 1.0), wave);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = aur * f * 0.65;
      `;

    // ── 145..164: 3D & SHAPES (20) ─────────────────────────────────────────
    case 145: // cubeUp3D
    case 146: { // cubeDown3D
      const dir = transTypeId === 145 ? 1.0 : -1.0;
      return `
        float yCut = ${dir > 0 ? '1.0 - sp' : 'sp'};
        bool showCurr = ${dir > 0 ? 'uv.y >= yCut' : 'uv.y <= yCut'};
        if (showCurr) {
          float h = ${dir > 0 ? 'max(0.05, sp)' : 'max(0.05, sp)'};
          float localY = ${dir > 0 ? '(uv.y - yCut) / h' : 'uv.y / max(0.05, yCut)'};
          float persp = 1.0 + (1.0 - sp) * 0.25 * (localY - 0.5);
          currRaw = sampleCurr(vec2(0.5 + (uv.x - 0.5) * persp, localY)) * (0.75 + 0.25 * sp);
          blendMode = 1;
        } else {
          float h = max(0.05, 1.0 - sp);
          float localY = ${dir > 0 ? 'uv.y / h' : '(uv.y - yCut) / h'};
          float persp = 1.0 + sp * 0.25 * (localY - 0.5);
          prevOut = samplePrev(vec2(0.5 + (uv.x - 0.5) * persp, localY)) * (1.0 - 0.25 * sp);
          currRaw = prevOut;
          blendMode = 1;
        }
      `;
    }
    case 147: { // flipHorizontal3D
      return `
        float ca = abs(cos(sp * PI));
        vec2 fUv = vec2(0.5 + (uv.x - 0.5) / max(0.04, ca), uv.y);
        if (sp < 0.5) {
          currRaw = samplePrev(fUv) * (0.6 + 0.4 * ca);
        } else {
          currRaw = sampleCurr(fUv) * (0.6 + 0.4 * ca);
        }
        blendMode = 1;
      `;
    }
    case 148: // swingDoorLeft
    case 149: { // swingDoorRight
      const fromLeft = transTypeId === 148;
      return `
        float w = max(0.02, 1.0 - sp);
        float px = ${fromLeft ? 'uv.x / w' : '(uv.x - sp) / w'};
        if (px >= 0.0 && px <= 1.0) {
          prevOut = samplePrev(vec2(px, uv.y)) * (1.0 - sp * 0.3);
          currRaw = prevOut;
          blendMode = 1;
        } else {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        }
      `;
    }
    case 150: // foldVertical
    case 151: { // foldHorizontal
      const horiz = transTypeId === 151;
      return `
        float halfSpan = max(0.02, 1.0 - sp);
        float coord = ${horiz ? 'uv.x' : 'uv.y'};
        float d = abs(coord - 0.5) * 2.0;
        if (d < halfSpan) {
          float mapped = 0.5 + (coord - 0.5) / halfSpan;
          currRaw = samplePrev(${horiz ? 'vec2(mapped, uv.y)' : 'vec2(uv.x, mapped)'}) * (1.0 - sp * 0.25);
          blendMode = 1;
        } else {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        }
      `;
    }
    case 152: // zoomRotate3D
      return `
        float ang = sp * PI * 2.0;
        float ca = cos(ang); float sa = sin(ang);
        float sc = 1.0 - sin(p * PI) * 0.55;
        vec2 d = (uv - 0.5) / max(0.2, sc);
        vec2 rUv = 0.5 + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 153: // cardFlipLeft
    case 154: { // cardFlipRight
      const s = transTypeId === 153 ? 1.0 : -1.0;
      return `
        float ca = abs(cos(sp * PI));
        float skew = sin(sp * PI) * 0.15 * ${s.toFixed(1)} * (uv.y - 0.5);
        vec2 fUv = vec2(0.5 + (uv.x - 0.5) / max(0.04, ca) + skew, uv.y);
        currRaw = (sp < 0.5 ? samplePrev(fUv) : sampleCurr(fUv)) * (0.7 + 0.3 * ca);
        blendMode = 1;
      `;
    }
    case 155: // triangleOpen
      return `
        vec2 p2 = (uv - 0.5) * vec2(aspect, 1.0);
        float tri = max(abs(p2.x) * 0.866 + p2.y * 0.5, -p2.y);
        float m = smoothstep(sp * 0.9 - 0.03, sp * 0.9 + 0.03, tri);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 156: // hexagonOpen
      return `
        vec2 p2 = abs((uv - 0.5) * vec2(aspect, 1.0));
        float hex = max(p2.x * 0.866 + p2.y * 0.5, p2.y);
        float m = smoothstep(sp * 0.9 - 0.03, sp * 0.9 + 0.03, hex);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 157: // ovalOpen
      return `
        float d = length((uv - 0.5) * vec2(1.0, 1.5));
        float m = smoothstep(sp * 0.95 - 0.03, sp * 0.95 + 0.03, d);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 158: // crossOpen
      return `
        vec2 p2 = abs(uv - 0.5);
        float crossD = min(p2.x, p2.y);
        float m = smoothstep(sp * 0.52 - 0.02, sp * 0.52 + 0.02, crossD);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 159: // plusWipe
      return `
        vec2 p2 = abs((uv - 0.5) * vec2(aspect, 1.0));
        float d = max(min(p2.x, p2.y), max(p2.x, p2.y) * 0.45);
        float m = smoothstep(sp * 0.7 - 0.02, sp * 0.7 + 0.02, d);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 160: // bowtieOpen
      return `
        vec2 p2 = abs(uv - 0.5);
        float d = p2.y / max(0.05, p2.x + 0.1);
        float m = smoothstep(sp * 1.4 - 0.05, sp * 1.4 + 0.05, d * 0.35 + p2.x);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 161: // curtainPart
      return `
        float gap = sp * 0.52;
        float d = abs(uv.x - 0.5);
        if (d < gap) {
          currRaw = sampleCurr(uv);
          blendMode = 1;
        } else {
          float shift = (uv.x < 0.5 ? gap : -gap);
          prevOut = samplePrev(vec2(uv.x + shift, uv.y));
          currRaw = prevOut;
          blendMode = 1;
        }
      `;
    case 162: // shutterClose
      return `
        float blades = 6.0;
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float a = atan(d.y, d.x);
        float r = length(d) + 0.04 * sin(a * blades + sp * 4.0);
        float iris = smoothstep(sp * 0.9 - 0.02, sp * 0.9 + 0.02, r);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - iris;
      `;
    case 163: // spiralIris
      return `
        vec2 d = (uv - 0.5) * vec2(aspect, 1.0);
        float r = length(d);
        float a = atan(d.y, d.x) / (2.0 * PI) + 0.5;
        float val = fract(a + r * 1.5);
        float m = smoothstep(sp - 0.05, sp + 0.05, val * 0.5 + r * 0.6);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = 1.0 - m;
      `;
    case 164: // carousel3D
      return `
        float x1 = uv.x + sp;
        float x2 = uv.x - (1.0 - sp);
        if (x1 <= 1.0) {
          float scale = 1.0 - sp * 0.2;
          prevOut = samplePrev(vec2(x1, 0.5 + (uv.y - 0.5) / scale)) * (1.0 - sp * 0.25);
          currRaw = prevOut;
        } else {
          float scale = 0.8 + sp * 0.2;
          currRaw = sampleCurr(vec2(x2, 0.5 + (uv.y - 0.5) / scale)) * (0.75 + sp * 0.25);
        }
        blendMode = 1;
      `;

    // ── 165..184: GLITCH & WAVE (20) ───────────────────────────────────────
    case 165: // rgbJitter
      return `
        float f = sin(p * PI);
        vec2 off = vec2(0.035 * f * sin(p * 45.0), 0.01 * f);
        prevOut = vec4(samplePrev(uv + off).r, samplePrev(uv).g, samplePrev(uv - off).b, 1.0);
        currRaw = vec4(sampleCurr(uv - off).r, sampleCurr(uv).g, sampleCurr(uv + off).b, 1.0);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 166: // vhsGlitch
      return `
        float f = sin(p * PI);
        float band = step(0.75, rand(vec2(floor(uv.y * 28.0), floor(p * 24.0))));
        vec2 gUv = vec2(fract(uv.x + band * 0.14 * f), uv.y);
        prevOut = samplePrev(gUv);
        currRaw = sampleCurr(gUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(band * f * 0.25);
      `;
    case 167: // neonGlitch
      return `
        float f = sin(p * PI);
        float b = step(0.7, rand(vec2(floor(uv.y * 20.0), floor(p * 18.0))));
        vec2 gUv = vec2(fract(uv.x + b * 0.12 * f), uv.y);
        prevOut = samplePrev(gUv);
        currRaw = sampleCurr(gUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(0.0, 0.9, 1.0) * b * f * 0.45;
      `;
    case 168: // waveDistortH
    case 169: { // waveDistortV
      const horiz = transTypeId === 168;
      return `
        float f = sin(p * PI);
        float w = sin(${horiz ? 'uv.y' : 'uv.x'} * 22.0 + p * 12.0) * 0.06 * f;
        vec2 wUv = clamp(uv + ${horiz ? 'vec2(w, 0.0)' : 'vec2(0.0, w)'}, 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    }
    case 170: // waterRipple
      return `
        vec2 d = uv - 0.5;
        float dist = length(d);
        float w = sin(dist * 34.0 - p * 14.0) * 0.03 * sin(p * PI);
        vec2 rUv = clamp(uv + normalize(d + 0.0001) * w, 0.0, 1.0);
        prevOut = samplePrev(rUv);
        currRaw = sampleCurr(rUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 171: // plasmaWave
      return `
        float f = sin(p * PI);
        float w = sin(uv.x * 10.0 + p * 8.0) + cos(uv.y * 10.0 - p * 8.0);
        vec2 wUv = clamp(uv + vec2(w * 0.02 * f), 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = vec3(0.5 + 0.5 * sin(w), 0.2, 0.8) * f * 0.35;
      `;
    case 172: // pixelBlocks
      return `
        float f = sin(p * PI);
        float res = mix(180.0, 14.0, f);
        vec2 pUv = floor(uv * res) / res;
        prevOut = samplePrev(pUv);
        currRaw = sampleCurr(pUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 173: // mosaicSpin
      return `
        float f = sin(p * PI);
        float res = mix(160.0, 18.0, f);
        vec2 cell = floor(uv * res) / res;
        float ang = f * 1.2;
        vec2 d = cell - 0.5;
        float ca = cos(ang); float sa = sin(ang);
        vec2 mUv = clamp(0.5 + vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca), 0.0, 1.0);
        prevOut = samplePrev(mUv);
        currRaw = sampleCurr(mUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 174: // scanlineWipe
      return `
        float line = fract(uv.y * 36.0);
        float dir = step(0.5, fract(uv.y * 18.0));
        float thresh = dir > 0.5 ? uv.x : 1.0 - uv.x;
        float m = step(thresh, sp);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = m;
        postAdd = vec3(0.0, 0.85, 1.0) * (1.0 - line) * sin(p * PI) * 0.25;
      `;
    case 175: // cyberGrid
      return `
        float f = sin(p * PI);
        vec2 g = abs(fract(uv * vec2(12.0 * aspect, 12.0)) - 0.5);
        float grid = smoothstep(0.45, 0.5, max(g.x, g.y)) * f;
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(0.1, 0.9, 1.0) * grid * 0.8;
      `;
    case 176: // analogNoise
      return `
        float f = sin(p * PI);
        float n = rand(uv + vec2(p * 17.0, p * 31.0));
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postAdd = vec3(n) * f * 0.55;
      `;
    case 177: // signalDrop
      return `
        float f = sin(p * PI);
        float tear = sin(uv.y * 40.0 + p * 30.0) * 0.03 * f;
        prevOut = samplePrev(clamp(uv + vec2(tear, 0.0), 0.0, 1.0));
        currRaw = sampleCurr(clamp(uv - vec2(tear, 0.0), 0.0, 1.0));
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        postMul = vec3(1.0 - 0.4 * f * step(0.5, fract(uv.y * 60.0)));
      `;
    case 178: // chromaWave
      return `
        float f = sin(p * PI);
        float w = sin(uv.y * 16.0 + p * 10.0) * 0.025 * f;
        prevOut = vec4(samplePrev(uv + vec2(w, 0.0)).r, samplePrev(uv).g, samplePrev(uv - vec2(w, 0.0)).b, 1.0);
        currRaw = vec4(sampleCurr(uv + vec2(w, 0.0)).r, sampleCurr(uv).g, sampleCurr(uv - vec2(w, 0.0)).b, 1.0);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 179: // echoSplit
      return `
        float f = sin(p * PI) * 0.08;
        prevOut = (samplePrev(uv + vec2(f, 0.0)) + samplePrev(uv - vec2(f, 0.0))) * 0.5;
        currRaw = (sampleCurr(uv + vec2(f, 0.0)) + sampleCurr(uv - vec2(f, 0.0))) * 0.5;
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 180: // prismShift
      return `
        float f = sin(p * PI);
        vec2 off = vec2(0.03 * f, 0.015 * f);
        prevOut = vec4(samplePrev(uv + off).r, samplePrev(uv).g, samplePrev(uv - off).b, 1.0);
        currRaw = vec4(sampleCurr(uv - off).r, sampleCurr(uv).g, sampleCurr(uv + off).b, 1.0);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 181: // energyPulse
      return `
        float d = length((uv - 0.5) * vec2(aspect, 1.0));
        float ring = exp(-pow((d - sp * 0.9) * 14.0, 2.0)) * sin(p * PI);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = smoothstep(sp * 0.9 + 0.04, sp * 0.9 - 0.04, d);
        postAdd = vec3(0.35, 0.75, 1.0) * ring * 1.1;
      `;
    case 182: // warpTunnel
      return `
        vec2 d = uv - 0.5;
        float r = length(d) + 0.001;
        float f = sin(p * PI);
        vec2 wUv = clamp(0.5 + d * (1.0 - f * 0.45 / (r + 0.3)), 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
    case 183: // acidRipple
      return `
        float f = sin(p * PI);
        float w = sin(uv.x * 24.0 + p * 12.0) * cos(uv.y * 24.0 - p * 12.0) * 0.03 * f;
        vec2 wUv = clamp(uv + vec2(w, -w), 0.0, 1.0);
        prevOut = samplePrev(wUv);
        currRaw = sampleCurr(wUv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
        needScreen = true;
        screenCol = vec3(0.4, 1.0, 0.25) * f * 0.25;
      `;
    case 184: // digitalDissolve
      return `
        float n = rand(floor(uv * vec2(48.0, 28.0)));
        float m = step(n, sp);
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = m;
      `;

    // ── 185..204: WIPES & CUTS (20) ────────────────────────────────────────
    case 185: // wipeDiagBL
      return `
        float d = (uv.x + (1.0 - uv.y)) * 0.5;
        float m = smoothstep(sp - 0.02, sp + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 186: // wipeDiagBR
      return `
        float d = ((1.0 - uv.x) + (1.0 - uv.y)) * 0.5;
        float m = smoothstep(sp - 0.02, sp + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 187: // wedgeOpen
      return `
        vec2 d = uv - 0.5;
        float ang = abs(atan(d.y, d.x)) / PI;
        float m = smoothstep(sp - 0.03, sp + 0.03, ang);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 188: // venetian45
    case 189: { // venetian135
      const s = transTypeId === 188 ? 1.0 : -1.0;
      return `
        float stripes = fract((uv.x + uv.y * ${s.toFixed(1)}) * 8.0);
        float m = smoothstep(sp - 0.03, sp + 0.03, stripes);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    }
    case 190: // irisBox
      return `
        vec2 d = abs(uv - 0.5) * 2.0;
        float m = smoothstep(sp - 0.02, sp + 0.02, max(d.x, d.y));
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 191: // splitDiag
      return `
        float d = abs((uv.x + uv.y) * 0.5 - 0.5) * 2.0;
        float m = smoothstep(sp - 0.02, sp + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 192: // barsSweepH
    case 193: { // barsSweepV
      const horiz = transTypeId === 192;
      return `
        float idx = floor(${horiz ? 'uv.y' : 'uv.x'} * 6.0) / 6.0;
        float coord = ${horiz ? 'uv.x' : 'uv.y'};
        float m = smoothstep(sp * 1.4 - 0.2 - idx * 0.2, sp * 1.4 + 0.02 - idx * 0.2, coord);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    }
    case 194: // gridFade
      return `
        vec2 cell = floor(uv * vec2(8.0, 5.0)) / vec2(8.0, 5.0);
        float val = (cell.x + cell.y) * 0.5;
        float m = smoothstep(sp - 0.12, sp + 0.12, val);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 195: // radialSweepCCW
      return `
        vec2 d = uv - 0.5;
        float ang = 1.0 - (atan(d.y, d.x) / (2.0 * PI) + 0.5);
        float m = smoothstep(sp - 0.02, sp + 0.02, ang);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    case 196: // doubleWipeH
    case 197: { // doubleWipeV
      const horiz = transTypeId === 196;
      return `
        float d = 1.0 - abs(${horiz ? 'uv.x' : 'uv.y'} - 0.5) * 2.0;
        float m = smoothstep(sp - 0.02, sp + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    }
    case 198: // cornerTL
    case 199: // cornerTR
    case 200: // cornerBL
    case 201: { // cornerBR
      const cx = (transTypeId === 198 || transTypeId === 200) ? 0.0 : 1.0;
      const cy = (transTypeId === 198 || transTypeId === 199) ? 0.0 : 1.0;
      return `
        float d = length(uv - vec2(${cx.toFixed(1)}, ${cy.toFixed(1)})) / 1.42;
        float m = smoothstep(sp - 0.03, sp + 0.03, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    }
    case 202: // zigzagH
    case 203: { // zigzagV
      const horiz = transTypeId === 202;
      return `
        float zig = abs(fract(${horiz ? 'uv.y' : 'uv.x'} * 8.0) - 0.5) * 0.14;
        float d = ${horiz ? 'uv.x' : 'uv.y'} + zig;
        float m = smoothstep(sp * 1.15 - 0.02, sp * 1.15 + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    }
    case 204: // stepWipe
      return `
        float stepY = floor(uv.y * 8.0) / 8.0;
        float d = uv.x * 0.75 + stepY * 0.25;
        float m = smoothstep(sp - 0.02, sp + 0.02, d);
        prevOut = samplePrev(uv); currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3; mixFactor = 1.0 - m;
      `;
    default:
      return `
        prevOut = samplePrev(uv);
        currRaw = sampleCurr(uv);
        blendMode = u_hasPrevImage == 1 ? 2 : 3;
        mixFactor = sp;
      `;
  }
}

export function buildTransitionFragmentShader(transTypeId: number): string {
  const extraSdf =
    transTypeId === 44 ? HEART_SDF : transTypeId === 45 ? STAR_SDF : '';
  const body = getTransitionBody(transTypeId);

  return `${TRANSITION_COMMON_HEADER}${extraSdf}
void main() {
  vec2 uv = v_texCoord;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  float p = clamp(u_transitionProgress, 0.0, 1.0);
  float sp = p * p * (3.0 - 2.0 * p);

  vec4 color = vec4(0.0);
  vec4 prevOut = vec4(0.0);
  vec4 currRaw = vec4(0.0);
  int blendMode = 0;
  float mixFactor = 1.0;
  vec3 currMul = vec3(1.0);
  vec3 postAdd = vec3(0.0);
  vec3 postMul = vec3(1.0);
  float postGamma = 1.0;
  bool needScreen = false;
  vec3 screenCol = vec3(0.0);

  ${body}

  if (blendMode == 1) {
    color = currRaw;
  } else if (blendMode == 2) {
    color = mix(prevOut, currRaw, mixFactor);
  } else if (blendMode == 3) {
    color = vec4(currRaw.rgb, currRaw.a * mixFactor);
  } else if (blendMode == 4) {
    color = mix(prevOut, vec4(currRaw.rgb * currMul, currRaw.a), mixFactor);
  }

  if (postGamma != 1.0) {
    color.rgb = pow(clamp(color.rgb, 0.0, 1.0), vec3(postGamma));
  }
  color.rgb = color.rgb * postMul + postAdd;
  if (needScreen) {
    color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - screenCol);
  }

  color.a *= u_opacity;
  color.rgb = clamp(color.rgb, 0.0, 1.0) * color.a;
  gl_FragColor = color;
}
`;
}
