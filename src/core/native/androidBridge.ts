// ============================================================================
// androidBridge - Native Android WebView Bridge for Zero-OOM Streaming Export,
// Gallery/MediaStore Saving, Share Sheet, and Screen WakeLock
// ============================================================================

export interface NativeExportResult {
  ok: boolean;
  uri?: string;
  displayPath?: string;
  filename?: string;
  error?: string;
}

export interface DulosAndroidNativeAPI {
  isNativeAndroid?: () => boolean;
  openExportSession: (filename: string, mimeType: string) => string;
  writeExportChunkAt: (sessionId: string, position: number, base64Data: string) => boolean;
  appendExportChunk: (sessionId: string, base64Data: string) => boolean;
  finishExportSession: (sessionId: string) => string;
  cancelExportSession: (sessionId: string) => void;
  setKeepScreenOn: (keepOn: boolean) => void;
  shareExportedFile: (uri: string, mimeType: string, title: string) => boolean;
  shareExportedFileToWhatsApp?: (uri: string, mimeType: string, title: string) => boolean;
  openExportedFile: (uri: string, mimeType: string) => boolean;
  getDeviceMemoryMB?: () => number;
  exitApp?: () => void;
}

declare global {
  interface Window {
    DulosAndroid?: DulosAndroidNativeAPI;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

const NATIVE_CHUNK_BYTES = 512 * 1024; // 512 KB per JNI call to keep RAM flat & prevent UI jank

export function getAndroidBridge(): DulosAndroidNativeAPI | null {
  if (typeof window === 'undefined') return null;
  const bridge = window.DulosAndroid;
  if (!bridge || typeof bridge.openExportSession !== 'function') return null;
  return bridge;
}

export function isAndroidNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (getAndroidBridge()) return true;
  try {
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor.getPlatform?.() === 'android') {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000; // 32 KB slices avoid call stack overflow
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += SLICE) {
    const sub = bytes.subarray(i, Math.min(i + SLICE, bytes.length));
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(''));
}

export function setAndroidKeepScreenOn(keepOn: boolean): void {
  try {
    getAndroidBridge()?.setKeepScreenOn?.(keepOn);
  } catch {
    // ignore
  }
}

export function shareAndroidExportedFile(
  uri: string,
  mimeType: string,
  title: string
): boolean {
  try {
    return Boolean(getAndroidBridge()?.shareExportedFile?.(uri, mimeType, title));
  } catch {
    return false;
  }
}

export function shareAndroidExportedFileToWhatsApp(
  uri: string,
  mimeType: string,
  title: string
): boolean {
  try {
    const bridge = getAndroidBridge();
    if (!bridge) return false;
    if (typeof bridge.shareExportedFileToWhatsApp === 'function') {
      return Boolean(bridge.shareExportedFileToWhatsApp(uri, mimeType, title));
    }
    return Boolean(bridge.shareExportedFile?.(uri, mimeType, title));
  } catch {
    return false;
  }
}

export function openAndroidExportedFile(uri: string, mimeType: string): boolean {
  try {
    return Boolean(getAndroidBridge()?.openExportedFile?.(uri, mimeType));
  } catch {
    return false;
  }
}

export function exitAndroidApp(): boolean {
  try {
    const bridge = getAndroidBridge();
    if (bridge && typeof bridge.exitApp === 'function') {
      bridge.exitApp();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Writes a Uint8Array at an exact byte offset into an open native Android export file.
 * Splits large buffers into 512 KB JNI chunks to prevent memory spikes.
 */
export function writeBytesToNativeSessionAt(
  sessionId: string,
  data: Uint8Array,
  position: number
): void {
  const bridge = getAndroidBridge();
  if (!bridge) throw new Error('Puente nativo de Android no disponible');

  let offset = 0;
  while (offset < data.byteLength) {
    const end = Math.min(offset + NATIVE_CHUNK_BYTES, data.byteLength);
    const slice = data.subarray(offset, end);
    const b64 = uint8ArrayToBase64(slice);
    const ok = bridge.writeExportChunkAt(sessionId, position + offset, b64);
    if (!ok) {
      throw new Error('Error al escribir bloque de video en almacenamiento de Android');
    }
    offset = end;
  }
}

export function parseNativeExportResult(rawJson: string): NativeExportResult {
  try {
    return JSON.parse(rawJson) as NativeExportResult;
  } catch {
    return { ok: false, error: 'Respuesta inválida al guardar en Android' };
  }
}

/**
 * Streams an existing Blob (e.g. MP3, WAV, or MediaRecorder WebM) to Android native MediaStore
 * in 512 KB slices so even large files never spike WebView RAM.
 */
export async function saveBlobToAndroidNative(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<NativeExportResult> {
  const bridge = getAndroidBridge();
  if (!bridge) {
    return { ok: false, error: 'Puente nativo de Android no disponible' };
  }

  const sessionId = bridge.openExportSession(filename, mimeType);
  if (!sessionId) {
    return { ok: false, error: 'No se pudo iniciar el guardado en el almacenamiento del celular' };
  }

  try {
    let offset = 0;
    while (offset < blob.size) {
      const end = Math.min(offset + NATIVE_CHUNK_BYTES, blob.size);
      const ab = await blob.slice(offset, end).arrayBuffer();
      const b64 = uint8ArrayToBase64(new Uint8Array(ab));
      const ok = bridge.appendExportChunk(sessionId, b64);
      if (!ok) {
        throw new Error('No se pudo escribir el archivo en el almacenamiento del dispositivo');
      }
      offset = end;
      // Yield briefly to keep UI responsive during large file copies
      if (offset % (NATIVE_CHUNK_BYTES * 4) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const raw = bridge.finishExportSession(sessionId);
    return parseNativeExportResult(raw);
  } catch (err) {
    try {
      bridge.cancelExportSession(sessionId);
    } catch {
      // ignore
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
