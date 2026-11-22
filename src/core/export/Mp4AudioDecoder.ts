// ============================================================================
// Mp4AudioDecoder - Streaming Range Audio Decoder via WebCodecs AudioDecoder
// Parses ISO-BMFF (MP4/MOV) audio track sample tables from a Blob without
// loading the whole file into RAM, and decodes only the requested time range.
// ============================================================================

interface BoxHeader {
  type: string;
  start: number;
  headerSize: number;
  end: number;
}

interface AudioSample {
  offset: number;
  size: number;
  ptsSec: number;
  durationSec: number;
}

interface ParsedAudioTrack {
  config: AudioDecoderConfig;
  samples: AudioSample[];
  sampleRate: number;
  numberOfChannels: number;
}

function readFourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function readBoxHeader(
  view: DataView,
  offset: number,
  limit: number
): BoxHeader | null {
  if (offset + 8 > limit) return null;
  const size32 = view.getUint32(offset, false);
  const type = readFourCC(view, offset + 4);
  let headerSize = 8;
  let size = size32;

  if (size32 === 1) {
    if (offset + 16 > limit) return null;
    const hi = view.getUint32(offset + 8, false);
    const lo = view.getUint32(offset + 12, false);
    size = hi * 4294967296 + lo;
    headerSize = 16;
  } else if (size32 === 0) {
    size = limit - offset;
  }

  if (size < headerSize) return null;
  const end = Math.min(limit, offset + size);
  return { type, start: offset, headerSize, end };
}

function findChildBox(
  view: DataView,
  start: number,
  end: number,
  targetType: string
): BoxHeader | null {
  let cursor = start;
  while (cursor + 8 <= end) {
    const box = readBoxHeader(view, cursor, end);
    if (!box) break;
    if (box.type === targetType) return box;
    if (box.end <= cursor) break;
    cursor = box.end;
  }
  return null;
}

function findAllChildBoxes(
  view: DataView,
  start: number,
  end: number,
  targetType: string
): BoxHeader[] {
  const results: BoxHeader[] = [];
  let cursor = start;
  while (cursor + 8 <= end) {
    const box = readBoxHeader(view, cursor, end);
    if (!box) break;
    if (box.type === targetType) results.push(box);
    if (box.end <= cursor) break;
    cursor = box.end;
  }
  return results;
}

function readMp4DescriptorLength(bytes: Uint8Array, pos: number, end: number): { len: number; next: number } {
  let len = 0;
  let count = 0;
  while (pos < end && count < 4) {
    const b = bytes[pos++];
    len = (len << 7) | (b & 0x7f);
    count++;
    if ((b & 0x80) === 0) break;
  }
  return { len, next: pos };
}

// Extract AudioSpecificConfig (tag 0x05) and objectTypeIndication from an MP4 `esds` box
function parseEsdsAudioConfig(
  bytes: Uint8Array,
  start: number,
  end: number
): { objectTypeIndication: number; asc: Uint8Array | null } {
  let pos = start + 4; // skip version + flags
  let objectTypeIndication = 0x40;
  let asc: Uint8Array | null = null;

  while (pos + 2 <= end) {
    const tag = bytes[pos++];
    const { len, next } = readMp4DescriptorLength(bytes, pos, end);
    pos = next;
    const descEnd = Math.min(end, pos + len);

    if (tag === 0x03) {
      // ES_Descriptor: ES_ID (2) + flags (1) + optional fields
      if (pos + 3 > descEnd) break;
      const flags = bytes[pos + 2];
      pos += 3;
      if (flags & 0x80) pos += 2; // streamDependenceFlag
      if (flags & 0x40) {
        if (pos < descEnd) pos += 1 + bytes[pos]; // URL_Flag
      }
      if (flags & 0x20) pos += 2; // OCRstreamFlag
      continue;
    }

    if (tag === 0x04) {
      // DecoderConfigDescriptor: objectTypeIndication (1) + streamType (1) + bufferSizeDB (3) + maxBitrate (4) + avgBitrate (4)
      if (pos + 13 > descEnd) break;
      objectTypeIndication = bytes[pos];
      pos += 13;
      continue;
    }

    if (tag === 0x05) {
      // DecoderSpecificInfo = AudioSpecificConfig
      asc = bytes.slice(pos, descEnd);
      break;
    }

    pos = descEnd;
  }

  return { objectTypeIndication, asc };
}

function parseAudioStsd(
  bytes: Uint8Array,
  view: DataView,
  stsdBox: BoxHeader
): { codec: string; sampleRate: number; numberOfChannels: number; description?: Uint8Array } | null {
  const payloadStart = stsdBox.start + stsdBox.headerSize;
  if (payloadStart + 8 > stsdBox.end) return null;
  const entryCount = view.getUint32(payloadStart + 4, false);
  if (entryCount < 1) return null;

  const entryBox = readBoxHeader(view, payloadStart + 8, stsdBox.end);
  if (!entryBox) return null;

  const p = entryBox.start + entryBox.headerSize;
  // AudioSampleEntry fixed header is 28 bytes after box header (version 0)
  if (p + 28 > entryBox.end) return null;

  const version = view.getUint16(p + 8, false);
  const numberOfChannels = Math.max(1, view.getUint16(p + 16, false));
  const sampleRateFixed = view.getUint32(p + 24, false);
  const sampleRate = Math.round(sampleRateFixed / 65536) || 44100;

  let childStart = p + 28;
  if (version === 1) childStart += 16;
  else if (version === 2) childStart += 36;

  const format = entryBox.type;

  if (format === 'mp4a') {
    let esds = findChildBox(view, childStart, entryBox.end, 'esds');
    if (!esds && version === 0) {
      // Some QuickTime/MOV files wrap esds inside `wave`
      const wave = findChildBox(view, childStart, entryBox.end, 'wave');
      if (wave) {
        esds = findChildBox(view, wave.start + wave.headerSize, wave.end, 'esds');
      }
    }
    if (!esds) {
      return { codec: 'mp4a.40.2', sampleRate, numberOfChannels };
    }
    const { objectTypeIndication, asc } = parseEsdsAudioConfig(
      bytes,
      esds.start + esds.headerSize,
      esds.end
    );
    if (objectTypeIndication === 0x6b || objectTypeIndication === 0x69) {
      return { codec: 'mp3', sampleRate, numberOfChannels };
    }
    let audioObjectType = 2;
    if (asc && asc.length >= 1) {
      const aot = (asc[0] >> 3) & 0x1f;
      if (aot > 0 && aot < 31) audioObjectType = aot;
    }
    return {
      codec: `mp4a.40.${audioObjectType}`,
      sampleRate,
      numberOfChannels,
      ...(asc && asc.length > 0 ? { description: asc } : {}),
    };
  }

  if (format === '.mp3' || format === 'mp3 ') {
    return { codec: 'mp3', sampleRate, numberOfChannels };
  }

  if (format === 'Opus') {
    const dOps = findChildBox(view, childStart, entryBox.end, 'dOps');
    const description = dOps
      ? bytes.slice(dOps.start + dOps.headerSize, dOps.end)
      : undefined;
    return { codec: 'opus', sampleRate: 48000, numberOfChannels, description };
  }

  if (format === 'fLaC') {
    const dfLa = findChildBox(view, childStart, entryBox.end, 'dfLa');
    const description = dfLa
      ? bytes.slice(dfLa.start + dfLa.headerSize + 4, dfLa.end)
      : undefined;
    return { codec: 'flac', sampleRate, numberOfChannels, description };
  }

  return null;
}

async function parseMp4AudioTrackFromBlob(blob: Blob): Promise<ParsedAudioTrack | null> {
  const len = blob.size;
  let cursor = 0;
  let moovStart = -1;
  let moovEnd = -1;
  let moovHeaderSize = 8;
  let hasMoof = false;

  while (cursor + 8 <= len) {
    const headerBuf = await blob.slice(cursor, Math.min(len, cursor + 16)).arrayBuffer();
    const headerView = new DataView(headerBuf);
    const box = readBoxHeader(headerView, 0, Math.min(16, len - cursor));
    if (!box) break;

    const size32 = headerView.getUint32(0, false);
    let boxSize = size32;
    let headerSize = 8;
    if (size32 === 1) {
      if (headerBuf.byteLength < 16) break;
      boxSize = headerView.getUint32(8, false) * 4294967296 + headerView.getUint32(12, false);
      headerSize = 16;
    } else if (size32 === 0) {
      boxSize = len - cursor;
    }
    if (boxSize < headerSize) break;
    const boxEnd = Math.min(len, cursor + boxSize);

    if (box.type === 'moof') hasMoof = true;
    else if (box.type === 'moov') {
      moovStart = cursor;
      moovEnd = boxEnd;
      moovHeaderSize = headerSize;
    }

    if (boxEnd <= cursor) break;
    cursor = boxEnd;
  }

  // Fragmented MP4s fallback to standard decodeAudioData
  if (hasMoof || moovStart < 0 || moovEnd <= moovStart) return null;
  const moovSize = moovEnd - moovStart;
  if (moovSize > 128 * 1024 * 1024) return null;

  const moovBuf = await blob.slice(moovStart, moovEnd).arrayBuffer();
  const bytes = new Uint8Array(moovBuf);
  const view = new DataView(moovBuf);
  const moov: BoxHeader = {
    type: 'moov',
    start: 0,
    headerSize: moovHeaderSize,
    end: moovSize,
  };

  const traks = findAllChildBoxes(view, moov.start + moov.headerSize, moov.end, 'trak');
  for (const trak of traks) {
    const mdia = findChildBox(view, trak.start + trak.headerSize, trak.end, 'mdia');
    if (!mdia) continue;

    const hdlr = findChildBox(view, mdia.start + mdia.headerSize, mdia.end, 'hdlr');
    if (!hdlr) continue;
    const hdlrP = hdlr.start + hdlr.headerSize;
    if (hdlrP + 12 > hdlr.end) continue;
    if (readFourCC(view, hdlrP + 8) !== 'soun') continue;

    const mdhd = findChildBox(view, mdia.start + mdia.headerSize, mdia.end, 'mdhd');
    if (!mdhd) continue;
    const mdhdP = mdhd.start + mdhd.headerSize;
    const mdhdVer = view.getUint8(mdhdP);
    const tsOff = mdhdVer === 1 ? mdhdP + 20 : mdhdP + 12;
    if (tsOff + 4 > mdhd.end) continue;
    const timescale = view.getUint32(tsOff, false);
    if (!timescale) continue;

    const minf = findChildBox(view, mdia.start + mdia.headerSize, mdia.end, 'minf');
    if (!minf) continue;
    const stbl = findChildBox(view, minf.start + minf.headerSize, minf.end, 'stbl');
    if (!stbl) continue;

    const stblStart = stbl.start + stbl.headerSize;
    const stsd = findChildBox(view, stblStart, stbl.end, 'stsd');
    const stts = findChildBox(view, stblStart, stbl.end, 'stts');
    const stsz = findChildBox(view, stblStart, stbl.end, 'stsz');
    const stsc = findChildBox(view, stblStart, stbl.end, 'stsc');
    const stco = findChildBox(view, stblStart, stbl.end, 'stco');
    const co64 = findChildBox(view, stblStart, stbl.end, 'co64');
    if (!stsd || !stts || !stsz || !stsc || (!stco && !co64)) continue;

    const audioInfo = parseAudioStsd(bytes, view, stsd);
    if (!audioInfo) continue;

    const stszP = stsz.start + stsz.headerSize;
    if (stszP + 12 > stsz.end) continue;
    const fixedSampleSize = view.getUint32(stszP + 4, false);
    const sampleCount = view.getUint32(stszP + 8, false);
    if (sampleCount === 0 || sampleCount > 5_000_000) continue;

    const sizes = new Uint32Array(sampleCount);
    if (fixedSampleSize > 0) {
      sizes.fill(fixedSampleSize);
    } else {
      if (stszP + 12 + sampleCount * 4 > stsz.end) continue;
      for (let i = 0; i < sampleCount; i++) {
        sizes[i] = view.getUint32(stszP + 12 + i * 4, false);
      }
    }

    const chunkOffsets: number[] = [];
    if (stco) {
      const p = stco.start + stco.headerSize;
      const count = view.getUint32(p + 4, false);
      for (let i = 0; i < count && p + 8 + i * 4 + 4 <= stco.end; i++) {
        chunkOffsets.push(view.getUint32(p + 8 + i * 4, false));
      }
    } else if (co64) {
      const p = co64.start + co64.headerSize;
      const count = view.getUint32(p + 4, false);
      for (let i = 0; i < count && p + 8 + i * 8 + 8 <= co64.end; i++) {
        const hi = view.getUint32(p + 8 + i * 8, false);
        const lo = view.getUint32(p + 8 + i * 8 + 4, false);
        chunkOffsets.push(hi * 4294967296 + lo);
      }
    }

    const stscP = stsc.start + stsc.headerSize;
    const stscCount = view.getUint32(stscP + 4, false);
    const stscEntries: { firstChunk: number; samplesPerChunk: number }[] = [];
    for (let i = 0; i < stscCount && stscP + 8 + i * 12 + 12 <= stsc.end; i++) {
      stscEntries.push({
        firstChunk: view.getUint32(stscP + 8 + i * 12, false),
        samplesPerChunk: view.getUint32(stscP + 8 + i * 12 + 4, false),
      });
    }

    const offsets = new Float64Array(sampleCount);
    let sampleIdx = 0;
    let stscIdx = 0;
    for (let chunkIdx = 0; chunkIdx < chunkOffsets.length && sampleIdx < sampleCount; chunkIdx++) {
      const chunkNum1 = chunkIdx + 1;
      while (
        stscIdx + 1 < stscEntries.length &&
        chunkNum1 >= stscEntries[stscIdx + 1].firstChunk
      ) {
        stscIdx++;
      }
      const perChunk = stscEntries[stscIdx]?.samplesPerChunk || 1;
      let chunkCursor = chunkOffsets[chunkIdx];
      for (let s = 0; s < perChunk && sampleIdx < sampleCount; s++) {
        offsets[sampleIdx] = chunkCursor;
        chunkCursor += sizes[sampleIdx];
        sampleIdx++;
      }
    }
    if (sampleIdx < sampleCount) continue;

    const sttsP = stts.start + stts.headerSize;
    const sttsCount = view.getUint32(sttsP + 4, false);
    const samples: AudioSample[] = new Array(sampleCount);
    let curDts = 0;
    let sIdx = 0;
    for (let i = 0; i < sttsCount && sIdx < sampleCount; i++) {
      const cnt = view.getUint32(sttsP + 8 + i * 8, false);
      const delta = view.getUint32(sttsP + 8 + i * 8 + 4, false);
      const durSec = Math.max(0.0005, delta / timescale);
      for (let k = 0; k < cnt && sIdx < sampleCount; k++) {
        samples[sIdx] = {
          offset: offsets[sIdx],
          size: sizes[sIdx],
          ptsSec: curDts / timescale,
          durationSec: durSec,
        };
        curDts += delta;
        sIdx++;
      }
    }
    if (sIdx < sampleCount) samples.length = sIdx;
    if (samples.length === 0) continue;

    const config: AudioDecoderConfig = {
      codec: audioInfo.codec,
      sampleRate: audioInfo.sampleRate,
      numberOfChannels: audioInfo.numberOfChannels,
      ...(audioInfo.description ? { description: audioInfo.description } : {}),
    };

    return {
      config,
      samples,
      sampleRate: audioInfo.sampleRate,
      numberOfChannels: audioInfo.numberOfChannels,
    };
  }

  return null;
}

function copyAudioDataChannels(data: AudioData): {
  channels: Float32Array[];
  sampleRate: number;
  numberOfFrames: number;
} {
  const numChannels = data.numberOfChannels;
  const numFrames = data.numberOfFrames;
  const channels: Float32Array[] = [];
  const fmt = data.format;

  if (fmt === 'f32-planar') {
    for (let ch = 0; ch < numChannels; ch++) {
      const buf = new Float32Array(numFrames);
      data.copyTo(buf, { planeIndex: ch, format: 'f32-planar' });
      channels.push(buf);
    }
  } else {
    // Convert interleaved/other formats to f32-planar if supported, otherwise interleaved f32
    try {
      for (let ch = 0; ch < numChannels; ch++) {
        const buf = new Float32Array(numFrames);
        data.copyTo(buf, { planeIndex: ch, format: 'f32-planar' });
        channels.push(buf);
      }
    } catch {
      const interleaved = new Float32Array(numFrames * numChannels);
      data.copyTo(interleaved, { planeIndex: 0, format: 'f32' });
      for (let ch = 0; ch < numChannels; ch++) {
        const chBuf = new Float32Array(numFrames);
        for (let i = 0; i < numFrames; i++) {
          chBuf[i] = interleaved[i * numChannels + ch];
        }
        channels.push(chBuf);
      }
    }
  }

  return { channels, sampleRate: data.sampleRate, numberOfFrames: numFrames };
}

export class Mp4AudioDecoder {
  /**
   * Decodes only the [startSec, endSec] time range of an MP4/MOV Blob's audio track
   * via WebCodecs AudioDecoder using 4MB streaming slices.
   * Returns null if unsupported or non-MP4 so caller can fall back to decodeAudioData.
   */
  public static async decodeRangeFromBlob(
    blob: Blob,
    startSec: number,
    endSec: number,
    ctx: BaseAudioContext
  ): Promise<{ buffer: AudioBuffer; trimmedStartSec: number } | null> {
    if (
      typeof AudioDecoder === 'undefined' ||
      typeof EncodedAudioChunk === 'undefined'
    ) {
      return null;
    }

    const parsed = await parseMp4AudioTrackFromBlob(blob);
    if (!parsed || parsed.samples.length === 0) return null;

    let supportedCfg: AudioDecoderConfig | null = null;
    try {
      const support = await AudioDecoder.isConfigSupported(parsed.config);
      if (support.supported) {
        supportedCfg = support.config || parsed.config;
      }
    } catch {
      return null;
    }
    if (!supportedCfg) return null;

    // Include a small pre-roll (2 frames / ~0.1s) so AAC MDCT overlap initializes cleanly
    const safeStart = Math.max(0, startSec);
    const preRollStart = Math.max(0, safeStart - 0.1);
    const safeEnd = Math.max(safeStart + 0.05, endSec + 0.05);

    const samples = parsed.samples;
    let firstIdx = 0;
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].ptsSec < preRollStart) lo = mid + 1;
      else hi = mid;
    }
    firstIdx = Math.max(0, lo - 2);

    let lastIdx = firstIdx;
    while (lastIdx + 1 < samples.length && samples[lastIdx].ptsSec <= safeEnd) {
      lastIdx++;
    }

    const decodedChunks: Array<{ channels: Float32Array[]; numFrames: number }> = [];
    let actualSampleRate = parsed.sampleRate;
    let actualChannels = parsed.numberOfChannels;
    let decoderErr: Error | null = null;
    let firstOutputPtsSec: number | null = null;

    const decoder = new AudioDecoder({
      output: (audioData) => {
        try {
          if (firstOutputPtsSec === null) {
            firstOutputPtsSec = audioData.timestamp / 1_000_000;
          }
          const copied = copyAudioDataChannels(audioData);
          actualSampleRate = copied.sampleRate;
          actualChannels = copied.channels.length;
          decodedChunks.push({
            channels: copied.channels,
            numFrames: copied.numberOfFrames,
          });
        } finally {
          audioData.close();
        }
      },
      error: (err) => {
        decoderErr = err instanceof Error ? err : new Error(String(err));
      },
    });

    try {
      decoder.configure(supportedCfg);

      const WINDOW_BYTES = 4 * 1024 * 1024;
      let winStart = -1;
      let winBytes: Uint8Array | null = null;

      for (let i = firstIdx; i <= lastIdx; i++) {
        if (decoderErr) break;
        const s = samples[i];
        if (s.size <= 0 || s.offset + s.size > blob.size) continue;

        if (
          !winBytes ||
          s.offset < winStart ||
          s.offset + s.size > winStart + winBytes.byteLength
        ) {
          const fetchLen = Math.max(s.size, WINDOW_BYTES);
          const sliceEnd = Math.min(blob.size, s.offset + fetchLen);
          const buf = await blob.slice(s.offset, sliceEnd).arrayBuffer();
          winStart = s.offset;
          winBytes = new Uint8Array(buf);
        }

        const rel = s.offset - winStart;
        if (rel + s.size > winBytes.byteLength) continue;

        const chunk = new EncodedAudioChunk({
          type: 'key',
          timestamp: Math.round(s.ptsSec * 1_000_000),
          duration: Math.round(s.durationSec * 1_000_000),
          data: winBytes.subarray(rel, rel + s.size),
        });
        decoder.decode(chunk);

        if (decoder.decodeQueueSize > 64) {
          await new Promise<void>((r) => setTimeout(r, 2));
        }
      }

      if (!decoderErr) {
        await decoder.flush();
      }
    } catch {
      return null;
    } finally {
      try {
        if (decoder.state !== 'closed') decoder.close();
      } catch {}
    }

    if (decoderErr || decodedChunks.length === 0) {
      return null;
    }

    let totalDecodedFrames = 0;
    for (const c of decodedChunks) totalDecodedFrames += c.numFrames;
    if (totalDecodedFrames === 0) return null;

    const expectedFirstPts = samples[firstIdx].ptsSec;
    const trimmedStartSec =
      firstOutputPtsSec !== null &&
      Math.abs(firstOutputPtsSec - expectedFirstPts) <= 0.5
        ? firstOutputPtsSec
        : expectedFirstPts;
    const outBuffer = ctx.createBuffer(
      Math.max(1, actualChannels),
      totalDecodedFrames,
      actualSampleRate
    );

    for (let ch = 0; ch < outBuffer.numberOfChannels; ch++) {
      const dst = outBuffer.getChannelData(ch);
      let writePos = 0;
      for (const c of decodedChunks) {
        const src = c.channels[Math.min(ch, c.channels.length - 1)];
        dst.set(src, writePos);
        writePos += c.numFrames;
      }
    }

    return { buffer: outBuffer, trimmedStartSec };
  }
}
