// ============================================================================
// Track Volume Envelope Evaluation & Web Audio Scheduling Helpers
// ============================================================================

import { Track, TrackVolumeKeyframe } from '../../types/editor';

export function clampTrackVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 100;
  return Math.max(0, Math.min(200, volume));
}

export function sortVolumeKeyframes(
  keyframes: TrackVolumeKeyframe[]
): TrackVolumeKeyframe[] {
  return [...keyframes]
    .map((kf) => ({
      ...kf,
      time: Math.max(0, kf.time),
      volume: clampTrackVolume(kf.volume),
    }))
    .sort((a, b) => a.time - b.time);
}

/**
 * Evaluates the track volume (0..200%) at a given timeline time (seconds).
 * Uses piecewise-linear interpolation between keyframes, holding flat before
 * the first node and after the last node (Sony Vegas-style envelope).
 */
export function evaluateTrackVolumeAtTime(track: Track, time: number): number {
  const kfs = track.volumeKeyframes;
  if (!kfs || kfs.length === 0) {
    return clampTrackVolume(track.volume ?? 100);
  }
  if (kfs.length === 1 || time <= kfs[0].time) {
    return clampTrackVolume(kfs[0].volume);
  }
  const last = kfs[kfs.length - 1];
  if (time >= last.time) {
    return clampTrackVolume(last.volume);
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time;
      if (span <= 1e-6) return clampTrackVolume(b.volume);
      const t = (time - a.time) / span;
      return clampTrackVolume(a.volume + (b.volume - a.volume) * t);
    }
  }

  return clampTrackVolume(last.volume);
}

/**
 * Returns true if the track has any non-zero volume across its envelope.
 */
export function hasTrackAudibleVolume(track: Track): boolean {
  const kfs = track.volumeKeyframes;
  if (kfs && kfs.length > 0) {
    return kfs.some((kf) => kf.volume > 0);
  }
  return (track.volume ?? 100) > 0;
}

/**
 * Schedules a track's volume envelope onto an OfflineAudioContext GainNode's
 * AudioParam over [startTime, endTime].
 */
export function scheduleTrackVolumeEnvelope(
  gainParam: AudioParam,
  track: Track,
  startTime: number,
  endTime: number
): void {
  const kfs = track.volumeKeyframes;
  const toGain = (volPct: number) =>
    Math.max(0, Math.min(2, clampTrackVolume(volPct) / 100));

  if (!kfs || kfs.length === 0) {
    gainParam.setValueAtTime(toGain(track.volume ?? 100), startTime);
    return;
  }

  const startVol = evaluateTrackVolumeAtTime(track, startTime);
  gainParam.setValueAtTime(toGain(startVol), startTime);

  for (const kf of kfs) {
    if (kf.time > startTime && kf.time < endTime) {
      gainParam.linearRampToValueAtTime(toGain(kf.volume), kf.time);
    }
  }

  const endVol = evaluateTrackVolumeAtTime(track, endTime);
  gainParam.linearRampToValueAtTime(toGain(endVol), endTime);
}
