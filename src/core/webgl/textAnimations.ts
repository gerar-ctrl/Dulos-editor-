// ============================================================================
// textAnimations - Catalog & procedural evaluator for all text animations
// Includes all classic animations + 100 extended animations for Entrada & Salida
// ============================================================================

export type NewTextAnimationId =
  | 'dropBounce'
  | 'elasticPop'
  | 'rubberBand'
  | 'swingIn'
  | 'hingeDrop'
  | 'rollLeft'
  | 'rollRight'
  | 'spinZoom'
  | 'spiralIn'
  | 'vortex'
  | 'flipX'
  | 'flipY'
  | 'flipDiag'
  | 'foldOpen'
  | 'unfoldH'
  | 'curtainOpen'
  | 'splitReveal'
  | 'wipeLeft'
  | 'wipeRight'
  | 'wipeUp'
  | 'wipeDown'
  | 'skewLeft'
  | 'skewRight'
  | 'whipLeft'
  | 'whipRight'
  | 'whipUp'
  | 'whipDown'
  | 'glitchSnap'
  | 'tvTurnOn'
  | 'neonFlicker'
  | 'flashBang'
  | 'strobeIn'
  | 'cinematicRise'
  | 'cinematicDrop'
  | 'epicSlam'
  | 'earthquake'
  | 'jello'
  | 'tada'
  | 'wobbleIn'
  | 'tiltShift'
  | 'stretchH'
  | 'stretchV'
  | 'compressSnap'
  | 'riseScale'
  | 'fallScale'
  | 'diagTopLeft'
  | 'diagTopRight'
  | 'diagBotLeft'
  | 'diagBotRight'
  | 'wordByWord'
  // 50 Additional Text Animations (51-100)
  | 'cinemaZoom'
  | 'letterboxReveal'
  | 'focusPull'
  | 'epicGlideLeft'
  | 'epicGlideRight'
  | 'dramaticDrop'
  | 'heroLanding'
  | 'horizonRise'
  | 'curtainZoom'
  | 'spotlightFade'
  | 'springUp'
  | 'springDown'
  | 'springLeft'
  | 'springRight'
  | 'pendulumDrop'
  | 'trampoline'
  | 'slingshotLeft'
  | 'slingshotRight'
  | 'boomerang'
  | 'gravityFall'
  | 'flipBook'
  | 'orbitLeft'
  | 'orbitRight'
  | 'tornado'
  | 'cartwheel'
  | 'barrelRoll'
  | 'swivel3D'
  | 'tiltZoom'
  | 'cyberDecode'
  | 'matrixBuild'
  | 'rgbShake'
  | 'signalLock'
  | 'hologramBoot'
  | 'laserCut'
  | 'pixelSnap'
  | 'voltPulse'
  | 'reverseType'
  | 'centerExpandText'
  | 'wordDrop'
  | 'letterScramble'
  | 'redactedReveal'
  | 'blindWipe'
  | 'irisPop'
  | 'heartbeatPop'
  | 'jellyDrop'
  | 'bubbleFloat'
  | 'punchZoom'
  | 'whipSpin'
  | 'accordionH'
  | 'accordionV'
  // 100 New Text Animations (101-200)
  // Cinematográficas & Épicas (15)
  | 'imaxZoom'
  | 'trailerSlam'
  | 'anamorReveal'
  | 'goldCurtain'
  | 'noirFade'
  | 'dollyForward'
  | 'dollyBack'
  | 'panSwipeL'
  | 'panSwipeR'
  | 'titleCard'
  | 'creditRoll'
  | 'epicStretch'
  | 'cinemaBlink'
  | 'widescreenOpen'
  | 'directorCut'
  // Rebote & Física (15)
  | 'pingPongDrop'
  | 'squashLand'
  | 'catapultUp'
  | 'catapultDown'
  | 'marbleRollL'
  | 'marbleRollR'
  | 'pendulumSwing'
  | 'seesawTilt'
  | 'springBounceH'
  | 'springBounceV'
  | 'meteorFall'
  | 'rocketLaunch'
  | 'gravityBounce'
  | 'bungeeDrop'
  | 'pinballPop'
  // 3D & Giros (15)
  | 'cubeFlipX'
  | 'cubeFlipY'
  | 'windmillSpin'
  | 'helixTwist'
  | 'gyroSpin'
  | 'coinFlip'
  | 'cardFlipL'
  | 'cardFlipR'
  | 'doorSwingL'
  | 'doorSwingR'
  | 'carouselIn'
  | 'propellerZoom'
  | 'prismRotate'
  | 'origamiFold'
  | 'radarSweep'
  // Glitch, Cyber & Neón (15)
  | 'vhsTracking'
  | 'staticBurst'
  | 'neonSignOn'
  | 'cyberGlitchH'
  | 'cyberGlitchV'
  | 'terminalBoot'
  | 'binaryDecode'
  | 'scanlineDrop'
  | 'empShock'
  | 'datastreamIn'
  | 'crtWarmup'
  | 'electricArc'
  | 'laserScanH'
  | 'laserScanV'
  | 'matrixGlitch'
  // Tipografía & Letras (15)
  | 'typeCursor'
  | 'cascadeWords'
  | 'backwardsReveal'
  | 'centerSplitWords'
  | 'staggerFade'
  | 'binaryReveal'
  | 'cipherCrack'
  | 'teleprompter'
  | 'newsTicker'
  | 'stampInk'
  | 'chalkWrite'
  | 'karaokeSweep'
  | 'flashWords'
  | 'underscoreType'
  | 'dotMatrixType'
  // Elegantes & Suaves (15)
  | 'silkGlideUp'
  | 'silkGlideDown'
  | 'silkGlideL'
  | 'silkGlideR'
  | 'featherFloat'
  | 'mistReveal'
  | 'velvetZoom'
  | 'cloudDrift'
  | 'zenBreath'
  | 'petalFall'
  | 'auroraWave'
  | 'pearlGlow'
  | 'waterRipple'
  | 'breezeSway'
  | 'moonRise'
  // Impacto & Redes Sociales (10)
  | 'viralPop'
  | 'tiktokBounce'
  | 'reelsWhip'
  | 'shortsSnap'
  | 'comicPow'
  | 'boomZoom'
  | 'shockDrop'
  | 'bassDrop'
  | 'clapSnap'
  | 'hypeShake';

export const NEW_TEXT_ANIMATIONS: { value: NewTextAnimationId; label: string }[] = [
  { value: 'dropBounce', label: 'Caída rebote' },
  { value: 'elasticPop', label: 'Resorte elástico' },
  { value: 'rubberBand', label: 'Goma elástica' },
  { value: 'swingIn', label: 'Péndulo' },
  { value: 'hingeDrop', label: 'Bisagra' },
  { value: 'rollLeft', label: 'Rodar izq.' },
  { value: 'rollRight', label: 'Rodar der.' },
  { value: 'spinZoom', label: 'Giro zoom' },
  { value: 'spiralIn', label: 'Espiral' },
  { value: 'vortex', label: 'Vórtice' },
  { value: 'flipX', label: 'Giro X 3D' },
  { value: 'flipY', label: 'Giro Y 3D' },
  { value: 'flipDiag', label: 'Giro diagonal' },
  { value: 'foldOpen', label: 'Desplegar V' },
  { value: 'unfoldH', label: 'Desplegar H' },
  { value: 'curtainOpen', label: 'Telón central' },
  { value: 'splitReveal', label: 'Apertura div.' },
  { value: 'wipeLeft', label: 'Barrido izq.' },
  { value: 'wipeRight', label: 'Barrido der.' },
  { value: 'wipeUp', label: 'Barrido arriba' },
  { value: 'wipeDown', label: 'Barrido abajo' },
  { value: 'skewLeft', label: 'Sesgo izq.' },
  { value: 'skewRight', label: 'Sesgo der.' },
  { value: 'whipLeft', label: 'Látigo izq.' },
  { value: 'whipRight', label: 'Látigo der.' },
  { value: 'whipUp', label: 'Látigo arriba' },
  { value: 'whipDown', label: 'Látigo abajo' },
  { value: 'glitchSnap', label: 'Glitch digital' },
  { value: 'tvTurnOn', label: 'Encendido TV' },
  { value: 'neonFlicker', label: 'Parpadeo neón' },
  { value: 'flashBang', label: 'Destello flash' },
  { value: 'strobeIn', label: 'Estroboscópico' },
  { value: 'cinematicRise', label: 'Ascenso cine' },
  { value: 'cinematicDrop', label: 'Descenso cine' },
  { value: 'epicSlam', label: 'Golpe épico' },
  { value: 'earthquake', label: 'Terremoto' },
  { value: 'jello', label: 'Gelatina' },
  { value: 'tada', label: '¡Tadá!' },
  { value: 'wobbleIn', label: 'Tambaleo' },
  { value: 'tiltShift', label: 'Enfoque incl.' },
  { value: 'stretchH', label: 'Estirar H' },
  { value: 'stretchV', label: 'Estirar V' },
  { value: 'compressSnap', label: 'Compresión' },
  { value: 'riseScale', label: 'Subir y crecer' },
  { value: 'fallScale', label: 'Bajar y crecer' },
  { value: 'diagTopLeft', label: 'Diag. sup. izq.' },
  { value: 'diagTopRight', label: 'Diag. sup. der.' },
  { value: 'diagBotLeft', label: 'Diag. inf. izq.' },
  { value: 'diagBotRight', label: 'Diag. inf. der.' },
  { value: 'wordByWord', label: 'Palabra a palabra' },
  // 50 Additional Text Animations (51-100)
  { value: 'cinemaZoom', label: 'Zoom cine' },
  { value: 'letterboxReveal', label: 'Apertura cine' },
  { value: 'focusPull', label: 'Enfoque cámara' },
  { value: 'epicGlideLeft', label: 'Planeo izq.' },
  { value: 'epicGlideRight', label: 'Planeo der.' },
  { value: 'dramaticDrop', label: 'Caída dramática' },
  { value: 'heroLanding', label: 'Aterrizaje héroe' },
  { value: 'horizonRise', label: 'Amanecer' },
  { value: 'curtainZoom', label: 'Telón zoom' },
  { value: 'spotlightFade', label: 'Foco escénico' },
  { value: 'springUp', label: 'Muelle arriba' },
  { value: 'springDown', label: 'Muelle abajo' },
  { value: 'springLeft', label: 'Muelle izq.' },
  { value: 'springRight', label: 'Muelle der.' },
  { value: 'pendulumDrop', label: 'Caída péndulo' },
  { value: 'trampoline', label: 'Trampolín' },
  { value: 'slingshotLeft', label: 'Resortera izq.' },
  { value: 'slingshotRight', label: 'Resortera der.' },
  { value: 'boomerang', label: 'Bumerán' },
  { value: 'gravityFall', label: 'Gravedad' },
  { value: 'flipBook', label: 'Paso de página' },
  { value: 'orbitLeft', label: 'Órbita izq.' },
  { value: 'orbitRight', label: 'Órbita der.' },
  { value: 'tornado', label: 'Tornado' },
  { value: 'cartwheel', label: 'Voltereta' },
  { value: 'barrelRoll', label: 'Tonel 360°' },
  { value: 'swivel3D', label: 'Pivote 3D' },
  { value: 'tiltZoom', label: 'Inclinación zoom' },
  { value: 'cyberDecode', label: 'Decodificar' },
  { value: 'matrixBuild', label: 'Construir binario' },
  { value: 'rgbShake', label: 'Vibración cyber' },
  { value: 'signalLock', label: 'Señal TV' },
  { value: 'hologramBoot', label: 'Holograma' },
  { value: 'laserCut', label: 'Corte láser' },
  { value: 'pixelSnap', label: 'Chasquido retro' },
  { value: 'voltPulse', label: 'Pulso eléctrico' },
  { value: 'reverseType', label: 'Escritura inversa' },
  { value: 'centerExpandText', label: 'Expansión texto' },
  { value: 'wordDrop', label: 'Palabras cayendo' },
  { value: 'letterScramble', label: 'Letras locas' },
  { value: 'redactedReveal', label: 'Censura revelada' },
  { value: 'blindWipe', label: 'Persiana' },
  { value: 'irisPop', label: 'Apertura iris' },
  { value: 'heartbeatPop', label: 'Latido doble' },
  { value: 'jellyDrop', label: 'Gelatina caída' },
  { value: 'bubbleFloat', label: 'Burbuja' },
  { value: 'punchZoom', label: 'Puñetazo zoom' },
  { value: 'whipSpin', label: 'Látigo giratorio' },
  { value: 'accordionH', label: 'Acordeón H' },
  { value: 'accordionV', label: 'Acordeón V' },
  // 100 New Text Animations (101-200)
  { value: 'imaxZoom', label: 'Zoom IMAX' },
  { value: 'trailerSlam', label: 'Golpe tráiler' },
  { value: 'anamorReveal', label: 'Anamórfico' },
  { value: 'goldCurtain', label: 'Telón dorado' },
  { value: 'noirFade', label: 'Cine Noir' },
  { value: 'dollyForward', label: 'Dolly adelante' },
  { value: 'dollyBack', label: 'Dolly atrás' },
  { value: 'panSwipeL', label: 'Paneo izq.' },
  { value: 'panSwipeR', label: 'Paneo der.' },
  { value: 'titleCard', label: 'Tarjeta título' },
  { value: 'creditRoll', label: 'Créditos cine' },
  { value: 'epicStretch', label: 'Estirado épico' },
  { value: 'cinemaBlink', label: 'Parpadeo cine' },
  { value: 'widescreenOpen', label: 'Pantalla ancha' },
  { value: 'directorCut', label: 'Corte director' },
  { value: 'pingPongDrop', label: 'Ping-pong' },
  { value: 'squashLand', label: 'Aterrizaje suave' },
  { value: 'catapultUp', label: 'Catapulta arriba' },
  { value: 'catapultDown', label: 'Catapulta abajo' },
  { value: 'marbleRollL', label: 'Canica izq.' },
  { value: 'marbleRollR', label: 'Canica der.' },
  { value: 'pendulumSwing', label: 'Columpio' },
  { value: 'seesawTilt', label: 'Balancín' },
  { value: 'springBounceH', label: 'Muelle H' },
  { value: 'springBounceV', label: 'Muelle V' },
  { value: 'meteorFall', label: 'Meteoro' },
  { value: 'rocketLaunch', label: 'Despegue cohete' },
  { value: 'gravityBounce', label: 'Gravedad rebote' },
  { value: 'bungeeDrop', label: 'Bungee' },
  { value: 'pinballPop', label: 'Pinball pop' },
  { value: 'cubeFlipX', label: 'Cubo giro X' },
  { value: 'cubeFlipY', label: 'Cubo giro Y' },
  { value: 'windmillSpin', label: 'Molino' },
  { value: 'helixTwist', label: 'Hélice' },
  { value: 'gyroSpin', label: 'Giroscopio' },
  { value: 'coinFlip', label: 'Moneda 3D' },
  { value: 'cardFlipL', label: 'Carta izq.' },
  { value: 'cardFlipR', label: 'Carta der.' },
  { value: 'doorSwingL', label: 'Puerta izq.' },
  { value: 'doorSwingR', label: 'Puerta der.' },
  { value: 'carouselIn', label: 'Carrusel' },
  { value: 'propellerZoom', label: 'Hélice zoom' },
  { value: 'prismRotate', label: 'Prisma 3D' },
  { value: 'origamiFold', label: 'Origami' },
  { value: 'radarSweep', label: 'Barrido radar' },
  { value: 'vhsTracking', label: 'Tracking VHS' },
  { value: 'staticBurst', label: 'Estática TV' },
  { value: 'neonSignOn', label: 'Cartel neón' },
  { value: 'cyberGlitchH', label: 'Glitch H' },
  { value: 'cyberGlitchV', label: 'Glitch V' },
  { value: 'terminalBoot', label: 'Consola boot' },
  { value: 'binaryDecode', label: 'Código binario' },
  { value: 'scanlineDrop', label: 'Líneas escáner' },
  { value: 'empShock', label: 'Pulso EMP' },
  { value: 'datastreamIn', label: 'Flujo datos' },
  { value: 'crtWarmup', label: 'Encendido CRT' },
  { value: 'electricArc', label: 'Arco eléctrico' },
  { value: 'laserScanH', label: 'Láser H' },
  { value: 'laserScanV', label: 'Láser V' },
  { value: 'matrixGlitch', label: 'Glitch Matrix' },
  { value: 'typeCursor', label: 'Máquina cursor' },
  { value: 'cascadeWords', label: 'Cascada palabras' },
  { value: 'backwardsReveal', label: 'Revelado inverso' },
  { value: 'centerSplitWords', label: 'Centro palabras' },
  { value: 'staggerFade', label: 'Escalonado' },
  { value: 'binaryReveal', label: 'Bits a texto' },
  { value: 'cipherCrack', label: 'Descifrado' },
  { value: 'teleprompter', label: 'Teleprompter' },
  { value: 'newsTicker', label: 'Cinta noticias' },
  { value: 'stampInk', label: 'Sello tinta' },
  { value: 'chalkWrite', label: 'Tiza pizarra' },
  { value: 'karaokeSweep', label: 'Barrido karaoke' },
  { value: 'flashWords', label: 'Palabras flash' },
  { value: 'underscoreType', label: 'Guion bajo' },
  { value: 'dotMatrixType', label: 'Matriz puntos' },
  { value: 'silkGlideUp', label: 'Seda arriba' },
  { value: 'silkGlideDown', label: 'Seda abajo' },
  { value: 'silkGlideL', label: 'Seda izq.' },
  { value: 'silkGlideR', label: 'Seda der.' },
  { value: 'featherFloat', label: 'Pluma flotante' },
  { value: 'mistReveal', label: 'Niebla suave' },
  { value: 'velvetZoom', label: 'Zoom terciopelo' },
  { value: 'cloudDrift', label: 'Deriva nube' },
  { value: 'zenBreath', label: 'Respirar zen' },
  { value: 'petalFall', label: 'Caída pétalo' },
  { value: 'auroraWave', label: 'Onda aurora' },
  { value: 'pearlGlow', label: 'Brillo perla' },
  { value: 'waterRipple', label: 'Onda agua' },
  { value: 'breezeSway', label: 'Brisa suave' },
  { value: 'moonRise', label: 'Salida luna' },
  { value: 'viralPop', label: 'Pop viral' },
  { value: 'tiktokBounce', label: 'Rebote TikTok' },
  { value: 'reelsWhip', label: 'Látigo Reels' },
  { value: 'shortsSnap', label: 'Chasquido Shorts' },
  { value: 'comicPow', label: 'Cómic POW!' },
  { value: 'boomZoom', label: 'Boom zoom' },
  { value: 'shockDrop', label: 'Impacto caída' },
  { value: 'bassDrop', label: 'Golpe grave' },
  { value: 'clapSnap', label: 'Aplauso snap' },
  { value: 'hypeShake', label: 'Temblor hype' },
];

export interface TextAnimResult {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  skewX: number;
  opacity: number;
  blur: number;
  clipMode?: 'none' | 'left' | 'right' | 'up' | 'down' | 'curtain' | 'splitV';
  clipProgress?: number; // 0 = hidden, 1 = fully visible
  textOverride?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const x = t - 1.5 / d1;
    return n1 * x * x + 0.75;
  }
  if (t < 2.5 / d1) {
    const x = t - 2.25 / d1;
    return n1 * x * x + 0.9375;
  }
  const x = t - 2.625 / d1;
  return n1 * x * x + 0.984375;
}

function easeOutElastic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutBack(t: number, overshoot = 1.70158): number {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

function deterministicGlyph(charset: string, idx: number, step: number): string {
  const h = Math.abs((idx * 37 + step * 17 + idx * step * 13) % charset.length);
  return charset[h] || charset[0];
}

/**
 * Evaluates any of the 50 new text animations for either Entrada (isOut = false)
 * or Salida (isOut = true).
 * `rawP` is always in [0, 1] progressing forward in time during the animation window.
 */
export function evaluateNewTextAnimation(
  animId: string,
  rawP: number,
  isOut: boolean,
  fullText: string
): TextAnimResult | null {
  const clamped = Math.max(0, Math.min(1, rawP));
  // For exit animations, reverse visibility progress so 1 -> 0 smoothly
  const p = isOut ? 1 - clamped : clamped;
  const inv = 1 - p;
  const ease = easeOutCubic(p);
  const invEase = 1 - ease;

  const res: TextAnimResult = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    skewX: 0,
    opacity: 1,
    blur: 0,
  };

  switch (animId as NewTextAnimationId) {
    case 'dropBounce': {
      const b = easeOutBounce(p);
      res.offsetY = (b - 1) * 260;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'elasticPop': {
      const e = Math.max(0.04, easeOutElastic(p));
      res.scaleX = e;
      res.scaleY = e;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'rubberBand': {
      const s = Math.sin(p * Math.PI * 3) * inv * 0.35;
      res.scaleX = Math.max(0.1, 1 + s);
      res.scaleY = Math.max(0.1, 1 - s * 0.8);
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'swingIn': {
      res.rotate = Math.sin(p * Math.PI * 3) * inv * 32;
      res.offsetY = -invEase * 60;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'hingeDrop': {
      res.rotate = (isOut ? 1 : -1) * invEase * 75;
      res.offsetY = invEase * 190;
      res.offsetX = (isOut ? 1 : -1) * invEase * 70;
      res.opacity = ease;
      return res;
    }
    case 'rollLeft': {
      res.offsetX = (isOut ? -1 : 1) * invEase * 280;
      res.rotate = (isOut ? -1 : 1) * invEase * 360;
      res.opacity = ease;
      return res;
    }
    case 'rollRight': {
      res.offsetX = (isOut ? 1 : -1) * invEase * 280;
      res.rotate = (isOut ? 1 : -1) * invEase * 360;
      res.opacity = ease;
      return res;
    }
    case 'spinZoom': {
      res.rotate = invEase * 360;
      res.scaleX = Math.max(0.05, ease);
      res.scaleY = Math.max(0.05, ease);
      res.opacity = ease;
      return res;
    }
    case 'spiralIn': {
      const angle = invEase * Math.PI * 3;
      const radius = invEase * 180;
      res.offsetX = Math.cos(angle) * radius;
      res.offsetY = Math.sin(angle) * radius;
      res.scaleX = Math.max(0.1, 0.2 + 0.8 * ease);
      res.scaleY = Math.max(0.1, 0.2 + 0.8 * ease);
      res.rotate = invEase * 180;
      res.opacity = ease;
      return res;
    }
    case 'vortex': {
      res.rotate = invEase * 720;
      res.scaleX = Math.max(0.04, 0.1 + 0.9 * ease);
      res.scaleY = Math.max(0.04, 0.1 + 0.9 * ease);
      res.blur = invEase * 10;
      res.opacity = ease;
      return res;
    }
    case 'flipX': {
      res.scaleX = Math.max(0.04, Math.sin((p * Math.PI) / 2));
      res.opacity = Math.min(1, p * 1.8);
      return res;
    }
    case 'flipY': {
      res.scaleY = Math.max(0.04, Math.sin((p * Math.PI) / 2));
      res.opacity = Math.min(1, p * 1.8);
      return res;
    }
    case 'flipDiag': {
      const s = Math.max(0.06, Math.sin((p * Math.PI) / 2));
      res.scaleX = s;
      res.scaleY = s;
      res.rotate = invEase * 45;
      res.opacity = Math.min(1, p * 1.8);
      return res;
    }
    case 'foldOpen': {
      res.scaleY = Math.max(0.02, ease);
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'unfoldH': {
      res.scaleX = Math.max(0.02, ease);
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'curtainOpen': {
      res.clipMode = 'curtain';
      res.clipProgress = ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'splitReveal': {
      res.clipMode = 'splitV';
      res.clipProgress = ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'wipeLeft': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      return res;
    }
    case 'wipeRight': {
      res.clipMode = 'right';
      res.clipProgress = ease;
      return res;
    }
    case 'wipeUp': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      return res;
    }
    case 'wipeDown': {
      res.clipMode = 'down';
      res.clipProgress = ease;
      return res;
    }
    case 'skewLeft': {
      res.skewX = -invEase * 0.65;
      res.offsetX = invEase * 160;
      res.opacity = ease;
      return res;
    }
    case 'skewRight': {
      res.skewX = invEase * 0.65;
      res.offsetX = -invEase * 160;
      res.opacity = ease;
      return res;
    }
    case 'whipLeft': {
      res.offsetX = invEase * 380;
      res.skewX = -invEase * 0.55;
      res.blur = invEase * 12;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'whipRight': {
      res.offsetX = -invEase * 380;
      res.skewX = invEase * 0.55;
      res.blur = invEase * 12;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'whipUp': {
      res.offsetY = invEase * 340;
      res.scaleY = 1 + invEase * 0.6;
      res.blur = invEase * 10;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'whipDown': {
      res.offsetY = -invEase * 340;
      res.scaleY = 1 + invEase * 0.6;
      res.blur = invEase * 10;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'glitchSnap': {
      const jitter = Math.sin(rawP * 75) * inv * 38;
      res.offsetX = jitter;
      res.offsetY = Math.cos(rawP * 55) * inv * 14;
      res.skewX = Math.sin(rawP * 40) * inv * 0.4;
      res.opacity = p < 0.15 ? 0.2 : Math.sin(rawP * 60) > -0.4 ? Math.min(1, p * 1.6) : 0.35;
      return res;
    }
    case 'tvTurnOn': {
      if (p < 0.45) {
        const sub = p / 0.45;
        res.scaleX = Math.max(0.05, sub);
        res.scaleY = 0.04;
        res.opacity = Math.min(1, sub * 2);
      } else {
        const sub = (p - 0.45) / 0.55;
        res.scaleX = 1;
        res.scaleY = 0.04 + 0.96 * easeOutCubic(sub);
        res.opacity = 1;
      }
      return res;
    }
    case 'neonFlicker': {
      const flick = Math.sin(rawP * 50) * Math.cos(rawP * 23);
      res.opacity = p > 0.8 ? 1 : Math.max(0.05, p * 0.7 + (flick > 0 ? 0.4 : 0));
      return res;
    }
    case 'flashBang': {
      res.scaleX = 1 + invEase * 0.9;
      res.scaleY = 1 + invEase * 0.9;
      res.blur = invEase * 18;
      res.opacity = p < 0.2 ? p * 5 : 1 - Math.sin(inv * Math.PI) * 0.35;
      if (isOut) res.opacity *= p;
      return res;
    }
    case 'strobeIn': {
      const step = Math.floor(rawP * 12) % 2;
      res.opacity = p > 0.85 ? 1 : step === 0 ? p : 0.1;
      return res;
    }
    case 'cinematicRise': {
      res.offsetY = invEase * 90;
      res.scaleX = 0.92 + 0.08 * ease;
      res.scaleY = 0.92 + 0.08 * ease;
      res.blur = invEase * 6;
      res.opacity = ease;
      return res;
    }
    case 'cinematicDrop': {
      res.offsetY = -invEase * 90;
      res.scaleX = 1.08 - 0.08 * ease;
      res.scaleY = 1.08 - 0.08 * ease;
      res.blur = invEase * 6;
      res.opacity = ease;
      return res;
    }
    case 'epicSlam': {
      const s = 2.6 - 1.6 * ease;
      const shake = p > 0.65 ? Math.sin(p * 60) * (1 - p) * 24 : 0;
      res.scaleX = s;
      res.scaleY = s;
      res.offsetX = shake;
      res.offsetY = shake * 0.6;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'earthquake': {
      res.offsetX = Math.sin(rawP * 90) * inv * 32;
      res.offsetY = Math.cos(rawP * 70) * inv * 24;
      res.rotate = Math.sin(rawP * 50) * inv * 8;
      res.opacity = Math.min(1, p * 2);
      return res;
    }
    case 'jello': {
      const w = Math.sin(p * Math.PI * 4) * inv * 0.35;
      res.skewX = w;
      res.scaleX = Math.max(0.2, 1 + w * 0.4);
      res.scaleY = Math.max(0.2, 1 - w * 0.4);
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'tada': {
      const pulse = Math.sin(p * Math.PI * 3) * inv;
      res.scaleX = Math.max(0.2, 0.7 + 0.3 * ease + Math.abs(pulse) * 0.2);
      res.scaleY = Math.max(0.2, 0.7 + 0.3 * ease + Math.abs(pulse) * 0.2);
      res.rotate = pulse * 14;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'wobbleIn': {
      res.offsetX = Math.sin(p * Math.PI * 3.5) * inv * 120;
      res.rotate = Math.sin(p * Math.PI * 3.5) * inv * 18;
      res.opacity = Math.min(1, p * 2);
      return res;
    }
    case 'tiltShift': {
      res.rotate = invEase * -18;
      res.offsetY = invEase * 70;
      res.blur = invEase * 12;
      res.opacity = ease;
      return res;
    }
    case 'stretchH': {
      res.scaleX = 1 + invEase * 1.8;
      res.scaleY = Math.max(0.15, 1 - invEase * 0.7);
      res.opacity = ease;
      return res;
    }
    case 'stretchV': {
      res.scaleX = Math.max(0.15, 1 - invEase * 0.7);
      res.scaleY = 1 + invEase * 1.8;
      res.opacity = ease;
      return res;
    }
    case 'compressSnap': {
      const overs = p < 0.6 ? 0.2 + (p / 0.6) * 1.1 : 1.3 - ((p - 0.6) / 0.4) * 0.3;
      res.scaleX = Math.max(0.1, overs);
      res.scaleY = Math.max(0.1, 2 - overs);
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'riseScale': {
      res.offsetY = invEase * 160;
      res.scaleX = 0.4 + 0.6 * ease;
      res.scaleY = 0.4 + 0.6 * ease;
      res.opacity = ease;
      return res;
    }
    case 'fallScale': {
      res.offsetY = -invEase * 160;
      res.scaleX = 1.5 - 0.5 * ease;
      res.scaleY = 1.5 - 0.5 * ease;
      res.opacity = ease;
      return res;
    }
    case 'diagTopLeft': {
      res.offsetX = -invEase * 220;
      res.offsetY = -invEase * 180;
      res.opacity = ease;
      return res;
    }
    case 'diagTopRight': {
      res.offsetX = invEase * 220;
      res.offsetY = -invEase * 180;
      res.opacity = ease;
      return res;
    }
    case 'diagBotLeft': {
      res.offsetX = -invEase * 220;
      res.offsetY = invEase * 180;
      res.opacity = ease;
      return res;
    }
    case 'diagBotRight': {
      res.offsetX = invEase * 220;
      res.offsetY = invEase * 180;
      res.opacity = ease;
      return res;
    }
    case 'wordByWord': {
      const tokens = fullText.split(/(\s+)/);
      const wordIndices: number[] = [];
      tokens.forEach((tok, idx) => {
        if (tok.trim().length > 0) wordIndices.push(idx);
      });
      if (wordIndices.length > 0) {
        const visibleWords = isOut
          ? Math.max(0, Math.ceil(p * wordIndices.length))
          : Math.max(1, Math.ceil(p * wordIndices.length));
        if (visibleWords <= 0) {
          res.textOverride = '';
        } else {
          const lastIdx = wordIndices[Math.min(wordIndices.length - 1, visibleWords - 1)];
          res.textOverride = tokens.slice(0, lastIdx + 1).join('');
        }
      }
      res.opacity = Math.min(1, p * 4);
      return res;
    }

    // --- 50 Additional Text Animations (51-100) ---
    case 'cinemaZoom': {
      res.scaleX = 1.38 - 0.38 * ease;
      res.scaleY = 1.38 - 0.38 * ease;
      res.blur = invEase * 8;
      res.opacity = ease;
      return res;
    }
    case 'letterboxReveal': {
      res.clipMode = 'splitV';
      res.clipProgress = ease;
      res.scaleX = 1.12 - 0.12 * ease;
      res.scaleY = 1.12 - 0.12 * ease;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'focusPull': {
      res.blur = invEase * 22;
      res.scaleX = 1.16 - 0.16 * ease;
      res.scaleY = 1.16 - 0.16 * ease;
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'epicGlideLeft': {
      res.offsetX = invEase * 320;
      res.rotate = invEase * -6;
      res.blur = invEase * 4;
      res.opacity = ease;
      return res;
    }
    case 'epicGlideRight': {
      res.offsetX = -invEase * 320;
      res.rotate = invEase * 6;
      res.blur = invEase * 4;
      res.opacity = ease;
      return res;
    }
    case 'dramaticDrop': {
      const b = p < 0.75 ? Math.pow(p / 0.75, 2) : 1 + Math.sin(((p - 0.75) / 0.25) * Math.PI) * 0.08;
      res.offsetY = -(1 - b) * 320;
      res.blur = p < 0.75 ? (1 - p / 0.75) * 10 : 0;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'heroLanding': {
      if (p < 0.6) {
        const sub = p / 0.6;
        res.offsetY = -(1 - sub * sub) * 280;
        res.scaleX = 0.85 + 0.15 * sub;
        res.scaleY = 1.25 - 0.25 * sub;
      } else {
        const sub = (p - 0.6) / 0.4;
        const squash = Math.sin(sub * Math.PI) * 0.28 * (1 - sub * 0.4);
        res.scaleX = 1 + squash;
        res.scaleY = Math.max(0.5, 1 - squash * 0.75);
      }
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'horizonRise': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      res.offsetY = invEase * 75;
      res.opacity = Math.min(1, p * 2);
      return res;
    }
    case 'curtainZoom': {
      res.clipMode = 'curtain';
      res.clipProgress = ease;
      res.scaleX = 0.82 + 0.18 * ease;
      res.scaleY = 0.82 + 0.18 * ease;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'spotlightFade': {
      res.blur = invEase * 14;
      res.scaleX = 0.9 + 0.1 * ease;
      res.scaleY = 0.9 + 0.1 * ease;
      res.opacity = Math.pow(p, 1.8);
      return res;
    }
    case 'springUp': {
      const back = easeOutBack(p, 2.2);
      res.offsetY = (1 - back) * 200;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'springDown': {
      const back = easeOutBack(p, 2.2);
      res.offsetY = -(1 - back) * 200;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'springLeft': {
      const back = easeOutBack(p, 2.2);
      res.offsetX = (1 - back) * 240;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'springRight': {
      const back = easeOutBack(p, 2.2);
      res.offsetX = -(1 - back) * 240;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'pendulumDrop': {
      res.offsetY = -invEase * 220;
      res.rotate = Math.sin(p * Math.PI * 4) * inv * 38;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'trampoline': {
      const bounce = Math.abs(Math.sin(p * Math.PI * 3)) * inv;
      res.offsetY = -bounce * 180;
      res.scaleX = 1 + (0.25 - bounce * 0.4) * inv;
      res.scaleY = Math.max(0.4, 1 - (0.2 - bounce * 0.45) * inv);
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'slingshotLeft': {
      const pull = p < 0.35 ? -(p / 0.35) * 90 : (1 - easeOutBack((p - 0.35) / 0.65, 1.8)) * -90;
      res.offsetX = -pull + invEase * 260;
      res.skewX = p < 0.35 ? 0.25 * (p / 0.35) : -invEase * 0.35;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'slingshotRight': {
      const pull = p < 0.35 ? -(p / 0.35) * 90 : (1 - easeOutBack((p - 0.35) / 0.65, 1.8)) * -90;
      res.offsetX = pull - invEase * 260;
      res.skewX = p < 0.35 ? -0.25 * (p / 0.35) : invEase * 0.35;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'boomerang': {
      const arc = Math.sin(p * Math.PI);
      res.offsetX = -invEase * 260 + arc * 90;
      res.offsetY = -arc * 110;
      res.rotate = invEase * -270;
      res.scaleX = 0.5 + 0.5 * ease;
      res.scaleY = 0.5 + 0.5 * ease;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'gravityFall': {
      const b = easeOutBounce(p);
      res.offsetY = -(1 - b) * 340;
      res.rotate = (1 - b) * -14;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'flipBook': {
      res.scaleX = Math.max(0.04, ease);
      res.skewX = invEase * 0.45;
      res.offsetX = -invEase * 90;
      res.opacity = Math.min(1, p * 2);
      return res;
    }
    case 'orbitLeft': {
      const ang = invEase * Math.PI * 0.85;
      res.offsetX = -Math.sin(ang) * 260;
      res.offsetY = (1 - Math.cos(ang)) * -120;
      res.scaleX = 0.55 + 0.45 * ease;
      res.scaleY = 0.55 + 0.45 * ease;
      res.opacity = ease;
      return res;
    }
    case 'orbitRight': {
      const ang = invEase * Math.PI * 0.85;
      res.offsetX = Math.sin(ang) * 260;
      res.offsetY = (1 - Math.cos(ang)) * -120;
      res.scaleX = 0.55 + 0.45 * ease;
      res.scaleY = 0.55 + 0.45 * ease;
      res.opacity = ease;
      return res;
    }
    case 'tornado': {
      res.rotate = invEase * 1080;
      res.offsetY = invEase * 220;
      res.scaleX = Math.max(0.05, 0.15 + 0.85 * ease);
      res.scaleY = Math.max(0.05, 0.15 + 0.85 * ease);
      res.blur = invEase * 12;
      res.opacity = ease;
      return res;
    }
    case 'cartwheel': {
      res.offsetX = -invEase * 320;
      res.offsetY = -Math.sin(p * Math.PI) * 140;
      res.rotate = -invEase * 360;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'barrelRoll': {
      res.rotate = invEase * 360;
      res.scaleX = Math.max(0.1, 0.35 + 0.65 * ease);
      res.scaleY = Math.max(0.1, 0.35 + 0.65 * ease);
      res.offsetX = invEase * 160;
      res.opacity = ease;
      return res;
    }
    case 'swivel3D': {
      const spin = Math.cos(invEase * Math.PI * 2.5);
      res.scaleX = Math.max(0.06, Math.abs(spin));
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'tiltZoom': {
      res.rotate = invEase * 28;
      res.scaleX = 0.45 + 0.55 * ease;
      res.scaleY = 0.45 + 0.55 * ease;
      res.opacity = ease;
      return res;
    }
    case 'cyberDecode': {
      const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*@';
      const step = Math.floor(rawP * 26);
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ') {
          out += ch;
        } else if (i < revealed) {
          out += ch;
        } else {
          out += deterministicGlyph(glyphs, i, step);
        }
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'matrixBuild': {
      const step = Math.floor(rawP * 28);
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ') {
          out += ch;
        } else if (i < revealed) {
          out += ch;
        } else {
          out += deterministicGlyph('01', i, step);
        }
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.offsetY = invEase * -24;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'rgbShake': {
      res.offsetX = Math.sin(rawP * 110) * inv * 44;
      res.offsetY = Math.sin(rawP * 67) * inv * 10;
      res.blur = inv * 9;
      res.opacity = Math.min(1, p * 2.4);
      return res;
    }
    case 'signalLock': {
      const snap = p > 0.72 ? 0 : Math.sin(rawP * 48) * inv;
      res.skewX = snap * 0.85;
      res.offsetY = snap * 55;
      res.scaleY = p < 0.25 ? 0.15 + (p / 0.25) * 0.85 : 1;
      res.opacity = p < 0.15 ? 0.25 : Math.min(1, p * 1.8);
      return res;
    }
    case 'hologramBoot': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      const flicker = Math.sin(rawP * 64) > -0.35 ? 1 : 0.4;
      res.opacity = p > 0.85 ? 1 : Math.min(1, p * 1.4) * flicker;
      return res;
    }
    case 'laserCut': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      res.skewX = -invEase * 0.45;
      res.blur = invEase * 6;
      return res;
    }
    case 'pixelSnap': {
      const q = Math.floor(p * 6) / 6;
      res.scaleX = 0.25 + 0.75 * q;
      res.scaleY = 0.25 + 0.75 * q;
      res.offsetY = (1 - q) * 80;
      res.opacity = q > 0 ? Math.min(1, q * 1.3) : 0;
      return res;
    }
    case 'voltPulse': {
      const bolt = Math.sin(rawP * 95) * inv;
      res.offsetX = bolt * 26;
      res.offsetY = Math.cos(rawP * 82) * inv * 18;
      res.scaleX = 1 + Math.abs(bolt) * 0.18;
      res.scaleY = 1 - Math.abs(bolt) * 0.1;
      res.opacity = p > 0.8 ? 1 : Math.abs(Math.sin(rawP * 38)) > 0.25 ? Math.min(1, p * 1.6) : 0.15;
      return res;
    }
    case 'reverseType': {
      const len = fullText.length;
      const vis = isOut ? Math.floor(p * len) : Math.max(1, Math.ceil(p * len));
      res.textOverride = vis <= 0 ? '' : fullText.slice(Math.max(0, len - vis));
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'centerExpandText': {
      const len = fullText.length;
      if (len > 0) {
        const half = Math.ceil((p * len) / 2);
        const mid = Math.floor(len / 2);
        const start = Math.max(0, mid - half);
        const end = Math.min(len, mid + half);
        res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(start, end);
      }
      res.scaleX = 0.88 + 0.12 * ease;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'wordDrop': {
      const tokens = fullText.split(/(\s+)/);
      const wordIndices: number[] = [];
      tokens.forEach((tok, idx) => {
        if (tok.trim().length > 0) wordIndices.push(idx);
      });
      if (wordIndices.length > 0) {
        const count = wordIndices.length;
        const rawPos = p * count;
        const visibleWords = isOut ? Math.max(0, Math.ceil(rawPos)) : Math.max(1, Math.ceil(rawPos));
        if (visibleWords <= 0) {
          res.textOverride = '';
        } else {
          const lastIdx = wordIndices[Math.min(count - 1, visibleWords - 1)];
          res.textOverride = tokens.slice(0, lastIdx + 1).join('');
          const wordFrac = rawPos - Math.floor(rawPos);
          res.offsetY = p >= 0.99 ? 0 : -(1 - easeOutCubic(wordFrac)) * 28;
        }
      }
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'letterScramble': {
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const step = Math.floor(rawP * 20);
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ') {
          out += ch;
        } else if (i < revealed) {
          out += ch;
        } else {
          out += deterministicGlyph(alpha, i + 7, step);
        }
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.scaleX = 0.94 + 0.06 * ease;
      res.scaleY = 0.94 + 0.06 * ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'redactedReveal': {
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ') {
          out += ch;
        } else if (i < revealed) {
          out += ch;
        } else {
          out += '█';
        }
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'blindWipe': {
      res.clipMode = 'splitV';
      res.clipProgress = ease;
      res.scaleY = 1.25 - 0.25 * ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'irisPop': {
      res.clipMode = 'curtain';
      res.clipProgress = ease;
      const pop = Math.max(0.1, easeOutElastic(p));
      res.scaleX = pop;
      res.scaleY = pop;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'heartbeatPop': {
      const beat1 = Math.sin(Math.min(1, p * 2.2) * Math.PI) * 0.24;
      const beat2 = p > 0.45 ? Math.sin(Math.min(1, (p - 0.45) * 2.2) * Math.PI) * 0.16 : 0;
      const s = Math.max(0.15, 0.7 + 0.3 * ease + beat1 + beat2);
      res.scaleX = s;
      res.scaleY = s;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'jellyDrop': {
      res.offsetY = -invEase * 210;
      const wobble = Math.sin(p * Math.PI * 4.5) * inv * 0.32;
      res.skewX = wobble;
      res.scaleX = Math.max(0.25, 1 + wobble * 0.5);
      res.scaleY = Math.max(0.25, 1 - wobble * 0.45);
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'bubbleFloat': {
      res.offsetY = invEase * 170;
      res.offsetX = Math.sin(p * Math.PI * 3) * inv * 45;
      res.scaleX = 0.55 + 0.45 * ease + Math.sin(p * Math.PI * 2) * inv * 0.12;
      res.scaleY = 0.55 + 0.45 * ease - Math.sin(p * Math.PI * 2) * inv * 0.1;
      res.opacity = ease;
      return res;
    }
    case 'punchZoom': {
      const s = p < 0.55 ? 0.12 + (p / 0.55) * 1.28 : 1.4 - ((p - 0.55) / 0.45) * 0.4;
      const shake = p > 0.5 ? Math.sin(p * 85) * (1 - p) * 22 : 0;
      res.scaleX = Math.max(0.05, s);
      res.scaleY = Math.max(0.05, s);
      res.offsetX = shake;
      res.offsetY = shake * 0.5;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'whipSpin': {
      res.offsetX = -invEase * 340;
      res.rotate = -invEase * 180;
      res.skewX = invEase * 0.4;
      res.blur = invEase * 11;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'accordionH': {
      const wave = Math.cos(p * Math.PI * 3.5) * inv * 0.55;
      res.scaleX = Math.max(0.12, 1 - Math.abs(wave) + wave * 0.3);
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'accordionV': {
      const wave = Math.cos(p * Math.PI * 3.5) * inv * 0.55;
      res.scaleY = Math.max(0.12, 1 - Math.abs(wave) + wave * 0.3);
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }

    // =========================================================================
    // 100 NEW TEXT ANIMATIONS (101 - 200)
    // =========================================================================

    // --- Cinematográficas & Épicas (15) ---
    case 'imaxZoom': {
      const s = 2.4 - 1.4 * ease;
      res.scaleX = s;
      res.scaleY = s;
      res.blur = invEase * 14;
      res.opacity = Math.min(1, p * 2.4);
      return res;
    }
    case 'trailerSlam': {
      const slam = p < 0.5 ? 2.6 - (p / 0.5) * 1.65 : 0.95 + ((p - 0.5) / 0.5) * 0.05;
      const shake = p > 0.48 && p < 0.85 ? Math.sin(p * 110) * (0.85 - p) * 28 : 0;
      res.scaleX = Math.max(0.2, slam);
      res.scaleY = Math.max(0.2, slam);
      res.offsetX = shake;
      res.offsetY = shake * 0.6;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'anamorReveal': {
      res.clipMode = 'curtain';
      res.clipProgress = ease;
      res.scaleX = 1.45 - 0.45 * ease;
      res.blur = invEase * 6;
      res.opacity = ease;
      return res;
    }
    case 'goldCurtain': {
      res.clipMode = 'curtain';
      res.clipProgress = ease;
      res.offsetY = invEase * 30;
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'noirFade': {
      res.blur = invEase * 12;
      res.scaleX = 1.08 - 0.08 * ease;
      res.scaleY = 1.08 - 0.08 * ease;
      res.opacity = Math.pow(p, 1.8);
      return res;
    }
    case 'dollyForward': {
      const s = 0.65 + 0.35 * ease;
      res.scaleX = s;
      res.scaleY = s;
      res.offsetY = invEase * 24;
      res.opacity = ease;
      return res;
    }
    case 'dollyBack': {
      const s = 1.55 - 0.55 * ease;
      res.scaleX = s;
      res.scaleY = s;
      res.offsetY = -invEase * 24;
      res.opacity = ease;
      return res;
    }
    case 'panSwipeL': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      res.offsetX = invEase * 120;
      res.blur = invEase * 5;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'panSwipeR': {
      res.clipMode = 'right';
      res.clipProgress = ease;
      res.offsetX = -invEase * 120;
      res.blur = invEase * 5;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'titleCard': {
      res.scaleX = 0.88 + 0.12 * ease;
      res.scaleY = 0.88 + 0.12 * ease;
      res.clipMode = 'splitV';
      res.clipProgress = ease;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'creditRoll': {
      res.offsetY = inv * 240;
      res.opacity = Math.min(1, p * 2.2);
      return res;
    }
    case 'epicStretch': {
      res.scaleX = 2.2 - 1.2 * ease;
      res.scaleY = 0.75 + 0.25 * ease;
      res.blur = invEase * 8;
      res.opacity = ease;
      return res;
    }
    case 'cinemaBlink': {
      const blink = p < 0.7 ? (Math.floor(p * 14) % 2 === 0 ? 1 : 0.18) : 1;
      res.opacity = blink * Math.min(1, p * 2.5);
      res.scaleX = 1.05 - 0.05 * ease;
      res.scaleY = 1.05 - 0.05 * ease;
      return res;
    }
    case 'widescreenOpen': {
      res.clipMode = 'splitV';
      res.clipProgress = ease;
      res.scaleX = 1.15 - 0.15 * ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'directorCut': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      res.offsetY = invEase * 60;
      res.skewX = invEase * 0.12;
      res.opacity = Math.min(1, p * 2.6);
      return res;
    }

    // --- Rebote & Física (15) ---
    case 'pingPongDrop': {
      const b = easeOutBounce(p);
      res.offsetY = -(1 - b) * 260;
      res.offsetX = Math.sin(p * Math.PI * 3) * inv * 60;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'squashLand': {
      const b = easeOutBounce(p);
      res.offsetY = -(1 - b) * 220;
      const impact = p > 0.32 ? Math.sin((p - 0.32) * Math.PI * 4) * inv * 0.35 : 0;
      res.scaleX = Math.max(0.3, 1 + impact);
      res.scaleY = Math.max(0.3, 1 - impact * 0.8);
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'catapultUp': {
      const back = easeOutBack(p);
      res.offsetY = (1 - back) * 260;
      res.rotate = invEase * -18;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'catapultDown': {
      const back = easeOutBack(p);
      res.offsetY = -(1 - back) * 260;
      res.rotate = invEase * 18;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'marbleRollL': {
      res.offsetX = -invEase * 360;
      res.rotate = -invEase * 540;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'marbleRollR': {
      res.offsetX = invEase * 360;
      res.rotate = invEase * 540;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'pendulumSwing': {
      res.rotate = Math.cos(p * Math.PI * 3.5) * inv * 42;
      res.offsetX = Math.sin(p * Math.PI * 3.5) * inv * 45;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'seesawTilt': {
      res.rotate = Math.sin(p * Math.PI * 4) * inv * 28;
      res.skewX = Math.sin(p * Math.PI * 4) * inv * 0.2;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'springBounceH': {
      const el = easeOutElastic(p);
      res.offsetX = -(1 - el) * 240;
      res.opacity = Math.min(1, p * 3.2);
      return res;
    }
    case 'springBounceV': {
      const el = easeOutElastic(p);
      res.offsetY = (1 - el) * 220;
      res.opacity = Math.min(1, p * 3.2);
      return res;
    }
    case 'meteorFall': {
      res.offsetX = invEase * 280;
      res.offsetY = -invEase * 280;
      res.rotate = invEase * -35;
      res.blur = invEase * 12;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'rocketLaunch': {
      res.offsetY = invEase * 320;
      res.scaleY = 1 + invEase * 0.6;
      res.scaleX = 1 - invEase * 0.25;
      res.blur = invEase * 9;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'gravityBounce': {
      const b = easeOutBounce(p);
      res.offsetY = -(1 - b) * 300;
      res.scaleY = 0.8 + 0.2 * b;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'bungeeDrop': {
      const el = easeOutElastic(p);
      res.offsetY = -(1 - el) * 250;
      res.scaleY = Math.max(0.4, 1 + (1 - el) * 0.35);
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'pinballPop': {
      const el = easeOutElastic(p);
      res.scaleX = Math.max(0.1, el);
      res.scaleY = Math.max(0.1, el);
      res.offsetX = Math.sin(p * Math.PI * 5) * inv * 50;
      res.rotate = Math.cos(p * Math.PI * 5) * inv * 24;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }

    // --- 3D & Giros (15) ---
    case 'cubeFlipX': {
      const angle = invEase * (Math.PI / 2);
      res.scaleY = Math.max(0.05, Math.cos(angle));
      res.offsetY = -Math.sin(angle) * 90;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'cubeFlipY': {
      const angle = invEase * (Math.PI / 2);
      res.scaleX = Math.max(0.05, Math.cos(angle));
      res.offsetX = -Math.sin(angle) * 110;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'windmillSpin': {
      res.rotate = -invEase * 270;
      res.scaleX = 0.2 + 0.8 * ease;
      res.scaleY = 0.2 + 0.8 * ease;
      res.opacity = ease;
      return res;
    }
    case 'helixTwist': {
      const turns = invEase * Math.PI * 2;
      res.scaleX = Math.max(0.08, Math.abs(Math.cos(turns)));
      res.offsetY = invEase * 120;
      res.rotate = invEase * 90;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'gyroSpin': {
      res.rotate = invEase * 360;
      res.scaleX = Math.max(0.1, Math.abs(Math.cos(invEase * Math.PI)));
      res.scaleY = 0.4 + 0.6 * ease;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'coinFlip': {
      res.scaleX = Math.max(0.05, Math.abs(Math.cos(invEase * Math.PI * 2.5)));
      res.offsetY = -Math.sin(p * Math.PI) * 65;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'cardFlipL': {
      res.scaleX = Math.max(0.05, Math.cos(invEase * Math.PI * 0.5));
      res.skewX = -invEase * 0.35;
      res.offsetX = -invEase * 80;
      res.opacity = Math.min(1, p * 2.6);
      return res;
    }
    case 'cardFlipR': {
      res.scaleX = Math.max(0.05, Math.cos(invEase * Math.PI * 0.5));
      res.skewX = invEase * 0.35;
      res.offsetX = invEase * 80;
      res.opacity = Math.min(1, p * 2.6);
      return res;
    }
    case 'doorSwingL': {
      res.scaleX = Math.max(0.08, ease);
      res.skewX = invEase * 0.25;
      res.offsetX = -invEase * 130;
      res.opacity = Math.min(1, p * 2.6);
      return res;
    }
    case 'doorSwingR': {
      res.scaleX = Math.max(0.08, ease);
      res.skewX = -invEase * 0.25;
      res.offsetX = invEase * 130;
      res.opacity = Math.min(1, p * 2.6);
      return res;
    }
    case 'carouselIn': {
      const a = invEase * Math.PI * 0.85;
      res.offsetX = Math.sin(a) * 260;
      res.scaleX = Math.max(0.25, Math.cos(a * 0.5));
      res.scaleY = Math.max(0.25, Math.cos(a * 0.5));
      res.opacity = ease;
      return res;
    }
    case 'propellerZoom': {
      res.rotate = invEase * 720;
      res.scaleX = 0.05 + 0.95 * ease;
      res.scaleY = 0.05 + 0.95 * ease;
      res.blur = invEase * 10;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'prismRotate': {
      res.rotate = invEase * 120;
      res.skewX = invEase * 0.4;
      res.scaleX = 0.5 + 0.5 * ease;
      res.opacity = ease;
      return res;
    }
    case 'origamiFold': {
      res.scaleX = Math.max(0.05, ease);
      res.scaleY = Math.max(0.05, Math.pow(ease, 0.5));
      res.skewX = invEase * 0.5;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'radarSweep': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      res.rotate = invEase * -12;
      res.opacity = Math.min(1, p * 3);
      return res;
    }

    // --- Glitch, Cyber & Neón (15) ---
    case 'vhsTracking': {
      const jitter = inv * Math.sin(p * 65) * 26;
      res.offsetX = jitter;
      res.skewX = inv * Math.cos(p * 45) * 0.3;
      res.blur = inv * 5;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'staticBurst': {
      const step = Math.floor(p * 24);
      res.offsetX = p < 0.75 ? ((step % 3) - 1) * inv * 24 : 0;
      res.offsetY = p < 0.75 ? (((step * 7) % 3) - 1) * inv * 12 : 0;
      res.opacity = p < 0.65 ? (step % 2 === 0 ? 0.95 : 0.25) : 1;
      res.blur = inv * 6;
      return res;
    }
    case 'neonSignOn': {
      const pattern = p < 0.18 ? 0.1 : p < 0.28 ? 0.95 : p < 0.38 ? 0.2 : p < 0.5 ? 1 : p < 0.58 ? 0.35 : 1;
      res.opacity = pattern;
      res.blur = (1 - pattern) * 6;
      return res;
    }
    case 'cyberGlitchH': {
      const g = p < 0.8 ? Math.sin(p * 95) * inv * 48 : 0;
      res.offsetX = g;
      res.scaleX = 1 + Math.abs(g) * 0.008;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'cyberGlitchV': {
      const g = p < 0.8 ? Math.cos(p * 95) * inv * 38 : 0;
      res.offsetY = g;
      res.scaleY = 1 + Math.abs(g) * 0.01;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'terminalBoot': {
      const chars = Math.max(0, Math.floor(p * fullText.length));
      const cursor = p < 0.96 ? '▌' : '';
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(0, chars) + cursor;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'binaryDecode': {
      const revealed = Math.floor(p * fullText.length);
      const step = Math.floor(p * 22);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ' || i < revealed) out += ch;
        else out += (i + step) % 2 === 0 ? '0' : '1';
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'scanlineDrop': {
      res.clipMode = 'down';
      res.clipProgress = ease;
      res.offsetY = -invEase * 55;
      res.blur = invEase * 4;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'empShock': {
      const pulse = Math.sin(p * Math.PI * 6) * inv;
      res.scaleX = Math.max(0.2, 1 + pulse * 0.45);
      res.scaleY = Math.max(0.2, 1 - pulse * 0.35);
      res.blur = Math.abs(pulse) * 10;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'datastreamIn': {
      res.clipMode = 'right';
      res.clipProgress = ease;
      res.skewX = -invEase * 0.45;
      res.offsetX = -invEase * 90;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'crtWarmup': {
      if (p < 0.4) {
        const t = p / 0.4;
        res.scaleX = 0.05 + 1.15 * t;
        res.scaleY = 0.03;
      } else {
        const t = easeOutCubic((p - 0.4) / 0.6);
        res.scaleX = 1.2 - 0.2 * t;
        res.scaleY = 0.03 + 0.97 * t;
      }
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'electricArc': {
      const zap = p < 0.85 ? Math.sin(p * 120) * inv * 18 : 0;
      res.offsetX = zap;
      res.offsetY = Math.cos(p * 110) * inv * 14;
      res.rotate = zap * 0.4;
      res.opacity = p < 0.75 && Math.floor(p * 28) % 3 === 0 ? 0.35 : Math.min(1, p * 3.5);
      return res;
    }
    case 'laserScanH': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      res.scaleX = 1.12 - 0.12 * ease;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'laserScanV': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      res.scaleY = 1.12 - 0.12 * ease;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'matrixGlitch': {
      const glyphs = 'アイウエオカキクケコ0123456789#$%';
      const revealed = Math.floor(p * fullText.length);
      const step = Math.floor(p * 24);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ' || i < revealed) out += ch;
        else out += deterministicGlyph(glyphs, i, step);
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.offsetY = -invEase * 24;
      res.opacity = Math.min(1, p * 3);
      return res;
    }

    // --- Tipografía & Letras (15) ---
    case 'typeCursor': {
      const chars = Math.max(0, Math.floor(p * fullText.length));
      const blink = Math.floor(p * 12) % 2 === 0 ? '|' : '';
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(0, chars) + (p < 0.98 ? blink : '');
      res.opacity = 1;
      return res;
    }
    case 'cascadeWords': {
      const words = fullText.split(/(\s+)/);
      const visible = Math.max(0, Math.ceil(p * words.length));
      res.textOverride = p <= 0.02 && isOut ? '' : words.slice(0, visible).join('');
      res.offsetY = -invEase * 40;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'backwardsReveal': {
      const chars = Math.max(0, Math.ceil(p * fullText.length));
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(Math.max(0, fullText.length - chars));
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'centerSplitWords': {
      const half = Math.floor(fullText.length / 2);
      const span = Math.ceil(p * (fullText.length - half + 1));
      const start = Math.max(0, half - span);
      const end = Math.min(fullText.length, half + span);
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(start, end);
      res.scaleX = 0.9 + 0.1 * ease;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'staggerFade': {
      const chars = Math.max(0, Math.ceil(ease * fullText.length));
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(0, chars);
      res.blur = invEase * 4;
      res.opacity = ease;
      return res;
    }
    case 'binaryReveal': {
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ' || i < revealed) out += ch;
        else out += i % 2 === 0 ? '1' : '0';
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'cipherCrack': {
      const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&*';
      const revealed = Math.floor(ease * fullText.length);
      const step = Math.floor(p * 30);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ' || i < revealed) out += ch;
        else out += deterministicGlyph(glyphs, i * 3, step);
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'teleprompter': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      res.offsetY = invEase * 90;
      res.opacity = Math.min(1, p * 2.5);
      return res;
    }
    case 'newsTicker': {
      res.clipMode = 'left';
      res.clipProgress = ease;
      res.offsetX = invEase * 240;
      res.opacity = Math.min(1, p * 3);
      return res;
    }
    case 'stampInk': {
      const s = p < 0.55 ? 2.1 - (p / 0.55) * 1.15 : 0.95 + ((p - 0.55) / 0.45) * 0.05;
      res.scaleX = s;
      res.scaleY = s;
      res.rotate = invEase * -10;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'chalkWrite': {
      const chars = Math.max(0, Math.ceil(p * fullText.length));
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(0, chars);
      res.offsetY = Math.sin(p * 35) * inv * 3;
      res.opacity = Math.min(1, p * 2.8);
      return res;
    }
    case 'karaokeSweep': {
      res.clipMode = 'left';
      res.clipProgress = p;
      res.scaleY = 0.92 + 0.08 * ease;
      res.opacity = 1;
      return res;
    }
    case 'flashWords': {
      const words = fullText.split(/(\s+)/).filter((w) => w.length > 0);
      const visible = Math.max(1, Math.ceil(p * words.length));
      res.textOverride = p <= 0.02 && isOut ? '' : words.slice(0, visible).join('');
      const pulse = Math.sin((p * words.length % 1) * Math.PI) * 0.08;
      res.scaleX = 1 + pulse;
      res.scaleY = 1 + pulse;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'underscoreType': {
      const chars = Math.max(0, Math.floor(p * fullText.length));
      const tail = p < 0.96 ? '_' : '';
      res.textOverride = p <= 0.02 && isOut ? '' : fullText.slice(0, chars) + tail;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'dotMatrixType': {
      const revealed = Math.floor(p * fullText.length);
      let out = '';
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (ch === '\n' || ch === ' ' || i < revealed) out += ch;
        else out += '·';
      }
      res.textOverride = p <= 0.02 && isOut ? '' : out;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }

    // --- Elegantes & Suaves (15) ---
    case 'silkGlideUp': {
      res.offsetY = invEase * 95;
      res.opacity = ease;
      return res;
    }
    case 'silkGlideDown': {
      res.offsetY = -invEase * 95;
      res.opacity = ease;
      return res;
    }
    case 'silkGlideL': {
      res.offsetX = invEase * 120;
      res.opacity = ease;
      return res;
    }
    case 'silkGlideR': {
      res.offsetX = -invEase * 120;
      res.opacity = ease;
      return res;
    }
    case 'featherFloat': {
      res.offsetY = -invEase * 110;
      res.offsetX = Math.sin(p * Math.PI * 2.5) * inv * 32;
      res.rotate = Math.cos(p * Math.PI * 2.5) * inv * 8;
      res.opacity = ease;
      return res;
    }
    case 'mistReveal': {
      res.blur = invEase * 18;
      res.offsetY = invEase * 24;
      res.opacity = Math.pow(ease, 1.3);
      return res;
    }
    case 'velvetZoom': {
      const s = 0.82 + 0.18 * ease;
      res.scaleX = s;
      res.scaleY = s;
      res.blur = invEase * 6;
      res.opacity = ease;
      return res;
    }
    case 'cloudDrift': {
      res.offsetX = -invEase * 85;
      res.offsetY = Math.sin(p * Math.PI) * -18;
      res.blur = invEase * 10;
      res.opacity = ease;
      return res;
    }
    case 'zenBreath': {
      const s = 0.9 + 0.1 * ease + Math.sin(p * Math.PI) * 0.06;
      res.scaleX = s;
      res.scaleY = s;
      res.opacity = ease;
      return res;
    }
    case 'petalFall': {
      res.offsetY = -invEase * 140;
      res.offsetX = Math.sin(p * Math.PI * 2) * inv * 55;
      res.rotate = invEase * 25;
      res.opacity = ease;
      return res;
    }
    case 'auroraWave': {
      res.skewX = Math.sin(p * Math.PI * 2) * inv * 0.22;
      res.offsetY = Math.cos(p * Math.PI * 2) * inv * 24;
      res.blur = invEase * 6;
      res.opacity = ease;
      return res;
    }
    case 'pearlGlow': {
      res.scaleX = 1.14 - 0.14 * ease;
      res.scaleY = 1.14 - 0.14 * ease;
      res.blur = invEase * 11;
      res.opacity = ease;
      return res;
    }
    case 'waterRipple': {
      const wave = Math.sin(p * Math.PI * 4) * inv * 0.14;
      res.scaleX = 1 + wave;
      res.scaleY = 1 - wave;
      res.blur = invEase * 5;
      res.opacity = ease;
      return res;
    }
    case 'breezeSway': {
      res.skewX = -invEase * 0.28 + Math.sin(p * Math.PI * 3) * inv * 0.08;
      res.offsetX = -invEase * 75;
      res.opacity = ease;
      return res;
    }
    case 'moonRise': {
      res.clipMode = 'up';
      res.clipProgress = ease;
      res.offsetY = invEase * 70;
      res.scaleX = 0.92 + 0.08 * ease;
      res.scaleY = 0.92 + 0.08 * ease;
      res.opacity = ease;
      return res;
    }

    // --- Impacto & Redes Sociales (10) ---
    case 'viralPop': {
      const s = easeOutBack(p);
      res.scaleX = Math.max(0.1, s);
      res.scaleY = Math.max(0.1, s);
      res.rotate = (1 - ease) * -8;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'tiktokBounce': {
      const b = easeOutBounce(p);
      res.scaleX = 0.4 + 0.6 * b;
      res.scaleY = 0.4 + 0.6 * b;
      res.offsetY = -(1 - b) * 80;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'reelsWhip': {
      res.offsetX = invEase * 340;
      res.skewX = -invEase * 0.5;
      res.blur = invEase * 12;
      res.opacity = Math.min(1, p * 3.2);
      return res;
    }
    case 'shortsSnap': {
      const s = p < 0.4 ? 0.2 + (p / 0.4) * 1.02 : 1.22 - ((p - 0.4) / 0.6) * 0.22;
      res.scaleX = Math.max(0.1, s);
      res.scaleY = Math.max(0.1, s);
      res.opacity = Math.min(1, p * 5);
      return res;
    }
    case 'comicPow': {
      const el = easeOutElastic(p);
      res.scaleX = Math.max(0.1, el);
      res.scaleY = Math.max(0.1, el);
      res.rotate = Math.sin(p * Math.PI * 3) * inv * 18;
      res.opacity = Math.min(1, p * 4.5);
      return res;
    }
    case 'boomZoom': {
      const s = p < 0.45 ? 0.1 + (p / 0.45) * 1.3 : 1.4 - easeOutCubic((p - 0.45) / 0.55) * 0.4;
      res.scaleX = Math.max(0.05, s);
      res.scaleY = Math.max(0.05, s);
      res.blur = p < 0.45 ? (1 - p / 0.45) * 8 : 0;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'shockDrop': {
      res.offsetY = -invEase * 260;
      const shake = p > 0.55 ? Math.sin(p * 95) * (1 - p) * 20 : 0;
      res.offsetX = shake;
      res.scaleY = p < 0.55 ? 1.2 : 1 - Math.sin((p - 0.55) * Math.PI * 3) * (1 - p) * 0.25;
      res.opacity = Math.min(1, p * 4);
      return res;
    }
    case 'bassDrop': {
      const thump = Math.sin(p * Math.PI * 3) * inv * 0.32;
      res.scaleX = Math.max(0.3, 1 + thump);
      res.scaleY = Math.max(0.3, 1 + thump);
      res.offsetY = thump * 40;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    case 'clapSnap': {
      res.scaleX = p < 0.35 ? 1.8 - (p / 0.35) * 0.9 : 0.9 + ((p - 0.35) / 0.65) * 0.1;
      res.scaleY = p < 0.35 ? 0.5 + (p / 0.35) * 0.6 : 1.1 - ((p - 0.35) / 0.65) * 0.1;
      res.opacity = Math.min(1, p * 5);
      return res;
    }
    case 'hypeShake': {
      const s = 0.7 + 0.3 * ease;
      res.scaleX = s;
      res.scaleY = s;
      res.offsetX = Math.sin(p * 80) * inv * 24;
      res.offsetY = Math.cos(p * 70) * inv * 16;
      res.rotate = Math.sin(p * 60) * inv * 9;
      res.opacity = Math.min(1, p * 3.5);
      return res;
    }
    default:
      return null;
  }
}
