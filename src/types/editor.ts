// ============================================================================
// editordevideos - Domain Model & Type Definitions
// ============================================================================

import type { NewTextAnimationId } from '../core/webgl/textAnimations';

export type AspectRatio = 'auto' | '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | '4:3' | 'free';

export interface CanvasDimensions {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export type BlendMode =
  | 'normal'
  | 'overlay'
  | 'multiply'
  | 'screen'
  | 'lighten'
  | 'darken';

export type ScaleFitMode = 'contain' | 'cover' | 'fill';

export interface TransformProperties {
  x: number; // Offset X in % (-100 to 100)
  y: number; // Offset Y in % (-100 to 100)
  scale: number; // 0.1 to 5.0 (1.0 = 100%)
  scaleX?: number; // Independent width multiplier (0.1 to 5.0, default 1.0)
  scaleY?: number; // Independent height multiplier (0.1 to 5.0, default 1.0)
  freeResize?: boolean; // Allow free non-proportional resizing with fingers
  rotation: number; // In degrees (-360 to 360)
  opacity: number; // 0.0 to 1.0
  blendMode: BlendMode;
  flipH?: boolean;
  flipV?: boolean;
  fitMode?: ScaleFitMode;
}

// ----------------------------------------------------------------------------
// Keyframes & Curves
// ----------------------------------------------------------------------------
export interface Keyframe {
  id: string;
  time: number; // In seconds relative to clip start
  properties: Partial<TransformProperties & { volume?: number }>;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface BezierControlPoint {
  x: number; // 0.0 to 1.0 (relative time)
  y: number; // 0.1 to 10.0 (relative speed multiplier)
}

export interface SpeedCurve {
  name?: string;
  points: BezierControlPoint[];
}

// ----------------------------------------------------------------------------
// Color Grading & Visual Shaders
// ----------------------------------------------------------------------------
export interface ColorGrading {
  brightness: number; // -100 to 100 (0 default)
  contrast: number; // -100 to 100 (0 default)
  saturation: number; // -100 to 100 (0 default)
  exposure: number; // -100 to 100 (0 default)
  sharpness: number; // 0 to 100 (0 default)
  highlights: number; // -100 to 100 (0 default)
  shadows: number; // -100 to 100 (0 default)
  temperature: number; // -100 (cool) to 100 (warm)
  tint: number; // -100 (green) to 100 (magenta)
  vignette: number; // 0 to 100
  // HSL Selective adjustments
  hslRed: { hue: number; sat: number; lum: number };
  hslGreen: { hue: number; sat: number; lum: number };
  hslBlue: { hue: number; sat: number; lum: number };
  hslYellow: { hue: number; sat: number; lum: number };
}

export type FilterPreset =
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
  // 50 Studio Parametric LUT Filters (36-85)
  | 'oppenheimer'
  | 'dune'
  | 'bladeRunner'
  | 'joker'
  | 'wesAnderson'
  | 'johnWick'
  | 'godfather'
  | 'madMax'
  | 'thriller'
  | 'documentary'
  | 'portra400'
  | 'cinestill800'
  | 'agfaVista'
  | 'super8'
  | 'vhsRetro'
  | 'lomo'
  | 'crossProcess'
  | 'daguerreotype'
  | 'technicolor'
  | 'expiredFilm'
  | 'outrun'
  | 'holoPrism'
  | 'toxicAcid'
  | 'tokyoNight'
  | 'ultraviolet'
  | 'glitchPop'
  | 'thermal'
  | 'nightVision'
  | 'bloodMoon'
  | 'cyberMint'
  | 'tropical'
  | 'autumn'
  | 'winterFrost'
  | 'springBloom'
  | 'mediterranean'
  | 'coffeeCream'
  | 'peachGlow'
  | 'lavenderMist'
  | 'forestDeep'
  | 'sunburst'
  | 'leicaBW'
  | 'triX400'
  | 'cyanotype'
  | 'selenium'
  | 'platina'
  | 'duotoneCrimson'
  | 'duotoneOcean'
  | 'duotoneEmerald'
  | 'duotoneViolet'
  | 'charcoal'
  // 100 New Classified Studio Filters (86-185)
  // Cine (15)
  | 'imaxDark'
  | 'anamorphicGold'
  | 'noirThriller'
  | 'scifiTeal'
  | 'neoTokyo'
  | 'westernDust'
  | 'actionSlate'
  | 'hollywood70'
  | 'dramaWarm'
  | 'indieFilm'
  | 'epicBronze'
  | 'moonlitCine'
  | 'crimsonShadow'
  | 'emeraldCine'
  | 'midnightBlue'
  // Vintage (15)
  | 'kodakPortra800'
  | 'fujiPro400H'
  | 'ilfordHP5'
  | 'polaroidSX70'
  | 'ektachrome'
  | 'cineStill50D'
  | 'agfaChrome'
  | 'retro70s'
  | 'retro80s'
  | 'cassetteTape'
  | 'warmSepia2'
  | 'fadedMemory'
  | 'antiqueBrass'
  | 'nostalgia90s'
  | 'sunbleached'
  // Cyber (15)
  | 'neonMagenta'
  | 'cyberBlue'
  | 'laserLime'
  | 'arcadePink'
  | 'hologramTint'
  | 'quantumViolet'
  | 'hyperTeal'
  | 'acidYellow'
  | 'plasmaRed'
  | 'electricIndigo'
  | 'synthSunset'
  | 'matrixDeep'
  | 'glitchCyan'
  | 'futureChrome'
  | 'bladeAmber'
  // Nature (15)
  | 'alpineCrisp'
  | 'saharaHeat'
  | 'rainforest'
  | 'oceanicDeep'
  | 'coralReef'
  | 'autumnMaple'
  | 'sakuraSpring'
  | 'nordicFjord'
  | 'goldenSavanna'
  | 'volcanicAsh'
  | 'emeraldValley'
  | 'sunsetBlush'
  | 'morningDew'
  | 'starlightCool'
  | 'amberDusk'
  // B&W / Duotone (12)
  | 'silverGelatin'
  | 'highKeyBW'
  | 'lowKeyBW'
  | 'noirGritty'
  | 'softMonochrome'
  | 'matteGray'
  | 'dramaticBW'
  | 'streetBW'
  | 'duotoneIndigo'
  | 'duotoneCopper'
  | 'duotoneRose'
  | 'duotoneTeal'
  // Portrait / Editorial (14)
  | 'skinGlow'
  | 'studioSoft'
  | 'goldenSkin'
  | 'editorialClean'
  | 'beautyCream'
  | 'warmHoney'
  | 'ivorySoft'
  | 'peachVelvet'
  | 'roseQuartz'
  | 'bronzeTan'
  | 'porcelain'
  | 'fashionCrisp'
  | 'naturalLight'
  | 'velvetMatte'
  // Mood / Art (14)
  | 'dreamyHaze'
  | 'melancholy'
  | 'mysticPurple'
  | 'velvetNight'
  | 'emberGlow'
  | 'frostBite'
  | 'jadeMist'
  | 'obsidian'
  | 'crimsonMood'
  | 'amberDream'
  | 'twilightZone'
  | 'ethereal'
  | 'shadowPlay'
  | 'celestial'
  // 100 Additional Classified Studio Filters (186-285)
  // Cine (15: 186-200)
  | 'tenetInvert'
  | 'avatarPandora'
  | 'interstellarDust'
  | 'matrixRevolutions'
  | 'sicarioHeat'
  | 'revenantCold'
  | 'skyfallSteel'
  | 'driveNeon'
  | 'laLaLandGold'
  | 'moonlightBlue'
  | 'parasiteSlate'
  | 'furyRoadChrome'
  | 'herWarmth'
  | 'gladiatorSand'
  | 'inceptionDream'
  // Vintage (15: 201-215)
  | 'kodakGold200'
  | 'fujiSuperia400'
  | 'ilfordDelta3200'
  | 'lomochromePurple'
  | 'ektar100'
  | 'cinestill400D'
  | 'polaroid600'
  | 'orwoChrome'
  | 'sepiaAntique'
  | 'retroVHS88'
  | 'filmMatte90s'
  | 'kodakVision3'
  | 'fadedSlide'
  | 'warmArchive'
  | 'amber8mm'
  // Cyber (15: 216-230)
  | 'cyberpunk2077'
  | 'synthMagenta'
  | 'neonEmerald'
  | 'hologramCyan'
  | 'acidLime'
  | 'hyperViolet'
  | 'laserCrimson'
  | 'digitalAmber'
  | 'chromeMatrix'
  | 'vaporPink'
  | 'quantumTeal'
  | 'plasmaBlue'
  | 'arcadeGlow'
  | 'tokyoRainLUT'
  | 'ultravioletPro'
  // Nature (15: 231-245)
  | 'glacierIce'
  | 'canyonRed'
  | 'amazoniaGreen'
  | 'pacificTeal'
  | 'mediterraneanSun'
  | 'tundraFrost'
  | 'autumnOchre'
  | 'cherryBlossomLUT'
  | 'monsoonSlate'
  | 'desertMirage'
  | 'pineForest'
  | 'coralSunset'
  | 'lagoonAqua'
  | 'prairieGold'
  | 'auroraBorealisLUT'
  // B&W / Noir (13: 246-258)
  | 'silverNitrate'
  | 'carbonNoir'
  | 'platinumPrint'
  | 'fadedGraphite'
  | 'seleniumTone'
  | 'highContrastInk'
  | 'softSilver'
  | 'duotoneAmberBW'
  | 'duotoneCobaltBW'
  | 'duotoneRubyBW'
  | 'duotoneJadeBW'
  | 'classicNewspaper'
  | 'moonlitMono'
  // Portrait / Editorial (14: 259-272)
  | 'velvetSkin'
  | 'peachEditorial'
  | 'bronzeGlow'
  | 'milkCream'
  | 'cleanStudioPro'
  | 'roseGoldSkin'
  | 'honeySun'
  | 'ivoryMatte'
  | 'silkPortrait'
  | 'caramelWarm'
  | 'freshDaylight'
  | 'champagneSoft'
  | 'satinBlush'
  | 'fashionEditorial'
  // Mood / Art (13: 273-285)
  | 'velvetCrimson'
  | 'mysticIndigo'
  | 'dreamyLavender'
  | 'emberHaze'
  | 'arcticSilence'
  | 'emeraldDream'
  | 'obsidianGold'
  | 'pastelCloud'
  | 'twilightViolet'
  | 'goldenAura'
  | 'melancholicBlue'
  | 'crimsonDusk'
  | 'etherealMist';

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string; // Hex color (e.g. #00ff00)
  tolerance: number; // 0.0 to 1.0
  feather: number; // 0.0 to 1.0
  spillSuppression: number; // 0.0 to 1.0
}

export type MaskType =
  | 'none'
  | 'linear'
  | 'mirror'
  | 'circle'
  | 'rectangle'
  | 'star'
  | 'diamond'
  | 'heart'
  | 'hexagon'
  | 'triangle'
  | 'roundedRect';

export interface MaskConfig {
  type: MaskType;
  size: number; // 1 to 100
  feather: number; // 0 to 100
  rotation: number; // -180 to 180
  inverted: boolean;
}

export type VisualEffectType =
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
  // 50 New Effects (41-90): Fire, Day, Night, Nature, Sci-Fi, Light & Art
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
  // 100 New Classified Studio Effects (91-190)
  // Fire & Flames (14)
  | 'flameInferno'
  | 'flameBluePlasma'
  | 'flameDragonBreath'
  | 'flameSolarFlare'
  | 'flamePhoenixWings'
  | 'flameWildfire'
  | 'flameArcaneViolet'
  | 'flameTorchFlicker'
  | 'flameMeteorTrail'
  | 'flameVortex'
  | 'flameLavaBurst'
  | 'flameWhiteHot'
  | 'flameNeonCyber'
  | 'flameGhostSpirit'
  // Light Flares & Halos (16)
  | 'anamorphicBlue'
  | 'anamorphicGold'
  | 'prismHalo'
  | 'warmSunbeam'
  | 'crimsonLeak'
  | 'emeraldBeam'
  | 'violetAura'
  | 'strobeRGB'
  | 'neonBorderGlow'
  | 'spotlightWarm'
  | 'cyberLaserScan'
  | 'sunsetGradientFX'
  | 'moonHalo'
  | 'pinkFlare'
  | 'goldenRim'
  | 'starburstGlow'
  // Weather & Particles (16)
  | 'blizzardHeavy'
  | 'goldDust'
  | 'magicPollen'
  | 'cyberSparks'
  | 'rosePetals'
  | 'emeraldSpores'
  | 'toxicRain'
  | 'neonBubbles'
  | 'ashStorm'
  | 'meteorShower'
  | 'frostCrystals'
  | 'violetFireflies'
  | 'oceanSpray'
  | 'autumnWind'
  | 'cosmicDust'
  | 'acidRain'
  // Glitch & Cyber (14)
  | 'cyberGlitchPro'
  | 'rgbWaveShift'
  | 'vhsTrackingBad'
  | 'crtArcade'
  | 'signalInterference'
  | 'matrixCyan'
  | 'datamoshWave'
  | 'scanlinePulse'
  | 'pixelStorm'
  | 'neonStatic'
  | 'holoGlitch'
  | 'bitCrushFX'
  | 'chromaTear'
  | 'glitchMirror'
  // Lens & Optical (14)
  | 'zoomBurstFX'
  | 'prismSplitFX'
  | 'fishEyePro'
  | 'rippleWaterFX'
  | 'heatWavePro'
  | 'tunnelWarpFX'
  | 'dreamySoftFocus'
  | 'radialSpinFX'
  | 'mirrorKaleido6'
  | 'tiltShiftPro'
  | 'anamorphicStretch'
  | 'glassRefract'
  | 'vortexPull'
  | 'ghostTrail'
  // Art & Stylize (14)
  | 'comicHalftone'
  | 'celShading'
  | 'inkOutline'
  | 'popArtCyan'
  | 'popArtGold'
  | 'oilBrushPro'
  | 'pastelSketch'
  | 'stainedGlassFX'
  | 'duotoneFireArt'
  | 'blueprintTech'
  | 'charcoalSketch'
  | 'neonEdgeArt'
  | 'mosaicTiles'
  | 'retroPrint'
  // Retro Film & Atmosphere (12)
  | 'film16mm'
  | 'sepiaProjector'
  | 'super8Warm'
  | 'vintageDustFX'
  | 'lightBurnEdge'
  | 'noirVignetteFX'
  | 'cinemaScope21'
  | 'fadedPolaroidFX'
  | 'silentFilmFX'
  | 'amberNoir'
  | 'foggyMorning'
  | 'midnightMist'
  // 100 Additional Classified Studio Effects (191-290)
  // Fire & Flames (14: 191-204)
  | 'flameEmeraldInferno'
  | 'flameCrimsonTide'
  | 'flameGoldEmber'
  | 'flameFrostBlue'
  | 'flameCyberPink'
  | 'flameSolarCorona'
  | 'flameHellgate'
  | 'flameTorchWind'
  | 'flameMeteorRain'
  | 'flameCyclone'
  | 'flameMagmaCrack'
  | 'flameStarCore'
  | 'flameToxicGreen'
  | 'flameShadowWisp'
  // Light Flares & Halos (15: 205-219)
  | 'anamorphicCrimson'
  | 'anamorphicViolet'
  | 'anamorphicEmerald'
  | 'prismRainbowPro'
  | 'sunbeamGolden'
  | 'neonFramePink'
  | 'neonFrameGold'
  | 'laserSweepCyan'
  | 'laserSweepViolet'
  | 'haloSolar'
  | 'haloCyber'
  | 'strobeClubGold'
  | 'auroraRibbonFX'
  | 'candleWarmLeak'
  | 'starlightBurst'
  // Weather & Particles (15: 220-234)
  | 'sparkleDiamond'
  | 'emberFloatGold'
  | 'cyberDustCyan'
  | 'neonConfetti'
  | 'plasmaOrbs'
  | 'sakuraDrift'
  | 'magicSporesViolet'
  | 'starDustGold'
  | 'electricFireflies'
  | 'prismBubbles'
  | 'laserSparksRed'
  | 'snowflakesSoft'
  | 'glitterRain'
  | 'quantumParticles'
  | 'fairyDust'
  // Nature & Climate (14: 235-248)
  | 'blizzardArctic'
  | 'tropicalRainFX'
  | 'monsoonWind'
  | 'desertSandstormFX'
  | 'volcanicAshFX'
  | 'mistyForestFX'
  | 'iceCrystalEdge'
  | 'autumnBreezeFX'
  | 'oceanMistFX'
  | 'twilightFogFX'
  | 'goldenPollenFX'
  | 'stormLightningFX'
  | 'auroraMistFX'
  | 'sunsetHazeFX'
  // Glitch & Cyber (14: 249-262)
  | 'glitchHyperRGB'
  | 'vhsTapeWarp'
  | 'crtPhosphorGreen'
  | 'crtAmberTerminal'
  | 'matrixCrimson'
  | 'matrixGold'
  | 'datamoshBlock'
  | 'cyberScanViolet'
  | 'staticSnowTV'
  | 'rgbSplitJitter'
  | 'holoProjectionFX'
  | 'pixelMosaicGlitch'
  | 'signalDropFX'
  | 'neonWaveGlitch'
  // Lens & Optical (14: 263-276)
  | 'zoomWarpSpeed'
  | 'prismTripleSplit'
  | 'fisheyeUltra'
  | 'liquidRipplePro'
  | 'heatDistortDesert'
  | 'kaleidoOctagon'
  | 'softDreamHalo'
  | 'spinBlurVortex'
  | 'anamorphicCinema'
  | 'crystalRefractFX'
  | 'tunnelHyperspace'
  | 'ghostEchoRGB'
  | 'tiltShiftMacro'
  | 'radialShockwave'
  // Art & Retro Film (14: 277-290)
  | 'comicPopCyan'
  | 'animeCelPro'
  | 'mangaInkPro'
  | 'warholNeon'
  | 'oilImpastoFX'
  | 'stainedGlassPro'
  | 'blueprintCyan'
  | 'charcoalNoirFX'
  | 'neonOutlinePro'
  | 'mosaicArtTiles'
  | 'film35mmGrain'
  | 'super8SepiaFX'
  | 'cinemaScopeGold'
  | 'vintageBurnRed';

export interface VisualEffectConfig {
  type: VisualEffectType;
  intensity: number; // 0 to 100
  speed: number; // 0 to 100
}

// ----------------------------------------------------------------------------
// Transitions
// ----------------------------------------------------------------------------
export type TransitionType =
  | 'none'
  | 'crossDissolve'
  | 'whipPanLeft'
  | 'whipPanRight'
  | 'whipPanUp'
  | 'whipPanDown'
  | 'zoomInBlur'
  | 'zoomOutBlur'
  | 'zoomOutBounce'
  | 'spinTransition'
  | 'shakeImpact'
  | 'flashWhite'
  | 'flashBlack'
  | 'filmBurn'
  | 'lumaFade'
  | 'cube3D'
  | 'rotate3D'
  | 'slidePush'
  | 'circleOpen'
  | 'clockWipe'
  | 'blinds'
  | 'diamondOpen'
  | 'glitch'
  | 'liquidWave'
  | 'pixelate'
  | 'dreamy'
  | 'directionalWipe'
  | 'wipeRight'
  | 'wipeUp'
  | 'dynamicZoom'
  | 'motionBlur'
  | 'swirlWarp'
  | 'dollyZoom'
  | 'shakeZoom'
  | 'lensWarp'
  | 'lightLeak'
  | 'prismFlash'
  | 'vignetteFade'
  | 'radialBlurFade'
  | 'crossZoom'
  | 'burnDark'
  | 'wipeLeft'
  | 'wipeDown'
  | 'diagonalWipe'
  | 'barnDoorOpen'
  | 'barnDoorClose'
  | 'heartOpen'
  | 'starOpen'
  | 'flipVertical3D'
  | 'pageCurl'
  | 'slideDownPush'
  | 'rgbSplitSlide'
  | 'kaleidoTransition'
  | 'crtShutdown'
  | 'vaporwave'
  | 'rippleDrop'
  | 'mosaicGrid'
  // 50 New Studio Transitions (55-104)
  | 'panDiagonalTL'
  | 'panDiagonalTR'
  | 'snapZoomIn'
  | 'snapZoomOut'
  | 'tiltLeft'
  | 'tiltRight'
  | 'bounceDrop'
  | 'bounceRise'
  | 'crashZoom'
  | 'pullBackRotate'
  | 'focusPull'
  | 'fisheyePop'
  | 'hyperLapse'
  | 'solarFlare'
  | 'neonPulse'
  | 'warmSunset'
  | 'arcticFreeze'
  | 'goldenBokeh'
  | 'strobeFlash'
  | 'cinemaCurtain'
  | 'sepiaDream'
  | 'auroraGlow'
  | 'emberSpark'
  | 'moonlightFade'
  | 'haloBurst'
  | 'hexGrid'
  | 'spiralWipe'
  | 'radialSlices'
  | 'verticalBlinds'
  | 'diagonalBlinds'
  | 'checkerboard'
  | 'splitHorizontal'
  | 'splitVertical'
  | 'squeezeHorizontal'
  | 'squeezeVertical'
  | 'boxZoom3D'
  | 'irisDiamondSpin'
  | 'crossHatch'
  | 'pixelMelt'
  | 'chromaticBurst'
  | 'staticNoise'
  | 'scanlineTear'
  | 'vhsRewind'
  | 'cyberSlice'
  | 'datamosh'
  | 'matrixRain'
  | 'shockwave'
  | 'mirrorFlip'
  | 'liquidSwirl'
  | 'quantumDissolve'
  // 100 New Classified Studio Transitions (105-204)
  // Camera / Blur (20)
  | 'whipZoomLeft'
  | 'whipZoomRight'
  | 'whipZoomUp'
  | 'whipZoomDown'
  | 'smoothPanLeft'
  | 'smoothPanRight'
  | 'smoothPanUp'
  | 'smoothPanDown'
  | 'spiralZoomIn'
  | 'spiralZoomOut'
  | 'elasticZoomIn'
  | 'elasticZoomOut'
  | 'swayLeft'
  | 'swayRight'
  | 'tiltDrop'
  | 'tiltRise'
  | 'microShake'
  | 'vertigoPull'
  | 'cinematicDrift'
  | 'speedRamp'
  // Light & Cinema (20)
  | 'warmFlash'
  | 'coolFlash'
  | 'goldLeak'
  | 'crimsonFlare'
  | 'blueFlare'
  | 'amberBurn'
  | 'whiteBloom'
  | 'darkVignette'
  | 'filmFlash'
  | 'prismGlow'
  | 'sunsetWash'
  | 'neonFlash'
  | 'softOverexpose'
  | 'shadowSweep'
  | 'dreamyMist'
  | 'starburstFlash'
  | 'candleFlicker'
  | 'cinemaFadeOut'
  | 'retroBurn'
  | 'auroraSweep'
  // 3D & Shapes (20)
  | 'cubeUp3D'
  | 'cubeDown3D'
  | 'flipHorizontal3D'
  | 'swingDoorLeft'
  | 'swingDoorRight'
  | 'foldVertical'
  | 'foldHorizontal'
  | 'zoomRotate3D'
  | 'cardFlipLeft'
  | 'cardFlipRight'
  | 'triangleOpen'
  | 'hexagonOpen'
  | 'ovalOpen'
  | 'crossOpen'
  | 'plusWipe'
  | 'bowtieOpen'
  | 'curtainPart'
  | 'shutterClose'
  | 'spiralIris'
  | 'carousel3D'
  // Glitch & Wave (20)
  | 'rgbJitter'
  | 'vhsGlitch'
  | 'neonGlitch'
  | 'waveDistortH'
  | 'waveDistortV'
  | 'waterRipple'
  | 'plasmaWave'
  | 'pixelBlocks'
  | 'mosaicSpin'
  | 'scanlineWipe'
  | 'cyberGrid'
  | 'analogNoise'
  | 'signalDrop'
  | 'chromaWave'
  | 'echoSplit'
  | 'prismShift'
  | 'energyPulse'
  | 'warpTunnel'
  | 'acidRipple'
  | 'digitalDissolve'
  // Wipes & Cuts (20)
  | 'wipeDiagBL'
  | 'wipeDiagBR'
  | 'wedgeOpen'
  | 'venetian45'
  | 'venetian135'
  | 'irisBox'
  | 'splitDiag'
  | 'barsSweepH'
  | 'barsSweepV'
  | 'gridFade'
  | 'radialSweepCCW'
  | 'doubleWipeH'
  | 'doubleWipeV'
  | 'cornerTL'
  | 'cornerTR'
  | 'cornerBL'
  | 'cornerBR'
  | 'zigzagH'
  | 'zigzagV'
  | 'stepWipe';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // In seconds (e.g. 0.5s)
}

// ----------------------------------------------------------------------------
// Clip Animations (In, Out, Combo)
// ----------------------------------------------------------------------------
export type AnimationInType =
  | 'none'
  | 'fadeIn'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomBounce'
  | 'elasticPop'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'whipLeft'
  | 'whipRight'
  | 'whipUp'
  | 'whipDown'
  | 'bounce'
  | 'dropBounce'
  | 'spin'
  | 'vortexIn'
  | 'flip3D'
  | 'flip3DY'
  | 'swing3D'
  | 'tilt3D'
  | 'glitchIn'
  | 'blurIn'
  | 'popRotate'
  | 'rollInLeft'
  | 'rollInRight'
  | 'stretchInH'
  | 'stretchInV'
  | 'flashIn'
  | 'shakeIn'
  | 'pendulumIn'
  | 'spiralZoom'
  | 'unfold3D'
  | 'cinemaZoomIn';

export type AnimationOutType =
  | 'none'
  | 'fadeOut'
  | 'zoomOut'
  | 'zoomIn'
  | 'slideDown'
  | 'slideUp'
  | 'slideLeft'
  | 'slideRight'
  | 'whipOutLeft'
  | 'whipOutRight'
  | 'whipOutUp'
  | 'whipOutDown'
  | 'spin'
  | 'vortexOut'
  | 'flip3DOut'
  | 'flip3DOutY'
  | 'glitchOut'
  | 'blurOut'
  | 'rollOutLeft'
  | 'rollOutRight'
  | 'stretchOutH'
  | 'stretchOutV'
  | 'flashOut'
  | 'shakeOut'
  | 'dropOut'
  | 'popOut'
  | 'spiralOut';

export type AnimationComboType =
  | 'none'
  | 'heartbeat'
  | 'floating'
  | 'pendulum'
  | 'zoomPulse'
  | 'shake'
  | 'glitchFlash'
  | 'swing3DLoop'
  | 'neonPulse'
  | 'cinemaPan'
  | 'rubberBand'
  | 'handheldCam'
  | 'discoSpin'
  | 'breathe'
  | 'bounceLoop'
  | 'spin360Loop'
  | 'flip3DLoop'
  | 'figure8'
  | 'orbit3D'
  | 'strobeFlash'
  | 'wobble'
  | 'zoomInSlow'
  | 'zoomOutSlow'
  | 'panLeftSlow'
  | 'panRightSlow'
  | 'flicker'
  | 'turbulence';

export interface ClipAnimations {
  inType: AnimationInType;
  inDuration: number;
  outType: AnimationOutType;
  outDuration: number;
  comboType: AnimationComboType;
}

// ----------------------------------------------------------------------------
// Audio Configuration
// ----------------------------------------------------------------------------
export type VoiceFilter =
  | 'none'
  // Personas y Edades (10)
  | 'child'
  | 'baby'
  | 'woman'
  | 'man'
  | 'elderly'
  | 'elderly_woman'
  | 'teen'
  | 'drunk'
  | 'sleepy'
  | 'nervous'
  // Divertidos y Animales (9)
  | 'chipmunk'
  | 'high' // legacy alias for chipmunk
  | 'helium'
  | 'minion'
  | 'duck'
  | 'bee'
  | 'frog'
  | 'giant'
  | 'ogre'
  | 'clown'
  // Ciencia Ficción y Robots (9)
  | 'robot'
  | 'martian'
  | 'alien'
  | 'cyborg'
  | 'android'
  | 'astronaut'
  | 'transformer'
  | 'hologram'
  | 'space'
  // Terror y Fantasía (8)
  | 'demon'
  | 'monster'
  | 'ghost'
  | 'vampire'
  | 'witch'
  | 'zombie'
  | 'angel'
  | 'fairy'
  // Dispositivos y Retro (7)
  | 'radio'
  | 'telephone'
  | 'megaphone'
  | 'vintage_radio'
  | 'retro_8bit'
  | 'tv_static'
  | 'intercom'
  // Espacios y Efectos (7)
  | 'deep'
  | 'echo'
  | 'cave'
  | 'cathedral'
  | 'stadium'
  | 'underwater'
  | 'chorus';

export interface AudioConfig {
  volume: number; // 0 to 1000% (100 = default 1.0 gain)
  fadeInDuration: number; // In seconds
  fadeOutDuration: number; // In seconds
  voiceFilter: VoiceFilter;
  noiseReduction: boolean;
  isMuted: boolean;
  preservesPitch: boolean; // Retain original voice pitch when changing speed
}

// ----------------------------------------------------------------------------
// Text & Typography
// ----------------------------------------------------------------------------
export type TextAlignment = 'left' | 'center' | 'right';

export type TextAnimationIn =
  | 'none'
  | 'fadeIn'
  | 'typewriter'
  | 'letterFade'
  | 'bounce'
  | 'slide'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoom'
  | 'zoomOut'
  | 'flip'
  | 'pop'
  | 'wave'
  | 'blurIn'
  | NewTextAnimationId;

export type TextAnimationOut =
  | 'none'
  | 'fadeOut'
  | 'typewriterOut'
  | 'bounceOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomOut'
  | 'zoomIn'
  | 'flipOut'
  | 'popOut'
  | 'blurOut'
  | NewTextAnimationId;

export type TextAnimationLoop = 'none' | 'heartbeat' | 'float' | 'blink' | 'wiggle';

export interface TextConfig {
  text: string;
  fontFamily: string;
  fontSize: number; // In px
  fontWeight: number | string;
  color: string; // Fill color or gradient
  gradientFill?: { start: string; end: string; angle: number };
  alignment: TextAlignment;
  letterSpacing: number; // In px
  wordSpacing?: number; // In px
  lineHeight: number; // In em
  curved: boolean;
  curveRadius: number; // Angle/radius for curved text
  // Stroke / Outline
  strokeWidth: number;
  strokeColor: string;
  // Shadow
  hasShadow?: boolean;
  shadowColor: string;
  shadowOpacity?: number;
  shadowBlur: number;
  shadowDistance: number;
  shadowAngle: number;
  // Background Box
  hasBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  borderRadius: number;
  // Text Animation
  animIn: TextAnimationIn;
  animInDuration: number;
  animOut?: TextAnimationOut;
  animOutDuration?: number;
  animLoop: TextAnimationLoop;
  animLoopSpeed: number;
}

// ----------------------------------------------------------------------------
// Clips & Tracks
// ----------------------------------------------------------------------------
export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'subtitle';

export interface BaseClip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  startTime: number; // Timeline position in seconds
  duration: number; // Timeline duration in seconds
  sourceStartTime: number; // Media offset in seconds
  sourceDuration: number; // Original source duration
  isFrozen?: boolean;
  isReversed?: boolean;
  hasSeparatedAudio?: boolean;
  speed: number; // Linear speed (0.1x to 100x)
  speedCurve?: SpeedCurve;
}

export interface VideoClip extends BaseClip {
  type: 'video' | 'image';
  sourceUrl: string;
  sourceFilePath?: string; // Persisted local disk path in Electron for zero-copy FFmpeg export
  thumbnailUrl?: string;
  naturalWidth: number;
  naturalHeight: number;
  transform: TransformProperties;
  colorGrading: ColorGrading;
  filterPreset: FilterPreset;
  filterIntensity: number; // 0 to 100
  chromaKey: ChromaKeyConfig;
  mask: MaskConfig;
  effect: VisualEffectConfig;
  transition: TransitionConfig;
  animations: ClipAnimations;
  keyframes: Keyframe[];
  audio: AudioConfig;
}

export interface AudioClip extends BaseClip {
  type: 'audio';
  sourceUrl: string;
  sourceFilePath?: string; // Persisted local disk path in Electron for zero-copy FFmpeg export
  waveform?: number[]; // Normalized 0..1 peak samples
  audio: AudioConfig;
  beatMarkers?: number[]; // Detected beat timestamps
}

export interface TextClip extends BaseClip {
  type: 'text' | 'subtitle';
  textConfig: TextConfig;
  transform: TransformProperties;
  animations: ClipAnimations;
  keyframes?: Keyframe[];
  wordHighlights?: { word: string; start: number; end: number }[]; // For dynamic karaoke subtitles
}

export type TimelineClip = VideoClip | AudioClip | TextClip;

export type TrackType = 'main-video' | 'overlay-video' | 'audio' | 'text';

export interface TrackVolumeKeyframe {
  id: string;
  time: number; // In seconds along the timeline (>= 0)
  volume: number; // 0 to 200 (100 = 0 dB)
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  isLocked: boolean;
  isMuted: boolean;
  isVisible: boolean;
  volume?: number; // Track-level volume envelope (0 to 200%, default 100)
  volumeKeyframes?: TrackVolumeKeyframe[]; // Sony Vegas-style volume envelope nodes
  clips: TimelineClip[];
}

// ----------------------------------------------------------------------------
// Project Canvas & Settings
// ----------------------------------------------------------------------------
export type CanvasBackgroundType = 'blur' | 'color' | 'image';

export interface CanvasBackground {
  type: CanvasBackgroundType;
  color: string;
  imageUrl?: string;
  blurIntensity: number; // In px
}

export interface ProjectSettings {
  name: string;
  aspectRatio: AspectRatio;
  customWidth?: number;
  customHeight?: number;
  fps: number; // 24, 25, 30, 50, 60
  duration: number; // Total project duration in seconds
  background: CanvasBackground;
}

export interface Project {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  settings: ProjectSettings;
  tracks: Track[];
}

// ----------------------------------------------------------------------------
// Export Configuration
// ----------------------------------------------------------------------------
export type ExportResolution = '360p' | '480p' | '720p' | '1080p' | '2k' | '4k';
export type ExportFPS = 24 | 25 | 30 | 50 | 60;
export type ExportBitrateQuality = 'low' | 'medium' | 'high' | 'custom';
export type ExportFormat = 'mp4' | 'mp3' | 'wav';

export interface ExportSettings {
  resolution: ExportResolution;
  fps: ExportFPS;
  quality: ExportBitrateQuality;
  customBitrateMbps?: number;
  format: ExportFormat;
  exportEngine?: 'ffmpeg' | 'webcodecs';
  smartStreamCopy?: boolean; // Prefer zero-reencode stream copy matching source resolution/fps when no visual edits
  directOutputPath?: string;
  saveToDownloadsName?: string;
  onDirectSaved?: (savedPath: string, sizeBytes: number) => void;
  onAndroidNativeSaved?: (info: {
    uri: string;
    displayPath: string;
    filename: string;
    mimeType: string;
  }) => void;
}
