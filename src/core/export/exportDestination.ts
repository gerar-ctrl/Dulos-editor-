// ============================================================================
// exportDestination - PC Export Destination Picker & Persistence
// ============================================================================

import { get, set, del } from 'idb-keyval';
import {
  ExportBitrateQuality,
  ExportFormat,
  ExportFPS,
  ExportResolution,
} from '../../types/editor';

export type ExportDestinationMode = 'downloads' | 'directory' | 'ask';

const EXPORT_DIR_HANDLE_KEY = 'editordevideos_export_dir_handle_v1';
const EXPORT_DEST_MODE_KEY = 'editordevideos_export_dest_mode_v1';

export interface FileWritableStreamLike {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}

export interface FileHandleWithWritable {
  name: string;
  createWritable: () => Promise<FileWritableStreamLike>;
}

export interface DirectoryHandleWithPermissions {
  name: string;
  getFileHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<FileHandleWithWritable>;
  queryPermission?: (descriptor: {
    mode: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor: {
    mode: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
}

type FileSystemPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
  }) => Promise<DirectoryHandleWithPermissions>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileHandleWithWritable>;
};

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function supportsSaveFilePicker(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export function getSavedDestinationMode(): ExportDestinationMode {
  try {
    const raw = localStorage.getItem(EXPORT_DEST_MODE_KEY);
    if (raw === 'directory' && supportsDirectoryPicker()) return 'directory';
    if (raw === 'ask' && supportsSaveFilePicker()) return 'ask';
  } catch {
    // Ignore storage access errors
  }
  return 'downloads';
}

export function saveDestinationMode(mode: ExportDestinationMode): void {
  try {
    localStorage.setItem(EXPORT_DEST_MODE_KEY, mode);
  } catch {
    // Ignore storage access errors
  }
}

export async function getSavedDirectoryHandle(): Promise<DirectoryHandleWithPermissions | null> {
  try {
    const handle = await get<DirectoryHandleWithPermissions | undefined>(
      EXPORT_DIR_HANDLE_KEY
    );
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function saveDirectoryHandle(
  handle: DirectoryHandleWithPermissions | null
): Promise<void> {
  try {
    if (handle) {
      await set(EXPORT_DIR_HANDLE_KEY, handle);
    } else {
      await del(EXPORT_DIR_HANDLE_KEY);
    }
  } catch {
    // Ignore IndexedDB errors
  }
}

export async function pickExportDirectory(): Promise<DirectoryHandleWithPermissions | null> {
  const win = window as FileSystemPickerWindow;
  if (!win.showDirectoryPicker) return null;

  try {
    return await win.showDirectoryPicker({
      id: 'dulos-export-destination',
      mode: 'readwrite',
      startIn: 'videos',
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

export async function ensureDirectoryWritePermission(
  handle: DirectoryHandleWithPermissions
): Promise<boolean> {
  try {
    if (handle.queryPermission) {
      const current = await handle.queryPermission({ mode: 'readwrite' });
      if (current === 'granted') return true;
    }
    if (handle.requestPermission) {
      const requested = await handle.requestPermission({ mode: 'readwrite' });
      return requested === 'granted';
    }
    return true;
  } catch {
    return false;
  }
}

export async function pickExportFileHandle(
  suggestedName: string,
  mimeType: string,
  ext: string
): Promise<FileHandleWithWritable | null> {
  const win = window as FileSystemPickerWindow;
  if (!win.showSaveFilePicker) return null;

  const isAudio = ext === 'mp3' || ext === 'wav';
  try {
    return await win.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: isAudio
            ? `Archivo de Audio (${ext.toUpperCase()})`
            : `Archivo de Video (${ext.toUpperCase()})`,
          accept: { [mimeType]: [`.${ext}`] },
        },
      ],
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

export async function writeBlobToFileHandle(
  handle: FileHandleWithWritable,
  blob: Blob
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function writeBlobToDirectory(
  dirHandle: DirectoryHandleWithPermissions,
  filename: string,
  blob: Blob
): Promise<string> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  await writeBlobToFileHandle(fileHandle, blob);
  return fileHandle.name;
}

export function sanitizeExportBaseName(rawName: string): string {
  return rawName
    .trim()
    .replace(/\.(mp4|webm|mp3|wav)$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .trim();
}

export function resolveExportFilename(
  customName: string,
  projectName: string,
  format: ExportFormat,
  resolution: ExportResolution,
  fps: ExportFPS,
  quality: ExportBitrateQuality,
  videoExt: 'mp4' | 'webm' = 'mp4'
): string {
  const cleanCustom = sanitizeExportBaseName(customName);
  if (cleanCustom) {
    const ext = format === 'mp4' ? videoExt : format;
    return `${cleanCustom}.${ext}`;
  }
  return buildExportFilename(
    projectName,
    format,
    resolution,
    fps,
    quality,
    videoExt
  );
}

export function buildExportFilename(
  projectName: string,
  format: ExportFormat,
  resolution: ExportResolution,
  fps: ExportFPS,
  quality: ExportBitrateQuality,
  videoExt: 'mp4' | 'webm' = 'mp4'
): string {
  const cleanName =
    (projectName || 'proyecto').trim().replace(/[^\w\d_-]+/g, '_') ||
    'video_exportado';

  if (format === 'mp3') {
    const mp3Kbps = quality === 'low' ? 128 : quality === 'medium' ? 192 : 320;
    return `${cleanName}_audio_${mp3Kbps}kbps.mp3`;
  }
  if (format === 'wav') {
    return `${cleanName}_audio.wav`;
  }

  const qualityTag =
    quality === 'low' ? 'baja' : quality === 'medium' ? 'media' : 'alta';
  return `${cleanName}_${resolution}_${fps}fps_${qualityTag}.${videoExt}`;
}

export function getExportMimeType(ext: string, blobType?: string): string {
  if (blobType) return blobType;
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'webm') return 'video/webm';
  return 'video/mp4';
}
