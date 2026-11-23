// ============================================================================
// AudioExporter - Multi-Track Offline Audio Mixdown to MP3 & WAV
// ============================================================================

import { Mp3Encoder } from '@breezystack/lamejs';
import {
  Project,
  Track,
  AudioClip,
  VideoClip,
  VoiceFilter,
  ExportFormat,
} from '../../types/editor';
import { ProjectStorage } from '../storage/projectStorage';
import {
  hasTrackAudibleVolume,
  scheduleTrackVolumeEnvelope,
} from '../audio/trackVolumeEnvelope';
import { buildVoiceFilterGraph } from '../audio/voiceFilters';
import { timeStretchAudioBufferSlice } from '../audio/timeStretch';
import { Mp4AudioDecoder } from './Mp4AudioDecoder';
import type { RenderProgress } from './WebCodecsExporter';

function encodeStereoWAV(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i] || 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function createProceduralClipAudioBuffer(
  ctx: BaseAudioContext,
  durationSeconds: number,
  sampleRate: number,
  variant = 0
): AudioBuffer {
  const safeDuration = Math.max(0.5, durationSeconds);
  const length = Math.ceil(safeDuration * sampleRate);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const baseFreq = variant % 2 === 0 ? 110 : 130.81; // A2 or C3

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const beatPos = (t * 2) % 1; // 120 BPM
    const kickEnv = Math.exp(-beatPos * 12);
    const kick =
      Math.sin(2 * Math.PI * (115 * Math.exp(-beatPos * 14) + 45) * beatPos) *
      kickEnv *
      0.45;

    const hatPos = (t * 4) % 1;
    const hat =
      Math.sin(i * 12.9898) * Math.exp(-hatPos * 30) * 0.08;

    const chord1 = Math.sin(2 * Math.PI * baseFreq * t) * 0.14;
    const chord2 = Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.1;
    const arpFreq =
      baseFreq * (Math.floor(t * 4) % 2 === 0 ? 2 : 3);
    const arpEnv = Math.exp(-((t * 4) % 1) * 5);
    const arp = Math.sin(2 * Math.PI * arpFreq * t) * arpEnv * 0.12;

    const pan = 0.15 * Math.sin(t * 2.5);
    const sample = Math.max(-1, Math.min(1, kick + hat + chord1 + chord2 + arp));
    left[i] = Math.max(-1, Math.min(1, sample * (1 - pan)));
    right[i] = Math.max(-1, Math.min(1, sample * (1 + pan)));
  }

  return buffer;
}

function reverseAudioBuffer(
  ctx: BaseAudioContext,
  source: AudioBuffer
): AudioBuffer {
  const reversed = ctx.createBuffer(
    source.numberOfChannels,
    source.length,
    source.sampleRate
  );
  for (let ch = 0; ch < source.numberOfChannels; ch++) {
    const srcData = source.getChannelData(ch);
    const dstData = reversed.getChannelData(ch);
    for (let i = 0, len = srcData.length; i < len; i++) {
      dstData[i] = srcData[len - 1 - i];
    }
  }
  return reversed;
}

function connectVoiceFilterGraph(
  ctx: OfflineAudioContext,
  inputNode: AudioNode,
  voiceFilter: VoiceFilter,
  noiseReduction: boolean
): AudioNode {
  let current: AudioNode = inputNode;

  if (noiseReduction) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 85;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 13500;
    current.connect(hp);
    hp.connect(lp);
    current = lp;
  }

  if (!voiceFilter || voiceFilter === 'none') {
    return current;
  }

  return buildVoiceFilterGraph(ctx, current, voiceFilter).output;
}

interface DecodedClipAudioResult {
  buffer: AudioBuffer;
  trimmedStartSec: number;
  isFullFile: boolean;
}

async function resolveClipBlob(clip: VideoClip | AudioClip): Promise<Blob | null> {
  const url = clip.sourceUrl;
  if (!url || url.startsWith('procedural://')) return null;

  const runtimeBlob = ProjectStorage.getRuntimeBlob(url);
  if (runtimeBlob && runtimeBlob.size > 0) return runtimeBlob;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) return blob;
    }
  } catch {}

  try {
    const storedBlob = await ProjectStorage.getMediaBlob(clip.id);
    if (storedBlob && storedBlob.size > 0) return storedBlob;
  } catch {}

  return null;
}

async function decodeClipAudio(
  clip: VideoClip | AudioClip,
  decodeCtx: BaseAudioContext,
  preloadedBuffer?: ArrayBuffer,
  rangeStartSec?: number,
  rangeEndSec?: number
): Promise<DecodedClipAudioResult | null> {
  const url = clip.sourceUrl;
  if (!url || url.startsWith('procedural://')) {
    return null;
  }

  try {
    // Fast streaming range decode for MP4/MOV via WebCodecs AudioDecoder (avoids loading GBs into RAM)
    if (
      !preloadedBuffer &&
      !(clip.isReversed && !clip.isPreReversedMedia) &&
      rangeStartSec !== undefined &&
      rangeEndSec !== undefined
    ) {
      const blob = await resolveClipBlob(clip);
      if (blob) {
        const rangeDecoded = await Mp4AudioDecoder.decodeRangeFromBlob(
          blob,
          rangeStartSec,
          rangeEndSec,
          decodeCtx
        );
        if (rangeDecoded) {
          const decodedEnd =
            rangeDecoded.trimmedStartSec + rangeDecoded.buffer.duration;
          const expectedMinEnd = Math.min(rangeEndSec, rangeStartSec + 0.05);
          if (
            rangeDecoded.trimmedStartSec <= rangeStartSec + 0.25 &&
            decodedEnd >= expectedMinEnd - 0.05
          ) {
            return {
              buffer: rangeDecoded.buffer,
              trimmedStartSec: rangeDecoded.trimmedStartSec,
              isFullFile: false,
            };
          }
        }
        const arrayBuffer = await blob.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return null;
        const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
        return { buffer: decoded, trimmedStartSec: 0, isFullFile: true };
      }
    }

    let arrayBuffer: ArrayBuffer | null = preloadedBuffer || null;
    const isSharedPreloaded = Boolean(preloadedBuffer);
    if (!arrayBuffer) {
      const blob = await resolveClipBlob(clip);
      if (blob) {
        arrayBuffer = await blob.arrayBuffer();
      }
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return null;
    }

    // Only clone buffer if it's shared from preloadedBuffers, since decodeAudioData detaches it
    const decoded = await decodeCtx.decodeAudioData(
      isSharedPreloaded ? arrayBuffer.slice(0) : arrayBuffer
    );
    return { buffer: decoded, trimmedStartSec: 0, isFullFile: true };
  } catch {
    // Video file without an audio stream or unsupported audio codec
    return null;
  }
}

export class AudioExporter {
  /**
   * Renders the full multi-track project audio mixdown into a stereo AudioBuffer
   */
  public static async renderProjectAudioBuffer(
    project: Project,
    sampleRate = 44100,
    preloadedBuffers?: Map<string, ArrayBuffer>
  ): Promise<AudioBuffer> {
    const duration = Math.max(0.5, project.settings.duration || 1);
    const totalSamples = Math.max(1, Math.ceil(duration * sampleRate));
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

    let scheduledRealAudio = false;
    const proceduralClips: { clip: VideoClip; idx: number; track: Track }[] = [];
    const decodeTasks: Array<{ clip: VideoClip | AudioClip; track: Track; cacheKey: string }> = [];
    const decodedBySource = new Map<string, DecodedClipAudioResult | null>();

    for (const track of project.tracks) {
      if (track.isMuted || !track.isVisible) continue;
      if (!hasTrackAudibleVolume(track)) continue;

      for (let idx = 0; idx < track.clips.length; idx++) {
        const clip = track.clips[idx];
        if (clip.type !== 'video' && clip.type !== 'audio') continue;

        const mediaClip = clip as VideoClip | AudioClip;
        const audioCfg = mediaClip.audio;
        if (!audioCfg || audioCfg.isMuted || mediaClip.isFrozen) continue;

        const clipVolGain = Math.max(0, (audioCfg.volume ?? 100) / 100);
        if (clipVolGain <= 0.0001) continue;

        const isProcedural =
          !mediaClip.sourceUrl ||
          mediaClip.sourceUrl.startsWith('procedural://') ||
          mediaClip.id.startsWith('sample_');

        if (isProcedural && mediaClip.type === 'video') {
          proceduralClips.push({ clip: mediaClip as VideoClip, idx, track });
          continue;
        }

        const cacheKey = mediaClip.sourceUrl || mediaClip.id;
        decodeTasks.push({
          clip: mediaClip,
          track,
          cacheKey,
        });
      }
    }

    // Decode audio sequentially per unique source so large video files never spike RAM simultaneously
    if (decodeTasks.length > 0) {
      const remainingRefs = new Map<string, number>();
      for (const task of decodeTasks) {
        remainingRefs.set(task.cacheKey, (remainingRefs.get(task.cacheKey) || 0) + 1);
      }

      // Decode audio sequentially; when multiple clips share a source, only cache full-file decodes
      for (const task of decodeTasks) {
        const clipStart = Math.max(0, task.clip.startTime);
        const clipPlayDur = Math.max(0.05, Math.min(task.clip.duration, duration - clipStart));
        const clipSpeed = Math.max(0.02, Math.min(16, task.clip.speed || 1));
        const rangeStart = Math.max(0, task.clip.sourceStartTime || 0);
        const rangeEnd = rangeStart + clipPlayDur * clipSpeed;

        let decodedResult: DecodedClipAudioResult | null | undefined =
          decodedBySource.get(task.cacheKey);
        if (decodedResult === undefined) {
          decodedResult = await decodeClipAudio(
            task.clip,
            offlineCtx,
            preloadedBuffers?.get(task.clip.id) ?? preloadedBuffers?.get(task.cacheKey),
            rangeStart,
            rangeEnd
          );
          if (
            decodedResult &&
            decodedResult.isFullFile &&
            (remainingRefs.get(task.cacheKey) || 0) > 1
          ) {
            decodedBySource.set(task.cacheKey, decodedResult);
          }
        }
        const left = (remainingRefs.get(task.cacheKey) || 1) - 1;
        remainingRefs.set(task.cacheKey, left);
        if (left <= 0) {
          decodedBySource.delete(task.cacheKey);
        }

        if (!decodedResult) continue;
        scheduledRealAudio = true;
        this.scheduleClipBufferOnContext(
          offlineCtx,
          task.clip,
          decodedResult.buffer,
          duration,
          task.track,
          decodedResult.trimmedStartSec
        );
      }
      decodedBySource.clear();
    }

    // If project only has procedural demo clips and no real audio yet, synthesize backing audio for them
    if (!scheduledRealAudio && proceduralClips.length > 0) {
      for (const { clip, idx, track } of proceduralClips) {
        const procBuf = createProceduralClipAudioBuffer(
          offlineCtx,
          Math.max(clip.duration, clip.sourceDuration || clip.duration),
          sampleRate,
          idx
        );
        this.scheduleClipBufferOnContext(offlineCtx, clip, procBuf, duration, track);
      }
    }

    return await offlineCtx.startRendering();
  }

  private static scheduleClipBufferOnContext(
    offlineCtx: OfflineAudioContext,
    clip: VideoClip | AudioClip,
    rawBuffer: AudioBuffer,
    projectDuration: number,
    track: Track,
    trimmedStartSec = 0
  ) {
    const audioCfg = clip.audio;
    if (!audioCfg) return;

    const isVirtReversed = Boolean(clip.isReversed && !clip.isPreReversedMedia);
    const clipBuffer = isVirtReversed
      ? reverseAudioBuffer(offlineCtx, rawBuffer)
      : rawBuffer;

    const startTime = Math.max(0, clip.startTime);
    if (startTime >= projectDuration) return;

    const playDuration = Math.max(
      0.05,
      Math.min(clip.duration, projectDuration - startTime)
    );
    const speed = Math.max(0.02, Math.min(16, clip.speed || 1));
    const preservesPitch = audioCfg.preservesPitch ?? true;

    const requestedSourceSpan = playDuration * speed;
    const rawSourceStart = Math.max(
      0,
      (clip.sourceStartTime || 0) - trimmedStartSec
    );
    const sourceOffset = isVirtReversed
      ? Math.max(
          0,
          Math.min(
            clipBuffer.duration -
              Math.min(clipBuffer.duration, rawSourceStart + requestedSourceSpan),
            Math.max(0, clipBuffer.duration - 0.01)
          )
        )
      : Math.max(
          0,
          Math.min(rawSourceStart, Math.max(0, clipBuffer.duration - 0.01))
        );
    const maxSourceSpan = Math.max(0.01, clipBuffer.duration - sourceOffset);
    const actualSourceSpan = Math.min(maxSourceSpan, requestedSourceSpan);
    const usePitchPreservingStretch =
      preservesPitch && Math.abs(speed - 1.0) > 0.002;

    const source = offlineCtx.createBufferSource();
    if (usePitchPreservingStretch) {
      source.buffer = timeStretchAudioBufferSlice(
        offlineCtx,
        clipBuffer,
        sourceOffset,
        actualSourceSpan,
        speed
      );
      source.playbackRate.value = 1.0;
    } else {
      source.buffer = clipBuffer;
      source.playbackRate.value = speed;
    }

    const gainNode = offlineCtx.createGain();
    const baseGain = Math.max(0, Math.min(10, (audioCfg.volume ?? 100) / 100));

    const fadeIn = Math.max(
      0,
      Math.min(playDuration * 0.5, audioCfg.fadeInDuration || 0)
    );
    const fadeOut = Math.max(
      0,
      Math.min(playDuration * 0.5, audioCfg.fadeOutDuration || 0)
    );

    if (fadeIn > 0.01) {
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(baseGain, startTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(baseGain, startTime);
    }

    if (fadeOut > 0.01) {
      const fadeOutStart = Math.max(
        startTime + fadeIn,
        startTime + playDuration - fadeOut
      );
      gainNode.gain.setValueAtTime(baseGain, fadeOutStart);
      gainNode.gain.linearRampToValueAtTime(0.0001, startTime + playDuration);
    }

    const trackEnvelopeGain = offlineCtx.createGain();
    scheduleTrackVolumeEnvelope(
      trackEnvelopeGain.gain,
      track,
      startTime,
      startTime + playDuration
    );

    const filteredOut = connectVoiceFilterGraph(
      offlineCtx,
      source,
      audioCfg.voiceFilter || 'none',
      Boolean(audioCfg.noiseReduction)
    );
    filteredOut.connect(gainNode);
    gainNode.connect(trackEnvelopeGain);
    trackEnvelopeGain.connect(offlineCtx.destination);

    try {
      if (usePitchPreservingStretch) {
        source.start(
          startTime,
          0,
          Math.min(playDuration, source.buffer.duration)
        );
      } else {
        source.start(
          startTime,
          sourceOffset,
          actualSourceSpan
        );
      }
      source.stop(startTime + playDuration);
    } catch {
      // Ignore out-of-range scheduling errors
    }
  }

  /**
   * Exports the project's mixed audio to a genuine MP3 file (or WAV if requested)
   */
  public static async exportAudio(
    project: Project,
    format: ExportFormat = 'mp3',
    kbps = 192,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    if (format === 'wav') {
      return await this.exportWAV(project, onProgress);
    }
    return await this.exportMP3(project, kbps, onProgress);
  }

  public static async exportWAV(
    project: Project,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    const sampleRate = 44100;
    onProgress?.({
      percentage: 20,
      currentFrame: 20,
      totalFrames: 100,
      timeRemainingSeconds: 1,
    });

    const renderedBuffer = await this.renderProjectAudioBuffer(
      project,
      sampleRate
    );

    onProgress?.({
      percentage: 85,
      currentFrame: 85,
      totalFrames: 100,
      timeRemainingSeconds: 0,
    });

    const wavBlob = encodeStereoWAV(renderedBuffer);

    onProgress?.({
      percentage: 100,
      currentFrame: 100,
      totalFrames: 100,
      timeRemainingSeconds: 0,
    });

    return wavBlob;
  }

  public static async exportMP3(
    project: Project,
    kbps = 192,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    const sampleRate = 44100;
    const startTime = performance.now();

    onProgress?.({
      percentage: 10,
      currentFrame: 10,
      totalFrames: 100,
      timeRemainingSeconds: 2,
    });

    const renderedBuffer = await this.renderProjectAudioBuffer(
      project,
      sampleRate
    );

    const numChannels = renderedBuffer.numberOfChannels;
    const leftFloat = renderedBuffer.getChannelData(0);
    const rightFloat =
      numChannels > 1 ? renderedBuffer.getChannelData(1) : leftFloat;
    const totalSamples = renderedBuffer.length;

    const leftInt16 = new Int16Array(totalSamples);
    const rightInt16 = new Int16Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      const l = Math.max(-1, Math.min(1, leftFloat[i] || 0));
      const r = Math.max(-1, Math.min(1, rightFloat[i] || 0));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7fff;
      rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7fff;
    }

    const mp3Encoder = new Mp3Encoder(2, sampleRate, kbps);
    const mp3Data: BlobPart[] = [];

    // Encode in multiples of 1152 (MPEG-1 Layer III frame size)
    const chunkSamples = 1152 * 16;
    const totalChunks = Math.max(1, Math.ceil(totalSamples / chunkSamples));

    for (let offset = 0, chunkIdx = 0; offset < totalSamples; offset += chunkSamples, chunkIdx++) {
      const end = Math.min(totalSamples, offset + chunkSamples);
      const leftChunk = leftInt16.subarray(offset, end);
      const rightChunk = rightInt16.subarray(offset, end);

      const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf && mp3buf.length > 0) {
        const copy = new Uint8Array(mp3buf.length);
        copy.set(mp3buf);
        mp3Data.push(copy.buffer);
      }

      const pct = Math.min(
        98,
        15 + Math.round(((chunkIdx + 1) / totalChunks) * 83)
      );
      const elapsedSec = Math.max(0.05, (performance.now() - startTime) / 1000);
      const rate = (chunkIdx + 1) / elapsedSec;
      const remSec = Math.max(0, Math.round((totalChunks - (chunkIdx + 1)) / rate));

      onProgress?.({
        percentage: pct,
        currentFrame: chunkIdx + 1,
        totalFrames: totalChunks,
        timeRemainingSeconds: remSec,
      });

      if (chunkIdx % 4 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const finalBuf = mp3Encoder.flush();
    if (finalBuf && finalBuf.length > 0) {
      const copy = new Uint8Array(finalBuf.length);
      copy.set(finalBuf);
      mp3Data.push(copy.buffer);
    }

    onProgress?.({
      percentage: 100,
      currentFrame: totalChunks,
      totalFrames: totalChunks,
      timeRemainingSeconds: 0,
    });

    return new Blob(mp3Data, { type: 'audio/mpeg' });
  }
}
