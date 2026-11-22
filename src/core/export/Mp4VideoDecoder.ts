// ============================================================================
// Mp4VideoDecoder - Hardware-Accelerated Sequential WebCodecs VideoDecoder
// Parses ISO-BMFF (MP4/MOV) sample tables in pure TypeScript so export can
// decode frames sequentially at 100-500+ FPS without HTMLVideoElement seeking.
// ============================================================================

export interface Mp4Sample {
  offset: number;
  size: number;
  dtsSec: number;
  ptsSec: number;
  durationSec: number;
  isKey: boolean;
}

interface ParsedMp4Track {
  config: VideoDecoderConfig;
  samples: Mp4Sample[];
  minPtsSec: number;
  tkhdRotation: number;
}

interface BoxHeader {
  type: string;
  start: number;
  headerSize: number;
  end: number;
}

function readFourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0');
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

function parseHevcCodecString(desc: Uint8Array, fourcc: string): string {
  if (desc.length < 13) return `${fourcc}.1.6.L93.B0`;
  const b1 = desc[1];
  const space = (b1 >> 6) & 0x03;
  const tierFlag = (b1 >> 5) & 0x01;
  const profileIdc = b1 & 0x1f;
  const spaceStr = ['', 'A', 'B', 'C'][space] || '';

  // Reverse bits of profile_compatibility_flags (32-bit at bytes 2..5)
  const compat =
    (desc[2] << 24) | (desc[3] << 16) | (desc[4] << 8) | desc[5];
  let reversedCompat = 0;
  for (let i = 0; i < 32; i++) {
    reversedCompat = (reversedCompat << 1) | ((compat >>> i) & 1);
  }
  const compatHex = (reversedCompat >>> 0).toString(16);
  const tierChar = tierFlag ? 'H' : 'L';
  const levelIdc = desc[12];
  return `${fourcc}.${spaceStr}${profileIdc}.${compatHex}.${tierChar}${levelIdc}.B0`;
}

function parseStsd(
  bytes: Uint8Array,
  view: DataView,
  stsdBox: BoxHeader
): {
  codec: string;
  description?: Uint8Array;
  codedWidth: number;
  codedHeight: number;
} | null {
  const payloadStart = stsdBox.start + stsdBox.headerSize;
  if (payloadStart + 8 > stsdBox.end) return null;
  const entryCount = view.getUint32(payloadStart + 4, false);
  if (entryCount < 1) return null;

  const entryBox = readBoxHeader(view, payloadStart + 8, stsdBox.end);
  if (!entryBox) return null;

  const entryPayload = entryBox.start + entryBox.headerSize;
  // VisualSampleEntry fixed header is 78 bytes after box header
  if (entryPayload + 78 > entryBox.end) return null;

  const codedWidth = view.getUint16(entryPayload + 24, false);
  const codedHeight = view.getUint16(entryPayload + 26, false);
  const childStart = entryPayload + 78;

  const format = entryBox.type;
  if (format === 'avc1' || format === 'avc3') {
    const avcC = findChildBox(view, childStart, entryBox.end, 'avcC');
    if (!avcC) return null;
    const desc = bytes.slice(avcC.start + avcC.headerSize, avcC.end);
    if (desc.length < 4) return null;
    const codec = `avc1.${toHex2(desc[1])}${toHex2(desc[2])}${toHex2(desc[3])}`;
    return { codec, description: desc, codedWidth, codedHeight };
  }

  if (format === 'hvc1' || format === 'hev1') {
    const hvcC = findChildBox(view, childStart, entryBox.end, 'hvcC');
    if (!hvcC) return null;
    const desc = bytes.slice(hvcC.start + hvcC.headerSize, hvcC.end);
    const codec = parseHevcCodecString(desc, format);
    return { codec, description: desc, codedWidth, codedHeight };
  }

  if (format === 'vp09') {
    const vpcC = findChildBox(view, childStart, entryBox.end, 'vpcC');
    if (!vpcC) return null;
    const p = vpcC.start + vpcC.headerSize;
    if (p + 8 > vpcC.end) return null;
    const profile = view.getUint8(p + 4);
    const level = view.getUint8(p + 5);
    const bitDepth = (view.getUint8(p + 6) >> 4) & 0x0f;
    const codec = `vp09.${String(profile).padStart(2, '0')}.${String(level).padStart(2, '0')}.${String(bitDepth).padStart(2, '0')}`;
    return { codec, codedWidth, codedHeight };
  }

  if (format === 'av01') {
    const av1C = findChildBox(view, childStart, entryBox.end, 'av1C');
    if (!av1C) return null;
    const p = av1C.start + av1C.headerSize;
    if (p + 4 > av1C.end) return null;
    const b1 = view.getUint8(p + 1);
    const b2 = view.getUint8(p + 2);
    const profile = (b1 >> 5) & 0x07;
    const level = b1 & 0x1f;
    const tier = (b2 >> 7) & 0x01 ? 'H' : 'M';
    const highBit = (b2 >> 6) & 0x01;
    const twelveBit = (b2 >> 5) & 0x01;
    const bitDepth = highBit ? (twelveBit ? 12 : 10) : 8;
    const codec = `av01.${profile}.${String(level).padStart(2, '0')}${tier}.${String(bitDepth).padStart(2, '0')}`;
    return { codec, codedWidth, codedHeight };
  }

  return null;
}

// ============================================================================
// WebM / Matroska (EBML) Video Track Demuxer for WebCodecs VideoDecoder
// Supports VP8, VP9, AV1, and H.264/HEVC inside .webm / .mkv containers.
// ============================================================================

function readEbmlId(bytes: Uint8Array, pos: number, limit: number): { id: number; next: number } | null {
  if (pos >= limit) return null;
  const first = bytes[pos];
  if (first === 0) return null;
  let len = 1;
  let mask = 0x80;
  while (len <= 4 && (first & mask) === 0) {
    len++;
    mask >>= 1;
  }
  if (len > 4 || pos + len > limit) return null;
  let id = 0;
  for (let i = 0; i < len; i++) {
    id = id * 256 + bytes[pos + i];
  }
  return { id, next: pos + len };
}

function readEbmlVint(
  bytes: Uint8Array,
  pos: number,
  limit: number,
  signed = false
): { value: number; next: number; unknown: boolean } | null {
  if (pos >= limit) return null;
  const first = bytes[pos];
  if (first === 0) return null;
  let len = 1;
  let mask = 0x80;
  while (len <= 8 && (first & mask) === 0) {
    len++;
    mask >>= 1;
  }
  if (len > 8 || pos + len > limit) return null;
  let val = first & (mask - 1);
  let allOnes = val === mask - 1;
  for (let i = 1; i < len; i++) {
    const b = bytes[pos + i];
    if (b !== 0xff) allOnes = false;
    val = val * 256 + b;
  }
  if (signed) {
    const bias = Math.pow(2, len * 7 - 1) - 1;
    val -= bias;
  }
  return { value: val, next: pos + len, unknown: allOnes };
}

function readEbmlUint(bytes: Uint8Array, start: number, size: number): number {
  let v = 0;
  for (let i = 0; i < size; i++) {
    v = v * 256 + bytes[start + i];
  }
  return v;
}

function readEbmlFloat(view: DataView, start: number, size: number): number {
  if (size === 4) return view.getFloat32(start, false);
  if (size === 8) return view.getFloat64(start, false);
  return 0;
}

function readEbmlAscii(bytes: Uint8Array, start: number, size: number): string {
  let s = '';
  for (let i = 0; i < size; i++) {
    const c = bytes[start + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export function parseWebmVideoTrack(buffer: ArrayBuffer): ParsedMp4Track | null {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  if (len < 16) return null;
  // EBML magic header: 0x1A 0x45 0xDF 0xA3
  if (bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
    return null;
  }
  const view = new DataView(buffer);

  let cursor = 0;
  let segmentStart = -1;
  let segmentEnd = len;

  while (cursor < len) {
    const idRes = readEbmlId(bytes, cursor, len);
    if (!idRes) break;
    const sizeRes = readEbmlVint(bytes, idRes.next, len);
    if (!sizeRes) break;
    const dataStart = sizeRes.next;
    const dataEnd = sizeRes.unknown ? len : Math.min(len, dataStart + sizeRes.value);
    if (idRes.id === 0x18538067) {
      // Segment
      segmentStart = dataStart;
      segmentEnd = dataEnd;
      break;
    }
    if (dataEnd <= cursor) break;
    cursor = dataEnd;
  }

  if (segmentStart < 0) return null;

  let timecodeScaleNs = 1_000_000; // default 1ms per tick
  let videoTrackNum = -1;
  let codecId = '';
  let codecPrivate: Uint8Array | undefined;
  let pixelWidth = 0;
  let pixelHeight = 0;
  const samples: Mp4Sample[] = [];

  let segPos = segmentStart;
  while (segPos < segmentEnd) {
    const idRes = readEbmlId(bytes, segPos, segmentEnd);
    if (!idRes) break;
    const sizeRes = readEbmlVint(bytes, idRes.next, segmentEnd);
    if (!sizeRes) break;
    const elStart = sizeRes.next;
    const elEnd = sizeRes.unknown ? segmentEnd : Math.min(segmentEnd, elStart + sizeRes.value);

    if (idRes.id === 0x1549a966) {
      // Info
      let p = elStart;
      while (p < elEnd) {
        const subId = readEbmlId(bytes, p, elEnd);
        if (!subId) break;
        const subSz = readEbmlVint(bytes, subId.next, elEnd);
        if (!subSz) break;
        const sStart = subSz.next;
        const sEnd = Math.min(elEnd, sStart + subSz.value);
        if (subId.id === 0x2ad7b1 && subSz.value > 0 && subSz.value <= 8) {
          timecodeScaleNs = readEbmlUint(bytes, sStart, subSz.value) || 1_000_000;
        }
        p = sEnd;
      }
    } else if (idRes.id === 0x1654ae6b) {
      // Tracks
      let p = elStart;
      while (p < elEnd) {
        const subId = readEbmlId(bytes, p, elEnd);
        if (!subId) break;
        const subSz = readEbmlVint(bytes, subId.next, elEnd);
        if (!subSz) break;
        const tStart = subSz.next;
        const tEnd = Math.min(elEnd, tStart + subSz.value);
        if (subId.id === 0xae) {
          // TrackEntry
          let tp = tStart;
          let tNum = -1;
          let tType = -1;
          let tCodec = '';
          let tPriv: Uint8Array | undefined;
          let tW = 0;
          let tH = 0;
          while (tp < tEnd) {
            const fId = readEbmlId(bytes, tp, tEnd);
            if (!fId) break;
            const fSz = readEbmlVint(bytes, fId.next, tEnd);
            if (!fSz) break;
            const fStart = fSz.next;
            const fEnd = Math.min(tEnd, fStart + fSz.value);
            if (fId.id === 0xd7) {
              tNum = readEbmlUint(bytes, fStart, fSz.value);
            } else if (fId.id === 0x83) {
              tType = readEbmlUint(bytes, fStart, fSz.value);
            } else if (fId.id === 0x86) {
              tCodec = readEbmlAscii(bytes, fStart, fSz.value);
            } else if (fId.id === 0x63a2) {
              tPriv = bytes.slice(fStart, fEnd);
            } else if (fId.id === 0xe0) {
              // Video settings
              let vp = fStart;
              while (vp < fEnd) {
                const vId = readEbmlId(bytes, vp, fEnd);
                if (!vId) break;
                const vSz = readEbmlVint(bytes, vId.next, fEnd);
                if (!vSz) break;
                const vStart = vSz.next;
                const vEnd = Math.min(fEnd, vStart + vSz.value);
                if (vId.id === 0xb0) tW = readEbmlUint(bytes, vStart, vSz.value);
                else if (vId.id === 0xba) tH = readEbmlUint(bytes, vStart, vSz.value);
                vp = vEnd;
              }
            }
            tp = fEnd;
          }
          if (tType === 1 && videoTrackNum < 0 && tNum >= 0) {
            videoTrackNum = tNum;
            codecId = tCodec;
            codecPrivate = tPriv;
            pixelWidth = tW || 1280;
            pixelHeight = tH || 720;
          }
        }
        p = tEnd;
      }
    } else if (idRes.id === 0x1f43b675 && videoTrackNum >= 0) {
      // Cluster
      const tickToSec = timecodeScaleNs / 1_000_000_000;
      let clusterTimecode = 0;
      let cp = elStart;
      while (cp < elEnd) {
        const cId = readEbmlId(bytes, cp, elEnd);
        if (!cId) break;
        const cSz = readEbmlVint(bytes, cId.next, elEnd);
        if (!cSz) break;
        const cStart = cSz.next;
        const cEnd = cSz.unknown ? elEnd : Math.min(elEnd, cStart + cSz.value);

        const parseBlockPayload = (bStart: number, bEnd: number, forcedKey: boolean | null) => {
          const trk = readEbmlVint(bytes, bStart, bEnd);
          if (!trk || trk.value !== videoTrackNum) return;
          if (trk.next + 3 > bEnd) return;
          const relTimecode = view.getInt16(trk.next, false);
          const flags = bytes[trk.next + 2];
          const isKey = forcedKey !== null ? forcedKey : (flags & 0x80) !== 0;
          const lacing = (flags >> 1) & 0x03;
          const headerEnd = trk.next + 3;
          const ptsSec = (clusterTimecode + relTimecode) * tickToSec;

          if (lacing === 0) {
            const sz = bEnd - headerEnd;
            if (sz > 0) {
              samples.push({
                offset: headerEnd,
                size: sz,
                dtsSec: ptsSec,
                ptsSec,
                durationSec: 0.033,
                isKey,
              });
            }
          } else {
            if (headerEnd >= bEnd) return;
            const frameCount = bytes[headerEnd] + 1;
            let lPos = headerEnd + 1;
            const frameSizes: number[] = [];
            if (lacing === 1) {
              // Xiph lacing
              let sum = 0;
              for (let i = 0; i < frameCount - 1 && lPos < bEnd; i++) {
                let sz = 0;
                while (lPos < bEnd) {
                  const b = bytes[lPos++];
                  sz += b;
                  if (b < 255) break;
                }
                frameSizes.push(sz);
                sum += sz;
              }
              frameSizes.push(Math.max(0, bEnd - lPos - sum));
            } else if (lacing === 3) {
              // EBML lacing
              let sum = 0;
              let prevSz = 0;
              for (let i = 0; i < frameCount - 1 && lPos < bEnd; i++) {
                const v = readEbmlVint(bytes, lPos, bEnd, i > 0);
                if (!v) break;
                lPos = v.next;
                const sz = i === 0 ? v.value : prevSz + v.value;
                prevSz = sz;
                frameSizes.push(sz);
                sum += sz;
              }
              frameSizes.push(Math.max(0, bEnd - lPos - sum));
            } else {
              // Fixed-size lacing
              const total = bEnd - lPos;
              const each = Math.floor(total / frameCount);
              for (let i = 0; i < frameCount; i++) frameSizes.push(each);
            }
            let fOff = lPos;
            for (let i = 0; i < frameSizes.length; i++) {
              const fSz = frameSizes[i];
              if (fSz > 0 && fOff + fSz <= bEnd) {
                samples.push({
                  offset: fOff,
                  size: fSz,
                  dtsSec: ptsSec,
                  ptsSec,
                  durationSec: 0.033,
                  isKey: i === 0 ? isKey : false,
                });
              }
              fOff += fSz;
            }
          }
        };

        if (cId.id === 0xe7) {
          clusterTimecode = readEbmlUint(bytes, cStart, cSz.value);
        } else if (cId.id === 0xa3) {
          // SimpleBlock
          parseBlockPayload(cStart, cEnd, null);
        } else if (cId.id === 0xa0) {
          // BlockGroup
          let bgPos = cStart;
          let blockStart = -1;
          let blockEnd = -1;
          let hasReferenceBlock = false;
          while (bgPos < cEnd) {
            const bgId = readEbmlId(bytes, bgPos, cEnd);
            if (!bgId) break;
            const bgSz = readEbmlVint(bytes, bgId.next, cEnd);
            if (!bgSz) break;
            const bS = bgSz.next;
            const bE = Math.min(cEnd, bS + bgSz.value);
            if (bgId.id === 0xa1) {
              blockStart = bS;
              blockEnd = bE;
            } else if (bgId.id === 0xfb) {
              hasReferenceBlock = true;
            }
            bgPos = bE;
          }
          if (blockStart >= 0 && blockEnd > blockStart) {
            parseBlockPayload(blockStart, blockEnd, !hasReferenceBlock);
          }
        }
        cp = cEnd;
      }
    }

    if (elEnd <= segPos) break;
    segPos = elEnd;
  }

  if (videoTrackNum < 0 || samples.length === 0) return null;

  let codec = '';
  let description: Uint8Array | undefined;
  if (codecId === 'V_VP8') {
    codec = 'vp8';
  } else if (codecId === 'V_VP9') {
    codec = 'vp09.00.10.08';
  } else if (codecId === 'V_AV1') {
    codec = 'av01.0.08M.08';
  } else if (codecId === 'V_MPEG4/ISO/AVC' && codecPrivate && codecPrivate.length >= 4) {
    codec = `avc1.${toHex2(codecPrivate[1])}${toHex2(codecPrivate[2])}${toHex2(codecPrivate[3])}`;
    description = codecPrivate;
  } else if (codecId === 'V_MPEGH/ISO/HEVC' && codecPrivate && codecPrivate.length >= 13) {
    codec = parseHevcCodecString(codecPrivate, 'hvc1');
    description = codecPrivate;
  } else {
    return null;
  }

  samples.sort((a, b) => a.ptsSec - b.ptsSec);
  const minPtsSec = samples[0].ptsSec;
  for (let i = 0; i < samples.length; i++) {
    samples[i].ptsSec -= minPtsSec;
    samples[i].dtsSec = samples[i].ptsSec;
    if (i + 1 < samples.length) {
      samples[i].durationSec = Math.max(0.001, samples[i + 1].ptsSec - samples[i].ptsSec);
    }
  }
  if (!samples.some((s) => s.isKey)) {
    samples[0].isKey = true;
  }

  // Silence unused helper warning
  void readEbmlFloat;

  return {
    config: {
      codec,
      codedWidth: pixelWidth,
      codedHeight: pixelHeight,
      hardwareAcceleration: 'prefer-hardware',
      ...(description ? { description } : {}),
    },
    samples,
    minPtsSec,
    tkhdRotation: 0,
  };
}

function parseFragmentedSamples(
  view: DataView,
  len: number,
  moov: BoxHeader,
  trackId: number,
  timescale: number
): Mp4Sample[] | null {
  // Read default sample values from mvex -> trex if present
  let trexDefaultDur = Math.round(timescale / 30);
  let trexDefaultSize = 0;
  let trexDefaultFlags = 0;

  const mvex = findChildBox(view, moov.start + moov.headerSize, moov.end, 'mvex');
  if (mvex) {
    const trexs = findAllChildBoxes(view, mvex.start + mvex.headerSize, mvex.end, 'trex');
    for (const trex of trexs) {
      const p = trex.start + trex.headerSize;
      if (p + 24 <= trex.end && view.getUint32(p + 4, false) === trackId) {
        trexDefaultDur = view.getUint32(p + 12, false) || trexDefaultDur;
        trexDefaultSize = view.getUint32(p + 16, false);
        trexDefaultFlags = view.getUint32(p + 20, false);
        break;
      }
    }
  }

  const moofs = findAllChildBoxes(view, 0, len, 'moof');
  if (moofs.length === 0) return null;

  const samples: Mp4Sample[] = [];
  let runningDts = 0;

  for (const moof of moofs) {
    const trafs = findAllChildBoxes(view, moof.start + moof.headerSize, moof.end, 'traf');
    for (const traf of trafs) {
      const tfhd = findChildBox(view, traf.start + traf.headerSize, traf.end, 'tfhd');
      if (!tfhd) continue;
      const tfhdP = tfhd.start + tfhd.headerSize;
      if (tfhdP + 8 > tfhd.end) continue;
      const tfhdFlags =
        (view.getUint8(tfhdP + 1) << 16) |
        (view.getUint8(tfhdP + 2) << 8) |
        view.getUint8(tfhdP + 3);
      if (view.getUint32(tfhdP + 4, false) !== trackId) continue;

      let cursor = tfhdP + 8;
      let baseDataOffset = moof.start;
      if (tfhdFlags & 0x000001) {
        if (cursor + 8 > tfhd.end) continue;
        baseDataOffset =
          view.getUint32(cursor, false) * 4294967296 + view.getUint32(cursor + 4, false);
        cursor += 8;
      }
      if (tfhdFlags & 0x000002) cursor += 4; // sample_description_index
      let defaultDur = trexDefaultDur;
      if (tfhdFlags & 0x000008) {
        if (cursor + 4 <= tfhd.end) defaultDur = view.getUint32(cursor, false) || defaultDur;
        cursor += 4;
      }
      let defaultSize = trexDefaultSize;
      if (tfhdFlags & 0x000010) {
        if (cursor + 4 <= tfhd.end) defaultSize = view.getUint32(cursor, false);
        cursor += 4;
      }
      let defaultFlags = trexDefaultFlags;
      if (tfhdFlags & 0x000020) {
        if (cursor + 4 <= tfhd.end) defaultFlags = view.getUint32(cursor, false);
        cursor += 4;
      }

      const tfdt = findChildBox(view, traf.start + traf.headerSize, traf.end, 'tfdt');
      if (tfdt) {
        const tfdtP = tfdt.start + tfdt.headerSize;
        const tfdtVer = view.getUint8(tfdtP);
        if (tfdtVer === 1 && tfdtP + 12 <= tfdt.end) {
          runningDts =
            view.getUint32(tfdtP + 4, false) * 4294967296 + view.getUint32(tfdtP + 8, false);
        } else if (tfdtP + 8 <= tfdt.end) {
          runningDts = view.getUint32(tfdtP + 4, false);
        }
      }

      const truns = findAllChildBoxes(view, traf.start + traf.headerSize, traf.end, 'trun');
      for (const trun of truns) {
        const trunP = trun.start + trun.headerSize;
        if (trunP + 8 > trun.end) continue;
        const trunVer = view.getUint8(trunP);
        const trunFlags =
          (view.getUint8(trunP + 1) << 16) |
          (view.getUint8(trunP + 2) << 8) |
          view.getUint8(trunP + 3);
        const count = view.getUint32(trunP + 4, false);
        let tCursor = trunP + 8;

        let dataOffset = baseDataOffset;
        if (trunFlags & 0x000001) {
          if (tCursor + 4 > trun.end) continue;
          dataOffset = baseDataOffset + view.getInt32(tCursor, false);
          tCursor += 4;
        }
        let firstSampleFlags = defaultFlags;
        const hasFirstFlags = Boolean(trunFlags & 0x000004);
        if (hasFirstFlags) {
          if (tCursor + 4 <= trun.end) firstSampleFlags = view.getUint32(tCursor, false);
          tCursor += 4;
        }

        const hasDur = Boolean(trunFlags & 0x000100);
        const hasSize = Boolean(trunFlags & 0x000200);
        const hasFlags = Boolean(trunFlags & 0x000400);
        const hasCts = Boolean(trunFlags & 0x000800);

        let byteOffset = dataOffset;
        for (let i = 0; i < count; i++) {
          let dur = defaultDur;
          let size = defaultSize;
          let flags = i === 0 && hasFirstFlags ? firstSampleFlags : defaultFlags;
          let cts = 0;

          if (hasDur) {
            if (tCursor + 4 > trun.end) break;
            dur = view.getUint32(tCursor, false);
            tCursor += 4;
          }
          if (hasSize) {
            if (tCursor + 4 > trun.end) break;
            size = view.getUint32(tCursor, false);
            tCursor += 4;
          }
          if (hasFlags) {
            if (tCursor + 4 > trun.end) break;
            flags = view.getUint32(tCursor, false);
            tCursor += 4;
          }
          if (hasCts) {
            if (tCursor + 4 > trun.end) break;
            cts = trunVer === 0 ? view.getUint32(tCursor, false) : view.getInt32(tCursor, false);
            tCursor += 4;
          }

          if (size > 0 && byteOffset + size <= len) {
            // ISO-BMFF sample_depends_on (bits 24..25) == 2 or sample_is_non_sync_sample (bit 16) == 0
            const isSync = ((flags >> 16) & 1) === 0;
            samples.push({
              offset: byteOffset,
              size,
              dtsSec: runningDts / timescale,
              ptsSec: (runningDts + cts) / timescale,
              durationSec: Math.max(0.001, dur / timescale),
              isKey: isSync,
            });
          }

          byteOffset += size;
          runningDts += dur;
        }
      }
    }
  }

  if (samples.length === 0) return null;
  let minPts = Infinity;
  for (const s of samples) {
    if (s.ptsSec < minPts) minPts = s.ptsSec;
  }
  if (Number.isFinite(minPts) && minPts !== 0) {
    for (const s of samples) {
      s.ptsSec -= minPts;
    }
  }
  if (!samples.some((s) => s.isKey)) {
    samples[0].isKey = true;
  }
  return samples;
}

export function parseMp4VideoTrack(buffer: ArrayBuffer): ParsedMp4Track | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const len = bytes.byteLength;

  const isFragmented = Boolean(findChildBox(view, 0, len, 'moof'));
  const moov = findChildBox(view, 0, len, 'moov');
  if (!moov) return null;

  return parseMp4TrackFromMoov(bytes, view, moov, isFragmented, len);
}

function parseMp4TrackFromMoov(
  bytes: Uint8Array,
  view: DataView,
  moov: BoxHeader,
  isFragmented: boolean,
  fullLen: number
): ParsedMp4Track | null {

  const traks = findAllChildBoxes(
    view,
    moov.start + moov.headerSize,
    moov.end,
    'trak'
  );

  for (const trak of traks) {
    const mdia = findChildBox(
      view,
      trak.start + trak.headerSize,
      trak.end,
      'mdia'
    );
    if (!mdia) continue;

    const hdlr = findChildBox(
      view,
      mdia.start + mdia.headerSize,
      mdia.end,
      'hdlr'
    );
    if (!hdlr) continue;
    const hdlrPayload = hdlr.start + hdlr.headerSize;
    if (hdlrPayload + 12 > hdlr.end) continue;
    const handlerType = readFourCC(view, hdlrPayload + 8);
    if (handlerType !== 'vide') continue;

    const mdhd = findChildBox(
      view,
      mdia.start + mdia.headerSize,
      mdia.end,
      'mdhd'
    );
    if (!mdhd) continue;
    const mdhdPayload = mdhd.start + mdhd.headerSize;
    const mdhdVersion = view.getUint8(mdhdPayload);
    const timescaleOffset = mdhdVersion === 1 ? mdhdPayload + 20 : mdhdPayload + 12;
    if (timescaleOffset + 4 > mdhd.end) continue;
    const timescale = view.getUint32(timescaleOffset, false);
    if (!timescale) continue;

    const minf = findChildBox(
      view,
      mdia.start + mdia.headerSize,
      mdia.end,
      'minf'
    );
    if (!minf) continue;

    const stbl = findChildBox(
      view,
      minf.start + minf.headerSize,
      minf.end,
      'stbl'
    );
    if (!stbl) continue;

    const stblStart = stbl.start + stbl.headerSize;
    const stsd = findChildBox(view, stblStart, stbl.end, 'stsd');
    const stts = findChildBox(view, stblStart, stbl.end, 'stts');
    const stsz = findChildBox(view, stblStart, stbl.end, 'stsz');
    const stsc = findChildBox(view, stblStart, stbl.end, 'stsc');
    const stco = findChildBox(view, stblStart, stbl.end, 'stco');
    const co64 = findChildBox(view, stblStart, stbl.end, 'co64');
    const ctts = findChildBox(view, stblStart, stbl.end, 'ctts');
    const stss = findChildBox(view, stblStart, stbl.end, 'stss');

    if (!stsd || !stts || !stsz || !stsc || (!stco && !co64)) {
      continue;
    }

    const codecInfo = parseStsd(bytes, view, stsd);
    if (!codecInfo) continue;

    // Parse tkhd for trackId and display matrix rotation (common on portrait phone videos)
    let trackId = 1;
    let rotation = 0;
    const tkhd = findChildBox(view, trak.start + trak.headerSize, trak.end, 'tkhd');
    if (tkhd) {
      const tkhdP = tkhd.start + tkhd.headerSize;
      const tkhdVer = view.getUint8(tkhdP);
      const idOff = tkhdVer === 1 ? tkhdP + 20 : tkhdP + 12;
      if (idOff + 4 <= tkhd.end) {
        trackId = view.getUint32(idOff, false);
      }
      const matrixOff = tkhdVer === 1 ? tkhdP + 52 : tkhdP + 40;
      if (matrixOff + 20 <= tkhd.end) {
        const a = view.getInt32(matrixOff, false);
        const b = view.getInt32(matrixOff + 4, false);
        const c = view.getInt32(matrixOff + 12, false);
        const d = view.getInt32(matrixOff + 16, false);
        if (a === 0 && b > 0 && c < 0 && d === 0) rotation = 90;
        else if (a < 0 && b === 0 && c === 0 && d < 0) rotation = 180;
        else if (a === 0 && b < 0 && c > 0 && d === 0) rotation = 270;
      }
    }

    // Preserve tkhd rotation metadata; if VideoFrame doesn't natively support rotation,
    // WebGLRenderer applies tkhdRotation manually so portrait phone videos never fall back to slow <video> seeking.
    const supportsNativeRotation =
      typeof VideoFrame !== 'undefined' && 'rotation' in VideoFrame.prototype;

    // 1. Sample sizes (stsz)
    const stszP = stsz.start + stsz.headerSize;
    if (stszP + 12 > stsz.end) continue;
    const fixedSampleSize = view.getUint32(stszP + 4, false);
    const sampleCount = view.getUint32(stszP + 8, false);

    if (isFragmented && sampleCount === 0) {
      const fragSamples = parseFragmentedSamples(view, fullLen, moov, trackId, timescale);
      if (fragSamples && fragSamples.length > 0) {
        const config: VideoDecoderConfig = {
          codec: codecInfo.codec,
          codedWidth: codecInfo.codedWidth,
          codedHeight: codecInfo.codedHeight,
          hardwareAcceleration: 'prefer-hardware',
          ...(rotation && supportsNativeRotation ? { rotation } as Partial<VideoDecoderConfig> : {}),
          ...(codecInfo.description ? { description: codecInfo.description } : {}),
        };
        return { config, samples: fragSamples, minPtsSec: 0, tkhdRotation: rotation };
      }
      continue;
    }

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

    // 2. Chunk offsets (stco / co64)
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

    // 3. Sample-to-chunk (stsc) -> byte offset per sample
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
      let cursor = chunkOffsets[chunkIdx];
      for (let s = 0; s < perChunk && sampleIdx < sampleCount; s++) {
        offsets[sampleIdx] = cursor;
        cursor += sizes[sampleIdx];
        sampleIdx++;
      }
    }
    if (sampleIdx < sampleCount) continue;

    // 4. Decoding timestamps & durations (stts)
    const sttsP = stts.start + stts.headerSize;
    const sttsCount = view.getUint32(sttsP + 4, false);
    const dtsArr = new Float64Array(sampleCount);
    const durArr = new Float64Array(sampleCount);
    let curDts = 0;
    let sIdx = 0;
    for (let i = 0; i < sttsCount && sIdx < sampleCount; i++) {
      const cnt = view.getUint32(sttsP + 8 + i * 8, false);
      const delta = view.getUint32(sttsP + 8 + i * 8 + 4, false);
      for (let k = 0; k < cnt && sIdx < sampleCount; k++) {
        dtsArr[sIdx] = curDts;
        durArr[sIdx] = delta;
        curDts += delta;
        sIdx++;
      }
    }

    // 5. Composition time offsets (ctts) -> PTS
    const ptsArr = new Float64Array(sampleCount);
    ptsArr.set(dtsArr);
    if (ctts) {
      const cttsP = ctts.start + ctts.headerSize;
      const cttsVer = view.getUint8(cttsP);
      const cttsCount = view.getUint32(cttsP + 4, false);
      let pIdx = 0;
      for (let i = 0; i < cttsCount && pIdx < sampleCount; i++) {
        const cnt = view.getUint32(cttsP + 8 + i * 8, false);
        const off =
          cttsVer === 1
            ? view.getInt32(cttsP + 8 + i * 8 + 4, false)
            : view.getUint32(cttsP + 8 + i * 8 + 4, false);
        for (let k = 0; k < cnt && pIdx < sampleCount; k++) {
          ptsArr[pIdx] = dtsArr[pIdx] + off;
          pIdx++;
        }
      }
    }

    // 6. Sync samples (stss)
    const keySet = new Set<number>();
    if (stss) {
      const stssP = stss.start + stss.headerSize;
      const stssCount = view.getUint32(stssP + 4, false);
      for (let i = 0; i < stssCount && stssP + 8 + i * 4 + 4 <= stss.end; i++) {
        keySet.add(view.getUint32(stssP + 8 + i * 4, false) - 1);
      }
    }

    let minPtsRaw = Infinity;
    for (let i = 0; i < sampleCount; i++) {
      if (ptsArr[i] < minPtsRaw) minPtsRaw = ptsArr[i];
    }
    const minPtsSec = minPtsRaw / timescale;

    const samples: Mp4Sample[] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = {
        offset: offsets[i],
        size: sizes[i],
        dtsSec: dtsArr[i] / timescale,
        ptsSec: ptsArr[i] / timescale - minPtsSec,
        durationSec: Math.max(0.001, durArr[i] / timescale),
        isKey: stss ? keySet.has(i) : true,
      };
    }

    const config: VideoDecoderConfig = {
      codec: codecInfo.codec,
      codedWidth: codecInfo.codedWidth,
      codedHeight: codecInfo.codedHeight,
      hardwareAcceleration: 'prefer-hardware',
      ...(rotation && supportsNativeRotation ? { rotation } as Partial<VideoDecoderConfig> : {}),
      ...(codecInfo.description ? { description: codecInfo.description } : {}),
    };

    return { config, samples, minPtsSec, tkhdRotation: rotation };
  }

  return null;
}

async function parseMp4FromBlob(blob: Blob): Promise<ParsedMp4Track | null> {
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

    // Recompute actual end relative to full file size
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

    if (box.type === 'moof') {
      hasMoof = true;
    } else if (box.type === 'moov') {
      moovStart = cursor;
      moovEnd = boxEnd;
      moovHeaderSize = headerSize;
    }

    if (boxEnd <= cursor) break;
    cursor = boxEnd;
  }

  if (moovStart < 0 || moovEnd <= moovStart) return null;

  // Fragmented MP4s (moof) need full moof scanning; only buffer if reasonably sized
  if (hasMoof) {
    if (len > 150 * 1024 * 1024) return null;
    const fullBuf = await blob.arrayBuffer();
    return parseMp4VideoTrack(fullBuf);
  }

  const moovSize = moovEnd - moovStart;
  if (moovSize > 128 * 1024 * 1024) return null;

  const moovBuf = await blob.slice(moovStart, moovEnd).arrayBuffer();
  const moovBytes = new Uint8Array(moovBuf);
  const moovView = new DataView(moovBuf);
  const localMoovBox: BoxHeader = {
    type: 'moov',
    start: 0,
    headerSize: moovHeaderSize,
    end: moovSize,
  };

  return parseMp4TrackFromMoov(moovBytes, moovView, localMoovBox, false, len);
}

const IS_MOBILE_DEVICE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
    (typeof window !== 'undefined' && window.innerWidth < 768));

const BLOB_WINDOW_BYTES = IS_MOBILE_DEVICE ? 6 * 1024 * 1024 : 24 * 1024 * 1024;
const IN_MEMORY_BLOB_LIMIT_BYTES = IS_MOBILE_DEVICE ? 24 * 1024 * 1024 : 512 * 1024 * 1024;

export class Mp4VideoFrameReader {
  private bytes: Uint8Array | null;
  private blob: Blob | null;
  private fileSize: number;
  private windowStart = 0;
  private windowBytes: Uint8Array | null = null;
  private prefetchStart = -1;
  private prefetchPromise: Promise<{ start: number; bytes: Uint8Array } | null> | null = null;
  private config: VideoDecoderConfig;
  private samples: Mp4Sample[];
  private tkhdRotation: number;
  private decoder: VideoDecoder | null = null;
  private nextDecodeIdx = 0;
  private decodedFrames: VideoFrame[] = [];
  private currentFrame: VideoFrame | null = null;
  private lastRequestedTime = -1;
  private isBackwardMode = false;
  private decoderError: Error | null = null;
  private isDisposed = false;
  private justReset = true;
  private frameWaiters: Array<() => void> = [];
  // Keep the number of outstanding decoded VideoFrames small: hardware decoders own a tiny pool of
  // output surfaces and stop emitting frames (stalling the whole export forever) when we hold too many.
  private readonly maxBufferedFrames = IS_MOBILE_DEVICE ? 3 : 12;
  private readonly maxDecodeQueue = IS_MOBILE_DEVICE ? 3 : 16;
  private readonly lookaheadWindowSec = IS_MOBILE_DEVICE ? 0.04 : 0.25;
  private outputCount = 0;

  private constructor(
    bytes: Uint8Array | null,
    blob: Blob | null,
    fileSize: number,
    config: VideoDecoderConfig,
    samples: Mp4Sample[],
    tkhdRotation: number
  ) {
    this.bytes = bytes;
    this.blob = blob;
    this.fileSize = fileSize;
    this.config = config;
    this.samples = samples;
    this.tkhdRotation = tkhdRotation;
    this.initDecoder();
  }

  public getNeedsManualRotation(frame: VideoFrame): number {
    if (!this.tkhdRotation) return 0;
    const vfRot = (frame as VideoFrame & { rotation?: number }).rotation;
    if (typeof vfRot === 'number' && vfRot !== 0) return 0;
    if (
      (this.tkhdRotation === 90 || this.tkhdRotation === 270) &&
      this.config.codedWidth &&
      this.config.codedHeight &&
      frame.displayWidth === this.config.codedHeight &&
      frame.displayHeight === this.config.codedWidth
    ) {
      return 0;
    }
    return this.tkhdRotation;
  }

  private triggerWindowPrefetch(nextStart: number) {
    if (!this.blob || this.isDisposed || nextStart >= this.fileSize) return;
    if (this.prefetchPromise && this.prefetchStart === nextStart) return;
    const end = Math.min(this.fileSize, nextStart + BLOB_WINDOW_BYTES);
    this.prefetchStart = nextStart;
    const blobRef = this.blob;
    this.prefetchPromise = blobRef
      .slice(nextStart, end)
      .arrayBuffer()
      .then((buf) => ({ start: nextStart, bytes: new Uint8Array(buf) }))
      .catch(() => null);
  }

  private async readSampleBytes(offset: number, size: number): Promise<Uint8Array | null> {
    if (offset + size > this.fileSize) return null;
    if (this.bytes) {
      return this.bytes.subarray(offset, offset + size);
    }
    if (!this.blob) return null;

    if (
      this.windowBytes &&
      offset >= this.windowStart &&
      offset + size <= this.windowStart + this.windowBytes.byteLength
    ) {
      const rel = offset - this.windowStart;
      // Prefetch the next sequential window once we pass 50% of the current window
      if (!this.isBackwardMode && rel > this.windowBytes.byteLength >> 1) {
        this.triggerWindowPrefetch(this.windowStart + this.windowBytes.byteLength);
      }
      return this.windowBytes.subarray(rel, rel + size);
    }

    if (this.prefetchPromise) {
      const prefetched = await this.prefetchPromise;
      this.prefetchPromise = null;
      this.prefetchStart = -1;
      if (
        prefetched &&
        offset >= prefetched.start &&
        offset + size <= prefetched.start + prefetched.bytes.byteLength
      ) {
        this.windowStart = prefetched.start;
        this.windowBytes = prefetched.bytes;
        const rel = offset - this.windowStart;
        return this.windowBytes.subarray(rel, rel + size);
      }
    }

    const fetchLen = Math.max(size, BLOB_WINDOW_BYTES);
    const end = Math.min(this.fileSize, offset + fetchLen);
    const buf = await this.blob.slice(offset, end).arrayBuffer();
    this.windowStart = offset;
    this.windowBytes = new Uint8Array(buf);
    if (size > this.windowBytes.byteLength) return null;
    return this.windowBytes.subarray(0, size);
  }

  public static async create(
    buffer: ArrayBuffer
  ): Promise<Mp4VideoFrameReader | null> {
    if (
      typeof VideoDecoder === 'undefined' ||
      typeof EncodedVideoChunk === 'undefined'
    ) {
      return null;
    }

    const parsed = parseMp4VideoTrack(buffer) || parseWebmVideoTrack(buffer);
    if (!parsed || parsed.samples.length === 0) return null;

    const supportedConfig = await Mp4VideoFrameReader.negotiateConfig(parsed.config);
    if (!supportedConfig) return null;

    return new Mp4VideoFrameReader(
      new Uint8Array(buffer),
      null,
      buffer.byteLength,
      supportedConfig,
      parsed.samples,
      parsed.tkhdRotation
    );
  }

  public static async createFromBlob(
    blob: Blob
  ): Promise<Mp4VideoFrameReader | null> {
    if (
      typeof VideoDecoder === 'undefined' ||
      typeof EncodedVideoChunk === 'undefined'
    ) {
      return null;
    }

    // Load smaller/medium files into RAM for synchronous zero-IPC sample reads; larger files stream via 8 MB slices
    if (blob.size <= IN_MEMORY_BLOB_LIMIT_BYTES) {
      const buf = await blob.arrayBuffer();
      return await Mp4VideoFrameReader.create(buf);
    }

    let parsed = await parseMp4FromBlob(blob);
    if (!parsed && blob.size <= 384 * 1024 * 1024) {
      try {
        const magic = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        if (magic[0] === 0x1a && magic[1] === 0x45 && magic[2] === 0xdf && magic[3] === 0xa3) {
          const buf = await blob.arrayBuffer();
          return await Mp4VideoFrameReader.create(buf);
        }
      } catch {}
    }
    if (!parsed || parsed.samples.length === 0) return null;

    const supportedConfig = await Mp4VideoFrameReader.negotiateConfig(parsed.config);
    if (!supportedConfig) return null;

    return new Mp4VideoFrameReader(
      null,
      blob,
      blob.size,
      supportedConfig,
      parsed.samples,
      parsed.tkhdRotation
    );
  }

  private static async negotiateConfig(
    baseConfig: VideoDecoderConfig
  ): Promise<VideoDecoderConfig | null> {
    try {
      const tryCandidates = async (cfgBase: VideoDecoderConfig): Promise<VideoDecoderConfig | null> => {
        const candidates: VideoDecoderConfig[] = [
          cfgBase,
          { ...cfgBase, hardwareAcceleration: 'no-preference' },
          { ...cfgBase, hardwareAcceleration: 'prefer-software' },
        ];
        for (const cfg of candidates) {
          const support = await VideoDecoder.isConfigSupported(cfg);
          if (support.supported) {
            return support.config || cfg;
          }
        }
        return null;
      };

      const matched = await tryCandidates(baseConfig);
      if (matched) return matched;

      // Some browsers reject `rotation` in VideoDecoderConfig; retry without it and let WebGLRenderer rotate
      if ('rotation' in baseConfig) {
        const withoutRot = { ...baseConfig } as VideoDecoderConfig & { rotation?: number };
        delete withoutRot.rotation;
        return await tryCandidates(withoutRot);
      }

      return null;
    } catch {
      return null;
    }
  }

  private initDecoder() {
    this.decoder = new VideoDecoder({
      output: (frame) => {
        if (this.isDisposed) {
          frame.close();
          return;
        }
        this.outputCount++;
        // Insert sorted by timestamp
        const ts = frame.timestamp;
        if (
          this.decodedFrames.length === 0 ||
          ts >= this.decodedFrames[this.decodedFrames.length - 1].timestamp
        ) {
          this.decodedFrames.push(frame);
        } else {
          let idx = this.decodedFrames.length;
          while (idx > 0 && this.decodedFrames[idx - 1].timestamp > ts) {
            idx--;
          }
          this.decodedFrames.splice(idx, 0, frame);
        }
        this.notifyWaiters();
      },
      error: (err) => {
        this.decoderError =
          err instanceof Error ? err : new Error(String(err || 'VideoDecoder error'));
        this.notifyWaiters();
      },
    });
    this.decoder.configure(this.config);
  }

  private notifyWaiters() {
    if (this.frameWaiters.length === 0) return;
    const waiters = this.frameWaiters;
    this.frameWaiters = [];
    for (const resolve of waiters) {
      resolve();
    }
  }

  private waitForDecoderEvent(timeoutMs = 4): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, timeoutMs);
      this.frameWaiters.push(done);
    });
  }

  private clearFrames() {
    for (const f of this.decodedFrames) {
      try {
        f.close();
      } catch {}
    }
    this.decodedFrames = [];
  }

  private findNearestKeyIndex(targetSec: number): number {
    // Binary search on dtsSec (monotonically non-decreasing) + small window for B-frame PTS reordering
    const n = this.samples.length;
    if (n === 0) return 0;

    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.samples[mid].dtsSec <= targetSec + 0.002) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    const scanStart = Math.max(0, lo - 16);
    const scanEnd = Math.min(n - 1, lo + 16);
    let targetIdx = lo;
    for (let i = scanStart; i <= scanEnd; i++) {
      if (this.samples[i].ptsSec <= targetSec + 0.002) {
        targetIdx = i;
      }
    }

    for (let k = targetIdx; k >= 0; k--) {
      if (this.samples[k].isKey) return k;
    }
    return 0;
  }

  public hasError(): boolean {
    return Boolean(this.decoderError);
  }

  public async getFrameAtTime(targetSec: number): Promise<VideoFrame | null> {
    if (this.isDisposed || !this.decoder || this.decoderError) return null;

    const clamped = Math.max(0, targetSec);

    // Detect backward seek or large forward jump (> 2.5s)
    const minBufferedSec =
      this.decodedFrames.length > 0
        ? this.decodedFrames[0].timestamp / 1_000_000
        : this.lastRequestedTime;

    const isBackwardJump =
      this.lastRequestedTime >= 0 &&
      clamped < this.lastRequestedTime - 0.005 &&
      clamped < minBufferedSec - 0.04 &&
      this.nextDecodeIdx > 0;

    const currentMaxFedSec =
      this.nextDecodeIdx > 0 && this.nextDecodeIdx <= this.samples.length
        ? this.samples[this.nextDecodeIdx - 1].ptsSec
        : -1;
    const isInitialSeek = this.nextDecodeIdx === 0 && clamped > 0.5;
    const isLargeForwardJump =
      isInitialSeek ||
      (currentMaxFedSec >= 0 && clamped - currentMaxFedSec > 2.5);

    if (isBackwardJump) {
      this.isBackwardMode = true;
    } else if (isLargeForwardJump || (this.isBackwardMode && clamped > this.lastRequestedTime + 0.08)) {
      this.isBackwardMode = false;
    }

    if (isBackwardJump || isLargeForwardJump) {
      const keyIdx = this.findNearestKeyIndex(clamped);
      this.clearFrames();
      if (this.currentFrame) {
        try {
          this.currentFrame.close();
        } catch {}
        this.currentFrame = null;
      }
      try {
        this.decoder.reset();
        this.decoder.configure(this.config);
        this.justReset = true;
      } catch {
        return null;
      }
      this.nextDecodeIdx = keyIdx;
    }

    this.lastRequestedTime = clamped;

    // Keep a bounded lookahead so hardware decoder stays saturated without exhausting mobile GPU surfaces
    const lookaheadSec = this.isBackwardMode ? clamped + 0.02 : clamped + this.lookaheadWindowSec;
    let stallCycles = 0;
    while (this.nextDecodeIdx < this.samples.length) {
      const maxDecodedSec =
        this.decodedFrames.length > 0
          ? this.decodedFrames[this.decodedFrames.length - 1].timestamp / 1_000_000
          : -1;

      if (maxDecodedSec >= lookaheadSec) break;

      if (!this.isBackwardMode && this.decodedFrames.length >= this.maxBufferedFrames) {
        if (maxDecodedSec >= clamped) {
          break;
        }
        // Still seeking forward toward `clamped` within a GOP: evict older frames so buffer doesn't stall before reaching target
        let keepIdx = 0;
        for (let i = 0; i < this.decodedFrames.length; i++) {
          if (this.decodedFrames[i].timestamp / 1_000_000 <= clamped + 0.004) {
            keepIdx = i;
          } else {
            break;
          }
        }
        if (keepIdx > 0) {
          const evicted = this.decodedFrames.splice(0, keepIdx);
          for (const f of evicted) {
            try {
              f.close();
            } catch {}
          }
        } else {
          break;
        }
      }

      if (this.decoder.decodeQueueSize >= this.maxDecodeQueue) {
        const outputsBefore = this.outputCount;
        await this.waitForDecoderEvent(8);
        if (this.decoderError || this.isDisposed) return null;
        if (this.outputCount === outputsBefore) {
          // No output while the queue is full: never spin forever, use what we have
          if (++stallCycles > 60) break;
        } else {
          stallCycles = 0;
        }
        continue;
      }

      const s = this.samples[this.nextDecodeIdx++];
      const sampleData =
        this.bytes && s.offset + s.size <= this.fileSize
          ? this.bytes.subarray(s.offset, s.offset + s.size)
          : await this.readSampleBytes(s.offset, s.size);
      if (!sampleData) break;

      try {
        const isKeyChunk = s.isKey || this.justReset;
        this.justReset = false;
        const chunk = new EncodedVideoChunk({
          type: isKeyChunk ? 'key' : 'delta',
          timestamp: Math.round(s.ptsSec * 1_000_000),
          duration: Math.round(s.durationSec * 1_000_000),
          data: sampleData,
        });
        this.decoder.decode(chunk);
      } catch (err) {
        this.decoderError =
          err instanceof Error ? err : new Error(String(err || 'VideoDecoder decode error'));
        return null;
      }
    }

    // Wait via event callback if decoder is still outputting frames we already fed
    let waitCount = 0;
    while (
      this.decoder.decodeQueueSize > 0 &&
      waitCount < 300 &&
      (this.decodedFrames.length === 0 ||
        this.decodedFrames[this.decodedFrames.length - 1].timestamp / 1_000_000 <
          clamped)
    ) {
      await this.waitForDecoderEvent(4);
      waitCount++;
      if (this.decoderError || this.isDisposed) return null;
    }

    if (this.nextDecodeIdx >= this.samples.length && this.decoder.decodeQueueSize > 0) {
      let eofWait = 0;
      while (this.decoder.decodeQueueSize > 0 && eofWait < 40) {
        const before = this.outputCount;
        await this.waitForDecoderEvent(8);
        if (this.decoderError || this.isDisposed) return null;
        if (this.outputCount === before) {
          if (++eofWait > 6) break;
        }
      }
      if (this.decoder.decodeQueueSize > 0 && this.decodedFrames.length < this.maxBufferedFrames) {
        try {
          await Promise.race([
            this.decoder.flush(),
            new Promise<void>((r) => setTimeout(r, 120)),
          ]);
        } catch {}
      }
    }

    if (this.decodedFrames.length === 0) {
      try {
        if (this.currentFrame && this.currentFrame.codedWidth > 0) {
          return this.currentFrame;
        }
      } catch {}
      this.currentFrame = null;
      return null;
    }

    // Pick the frame with timestamp closest to (and <= if possible) clamped
    let bestIdx = 0;
    for (let i = 0; i < this.decodedFrames.length; i++) {
      const t = this.decodedFrames[i].timestamp / 1_000_000;
      if (t <= clamped + 0.004) {
        bestIdx = i;
      } else {
        break;
      }
    }

    const chosen = this.decodedFrames[bestIdx];
    this.currentFrame = chosen;

    if (this.isBackwardMode) {
      // In backward/reversed mode, evict frames AFTER bestIdx (already passed) and cap cache size
      if (bestIdx + 1 < this.decodedFrames.length) {
        const tail = this.decodedFrames.splice(bestIdx + 1);
        for (const f of tail) {
          try {
            f.close();
          } catch {}
        }
      }
      const maxBackwardCache = IS_MOBILE_DEVICE ? 6 : 24;
      if (this.decodedFrames.length > maxBackwardCache) {
        const excess = this.decodedFrames.splice(0, this.decodedFrames.length - maxBackwardCache);
        for (const f of excess) {
          try {
            f.close();
          } catch {}
        }
      }
    } else if (bestIdx > 0) {
      // In forward mode, evict frames strictly before bestIdx to keep GPU memory bounded
      const evicted = this.decodedFrames.splice(0, bestIdx);
      for (const f of evicted) {
        try {
          f.close();
        } catch {}
      }
    }

    return chosen;
  }

  public dispose() {
    this.isDisposed = true;
    this.prefetchPromise = null;
    this.prefetchStart = -1;
    this.windowBytes = null;
    this.bytes = null;
    this.blob = null;
    this.notifyWaiters();
    this.clearFrames();
    if (this.currentFrame) {
      try {
        this.currentFrame.close();
      } catch {}
      this.currentFrame = null;
    }
    if (this.decoder) {
      try {
        if (this.decoder.state !== 'closed') {
          this.decoder.close();
        }
      } catch {}
      this.decoder = null;
    }
  }
}
