// ============================================================================
// timeStretch - WSOLA (Waveform Similarity Overlap-Add) Pitch-Preserving
// Time-Stretcher for AudioBuffers
//
// Matches the pitch-preserving behavior of HTMLMediaElement (preservesPitch=true)
// and FFmpeg's `atempo` filter so exported audio sounds identical to timeline
// playback across WebCodecs, Android APK, Audio Export, and Electron.
// ============================================================================

/**
 * Extracts a slice [sourceOffsetSec, sourceOffsetSec + sourceSpanSec] from
 * `inputBuffer` and time-stretches it by `speed` while preserving voice pitch
 * using WSOLA (Waveform Similarity Overlap-Add).
 *
 * - `speed < 1`: slows audio down (output duration = sourceSpanSec / speed)
 * - `speed > 1`: speeds audio up  (output duration = sourceSpanSec / speed)
 * - `speed === 1`: returns the sliced buffer unchanged.
 *
 * The returned AudioBuffer should be played at `playbackRate = 1.0`.
 */
export function timeStretchAudioBufferSlice(
  ctx: BaseAudioContext,
  inputBuffer: AudioBuffer,
  sourceOffsetSec: number,
  sourceSpanSec: number,
  speed: number
): AudioBuffer {
  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;
  const clampedSpeed = Math.max(0.02, Math.min(16, speed || 1));

  const startSample = Math.max(
    0,
    Math.min(inputBuffer.length - 1, Math.floor(Math.max(0, sourceOffsetSec) * sampleRate))
  );
  const availSamples = Math.max(1, inputBuffer.length - startSample);
  const srcLen = Math.max(
    1,
    Math.min(availSamples, Math.round(Math.max(0.01, sourceSpanSec) * sampleRate))
  );

  // Fast path: speed is effectively 1.0x -> copy slice directly
  if (Math.abs(clampedSpeed - 1.0) <= 0.002) {
    const out = ctx.createBuffer(numChannels, srcLen, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const srcCh = inputBuffer.getChannelData(ch);
      out.getChannelData(ch).set(srcCh.subarray(startSample, startSample + srcLen));
    }
    return out;
  }

  const outLen = Math.max(1, Math.round(srcLen / clampedSpeed));
  const outBuffer = ctx.createBuffer(numChannels, outLen, sampleRate);

  // If the slice is extremely short (< 10ms), fall back to simple linear resample
  if (srcLen < Math.round(sampleRate * 0.01)) {
    for (let ch = 0; ch < numChannels; ch++) {
      const srcCh = inputBuffer.getChannelData(ch);
      const dstCh = outBuffer.getChannelData(ch);
      for (let i = 0; i < outLen; i++) {
        const pos = i * clampedSpeed;
        const idx = Math.min(srcLen - 1, Math.floor(pos));
        const frac = pos - idx;
        const s0 = srcCh[startSample + idx];
        const s1 = srcCh[startSample + Math.min(srcLen - 1, idx + 1)];
        dstCh[i] = s0 + (s1 - s0) * frac;
      }
    }
    return outBuffer;
  }

  // WSOLA parameters:
  // - 40 ms analysis/synthesis window (even length -> exact 50% Hann COLA)
  // - 20 ms synthesis hop
  // - ±15 ms search tolerance (covers > 1 full pitch period down to ~66 Hz)
  let halfWin = Math.round(sampleRate * 0.02);
  if (halfWin * 2 > srcLen) {
    halfWin = Math.max(64, Math.floor(srcLen / 4));
  }
  const winLen = halfWin * 2;
  const synthHop = halfWin;
  const searchDelta = Math.min(
    Math.round(sampleRate * 0.015),
    Math.max(16, Math.floor(srcLen / 4))
  );

  // Precompute Hann window of length winLen
  const hann = new Float32Array(winLen);
  const twoPiOverW = (2 * Math.PI) / winLen;
  for (let i = 0; i < winLen; i++) {
    hann[i] = 0.5 * (1 - Math.cos(twoPiOverW * i));
  }

  // Extract channel slices & build mono mixdown for phase-locked WSOLA search
  const srcChannels: Float32Array[] = [];
  const dstChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    srcChannels.push(inputBuffer.getChannelData(ch).subarray(startSample, startSample + srcLen));
    dstChannels.push(outBuffer.getChannelData(ch));
  }

  let mono: Float32Array;
  if (numChannels === 1) {
    mono = srcChannels[0];
  } else {
    mono = new Float32Array(srcLen);
    const invCh = 1 / numChannels;
    for (let i = 0; i < srcLen; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += srcChannels[ch][i];
      }
      mono[i] = sum * invCh;
    }
  }

  // Normalized overlap weight buffer so edges and interior have exact unity gain
  const weights = new Float32Array(outLen);

  // Maximum valid starting index in `mono` for a full `winLen` frame
  const maxSrcStart = Math.max(0, srcLen - winLen);

  let prevBestPos = 0;
  let outPos = 0;
  let frameIndex = 0;

  // Helper: normalized cross-correlation between template at `tmplStart`
  // and candidate at `candStart` over `halfWin` samples with given stride.
  const computeScore = (tmplStart: number, candStart: number, stride: number): number => {
    let dot = 0;
    let energyCand = 1e-9;
    const len = Math.min(halfWin, srcLen - tmplStart, srcLen - candStart);
    if (len <= 0) return -1e9;
    for (let i = 0; i < len; i += stride) {
      const t = mono[tmplStart + i];
      const c = mono[candStart + i];
      dot += t * c;
      energyCand += c * c;
    }
    return dot / Math.sqrt(energyCand);
  };

  while (outPos < outLen) {
    const idealPos = Math.min(maxSrcStart, Math.max(0, Math.round(outPos * clampedSpeed)));
    let bestPos = idealPos;

    if (frameIndex > 0 && maxSrcStart > 0) {
      // Natural continuation template from the previous frame
      const tmplStart = Math.min(maxSrcStart, prevBestPos + synthHop);
      const searchMin = Math.max(0, idealPos - searchDelta);
      const searchMax = Math.min(maxSrcStart, idealPos + searchDelta);

      if (searchMax > searchMin) {
        // Stage 1: coarse search (lag step 4, inner correlation step 4)
        let bestScore = -1e18;
        let coarseBest = idealPos;
        for (let cand = searchMin; cand <= searchMax; cand += 4) {
          const score = computeScore(tmplStart, cand, 4);
          if (score > bestScore) {
            bestScore = score;
            coarseBest = cand;
          }
        }

        // Stage 2: fine search around coarseBest (lag step 1, inner step 2)
        const fineMin = Math.max(searchMin, coarseBest - 4);
        const fineMax = Math.min(searchMax, coarseBest + 4);
        bestScore = -1e18;
        bestPos = coarseBest;
        for (let cand = fineMin; cand <= fineMax; cand++) {
          const score = computeScore(tmplStart, cand, 2);
          if (score > bestScore) {
            bestScore = score;
            bestPos = cand;
          }
        }
      }
    }

    // Overlap-add the chosen window into every channel
    const copyLen = Math.min(winLen, outLen - outPos, srcLen - bestPos);
    if (frameIndex === 0) {
      // First frame: flat unity on first half so there is no artificial fade-in
      for (let i = 0; i < copyLen; i++) {
        const w = i < halfWin ? 1.0 : hann[i];
        weights[outPos + i] += w;
        for (let ch = 0; ch < numChannels; ch++) {
          dstChannels[ch][outPos + i] += srcChannels[ch][bestPos + i] * w;
        }
      }
    } else {
      for (let i = 0; i < copyLen; i++) {
        const w = hann[i];
        weights[outPos + i] += w;
        for (let ch = 0; ch < numChannels; ch++) {
          dstChannels[ch][outPos + i] += srcChannels[ch][bestPos + i] * w;
        }
      }
    }

    prevBestPos = bestPos;
    outPos += synthHop;
    frameIndex++;
  }

  // Normalize by overlap weights (prevents amplitude dips at start/end)
  for (let i = 0; i < outLen; i++) {
    const w = weights[i];
    if (w > 1e-5 && Math.abs(w - 1.0) > 1e-4) {
      const invW = 1.0 / w;
      for (let ch = 0; ch < numChannels; ch++) {
        dstChannels[ch][i] *= invW;
      }
    }
  }

  return outBuffer;
}
