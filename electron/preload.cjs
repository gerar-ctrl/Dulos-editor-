const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  quitApp: () => ipcRenderer.invoke('app:quit'),
  confirmQuitApp: () => ipcRenderer.invoke('app:confirm-quit'),
  setUnsavedChanges: (hasUnsaved) =>
    ipcRenderer.send('app:set-unsaved-changes', Boolean(hasUnsaved)),
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:request-close', listener);
    return () => ipcRenderer.removeListener('app:request-close', listener);
  },
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || null;
    } catch {
      return file?.path || null;
    }
  },
  getLocalMediaUrl: (filePath) =>
    ipcRenderer.invoke('media:get-local-url', { filePath }),
  ffmpegInfo: () => ipcRenderer.invoke('ffmpeg:info'),
  createExportSession: () => ipcRenderer.invoke('ffmpeg:create-session'),
  writeExportFile: (sessionId, fileName, data) =>
    ipcRenderer.invoke('ffmpeg:write-file', { sessionId, fileName, data }),
  appendExportFileChunk: (sessionId, fileName, data, isFirst) =>
    ipcRenderer.invoke('ffmpeg:append-file-chunk', { sessionId, fileName, data, isFirst }),
  writeTextFile: (sessionId, fileName, content) =>
    ipcRenderer.invoke('ffmpeg:write-text-file', { sessionId, fileName, content }),
  writeConcatFile: (sessionId, fileName, content) =>
    ipcRenderer.invoke('ffmpeg:write-concat-file', { sessionId, fileName, content }),
  probeExportFile: (sessionId, fileName) =>
    ipcRenderer.invoke('ffmpeg:probe-file', { sessionId, fileName }),
  probeDirectPath: (filePath) =>
    ipcRenderer.invoke('ffmpeg:probe-path', { filePath }),
  getFFmpegEncoderArgs: (encoder, bitrateMbps) =>
    ipcRenderer.invoke('ffmpeg:get-encoder-args', { encoder, bitrateMbps }),
  runFFmpegExport: (payload) => ipcRenderer.invoke('ffmpeg:run-export', payload),
  pickSaveFilePath: (defaultName) =>
    ipcRenderer.invoke('ffmpeg:pick-save-path', { defaultName }),
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke('ffmpeg:show-in-folder', { filePath }),
  shareExportedFile: (filePath, target = 'system') =>
    ipcRenderer.invoke('ffmpeg:share-file', { filePath, target }),
  transcodeToFastMp4: (data, ext) =>
    ipcRenderer.invoke('ffmpeg:transcode-to-fast-mp4', { data, ext }),
  transcodePathToFastMp4: (filePath) =>
    ipcRenderer.invoke('ffmpeg:transcode-path-to-fast-mp4', { filePath }),
  cancelFFmpegExport: (jobId) => ipcRenderer.invoke('ffmpeg:cancel', { jobId }),
  cleanupExportSession: (sessionId) =>
    ipcRenderer.invoke('ffmpeg:cleanup-session', { sessionId }),
  onFFmpegProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('ffmpeg:progress', listener);
    return () => ipcRenderer.removeListener('ffmpeg:progress', listener);
  },
});
