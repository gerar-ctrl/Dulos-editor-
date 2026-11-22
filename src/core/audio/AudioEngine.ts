// ============================================================================
// AudioEngine - Web Audio API Multi-track Mixer, Filters, SFX & Waveforms
// ============================================================================

import { AudioClip, VideoClip, VoiceFilter } from '../../types/editor';
import {
  buildVoiceFilterGraph,
  VoiceFilterGraphHandle,
} from './voiceFilters';
import { timeStretchAudioBufferSlice } from './timeStretch';

interface ActiveNodeChain {
  element: HTMLMediaElement;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
  appliedFilter: VoiceFilter;
  lastGain?: number;
  filterHandle?: VoiceFilterGraphHandle;
}

interface ActivePreviewState {
  source: AudioBufferSourceNode;
  filterHandle: VoiceFilterGraphHandle;
  gainNode: GainNode;
  timerId: number | null;
  onStop?: () => void;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i] || 0));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeNodes = new Map<string, ActiveNodeChain>();
  private elementSourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private audioBufferCache = new Map<string, AudioBuffer>();
  private static readonly MAX_AUDIO_BUFFER_CACHE = 6;
  private activePreview: ActivePreviewState | null = null;
  private previewRequestToken = 0;

  private cacheAudioBuffer(url: string, buffer: AudioBuffer) {
    if (this.audioBufferCache.has(url)) {
      this.audioBufferCache.delete(url);
    }
    this.audioBufferCache.set(url, buffer);
    while (this.audioBufferCache.size > AudioEngine.MAX_AUDIO_BUFFER_CACHE) {
      const oldestKey = this.audioBufferCache.keys().next().value;
      if (!oldestKey) break;
      this.audioBufferCache.delete(oldestKey);
    }
  }

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.audioBufferCache.get(url);
    if (cached) return cached;

    const ctx = this.init();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.cacheAudioBuffer(url, audioBuffer);
    return audioBuffer;
  }

  public computeWaveformFromBuffer(buffer: AudioBuffer, samples = 80): number[] {
    const rawData = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(rawData.length / samples));
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j] || 0);
      }
      peaks.push(
        Number(Math.max(0.08, Math.min(1.0, (sum / blockSize) * 3.0)).toFixed(2))
      );
    }
    return peaks;
  }

  // Generate normalized waveform peaks for timeline rendering
  public async generateWaveform(url: string, samples = 80): Promise<number[]> {
    if (!url || url.startsWith('procedural://')) {
      return Array.from({ length: samples }, (_, i) =>
        Number((0.25 + 0.55 * Math.abs(Math.sin(i * 0.35))).toFixed(2))
      );
    }
    try {
      const buffer = await this.loadAudioBuffer(url);
      return this.computeWaveformFromBuffer(buffer, samples);
    } catch {
      return Array.from({ length: samples }, (_, i) =>
        Number((0.2 + 0.5 * Math.abs(Math.sin(i * 0.4) * Math.cos(i * 0.15))).toFixed(2))
      );
    }
  }

  // Detect beats / transients using high-frequency energy flux
  public async detectBeats(url: string, threshold = 0.45): Promise<number[]> {
    try {
      const buffer = await this.loadAudioBuffer(url);
      const rawData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      const step = Math.floor(sampleRate * 0.05);
      const beatMarkers: number[] = [];

      let prevEnergy = 0;
      for (let i = 0; i < rawData.length - step; i += step) {
        let energy = 0;
        for (let j = 0; j < step; j++) {
          energy += rawData[i + j] * rawData[i + j];
        }
        energy = Math.sqrt(energy / step);

        if (energy > threshold && energy > prevEnergy * 1.35) {
          const timestamp = i / sampleRate;
          if (
            beatMarkers.length === 0 ||
            timestamp - beatMarkers[beatMarkers.length - 1] > 0.2
          ) {
            beatMarkers.push(Number(timestamp.toFixed(2)));
          }
        }
        prevEnergy = energy;
      }
      return beatMarkers;
    } catch {
      return [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
    }
  }

  // Configure Audio Chain with Volume, Fades, and Voice Filters
  public setupNodeChain(
    clipId: string,
    element: HTMLMediaElement,
    clip: AudioClip | VideoClip
  ) {
    const ctx = this.init();

    let nodeGroup = this.activeNodes.get(clipId);
    if (!nodeGroup || nodeGroup.element !== element) {
      try {
        let source = this.elementSourceMap.get(element);
        if (!source) {
          source = ctx.createMediaElementSource(element);
          this.elementSourceMap.set(element, source);
        }
        const gainNode = ctx.createGain();
        try {
          source.disconnect();
        } catch {}
        source.connect(gainNode);
        gainNode.connect(this.masterGain!);

        nodeGroup = {
          element,
          source,
          gainNode,
          appliedFilter: 'none',
        };
        this.activeNodes.set(clipId, nodeGroup);
      } catch {
        return;
      }
    }

    const audio = clip.audio;
    if (nodeGroup.appliedFilter !== audio.voiceFilter) {
      this.applyVoiceFilter(nodeGroup, audio.voiceFilter);
      nodeGroup.appliedFilter = audio.voiceFilter;
    }
  }

  // Update dynamic Fade In, Fade Out, Volume, Mute & Voice Filter at current playhead time
  public updateFadeEnvelopes(
    clipId: string,
    clip: AudioClip | VideoClip,
    currentTime: number,
    trackMuted = false,
    element?: HTMLMediaElement,
    trackVolume = 100
  ) {
    const audio = clip.audio;
    if (!audio) return;

    const isMuted = trackMuted || audio.isMuted || Boolean(clip.isFrozen);

    const localTime = Math.max(0, currentTime - clip.startTime);
    const remainingTime = Math.max(0, clip.duration - localTime);

    let envelopeMultiplier = 1.0;
    if (audio.fadeInDuration > 0 && localTime < audio.fadeInDuration) {
      envelopeMultiplier *= Math.max(0, Math.min(1, localTime / audio.fadeInDuration));
    }
    if (audio.fadeOutDuration > 0 && remainingTime < audio.fadeOutDuration) {
      envelopeMultiplier *= Math.max(0, Math.min(1, remainingTime / audio.fadeOutDuration));
    }

    const trackGain = Math.max(0, Math.min(2, trackVolume / 100));
    const combinedVolumePct = audio.volume * trackGain;
    const targetGain = isMuted ? 0 : (combinedVolumePct / 100) * envelopeMultiplier;
    const clampedVol = Math.max(0, Math.min(1, targetGain));

    // Attach Web Audio MediaElementSourceNode only when a voiceFilter or >100% volume boost is active
    // AND the AudioContext is already running (from a user gesture). Standard 0..100% volume & fades
    // stay on native HTMLMediaElement.volume to keep hardware media audio paths fast.
    const needsWebAudioGraph =
      audio.voiceFilter !== 'none' || combinedVolumePct > 100;

    if (
      element &&
      needsWebAudioGraph &&
      !this.activeNodes.has(clipId) &&
      this.ctx &&
      this.ctx.state === 'running'
    ) {
      this.setupNodeChain(clipId, element, clip);
    }

    const nodeGroup = this.activeNodes.get(clipId);
    if (nodeGroup && this.ctx) {
      if (nodeGroup.appliedFilter !== audio.voiceFilter) {
        this.applyVoiceFilter(nodeGroup, audio.voiceFilter);
        nodeGroup.appliedFilter = audio.voiceFilter;
      }
      if (element) {
        if (element.muted !== isMuted) {
          element.muted = isMuted;
        }
        if (Math.abs(element.volume - 1) > 0.001) {
          element.volume = 1;
        }
      }
      if (
        nodeGroup.lastGain === undefined ||
        Math.abs(nodeGroup.lastGain - targetGain) > 0.002
      ) {
        nodeGroup.gainNode.gain.setTargetAtTime(
          targetGain,
          this.ctx.currentTime,
          0.03
        );
        nodeGroup.lastGain = targetGain;
      }
    } else if (element) {
      if (element.muted !== isMuted) {
        element.muted = isMuted;
      }
      if (
        Math.abs(element.volume - clampedVol) > 0.002 ||
        (clampedVol === 0 && element.volume !== 0)
      ) {
        element.volume = clampedVol;
      }
    }
  }

  private applyVoiceFilter(nodeGroup: ActiveNodeChain, filter: VoiceFilter) {
    const ctx = this.ctx!;
    // Clean up existing filter graph cleanly
    if (nodeGroup.filterHandle) {
      try {
        nodeGroup.filterHandle.dispose();
      } catch {}
      nodeGroup.filterHandle = undefined;
    }
    try {
      nodeGroup.gainNode.disconnect();
    } catch {}

    if (!filter || filter === 'none') {
      nodeGroup.gainNode.connect(this.masterGain!);
      return;
    }

    const handle = buildVoiceFilterGraph(ctx, nodeGroup.gainNode, filter);
    handle.output.connect(this.masterGain!);
    nodeGroup.filterHandle = handle;
  }

  /**
   * Stops any active standalone voice-filter preview snippet.
   */
  public stopVoiceFilterPreview() {
    this.previewRequestToken++;
    const current = this.activePreview;
    if (!current) return;
    this.activePreview = null;

    if (current.timerId !== null) {
      window.clearTimeout(current.timerId);
    }
    try {
      current.source.onended = null;
      current.source.stop();
      current.source.disconnect();
    } catch {}
    try {
      current.filterHandle.dispose();
    } catch {}
    try {
      current.gainNode.disconnect();
    } catch {}
    current.onStop?.();
  }

  /**
   * Plays a live preview snippet (up to ~4.5s) of a video or audio clip
   * through the requested voice filter so the user can audition it immediately.
   * Returns true if buffer preview started, false if caller should fall back to timeline playback.
   */
  public async previewVoiceFilter(
    clip: AudioClip | VideoClip,
    filter: VoiceFilter,
    currentTime: number,
    onStateChange?: (playing: boolean) => void
  ): Promise<boolean> {
    this.stopVoiceFilterPreview();
    const token = ++this.previewRequestToken;

    if (!clip.sourceUrl || clip.sourceUrl.startsWith('procedural://')) {
      return false;
    }

    try {
      const ctx = this.init();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const buffer = await this.loadAudioBuffer(clip.sourceUrl);
      if (token !== this.previewRequestToken) return true;
      if (!buffer || buffer.duration <= 0.05) return false;

      const speed = Math.max(0.25, Math.min(4, clip.speed || 1));
      const isInsideClip =
        currentTime >= clip.startTime &&
        currentTime < clip.startTime + clip.duration - 0.15;
      const localOffset = isInsideClip ? (currentTime - clip.startTime) * speed : 0;
      const baseSourceStart = Math.max(0, clip.sourceStartTime || 0);
      let startOffset = Math.min(
        Math.max(0, buffer.duration - 0.5),
        baseSourceStart + localOffset
      );
      if (buffer.duration - startOffset < 1.2 && baseSourceStart < buffer.duration - 1.2) {
        startOffset = baseSourceStart;
      }

      const maxPreviewSec = 4.5;
      const clipRemainingSource = Math.max(
        0.5,
        (clip.duration - (isInsideClip ? currentTime - clip.startTime : 0)) * speed
      );
      const previewDuration = Math.min(
        maxPreviewSec,
        Math.max(0.4, buffer.duration - startOffset),
        clipRemainingSource
      );

      const preservesPitch = clip.audio?.preservesPitch ?? true;
      const usePitchPreservingStretch =
        preservesPitch && Math.abs(speed - 1.0) > 0.002;

      const source = ctx.createBufferSource();
      if (usePitchPreservingStretch) {
        source.buffer = timeStretchAudioBufferSlice(
          ctx,
          buffer,
          startOffset,
          previewDuration,
          speed
        );
        source.playbackRate.setValueAtTime(1.0, ctx.currentTime);
      } else {
        source.buffer = buffer;
        source.playbackRate.setValueAtTime(speed, ctx.currentTime);
      }

      const previewGain = ctx.createGain();
      const vol = Math.max(0.15, Math.min(2.5, (clip.audio?.volume ?? 100) / 100));
      previewGain.gain.setValueAtTime(vol, ctx.currentTime);

      const filterHandle = buildVoiceFilterGraph(ctx, source, filter);
      filterHandle.output.connect(previewGain);
      previewGain.connect(this.masterGain!);

      const cleanup = () => {
        if (this.activePreview?.source === source) {
          this.stopVoiceFilterPreview();
        }
      };

      const realDurationMs = Math.ceil((previewDuration / speed) * 1000) + 150;
      const timerId = window.setTimeout(cleanup, realDurationMs);

      this.activePreview = {
        source,
        filterHandle,
        gainNode: previewGain,
        timerId,
        onStop: () => onStateChange?.(false),
      };

      source.onended = cleanup;
      onStateChange?.(true);
      if (usePitchPreservingStretch) {
        source.start(0, 0, source.buffer.duration);
      } else {
        source.start(0, startOffset, previewDuration);
      }
      return true;
    } catch {
      onStateChange?.(false);
      return false;
    }
  }

  // Synthesize Built-in Sound Effects (Whoosh, Impact, Pop, Ding, Glitch) as WAV Blobs
  public async generateSynthesizedSFX(
    sfxType: 'whoosh' | 'impact' | 'pop' | 'ding' | 'glitch' | 'beat'
  ): Promise<{ url: string; blob: Blob; duration: number; waveform: number[] }> {
    const sampleRate = 44100;
    const duration =
      sfxType === 'beat'
        ? 4.0
        : sfxType === 'impact'
        ? 1.4
        : sfxType === 'ding'
        ? 1.2
        : 0.8;
    const length = Math.floor(sampleRate * duration);
    const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
    const buffer = offlineCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const p = t / duration;
      if (sfxType === 'whoosh') {
        const env = Math.sin(p * Math.PI);
        const freq = 180 + Math.sin(p * Math.PI) * 900;
        const noise = (Math.random() * 2 - 1) * 0.45;
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.4;
        data[i] = (noise + tone) * Math.pow(env, 1.5);
      } else if (sfxType === 'impact') {
        const env = Math.exp(-t * 4.5);
        const sub = Math.sin(2 * Math.PI * (95 * Math.exp(-t * 6) + 38) * t);
        const punch = (Math.random() * 2 - 1) * Math.exp(-t * 18);
        data[i] = Math.max(-1, Math.min(1, (sub * 0.85 + punch * 0.5) * env));
      } else if (sfxType === 'pop') {
        const env = Math.exp(-t * 16);
        const freq = 260 + t * 1800;
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
      } else if (sfxType === 'ding') {
        const env = Math.exp(-t * 3.5);
        data[i] =
          (Math.sin(2 * Math.PI * 1046.5 * t) * 0.6 +
            Math.sin(2 * Math.PI * 2093.0 * t) * 0.3) *
          env;
      } else if (sfxType === 'glitch') {
        const step = Math.floor(t * 28);
        const f = 220 + ((step * 317) % 1400);
        data[i] = (Math.sin(2 * Math.PI * f * t) > 0 ? 0.6 : -0.6) * (1 - p);
      } else if (sfxType === 'beat') {
        // 120 BPM Electronic Beat Loop (Kick + Hi-hat + Bass)
        const beatPos = (t * 2) % 1;
        const kickEnv = Math.exp(-beatPos * 12);
        const kick = Math.sin(2 * Math.PI * (120 * Math.exp(-beatPos * 15) + 45) * beatPos) * kickEnv;
        const hatPos = (t * 4) % 1;
        const hat = (Math.random() * 2 - 1) * Math.exp(-hatPos * 28) * 0.25;
        const bassFreq = t < 2 ? 110 : 130.81;
        const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.25;
        data[i] = Math.max(-1, Math.min(1, kick * 0.75 + hat + bass));
      }
    }

    const blob = audioBufferToWavBlob(buffer);
    const url = URL.createObjectURL(blob);
    const waveform = this.computeWaveformFromBuffer(buffer, 60);
    return { url, blob, duration, waveform };
  }

  /**
   * Decodes the audio track from a video (or audio) ArrayBuffer/URL into a
   * standalone WAV Blob, object URL, exact duration and waveform peaks.
   */
  public async extractAudioFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{
    url: string;
    blob: Blob;
    duration: number;
    waveform: number[];
  }> {
    const ctx = this.init();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const blob = audioBufferToWavBlob(audioBuffer);
    const url = URL.createObjectURL(blob);
    this.cacheAudioBuffer(url, audioBuffer);
    const duration = Number(Math.max(0.5, audioBuffer.duration).toFixed(2));
    const waveform = this.computeWaveformFromBuffer(audioBuffer, 80);
    return { url, blob, duration, waveform };
  }

  public async extractAudioFromVideoFile(file: File): Promise<{
    url: string;
    blob: Blob;
    duration: number;
    waveform: number[];
  }> {
    const arrayBuffer = await file.arrayBuffer();
    return this.extractAudioFromArrayBuffer(arrayBuffer);
  }

  public async extractAudioFromUrl(url: string): Promise<{
    url: string;
    blob: Blob;
    duration: number;
    waveform: number[];
  }> {
    const buffer = await this.loadAudioBuffer(url);
    const blob = audioBufferToWavBlob(buffer);
    const wavUrl = URL.createObjectURL(blob);
    this.cacheAudioBuffer(wavUrl, buffer);
    const duration = Number(Math.max(0.5, buffer.duration).toFixed(2));
    const waveform = this.computeWaveformFromBuffer(buffer, 80);
    return { url: wavUrl, blob, duration, waveform };
  }

  public getRealtimeVolumeData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const globalAudioEngine = new AudioEngine();
