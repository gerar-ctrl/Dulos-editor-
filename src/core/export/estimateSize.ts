// ============================================================================
// estimateSize - Real-time MB file size estimation calculator
// ============================================================================

import {
  ExportResolution,
  ExportFPS,
  ExportBitrateQuality,
  ExportFormat,
} from '../../types/editor';

export function getResolutionDimensions(
  resolution: ExportResolution,
  aspectRatio: string,
  customWidth?: number,
  customHeight?: number
): { width: number; height: number } {
  let baseHeight = 1080;
  if (resolution === '360p') baseHeight = 360;
  else if (resolution === '480p') baseHeight = 480;
  else if (resolution === '720p') baseHeight = 720;
  else if (resolution === '1080p') baseHeight = 1080;
  else if (resolution === '2k') baseHeight = 1440;
  else if (resolution === '4k') baseHeight = 2160;

  let width = Math.round((baseHeight * 16) / 9);
  let height = baseHeight;

  if (aspectRatio === '9:16') {
    width = baseHeight;
    height = Math.round((baseHeight * 16) / 9);
  } else if (aspectRatio === '1:1') {
    width = baseHeight;
    height = baseHeight;
  } else if (aspectRatio === '4:5') {
    width = baseHeight;
    height = Math.round((baseHeight * 5) / 4);
  } else if (aspectRatio === '21:9') {
    width = Math.round((baseHeight * 21) / 9);
    height = baseHeight;
  } else if (aspectRatio === '4:3') {
    width = Math.round((baseHeight * 4) / 3);
    height = baseHeight;
  } else if (aspectRatio === 'free' || aspectRatio === 'auto') {
    const cw = Math.max(120, customWidth || 1080);
    const ch = Math.max(120, customHeight || 1920);
    const ratio = cw / ch;
    if (ratio >= 1) {
      height = baseHeight;
      width = Math.round(baseHeight * ratio);
    } else {
      width = baseHeight;
      height = Math.round(baseHeight / ratio);
    }
  }

  // Ensure even dimensions required by H.264
  width = width % 2 === 0 ? width : width + 1;
  height = height % 2 === 0 ? height : height + 1;

  return { width, height };
}

export function getRecommendedBitrateMbps(
  resolution: ExportResolution,
  fps: ExportFPS,
  quality: ExportBitrateQuality,
  customBitrateMbps?: number
): number {
  if (quality === 'custom' && customBitrateMbps) {
    return customBitrateMbps;
  }

  const baseBitrates: Record<ExportResolution, number> = {
    '360p': 1.2,
    '480p': 2.5,
    '720p': 5.0,
    '1080p': 10.0,
    '2k': 20.0,
    '4k': 45.0,
  };

  let bitrate = baseBitrates[resolution] || 10.0;

  // FPS multiplier (60fps needs ~30% more bitrate than 30fps)
  if (fps >= 50) {
    bitrate *= 1.35;
  }

  // Quality multiplier
  if (quality === 'low') {
    bitrate *= 0.55;
  } else if (quality === 'high') {
    bitrate *= 1.6;
  }

  return Number(bitrate.toFixed(1));
}

export function estimateExportFileSizeMB(
  durationSeconds: number,
  resolution: ExportResolution,
  fps: ExportFPS,
  quality: ExportBitrateQuality,
  format: ExportFormat,
  customBitrateMbps?: number
): number {
  if (durationSeconds <= 0) return 0.1;

  if (format === 'mp3' || format === 'wav') {
    const mp3Kbps =
      quality === 'low' ? 128 : quality === 'medium' ? 192 : 320;
    const audioBitrateKbps = format === 'wav' ? 1411 : mp3Kbps;
    const sizeBytes = (durationSeconds * audioBitrateKbps * 1000) / 8;
    return Number(Math.max(0.05, sizeBytes / (1024 * 1024)).toFixed(2));
  }

  const videoBitrateMbps = getRecommendedBitrateMbps(
    resolution,
    fps,
    quality,
    customBitrateMbps
  );
  const audioBitrateMbps = 0.256; // 256 kbps AAC audio
  const totalBitrateMbps = videoBitrateMbps + audioBitrateMbps;

  const totalBits = totalBitrateMbps * 1_000_000 * durationSeconds;
  const totalMB = totalBits / (8 * 1024 * 1024);

  return Number(Math.max(0.1, totalMB).toFixed(1));
}
