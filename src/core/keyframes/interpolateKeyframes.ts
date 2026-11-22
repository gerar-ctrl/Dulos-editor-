import {
  Keyframe,
  TextClip,
  TransformProperties,
  VideoClip,
} from '../../types/editor';

/** Returns the clip's transform interpolated at `clipLocalTime` (seconds relative to clip start). */
export function interpolateClipTransform(
  clip: VideoClip | TextClip,
  clipLocalTime: number
): TransformProperties {
  const transform = { ...clip.transform };
  const keyframes = 'keyframes' in clip ? clip.keyframes : undefined;
  if (!keyframes || keyframes.length === 0) return transform;

  const kfs = [...keyframes].sort((a, b) => a.time - b.time);
  if (clipLocalTime <= kfs[0].time) {
    return { ...transform, ...kfs[0].properties };
  }
  if (clipLocalTime >= kfs[kfs.length - 1].time) {
    return { ...transform, ...kfs[kfs.length - 1].properties };
  }

  let kPrev = kfs[0];
  let kNext = kfs[1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (clipLocalTime >= kfs[i].time && clipLocalTime <= kfs[i + 1].time) {
      kPrev = kfs[i];
      kNext = kfs[i + 1];
      break;
    }
  }

  const span = Math.max(0.001, kNext.time - kPrev.time);
  const t = Math.max(0, Math.min(1, (clipLocalTime - kPrev.time) / span));
  const ease = (p: number) => 0.5 - Math.cos(p * Math.PI) / 2;
  const factor = ease(t);

  const lerp = (a = 0, b = 0) => a + (b - a) * factor;

  return {
    ...transform,
    x: lerp(kPrev.properties.x ?? transform.x, kNext.properties.x ?? transform.x),
    y: lerp(kPrev.properties.y ?? transform.y, kNext.properties.y ?? transform.y),
    scale: lerp(
      kPrev.properties.scale ?? transform.scale,
      kNext.properties.scale ?? transform.scale
    ),
    scaleX: lerp(
      kPrev.properties.scaleX ?? (transform.scaleX ?? 1),
      kNext.properties.scaleX ?? (transform.scaleX ?? 1)
    ),
    scaleY: lerp(
      kPrev.properties.scaleY ?? (transform.scaleY ?? 1),
      kNext.properties.scaleY ?? (transform.scaleY ?? 1)
    ),
    rotation: lerp(
      kPrev.properties.rotation ?? transform.rotation,
      kNext.properties.rotation ?? transform.rotation
    ),
    opacity: lerp(
      kPrev.properties.opacity ?? transform.opacity,
      kNext.properties.opacity ?? transform.opacity
    ),
    blendMode: transform.blendMode,
  };
}

/** Extracts animatable transform properties for storing on a Keyframe. */
export function extractKeyframeProperties(
  transform: TransformProperties
): Keyframe['properties'] {
  return {
    x: transform.x,
    y: transform.y,
    scale: transform.scale,
    scaleX: transform.scaleX ?? 1,
    scaleY: transform.scaleY ?? 1,
    rotation: transform.rotation,
    opacity: transform.opacity,
  };
}
