// ============================================================================
// ExportModal - Video MP4 & Audio MP3/WAV Exporter with Multi-Export Support
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../../store/useEditorStore';
import {
  ExportResolution,
  ExportFPS,
  ExportBitrateQuality,
  ExportFormat,
  ExportSettings,
} from '../../types/editor';
import {
  estimateExportFileSizeMB,
  getResolutionDimensions,
} from '../../core/export/estimateSize';
import {
  WebCodecsExporter,
  RenderProgress,
} from '../../core/export/WebCodecsExporter';
import { AudioExporter } from '../../core/export/AudioExporter';
import {
  X,
  Download,
  CheckCircle2,
  HardDrive,
  Film,
  Music,
  Clock,
  RotateCcw,
  AlertCircle,
  FolderOpen,
  FolderCheck,
  FileSignature,
  Share2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import {
  isAndroidNativeApp,
  openAndroidExportedFile,
  saveBlobToAndroidNative,
  setAndroidKeepScreenOn,
  shareAndroidExportedFile,
  shareAndroidExportedFileToWhatsApp,
} from '../../core/native/androidBridge';
import {
  ExportDestinationMode,
  DirectoryHandleWithPermissions,
  FileHandleWithWritable,
  supportsDirectoryPicker,
  supportsSaveFilePicker,
  getSavedDestinationMode,
  saveDestinationMode,
  getSavedDirectoryHandle,
  saveDirectoryHandle,
  pickExportDirectory,
  ensureDirectoryWritePermission,
  pickExportFileHandle,
  writeBlobToFileHandle,
  writeBlobToDirectory,
  resolveExportFilename,
  getExportMimeType,
} from '../../core/export/exportDestination';

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    setIsExportModalOpen,
    project,
    mediaElements,
    setIsPlaying,
    showToast,
    markProjectExported,
  } = useEditorStore(
    useShallow((s) => ({
      isExportModalOpen: s.isExportModalOpen,
      setIsExportModalOpen: s.setIsExportModalOpen,
      project: s.project,
      mediaElements: s.mediaElements,
      setIsPlaying: s.setIsPlaying,
      showToast: s.showToast,
      markProjectExported: s.markProjectExported,
    }))
  );

  const isTouchMobile =
    typeof window !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  const isMobileDevice =
    isTouchMobile ||
    (typeof window !== 'undefined' && window.innerWidth < 768);

  const [resolution, setResolution] = useState<ExportResolution>(
    isMobileDevice ? '720p' : '1080p'
  );
  const [fps, setFps] = useState<ExportFPS>(30);
  const [quality, setQuality] = useState<ExportBitrateQuality>('medium');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [exportEngine, setExportEngine] = useState<'ffmpeg' | 'webcodecs'>(() => {
    const eApi = (window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI;
    return eApi?.isElectron ? 'ffmpeg' : 'webcodecs';
  });
  const [smartStreamCopy, setSmartStreamCopy] = useState<boolean>(true);
  const [customFileName, setCustomFileName] = useState<string>(
    project.settings.name || ''
  );

  // Rendering State
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [directSavedPath, setDirectSavedPath] = useState<string | null>(null);
  const [androidSavedInfo, setAndroidSavedInfo] = useState<{
    uri: string;
    displayPath: string;
    filename: string;
    mimeType: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingToFolder, setIsSavingToFolder] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isNativeAndroid = isAndroidNativeApp();

  // PC Destination State
  const [destinationMode, setDestinationMode] = useState<ExportDestinationMode>(() =>
    getSavedDestinationMode()
  );
  const [selectedDirHandle, setSelectedDirHandle] =
    useState<DirectoryHandleWithPermissions | null>(null);
  const [savedDestinationLabel, setSavedDestinationLabel] = useState<string | null>(
    null
  );

  const exporterRef = useRef<WebCodecsExporter | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const exportedBlobRef = useRef<Blob | null>(null);

  const supportsDirPicker = supportsDirectoryPicker();
  const supportsFilePicker = supportsSaveFilePicker();

  const revokePreviousUrl = () => {
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch {}
      activeBlobUrlRef.current = null;
    }
    exportedBlobRef.current = null;
  };

  // Load persisted directory handle for PC mode
  useEffect(() => {
    if (isTouchMobile || !supportsDirPicker) return;
    let active = true;
    getSavedDirectoryHandle().then((handle) => {
      if (!active) return;
      if (handle) {
        setSelectedDirHandle(handle);
      } else if (destinationMode === 'directory') {
        setDestinationMode('downloads');
        saveDestinationMode('downloads');
      }
    });
    return () => {
      active = false;
    };
  }, [isTouchMobile, supportsDirPicker]);

  // Reset export state every time the modal is opened so the user can export as many times as needed
  useEffect(() => {
    if (isExportModalOpen) {
      setIsExporting(false);
      setProgress(null);
      setErrorMessage(null);
      setDownloadUrl(null);
      setDownloadFilename('');
      setDirectSavedPath(null);
      setAndroidSavedInfo(null);
      setSavedDestinationLabel(null);
      setCustomFileName(project.settings.name || '');
    }
  }, [isExportModalOpen, project.settings.name]);

  // Also invalidate any previous download result whenever the project is modified
  useEffect(() => {
    if (!isExporting && downloadUrl) {
      setDownloadUrl(null);
      setDownloadFilename('');
      setErrorMessage(null);
    }
  }, [project.tracks, project.settings]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      revokePreviousUrl();
    };
  }, []);

  // Real-time Estimated MB calculation
  const estimatedSizeMB = useMemo(() => {
    return estimateExportFileSizeMB(
      project.settings.duration,
      resolution,
      fps,
      quality,
      format
    );
  }, [project.settings.duration, resolution, fps, quality, format]);

  const dimensions = useMemo(() => {
    return getResolutionDimensions(
      resolution,
      project.settings.aspectRatio,
      project.settings.customWidth,
      project.settings.customHeight
    );
  }, [
    resolution,
    project.settings.aspectRatio,
    project.settings.customWidth,
    project.settings.customHeight,
  ]);

  if (!isExportModalOpen) return null;

  const mp3Kbps =
    quality === 'low' ? 128 : quality === 'medium' ? 192 : 320;

  const handleResetToSettings = () => {
    revokePreviousUrl();
    setDownloadUrl(null);
    setDownloadFilename('');
    setDirectSavedPath(null);
    setAndroidSavedInfo(null);
    setSavedDestinationLabel(null);
    setProgress(null);
    setErrorMessage(null);
  };

  const handleCloseModal = () => {
    if (isExporting) return;
    handleResetToSettings();
    setIsExportModalOpen(false);
  };

  const unsupportedFolderPickerMessage =
    'Tu navegador actual bloquea o no soporta el selector nativo de carpetas (File System Access API). Usa Chrome, Edge u Opera (o actívalo en Brave), o selecciona «Descargas».';

  const handleSelectDestinationMode = async (mode: ExportDestinationMode) => {
    setErrorMessage(null);
    if (mode === 'directory') {
      if (!supportsDirPicker) {
        setErrorMessage(unsupportedFolderPickerMessage);
        return;
      }
      if (!selectedDirHandle) {
        try {
          const picked = await pickExportDirectory();
          if (!picked) return;
          setSelectedDirHandle(picked);
          await saveDirectoryHandle(picked);
        } catch {
          setErrorMessage('No se pudo abrir el selector de carpetas.');
          return;
        }
      }
    } else if (mode === 'ask' && !supportsFilePicker) {
      setErrorMessage(unsupportedFolderPickerMessage);
      return;
    }
    setDestinationMode(mode);
    saveDestinationMode(mode);
  };

  const handlePickDirectory = async () => {
    setErrorMessage(null);
    if (!supportsDirPicker) {
      setErrorMessage(unsupportedFolderPickerMessage);
      return;
    }
    try {
      const picked = await pickExportDirectory();
      if (!picked) return;
      setSelectedDirHandle(picked);
      await saveDirectoryHandle(picked);
      setDestinationMode('directory');
      saveDestinationMode('directory');
    } catch {
      setErrorMessage('No se pudo seleccionar la carpeta de destino.');
    }
  };

  const handleClearDirectory = async () => {
    setSelectedDirHandle(null);
    await saveDirectoryHandle(null);
    setDestinationMode('downloads');
    saveDestinationMode('downloads');
  };

  const triggerBrowserDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 150);
  };

  const handleStartExport = async () => {
    setErrorMessage(null);

    // On PC mode, resolve custom destination (folder or Save As) BEFORE rendering
    // while we still have user activation for permission prompts / file pickers.
    let targetDirHandle: DirectoryHandleWithPermissions | null = null;
    let targetFileHandle: FileHandleWithWritable | null = null;

    if (!isTouchMobile && destinationMode === 'directory') {
      if (!supportsDirPicker) {
        setErrorMessage(unsupportedFolderPickerMessage);
        return;
      }
      let dir = selectedDirHandle;
      if (!dir) {
        try {
          dir = await pickExportDirectory();
          if (!dir) return;
          setSelectedDirHandle(dir);
          await saveDirectoryHandle(dir);
        } catch {
          setErrorMessage('No se pudo acceder a la carpeta de destino.');
          return;
        }
      }
      const granted = await ensureDirectoryWritePermission(dir);
      if (!granted) {
        setErrorMessage(
          'Se necesita permiso de escritura en la carpeta seleccionada. Elige la carpeta nuevamente o usa Descargas.'
        );
        return;
      }
      targetDirHandle = dir;
    } else if (!isTouchMobile && destinationMode === 'ask') {
      if (!supportsFilePicker) {
        setErrorMessage(unsupportedFolderPickerMessage);
        return;
      }
      const suggestedExt = format === 'mp4' ? 'mp4' : format;
      const suggestedName = resolveExportFilename(
        customFileName,
        project.settings.name,
        format,
        resolution,
        fps,
        quality,
        'mp4'
      );
      try {
        targetFileHandle = await pickExportFileHandle(
          suggestedName,
          getExportMimeType(suggestedExt),
          suggestedExt
        );
        if (!targetFileHandle) {
          // User cancelled the Save As dialog before starting export
          return;
        }
      } catch {
        setErrorMessage('No se pudo abrir el selector de ubicación.');
        return;
      }
    }

    // Pause editor preview playback so it doesn't compete with export rendering
    setIsPlaying(false);
    revokePreviousUrl();

    setIsExporting(true);
    setDownloadUrl(null);
    setDirectSavedPath(null);
    setAndroidSavedInfo(null);
    setSavedDestinationLabel(null);
    setAndroidKeepScreenOn(true);
    setProgress({
      percentage: 0,
      currentFrame: 0,
      totalFrames:
        format === 'mp4'
          ? Math.max(1, Math.ceil(project.settings.duration * fps))
          : 100,
      timeRemainingSeconds: -1,
      stage: 'preparing',
      stageLabel: 'Preparando medios y codificador...',
    });

    // Keep mobile screen awake during export so browser never throttles WebCodecs/GPU
    let wakeLock: { release?: () => Promise<void> } | null = null;
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      if (nav.wakeLock?.request) {
        wakeLock = await nav.wakeLock.request('screen');
      }
    } catch {
      // Wake Lock not supported or denied
    }

    try {
      let resultBlob: Blob;
      let videoExt: 'mp4' | 'webm' = 'mp4';

      if (format === 'mp3' || format === 'wav') {
        resultBlob = await AudioExporter.exportAudio(
          project,
          format,
          mp3Kbps,
          (prog) => setProgress(prog)
        );
      } else {
        const exporter = new WebCodecsExporter();
        exporterRef.current = exporter;

        const eApi = (
          window as unknown as {
            electronAPI?: {
              isElectron?: boolean;
              showItemInFolder?: (p: string) => Promise<boolean>;
            };
          }
        ).electronAPI;

        const suggestedMp4Name = resolveExportFilename(
          customFileName,
          project.settings.name,
          format,
          resolution,
          fps,
          quality,
          'mp4'
        );

        const directSavedRef: { path: string | null } = { path: null };
        const androidSavedRef: {
          info: {
            uri: string;
            displayPath: string;
            filename: string;
            mimeType: string;
          } | null;
        } = { info: null };
        const exportSettings: ExportSettings = {
          resolution,
          fps,
          quality,
          format,
          exportEngine: eApi?.isElectron ? exportEngine : 'webcodecs',
          smartStreamCopy: eApi?.isElectron && exportEngine === 'ffmpeg' ? smartStreamCopy : false,
          saveToDownloadsName:
            ((eApi?.isElectron && !targetFileHandle && !targetDirHandle) || isNativeAndroid) &&
            format === 'mp4'
              ? suggestedMp4Name
              : undefined,
          onDirectSaved: (savedPath) => {
            directSavedRef.path = savedPath;
          },
          onAndroidNativeSaved: (info) => {
            androidSavedRef.info = info;
          },
        };

        resultBlob = await exporter.exportProject(
          project,
          exportSettings,
          mediaElements,
          (prog) => setProgress(prog)
        );

        if (directSavedRef.path) {
          const baseName = directSavedRef.path.split(/[\\/]/).pop() || suggestedMp4Name;
          setDirectSavedPath(directSavedRef.path);
          setDownloadFilename(baseName);
          setSavedDestinationLabel(`Descargas (${directSavedRef.path})`);
          markProjectExported();
          showToast(`⚡ Exportado directo a disco: ${baseName}`);
          return;
        }

        if (androidSavedRef.info) {
          setAndroidSavedInfo(androidSavedRef.info);
          setDownloadFilename(androidSavedRef.info.filename);
          setSavedDestinationLabel(androidSavedRef.info.displayPath);
          markProjectExported();
          showToast(`🎬 Video guardado en Galería: ${androidSavedRef.info.filename}`);
          return;
        }

        videoExt = resultBlob.type.includes('webm') ? 'webm' : 'mp4';
      }

      const filename = resolveExportFilename(
        customFileName,
        project.settings.name,
        format,
        resolution,
        fps,
        quality,
        videoExt
      );

      if (isNativeAndroid) {
        const ext = format === 'mp4' ? videoExt : format;
        const mimeType = getExportMimeType(ext, resultBlob.type);
        setProgress({
          percentage: 98,
          currentFrame: 100,
          totalFrames: 100,
          timeRemainingSeconds: 1,
          stage: 'muxing',
          stageLabel: 'Guardando archivo en el celular...',
        });
        const nativeRes = await saveBlobToAndroidNative(resultBlob, filename, mimeType);
        if (!nativeRes.ok) {
          throw new Error(nativeRes.error || 'No se pudo guardar el archivo en el celular');
        }
        const savedInfo = {
          uri: nativeRes.uri || '',
          displayPath: nativeRes.displayPath || filename,
          filename: nativeRes.filename || filename,
          mimeType,
        };
        setAndroidSavedInfo(savedInfo);
        setDownloadFilename(savedInfo.filename);
        setSavedDestinationLabel(savedInfo.displayPath);
        markProjectExported();
        showToast(
          format === 'mp3' || format === 'wav'
            ? `🎵 Audio guardado en ${savedInfo.displayPath}`
            : `🎬 Video guardado en ${savedInfo.displayPath}`
        );
        return;
      }

      const url = URL.createObjectURL(resultBlob);
      activeBlobUrlRef.current = url;
      exportedBlobRef.current = resultBlob;

      setDownloadUrl(url);
      markProjectExported();

      if (targetFileHandle) {
        try {
          await writeBlobToFileHandle(targetFileHandle, resultBlob);
          setDownloadFilename(targetFileHandle.name);
          setSavedDestinationLabel(`"${targetFileHandle.name}"`);
          showToast(`📁 Guardado en "${targetFileHandle.name}"`);
        } catch (writeErr) {
          console.error('Error writing to chosen file:', writeErr);
          setDownloadFilename(filename);
          triggerBrowserDownload(url, filename);
          showToast('⚠️ No se pudo escribir en la ubicación elegida; se descargó en Descargas');
        }
      } else if (targetDirHandle) {
        try {
          const savedName = await writeBlobToDirectory(
            targetDirHandle,
            filename,
            resultBlob
          );
          setDownloadFilename(savedName);
          setSavedDestinationLabel(`carpeta "${targetDirHandle.name}"`);
          showToast(`📁 Guardado en "${targetDirHandle.name}/${savedName}"`);
        } catch (writeErr) {
          console.error('Error writing to chosen folder:', writeErr);
          setDownloadFilename(filename);
          triggerBrowserDownload(url, filename);
          showToast('⚠️ No se pudo guardar en la carpeta; se descargó en Descargas');
        }
      } else {
        setDownloadFilename(filename);
        triggerBrowserDownload(url, filename);
        showToast(
          format === 'mp3'
            ? '🎵 Audio MP3 exportado y descargado'
            : format === 'wav'
            ? '🎵 Audio WAV exportado y descargado'
            : '🎬 Video exportado y descargado'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('cancelled')) {
        console.error('Export error:', err);
        setErrorMessage(
          msg && msg.length < 220
            ? `Error al exportar: ${msg}`
            : 'Ocurrió un error durante la exportación. Intenta nuevamente o prueba con otra resolución.'
        );
      }
    } finally {
      setAndroidKeepScreenOn(false);
      if (wakeLock?.release) {
        try {
          await wakeLock.release();
        } catch {}
      }
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exporterRef.current?.cancel();
    setIsExporting(false);
    setProgress(null);
    setErrorMessage(null);
  };

  const handleShareExportedFile = async (target: 'system' | 'whatsapp' = 'system') => {
    if (isSharing) return;

    // 1. Native Android APK
    if (androidSavedInfo) {
      const ok =
        target === 'whatsapp'
          ? shareAndroidExportedFileToWhatsApp(
              androidSavedInfo.uri,
              androidSavedInfo.mimeType,
              androidSavedInfo.filename
            )
          : shareAndroidExportedFile(
              androidSavedInfo.uri,
              androidSavedInfo.mimeType,
              androidSavedInfo.filename
            );
      if (!ok) {
        showToast('No se pudo abrir el menú de compartir');
      }
      return;
    }

    // 2. Electron Desktop (saved directly to disk)
    if (directSavedPath) {
      const eApi = (
        window as unknown as {
          electronAPI?: {
            shareExportedFile?: (
              p: string,
              t?: 'system' | 'whatsapp'
            ) => Promise<{ ok: boolean; mode?: string; error?: string }>;
            showItemInFolder?: (p: string) => Promise<boolean>;
          };
        }
      ).electronAPI;

      setIsSharing(true);
      try {
        if (typeof eApi?.shareExportedFile === 'function') {
          const res = await eApi.shareExportedFile(directSavedPath, target);
          if (res?.ok) {
            if (res.mode === 'clipboard-whatsapp') {
              showToast('📋 Video copiado. Pega con Ctrl+V en el chat de WhatsApp');
            } else if (res.mode === 'clipboard-folder') {
              showToast('📋 Archivo copiado y mostrado en carpeta. Pega con Ctrl+V o arrastra para compartir');
            } else if (res.mode === 'whatsapp-web') {
              showToast('💬 WhatsApp Web abierto. Arrastra el archivo desde la carpeta');
            }
            return;
          }
        }
        eApi?.showItemInFolder?.(directSavedPath);
        showToast('📁 Archivo mostrado en carpeta listo para compartir');
      } finally {
        setIsSharing(false);
      }
      return;
    }

    // 3. Web / Mobile Browser / PWA (Web Share API Level 2 with file attachment)
    const blob = exportedBlobRef.current;
    if (!blob) {
      showToast('No se encontró el archivo exportado para compartir');
      return;
    }

    const ext = downloadFilename.split('.').pop()?.toLowerCase() || (isAudioOnly ? format : 'mp4');
    const mimeType = getExportMimeType(ext, blob.type);
    const shareName = downloadFilename || `video_editado.${ext}`;
    const shareFile = new File([blob], shareName, { type: mimeType });

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data?: ShareData) => Promise<void>;
    };

    setIsSharing(true);
    try {
      if (typeof nav.share === 'function') {
        const sharePayload: ShareData = {
          files: [shareFile],
          title: shareName,
          text: isAudioOnly
            ? 'Audio editado con Dulos Editor'
            : 'Video editado con Dulos Editor',
        };

        const canShareFiles =
          typeof nav.canShare === 'function' ? nav.canShare({ files: [shareFile] }) : true;

        if (canShareFiles) {
          await nav.share(sharePayload);
          return;
        }
      }

      // Fallback when browser does not support Web Share API with files (e.g. desktop Firefox/Chrome)
      if (target === 'whatsapp') {
        window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
        showToast(
          '💬 WhatsApp Web abierto. Adjunta el archivo descargado (' + shareName + ')'
        );
      } else {
        showToast(
          'Tu navegador de escritorio no admite compartir archivos directamente. Adjunta el archivo desde Descargas.'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User dismissed the share sheet
        return;
      }
      console.error('Share error:', err);
      if (target === 'whatsapp') {
        window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
        showToast('💬 WhatsApp Web abierto. Adjunta el archivo desde Descargas');
      } else {
        showToast('No se pudo abrir el menú de compartir en este navegador');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveToFolder = async () => {
    const blob = exportedBlobRef.current;
    if (!blob) return;

    if (!supportsFilePicker) {
      showToast(
        isMobileDevice
          ? 'Abre la app Descargas o Archivos para ver el video en su carpeta'
          : 'Presiona Ctrl+J (⌘+Shift+J en Mac) y haz clic en "Mostrar en carpeta"'
      );
      return;
    }

    const ext = downloadFilename.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeType = getExportMimeType(ext, blob.type);

    setIsSavingToFolder(true);
    try {
      const handle = await pickExportFileHandle(downloadFilename, mimeType, ext);
      if (!handle) return;
      await writeBlobToFileHandle(handle, blob);
      showToast('📁 Archivo guardado en la carpeta seleccionada');
    } catch (err) {
      console.error('Save to folder error:', err);
      showToast('No se pudo guardar en la carpeta seleccionada');
    } finally {
      setIsSavingToFolder(false);
    }
  };

  const isAudioOnly = format === 'mp3' || format === 'wav';
  const previewFilename = resolveExportFilename(
    customFileName,
    project.settings.name,
    format,
    resolution,
    fps,
    quality,
    'mp4'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md max-h-[92dvh] bg-[#12131e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {isAudioOnly ? (
              <Music className="w-5 h-5 text-pink-400" />
            ) : (
              <Film className="w-5 h-5 text-indigo-400" />
            )}
            <h2 className="text-sm font-bold text-white">
              {isAudioOnly
                ? 'Exportar Solo Audio (MP3 / WAV)'
                : 'Exportar y Renderizar Video'}
            </h2>
          </div>
          {!isExporting && (
            <button
              onClick={handleCloseModal}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
          {!isExporting && !downloadUrl && !directSavedPath && !androidSavedInfo && (
            <>
              {/* Custom Export File Name */}
              <div>
                <label
                  htmlFor="export-custom-filename"
                  className="text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5"
                >
                  <FileSignature className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Nombre del {isAudioOnly ? 'Audio' : 'Video'} a Exportar
                  </span>
                </label>
                <div className="flex items-center rounded-lg bg-white/5 border border-white/10 focus-within:border-indigo-500 transition-colors overflow-hidden">
                  <input
                    id="export-custom-filename"
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder={
                      project.settings.name ||
                      (isAudioOnly ? 'mi_audio_exportado' : 'mi_video_exportado')
                    }
                    maxLength={120}
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none select-text"
                  />
                  <span className="px-2.5 py-2 bg-white/5 border-l border-white/10 font-mono text-[11px] font-semibold text-indigo-300 shrink-0">
                    .{format}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">
                  Archivo final:{' '}
                  <span className="font-mono text-slate-200">
                    {previewFilename}
                  </span>
                </p>
              </div>

              {/* Format Selection (Video MP4 vs Audio MP3 vs WAV) */}
              <div>
                <label className="text-slate-400 font-semibold mb-1.5 block">
                  Formato de Salida
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFormat('mp4')}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg font-semibold border transition-all ${
                      format === 'mp4'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>Video MP4</span>
                  </button>

                  <button
                    onClick={() => setFormat('mp3')}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg font-semibold border transition-all ${
                      format === 'mp3'
                        ? 'bg-pink-600/30 border-pink-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Music className="w-4 h-4 text-pink-400" />
                    <span>Solo Audio MP3</span>
                  </button>

                  <button
                    onClick={() => setFormat('wav')}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg font-semibold border transition-all ${
                      format === 'wav'
                        ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Music className="w-4 h-4 text-purple-400" />
                    <span>Audio WAV</span>
                  </button>
                </div>
              </div>

              {format === 'mp4' && (
                <>
                  {/* Resolution Selector */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-slate-400 font-semibold">
                        Calidad de Resolución
                      </span>
                      <span className="font-mono text-indigo-400">
                        {dimensions.width}x{dimensions.height} px
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          '360p',
                          '480p',
                          '720p',
                          '1080p',
                        ] as ExportResolution[]
                      ).map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={`py-1.5 rounded font-mono font-semibold uppercase text-[11px] border transition-all ${
                            resolution === res
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Rate (FPS) */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block">
                      Tasa de Fotogramas (FPS)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([24, 25, 30] as ExportFPS[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFps(f)}
                          className={`py-1.5 rounded font-mono font-semibold text-[11px] border transition-all ${
                            fps === f
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {f} fps
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bitrate Quality */}
                  <div>
                    <label className="text-slate-400 font-semibold mb-1.5 block">
                      Calidad y Tasa de Bits
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        ['low', 'medium', 'high'] as ExportBitrateQuality[]
                      ).map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`py-1.5 rounded font-semibold capitalize border transition-all ${
                            quality === q
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {q === 'low'
                            ? 'Baja'
                            : q === 'medium'
                            ? 'Recomendada'
                            : 'Alta'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {format === 'mp3' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-slate-400 font-semibold">
                      Calidad de Audio MP3
                    </span>
                    <span className="font-mono text-pink-400">
                      {mp3Kbps} kbps · Estéreo 44.1 kHz
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as ExportBitrateQuality[]).map(
                      (q) => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`py-2 rounded-lg font-semibold border transition-all ${
                            quality === q
                              ? 'bg-pink-600 border-pink-500 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {q === 'low'
                            ? '128 kbps (Estándar)'
                            : q === 'medium'
                            ? '192 kbps (Óptima)'
                            : '320 kbps (Máxima)'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Native Engine Selector (Electron Desktop) */}
              {!isAudioOnly &&
                Boolean((window as unknown as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron) && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold">
                      Motor de Exportación
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {exportEngine === 'ffmpeg' ? 'FFmpeg Nativo + GPU' : 'WebGL / WebCodecs'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExportEngine('ffmpeg')}
                      className={`py-1.5 px-2 rounded font-semibold text-[11px] border transition-all ${
                        exportEngine === 'ffmpeg'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      ⚡ Ultra Rápido (FFmpeg GPU)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportEngine('webcodecs')}
                      className={`py-1.5 px-2 rounded font-semibold text-[11px] border transition-all ${
                        exportEngine === 'webcodecs'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      🎨 WebGL Exacto (Lento)
                    </button>
                  </div>
                  {exportEngine === 'ffmpeg' && (
                    <label className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 cursor-pointer select-none">
                      <span className="text-[11px] text-slate-300">
                        ⚡ Copia directa sin recodificar (instantáneo si no hay filtros visuales)
                      </span>
                      <input
                        type="checkbox"
                        checked={smartStreamCopy}
                        onChange={(e) => setSmartStreamCopy(e.target.checked)}
                        className="accent-emerald-500 w-3.5 h-3.5 shrink-0"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* PC Mode Export Destination Selector */}
              {!isTouchMobile && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                      Destino del Archivo (Modo PC)
                    </span>
                    {destinationMode === 'directory' && selectedDirHandle && (
                      <span className="text-[11px] font-mono text-emerald-400 truncate max-w-[170px]">
                        /{selectedDirHandle.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectDestinationMode('downloads')}
                      className={`py-1.5 px-2 rounded font-semibold text-[11px] border transition-all ${
                        destinationMode === 'downloads'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Descargas
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDestinationMode('directory')}
                      className={`py-1.5 px-2 rounded font-semibold text-[11px] border transition-all ${
                        destinationMode === 'directory'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Carpeta fija
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectDestinationMode('ask')}
                      className={`py-1.5 px-2 rounded font-semibold text-[11px] border transition-all ${
                        destinationMode === 'ask'
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Elegir al exportar
                    </button>
                  </div>

                  {destinationMode === 'directory' && (
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
                        <FolderCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {selectedDirHandle
                            ? `Carpeta: ${selectedDirHandle.name}`
                            : 'Ninguna carpeta seleccionada'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handlePickDirectory}
                          className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold transition-colors"
                        >
                          {selectedDirHandle ? 'Cambiar' : 'Elegir...'}
                        </button>
                        {selectedDirHandle && (
                          <button
                            type="button"
                            onClick={handleClearDirectory}
                            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {destinationMode === 'ask' && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Se abrirá el explorador de archivos para elegir la carpeta y el nombre antes de renderizar.
                    </p>
                  )}

                  {destinationMode === 'downloads' && (
                    <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                      <span className="text-slate-400 truncate">
                        Carpeta predeterminada de Descargas
                      </span>
                      <button
                        type="button"
                        onClick={handlePickDirectory}
                        className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold transition-colors shrink-0"
                      >
                        Elegir carpeta...
                      </button>
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 flex items-start gap-2 text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Real-time Estimated MB Size Card */}
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300">
                  <HardDrive className="w-4 h-4" />
                  <span className="font-semibold">
                    Tamaño Estimado ({project.settings.duration.toFixed(1)}s):
                  </span>
                </div>
                <span className="font-mono text-base font-extrabold text-white">
                  ~{estimatedSizeMB} MB
                </span>
              </div>
            </>
          )}

          {/* Active Rendering Progress Screen */}
          {isExporting && progress && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto" />

              <div>
                <span className="text-lg font-extrabold text-white font-mono">
                  {progress.currentFrame > 0 && progress.totalFrames > 0 && progress.percentage === 0
                    ? `${((progress.currentFrame / progress.totalFrames) * 95).toFixed(1)}%`
                    : `${progress.percentage}%`}
                </span>
                <p className="text-slate-400 mt-1">
                  {isAudioOnly
                    ? `Mezclando y codificando audio ${format.toUpperCase()}...`
                    : progress.stageLabel
                    ? progress.stageLabel
                    : progress.currentFrame === 0
                    ? 'Preparando medios y codificador...'
                    : `Renderizando fotograma ${progress.currentFrame} de ${progress.totalFrames}...`}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${
                      progress.currentFrame > 0 && progress.totalFrames > 0 && progress.percentage === 0
                        ? Math.max(0.5, (progress.currentFrame / progress.totalFrames) * 95)
                        : progress.percentage
                    }%`,
                  }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-150"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {progress.timeRemainingSeconds < 0
                    ? 'Calculando tiempo restante...'
                    : progress.timeRemainingSeconds >= 60
                    ? `Tiempo restante: ~${Math.floor(progress.timeRemainingSeconds / 60)}m ${progress.timeRemainingSeconds % 60}s`
                    : `Tiempo restante: ~${progress.timeRemainingSeconds} segundos`}
                </span>
              </div>

              <button
                onClick={handleCancelExport}
                className="mt-2 text-rose-400 hover:text-rose-300 underline font-semibold"
              >
                Cancelar Exportación
              </button>
            </div>
          )}

          {/* Export Complete Screen */}
          {!isExporting && (downloadUrl || directSavedPath || androidSavedInfo) && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {format === 'mp3'
                    ? '¡Audio MP3 Exportado con Éxito!'
                    : format === 'wav'
                    ? '¡Audio WAV Exportado con Éxito!'
                    : '¡Video Renderizado con Éxito!'}
                </h3>
                {savedDestinationLabel ? (
                  <p className="text-slate-400 mt-1">
                    Guardado en{' '}
                    <span className="text-emerald-300 font-semibold">
                      {savedDestinationLabel}
                    </span>{' '}
                    (<span className="text-slate-200 font-mono">{downloadFilename}</span>).
                  </p>
                ) : (
                  <p className="text-slate-400 mt-1">
                    La descarga de{' '}
                    <span className="text-slate-200 font-mono">{downloadFilename}</span> ha comenzado automáticamente.
                  </p>
                )}
              </div>

              {/* Direct Share Section (WhatsApp & Any App) */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/40 via-indigo-950/40 to-slate-900/60 border border-emerald-500/25 space-y-2">
                <p className="text-[11px] font-semibold text-slate-200">
                  Compartir {isAudioOnly ? 'audio' : 'video'} directamente
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSharing}
                    onClick={() => handleShareExportedFile('whatsapp')}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 shadow-lg transition-all active:scale-95 disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSharing}
                    onClick={() => handleShareExportedFile('system')}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all active:scale-95 disabled:opacity-60"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isSharing ? 'Abriendo...' : 'Compartir...'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-1">
                {androidSavedInfo ? (
                  <button
                    onClick={() => {
                      const opened = openAndroidExportedFile(
                        androidSavedInfo.uri,
                        androidSavedInfo.mimeType
                      );
                      if (!opened) {
                        showToast(`Archivo guardado en ${androidSavedInfo.displayPath}`);
                      }
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{isAudioOnly ? 'Reproducir Audio' : 'Abrir en Galería'}</span>
                  </button>
                ) : directSavedPath ? (
                  <button
                    onClick={() => {
                      const eApi = (
                        window as unknown as {
                          electronAPI?: { showItemInFolder?: (p: string) => Promise<boolean> };
                        }
                      ).electronAPI;
                      eApi?.showItemInFolder?.(directSavedPath);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Abrir en Carpeta</span>
                  </button>
                ) : (
                  <>
                    <a
                      href={downloadUrl!}
                      download={downloadFilename}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>{savedDestinationLabel ? 'Descargar Copia' : 'Descargar de Nuevo'}</span>
                    </a>

                    <button
                      onClick={handleSaveToFolder}
                      disabled={isSavingToFolder}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white transition-all disabled:opacity-60"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>
                        {isSavingToFolder
                          ? 'Abriendo carpeta...'
                          : supportsFilePicker
                          ? savedDestinationLabel
                            ? 'Guardar Copia en...'
                            : 'Guardar en Carpeta...'
                          : 'Ver en Carpeta'}
                      </span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    setDirectSavedPath(null);
                    handleResetToSettings();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Exportar Otro Formato</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-400 text-left leading-relaxed">
                {isMobileDevice ? (
                  <span>
                    Para ver el archivo descargado en su carpeta, abre la app{' '}
                    <strong className="text-slate-200">Descargas</strong> o{' '}
                    <strong className="text-slate-200">Archivos</strong> de tu dispositivo.
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-200">¿Dónde quedó la descarga automática?</strong>{' '}
                    Presiona{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">
                      Ctrl + J
                    </kbd>{' '}
                    (o{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">
                      ⌘ + Shift + J
                    </kbd>{' '}
                    en Mac) y haz clic en{' '}
                    <strong className="text-slate-200">Mostrar en carpeta</strong>.
                    {supportsFilePicker && (
                      <>
                        {' '}
                        O usa <strong className="text-indigo-300">Guardar en Carpeta...</strong> para abrir el explorador y elegir la carpeta de destino.
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isExporting && (
          <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2 bg-[#0e0f18]">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-md font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cerrar
            </button>
            {!downloadUrl && !directSavedPath && !androidSavedInfo && (
              <button
                onClick={handleStartExport}
                className="px-5 py-2 rounded-md font-bold bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white shadow-lg active:scale-95 transition-all"
              >
                {format === 'mp3'
                  ? 'Exportar Audio MP3'
                  : format === 'wav'
                  ? 'Exportar Audio WAV'
                  : 'Exportar Video MP4'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
