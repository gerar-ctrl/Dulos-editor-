import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { AudioClip, VideoClip } from '../../types/editor';
import { Mp4VideoFrameReader } from '../export/Mp4VideoDecoder';
import { globalAudioEngine } from '../audio/AudioEngine';
import { ProjectStorage } from '../storage/projectStorage';

export interface ReverseClipResult {
  reversedUrl: string;
  reversedDuration: number;
  waveform?: number[];
}

export type ReverseProgressCallback = (percent: number, stage: string) => void;

const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
    (typeof window !== 'undefined' && window.innerWidth < 768));

function encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function sliceAndReverseAudioBuffer(
  source: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.min(source.length - 1, Math.floor(startSec * sampleRate)));
  const endSample = Math.max(
    startSample + 1,
    Math.min(source.length, Math.ceil(endSec * sampleRate))
  );
  const length = Math.max(1, endSample - startSample);
  const numChannels = Math.min(2, source.numberOfChannels);
  const ctx = globalAudioEngine.init();
  const reversed = ctx.createBuffer(numChannels, length, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const src = source.getChannelData(ch);
    const dst = reversed.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      dst[i] = src[endSample - 1 - i] ?? 0;
    }
  }
  return reversed;
}

function computeWaveformPeaks(buffer: AudioBuffer, bars = 80): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  let maxPeak = 0.001;
  for (let i = 0; i < bars; i++) {
    const start = i * step;
    const end = Math.min(data.length, start + step);
    let peak = 0;
    for (let j = start; j < end; j += Math.max(1, Math.floor(step / 32))) {
      const abs = Math.abs(data[j]);
      if (abs > peak) peak = abs;
    }
    peaks.push(peak);
    if (peak > maxPeak) maxPeak = peak;
  }
  return peaks.map((p) => Number(Math.max(0.06, Math.min(1, p / maxPeak)).toFixed(3)));
}

function computeEvenDimensions(
  srcWidth: number,
  srcHeight: number,
  maxEdge: number
): { width: number; height: number } {
  let w = Math.max(16, srcWidth || 1280);
  let h = Math.max(16, srcHeight || 720);
  const longest = Math.max(w, h);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    w = w * scale;
    h = h * scale;
  }
  const evenW = Math.max(16, Math.round(w / 2) * 2);
  const evenH = Math.max(16, Math.round(h / 2) * 2);
  return { width: evenW, height: evenH };
}

function drawFrameWithRotation(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  outW: number,
  outH: number,
  rotationDeg: number
) {
  ctx.save();
  ctx.clearRect(0, 0, outW, outH);
  const rot = ((rotationDeg % 360) + 360) % 360;
  if (rot === 90) {
    ctx.translate(outW, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(source, 0, 0, outH, outW);
  } else if (rot === 180) {
    ctx.translate(outW, outH);
    ctx.rotate(Math.PI);
    ctx.drawImage(source, 0, 0, outW, outH);
  } else if (rot === 270) {
    ctx.translate(0, outH);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(source, 0, 0, outH, outW);
  } else {
    ctx.drawImage(source, 0, 0, outW, outH);
  }
  ctx.restore();
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.88): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('No se pudo capturar el fotograma'));
      },
      'image/jpeg',
      quality
    );
  });
}

async function negotiateVideoEncoderConfig(
  width: number,
  height: number,
  fps: number
): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === 'undefined' || !VideoEncoder.isConfigSupported) {
    return null;
  }

  const pixels = width * height;
  const bitrate =
    pixels <= 640 * 360
      ? 1_800_000
      : pixels <= 1280 * 720
      ? 4_200_000
      : 7_500_000;

  const codecs =
    pixels <= 1280 * 720
      ? ['avc1.42001f', 'avc1.4d001f', 'avc1.64001f', 'avc1.4d0028', 'avc1.640028']
      : ['avc1.4d0028', 'avc1.640028', 'avc1.42002a', 'avc1.64002a', 'avc1.42001f'];

  const accelModes: HardwareAcceleration[] = IS_MOBILE
    ? ['no-preference', 'prefer-hardware', 'prefer-software']
    : ['prefer-hardware', 'no-preference', 'prefer-software'];

  for (const hw of accelModes) {
    for (const codec of codecs) {
      const cfg: VideoEncoderConfig = {
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: hw,
        avc: { format: 'avc' },
      };
      try {
        const res = await VideoEncoder.isConfigSupported(cfg);
        if (res.supported) {
          return res.config || cfg;
        }
      } catch {}
    }
  }
  return null;
}

async function negotiateAudioEncoderConfig(
  sampleRate: number,
  numberOfChannels: number
): Promise<AudioEncoderConfig | null> {
  if (
    typeof AudioEncoder === 'undefined' ||
    typeof AudioData === 'undefined' ||
    !AudioEncoder.isConfigSupported
  ) {
    return null;
  }
  const ch = Math.max(1, Math.min(2, numberOfChannels));
  const candidates: AudioEncoderConfig[] = [
    { codec: 'mp4a.40.2', sampleRate, numberOfChannels: ch, bitrate: 128_000 },
    { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128_000 },
    { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128_000 },
  ];
  for (const cfg of candidates) {
    try {
      const res = await AudioEncoder.isConfigSupported(cfg);
      if (res.supported) {
        return res.config || cfg;
      }
    } catch {}
  }
  return null;
}

async function resampleAudioBufferIfNeeded(
  buffer: AudioBuffer,
  targetSampleRate: number,
  targetChannels: number
): Promise<AudioBuffer> {
  if (
    buffer.sampleRate === targetSampleRate &&
    buffer.numberOfChannels === targetChannels
  ) {
    return buffer;
  }
  const targetLen = Math.max(1, Math.ceil(buffer.duration * targetSampleRate));
  const offline = new OfflineAudioContext(targetChannels, targetLen, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

async function seekHtmlVideo(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const clamped = Math.max(
    0,
    Number.isFinite(video.duration) && video.duration > 0
      ? Math.min(targetTime, Math.max(0, video.duration - 0.015))
      : targetTime
  );
  if (Math.abs(video.currentTime - clamped) < 0.008 && video.readyState >= 2) {
    return;
  }
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      video.removeEventListener('error', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, 1800);
    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    try {
      video.currentTime = clamped;
    } catch {
      finish();
    }
  });
}

async function loadHtmlVideoElement(url: string): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    video.crossOrigin = 'anonymous';
  }
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.preload = 'auto';
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onErr);
      window.clearTimeout(timer);
    };
    const onReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onErr = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('No se pudo cargar el video para invertirlo'));
    };
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      if (video.readyState >= 1) resolve();
      else reject(new Error('Tiempo agotado al cargar el video'));
    }, 10000);
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('error', onErr, { once: true });
    video.load();
  });

  return video;
}

export class ReverseClipEngine {
  public static async reverseAudioClip(
    clip: AudioClip,
    onProgress?: ReverseProgressCallback,
    signal?: AbortSignal
  ): Promise<ReverseClipResult> {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    onProgress?.(15, 'Decodificando audio...');
    const rawBuffer = await globalAudioEngine.loadAudioBuffer(clip.sourceUrl);
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

    const speed = Math.max(0.05, Math.min(16, clip.speed || 1));
    const startSec = Math.max(0, Math.min(rawBuffer.duration - 0.05, clip.sourceStartTime || 0));
    const endSec = Math.max(
      startSec + 0.05,
      Math.min(rawBuffer.duration, startSec + clip.duration * speed)
    );

    onProgress?.(55, 'Invirtiendo ondas de audio...');
    const reversedBuffer = sliceAndReverseAudioBuffer(rawBuffer, startSec, endSec);
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

    onProgress?.(85, 'Empaquetando audio invertido...');
    const wavBlob = encodeAudioBufferToWavBlob(reversedBuffer);
    const reversedUrl = URL.createObjectURL(wavBlob);
    ProjectStorage.registerRuntimeBlob(reversedUrl, wavBlob);
    const waveform = computeWaveformPeaks(reversedBuffer, 80);
    onProgress?.(100, 'Reversa completada');

    return {
      reversedUrl,
      reversedDuration: Math.max(0.05, endSec - startSec),
      waveform,
    };
  }

  public static async reverseVideoClip(
    clip: VideoClip,
    onProgress?: ReverseProgressCallback,
    signal?: AbortSignal
  ): Promise<ReverseClipResult> {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
      throw new Error('Tu dispositivo no soporta WebCodecs para invertir video');
    }

    onProgress?.(3, 'Leyendo archivo de video...');
    const response = await fetch(clip.sourceUrl, { signal });
    if (!response.ok) {
      throw new Error('No se pudo leer el archivo del clip');
    }
    const sourceBlob = await response.blob();
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

    onProgress?.(6, 'Analizando fotogramas...');
    const reader = await Mp4VideoFrameReader.createFromBlob(sourceBlob);
    let fallbackVideo: HTMLVideoElement | null = null;

    try {
      let srcWidth = clip.naturalWidth || 1280;
      let srcHeight = clip.naturalHeight || 720;
      let srcDuration = clip.sourceDuration || clip.duration;
      let srcFps = 30;

      if (reader) {
        const info = reader.getVideoInfo();
        srcWidth = info.width || srcWidth;
        srcHeight = info.height || srcHeight;
        srcDuration = info.durationSec > 0.05 ? info.durationSec : srcDuration;
        srcFps = info.fps || 30;
      } else {
        fallbackVideo = await loadHtmlVideoElement(clip.sourceUrl);
        srcWidth = fallbackVideo.videoWidth || srcWidth;
        srcHeight = fallbackVideo.videoHeight || srcHeight;
        if (Number.isFinite(fallbackVideo.duration) && fallbackVideo.duration > 0.05) {
          srcDuration = fallbackVideo.duration;
        }
        srcFps = 24;
      }

      const speed = Math.max(0.05, Math.min(16, clip.speed || 1));
      const startSec = Math.max(0, Math.min(srcDuration - 0.05, clip.sourceStartTime || 0));
      const endSec = Math.max(
        startSec + 0.05,
        Math.min(srcDuration, startSec + clip.duration * speed)
      );
      const spanSec = Math.max(0.05, endSec - startSec);

      const maxEdge = IS_MOBILE ? 1280 : 1920;
      const { width: outW, height: outH } = computeEvenDimensions(srcWidth, srcHeight, maxEdge);
      const targetFps = IS_MOBILE
        ? Math.max(15, Math.min(30, Math.round(srcFps)))
        : Math.max(15, Math.min(60, Math.round(srcFps)));

      const videoEncoderCfg = await negotiateVideoEncoderConfig(outW, outH, targetFps);
      if (!videoEncoderCfg) {
        throw new Error('No se encontró un codificador H.264 compatible en este dispositivo');
      }

      // Decode and reverse audio track (optional: silent videos succeed cleanly without audio)
      onProgress?.(10, 'Invirtiendo pista de audio...');
      let reversedAudioBuffer: AudioBuffer | null = null;
      let audioEncoderCfg: AudioEncoderConfig | null = null;
      try {
        const rawAudio = await globalAudioEngine.loadAudioBuffer(clip.sourceUrl);
        if (rawAudio && rawAudio.length > 0 && rawAudio.duration > 0.02) {
          const slicedRev = sliceAndReverseAudioBuffer(rawAudio, startSec, endSec);
          const candidateAudioCfg = await negotiateAudioEncoderConfig(
            slicedRev.sampleRate,
            slicedRev.numberOfChannels
          );
          if (candidateAudioCfg) {
            reversedAudioBuffer = await resampleAudioBufferIfNeeded(
              slicedRev,
              candidateAudioCfg.sampleRate,
              candidateAudioCfg.numberOfChannels
            );
            audioEncoderCfg = candidateAudioCfg;
          }
        }
      } catch {
        // Video has no audio track or audio decode failed; continue with video-only reversal
        reversedAudioBuffer = null;
        audioEncoderCfg = null;
      }

      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

      const muxerTarget = new ArrayBufferTarget();
      const muxer = new Muxer({
        target: muxerTarget,
        video: {
          codec: 'avc',
          width: outW,
          height: outH,
          frameRate: targetFps,
        },
        ...(audioEncoderCfg
          ? {
              audio: {
                codec: 'aac',
                numberOfChannels: audioEncoderCfg.numberOfChannels,
                sampleRate: audioEncoderCfg.sampleRate,
              },
            }
          : {}),
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset',
      });

      let encoderError: Error | null = null;
      let encodedCount = 0;
      let dequeueResolve: (() => void) | null = null;

      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          encodedCount++;
          muxer.addVideoChunk(chunk, meta);
        },
        error: (err) => {
          encoderError =
            err instanceof Error ? err : new Error(String(err || 'Error de VideoEncoder'));
          if (dequeueResolve) {
            const fn = dequeueResolve;
            dequeueResolve = null;
            fn();
          }
        },
      });
      videoEncoder.ondequeue = () => {
        if (dequeueResolve) {
          const fn = dequeueResolve;
          dequeueResolve = null;
          fn();
        }
      };
      videoEncoder.configure(videoEncoderCfg);

      const waitEncoderBackpressure = async () => {
        while (videoEncoder.encodeQueueSize >= 4 && !encoderError && !signal?.aborted) {
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              window.clearTimeout(timer);
              resolve();
            };
            dequeueResolve = finish;
            const timer = window.setTimeout(finish, 40);
          });
        }
      };

      const workCanvas = document.createElement('canvas');
      workCanvas.width = outW;
      workCanvas.height = outH;
      const workCtx = workCanvas.getContext('2d');
      if (!workCtx) {
        throw new Error('No se pudo inicializar el lienzo 2D');
      }

      const frameDurMicros = Math.round(1_000_000 / targetFps);
      const minSourceStepSec = (1 / targetFps) * 0.82;
      const keyFrameInterval = Math.max(15, targetFps);
      let lastTsMicros = -1;
      let lastKeptSrcPts = Infinity;
      let frameIdx = 0;

      if (reader) {
        const gops = reader.getGopRanges(startSec, endSec);
        if (gops.length === 0) {
          throw new Error('No se encontraron fotogramas en el rango del clip');
        }

        for (let g = gops.length - 1; g >= 0; g--) {
          if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
          if (encoderError) throw encoderError;

          const gop = gops[g];
          const gopFrames: Array<{ ptsSec: number; blob: Blob }> = [];

          const gopProgressBase = 12 + ((gops.length - 1 - g) / gops.length) * 76;
          onProgress?.(
            Math.round(gopProgressBase),
            `Invirtiendo video (${gops.length - g}/${gops.length})...`
          );

          await reader.decodeGopRange(
            gop.keyIdx,
            gop.endIdx,
            async (vf, manualRotation) => {
              const ptsSec = vf.timestamp / 1_000_000;
              if (ptsSec < startSec - 0.04 || ptsSec > endSec + 0.04) return;
              drawFrameWithRotation(workCtx, vf, outW, outH, manualRotation);
              const jpegBlob = await canvasToJpegBlob(workCanvas, 0.9);
              gopFrames.push({ ptsSec, blob: jpegBlob });
            },
            signal
          );

          if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
          if (reader.hasError()) {
            throw new Error('Error al decodificar el video en reversa');
          }

          // Reverse order: newest PTS -> oldest PTS
          gopFrames.sort((a, b) => b.ptsSec - a.ptsSec);

          for (let i = 0; i < gopFrames.length; i++) {
            if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
            if (encoderError) throw encoderError;

            const item = gopFrames[i];
            if (lastKeptSrcPts !== Infinity && lastKeptSrcPts - item.ptsSec < minSourceStepSec) {
              continue;
            }
            lastKeptSrcPts = item.ptsSec;

            await waitEncoderBackpressure();

            const bmp = await createImageBitmap(item.blob);
            try {
              let tsMicros = Math.max(0, Math.round((endSec - item.ptsSec) * 1_000_000));
              if (tsMicros <= lastTsMicros) {
                tsMicros = lastTsMicros + frameDurMicros;
              }
              lastTsMicros = tsMicros;

              const outFrame = new VideoFrame(bmp, {
                timestamp: tsMicros,
                duration: frameDurMicros,
              });
              try {
                videoEncoder.encode(outFrame, {
                  keyFrame: frameIdx % keyFrameInterval === 0,
                });
                frameIdx++;
              } finally {
                outFrame.close();
              }
            } finally {
              bmp.close();
            }
          }

          // Immediately free this GOP's JPEG blobs before decoding the previous GOP
          gopFrames.length = 0;
        }
      } else if (fallbackVideo) {
        // Fallback for non-MP4/WebM containers via <video> backward stepping
        const totalSteps = Math.max(1, Math.ceil(spanSec * targetFps));
        for (let step = 0; step < totalSteps; step++) {
          if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
          if (encoderError) throw encoderError;

          const t = Math.max(startSec, endSec - step / targetFps);
          await seekHtmlVideo(fallbackVideo, t);
          drawFrameWithRotation(workCtx, fallbackVideo, outW, outH, 0);
          await waitEncoderBackpressure();

          const tsMicros = Math.round((step / targetFps) * 1_000_000);
          const outFrame = new VideoFrame(workCanvas, {
            timestamp: tsMicros,
            duration: frameDurMicros,
          });
          try {
            videoEncoder.encode(outFrame, {
              keyFrame: step % keyFrameInterval === 0,
            });
            frameIdx++;
          } finally {
            outFrame.close();
          }

          if (step % 4 === 0) {
            onProgress?.(
              Math.round(12 + (step / totalSteps) * 76),
              'Invirtiendo fotogramas...'
            );
          }
        }
      }

      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');

      onProgress?.(90, 'Finalizando video invertido...');
      await videoEncoder.flush();
      videoEncoder.close();

      if (encoderError) throw encoderError;
      if (encodedCount === 0) {
        throw new Error('No se pudo codificar ningún fotograma en reversa');
      }

      // Encode reversed audio track if available
      if (audioEncoderCfg && reversedAudioBuffer) {
        onProgress?.(94, 'Sincronizando audio invertido...');
        try {
          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              muxer.addAudioChunk(chunk, meta);
            },
            error: (e) => {
              console.warn('Reverse AudioEncoder warning:', e);
            },
          });
          audioEncoder.configure(audioEncoderCfg);

          const sr = reversedAudioBuffer.sampleRate;
          const numCh = audioEncoderCfg.numberOfChannels;
          const totalSamples = reversedAudioBuffer.length;
          const left = reversedAudioBuffer.getChannelData(0);
          const right =
            numCh > 1
              ? reversedAudioBuffer.numberOfChannels > 1
                ? reversedAudioBuffer.getChannelData(1)
                : left
              : null;

          const chunkFrames = 1024 * 8;
          for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
            const count = Math.min(chunkFrames, totalSamples - offset);
            const planar = new Float32Array(count * numCh);
            planar.set(left.subarray(offset, offset + count), 0);
            if (numCh > 1 && right) {
              planar.set(right.subarray(offset, offset + count), count);
            }
            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: sr,
              numberOfFrames: count,
              numberOfChannels: numCh,
              timestamp: Math.round((offset / sr) * 1_000_000),
              data: planar,
            });
            audioEncoder.encode(audioData);
            audioData.close();
          }

          await audioEncoder.flush();
          audioEncoder.close();
        } catch (audioErr) {
          console.warn('Reverse audio muxing skipped:', audioErr);
        }
      }

      onProgress?.(98, 'Guardando clip invertido...');
      muxer.finalize();
      const mp4Blob = new Blob([muxerTarget.buffer], { type: 'video/mp4' });
      const reversedUrl = URL.createObjectURL(mp4Blob);
      ProjectStorage.registerRuntimeBlob(reversedUrl, mp4Blob);
      onProgress?.(100, 'Reversa lista');

      return {
        reversedUrl,
        reversedDuration: spanSec,
      };
    } finally {
      reader?.dispose();
      if (fallbackVideo) {
        try {
          fallbackVideo.pause();
          fallbackVideo.removeAttribute('src');
          fallbackVideo.load();
        } catch {}
        fallbackVideo.remove();
      }
    }
  }
}
