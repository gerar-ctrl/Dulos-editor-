const { app, BrowserWindow, Menu, ShareMenu, session, shell, ipcMain, dialog, powerMonitor } = require('electron');
const { execFile } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const ffmpegHelper = require('./ffmpegHelper.cjs');

// ============================================================================
// GPU Stability, Memory Budget & Crash Diagnostics
// ============================================================================
const PREFERRED_SERVER_PORTS = [47832, 47833, 47834, 47835, 0];

function getGpuStabilityPath() {
  try {
    return path.join(app.getPath('userData'), 'gpu-stability.json');
  } catch {
    return null;
  }
}

function readGpuStabilityState() {
  try {
    const filePath = getGpuStabilityPath();
    if (!filePath || !fs.existsSync(filePath)) return { gpuSafeMode: false };
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { gpuSafeMode: Boolean(raw && raw.gpuSafeMode && raw.userSelected) };
  } catch {
    return { gpuSafeMode: false };
  }
}

function writeGpuStabilityState(state) {
  try {
    const filePath = getGpuStabilityPath();
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // ignore persistence errors
  }
}

function appendCrashLog(entry) {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    const line = `[${new Date().toISOString()}] ${entry}\n`;
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 65536) {
      const existing = fs.readFileSync(logPath, 'utf8').slice(-32768);
      fs.writeFileSync(logPath, existing + line, 'utf8');
    } else {
      fs.appendFileSync(logPath, line, 'utf8');
    }
  } catch {
    // ignore log write errors
  }
}

const isGpuSafeMode =
  process.argv.includes('--safe-gpu') || readGpuStabilityState().gpuSafeMode;

if (isGpuSafeMode) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-compositing');
} else if (process.platform === 'win32') {
  // Prevent Windows DWM DirectComposition video overlay black-screen glitches
  app.commandLine.appendSwitch('disable-direct-composition-video-overlays');
}

// Scale V8 heap limit to system RAM so 8 GB PCs garbage-collect promptly instead of
// thrashing Windows virtual memory / pagefile and triggering OOM freezes.
const totalRamMB = Math.floor(os.totalmem() / (1024 * 1024));
const safeV8HeapMB = Math.max(1024, Math.min(3072, Math.floor(totalRamMB * 0.22)));

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${safeV8HeapMB}`);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.opus': 'audio/opus',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

let mainWindow = null;
let localServer = null;
let serverOrigin = '';
let rendererHasUnsavedChanges = false;
let isForceQuitting = false;

// Allowlisted local media files streamed directly from disk with HTTP Range support
// so Electron never duplicates multi-GB video files into IndexedDB on drive C:.
const localMediaTokenByPath = new Map();
const localMediaPathByToken = new Map();

function registerLocalMediaFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  let token = localMediaTokenByPath.get(resolved);
  if (!token) {
    token = crypto.randomBytes(12).toString('hex');
    localMediaTokenByPath.set(resolved, token);
    localMediaPathByToken.set(token, resolved);
  }
  return serverOrigin ? `${serverOrigin}/local-media/${token}` : null;
}

function serveLocalMediaStream(req, res, token) {
  const filePath = localMediaPathByToken.get(token);
  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Media file not found');
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Media file unavailable');
    return;
  }

  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const rangeHeader = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'no-store');

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      res.end();
      return;
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
    if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      res.end();
      return;
    }
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    req.on('close', () => stream.destroy());
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': contentType,
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  req.on('close', () => stream.destroy());
  stream.pipe(res);
}

// Reclaim gigabytes of orphaned IndexedDB blob folders left behind by older builds
// that listened on random ephemeral localhost ports.
function cleanupOrphanedIndexedDB(activePort) {
  try {
    const idbDir = path.join(app.getPath('userData'), 'IndexedDB');
    if (!fs.existsSync(idbDir)) return;
    const keepPrefix = `http_127.0.0.1_${activePort}.indexeddb.`;
    const entries = fs.readdirSync(idbDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith('http_127.0.0.1_')) continue;
      if (entry.name.startsWith(keepPrefix)) continue;
      try {
        fs.rmSync(path.join(idbDir, entry.name), { recursive: true, force: true });
      } catch {
        // ignore locked/in-use entries
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

function listenOnPreferredPort(server, ports) {
  return new Promise((resolve, reject) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= ports.length) {
        reject(new Error('No available local port'));
        return;
      }
      const port = ports[idx++];
      const onError = (err) => {
        server.removeListener('listening', onListening);
        if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && idx < ports.length) {
          tryNext();
        } else {
          reject(err);
        }
      };
      const onListening = () => {
        server.removeListener('error', onError);
        const address = server.address();
        resolve({ server, port: address.port });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, '127.0.0.1');
    };
    tryNext();
  });
}

function startLocalServer(distDir) {
  const server = http.createServer((req, res) => {
    // Required for SharedArrayBuffer, WebCodecs & high-performance workers
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-cache');

    const rawUrl = (req.url || '/').split('?')[0];
    if (rawUrl.startsWith('/local-media/')) {
      const token = rawUrl.slice('/local-media/'.length).replace(/[^a-f0-9]/gi, '');
      serveLocalMediaStream(req, res, token);
      return;
    }

    let decodedPath = '/';
    try {
      decodedPath = decodeURIComponent(rawUrl);
    } catch {
      decodedPath = '/';
    }

    const relPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
    let filePath = path.resolve(distDir, relPath);

    // Prevent path traversal outside distDir
    if (!filePath.startsWith(path.resolve(distDir))) {
      filePath = path.join(distDir, 'index.html');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Error loading asset');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });

  return listenOnPreferredPort(server, PREFERRED_SERVER_PORTS);
}

function setupPermissions() {
  const allowedPermissions = new Set([
    'media',
    'mediaKeySystem',
    'clipboard-read',
    'clipboard-sanitized-write',
    'fullscreen',
  ]);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const requestingUrl = details.requestingUrl || '';
    const isLocalOrigin =
      requestingUrl.startsWith(serverOrigin) ||
      requestingUrl.startsWith('http://127.0.0.1') ||
      requestingUrl.startsWith('http://localhost');

    callback(isLocalOrigin && allowedPermissions.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const isLocalOrigin =
      requestingOrigin.startsWith(serverOrigin) ||
      requestingOrigin.startsWith('http://127.0.0.1') ||
      requestingOrigin.startsWith('http://localhost');

    return isLocalOrigin && allowedPermissions.has(permission);
  });
}

async function createWindow() {
  const distDir = path.join(__dirname, '..', 'dist');
  const devUrl = process.env.VITE_DEV_SERVER_URL;

  let targetUrl = devUrl;
  if (!targetUrl) {
    const { server, port } = await startLocalServer(distDir);
    localServer = server;
    serverOrigin = `http://127.0.0.1:${port}`;
    targetUrl = serverOrigin;
    // Reclaim disk space from orphaned random-port IndexedDB folders created by earlier builds
    cleanupOrphanedIndexedDB(port);
  } else {
    serverOrigin = devUrl;
  }

  setupPermissions();
  Menu.setApplicationMenu(null);

  const iconPath = path.join(distDir, 'icon-512.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    title: 'Dulos editor',
    backgroundColor: '#090a0f',
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      webgl: true,
    },
  });

  let hasShownWindow = false;
  const showMainWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed() || hasShownWindow) return;
    hasShownWindow = true;
    mainWindow.maximize();
    mainWindow.show();
  };

  mainWindow.once('ready-to-show', showMainWindow);
  const showFallbackTimer = setTimeout(showMainWindow, 5000);

  let loadRetryCount = 0;
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || isForceQuitting) return;
    if (loadRetryCount < 3 && mainWindow && !mainWindow.isDestroyed()) {
      loadRetryCount += 1;
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(targetUrl).catch(() => {});
        }
      }, 400 * loadRetryCount);
    }
  });

  const rendererCrashTimestamps = [];
  let isRecoveryDialogOpen = false;
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (isForceQuitting || details.reason === 'clean-exit') return;
    appendCrashLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
    const now = Date.now();
    rendererCrashTimestamps.push(now);
    while (rendererCrashTimestamps.length > 0 && now - rendererCrashTimestamps[0] > 60000) {
      rendererCrashTimestamps.shift();
    }

    // Never silently loop-reload on OOM or repeated crashes; clear cache and let user decide
    if (
      details.reason !== 'oom' &&
      rendererCrashTimestamps.length === 1 &&
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      session.defaultSession.clearCache().catch(() => {});
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(targetUrl).catch(() => {});
        }
      }, 500);
      return;
    }

    if (!mainWindow || mainWindow.isDestroyed() || isRecoveryDialogOpen) return;
    isRecoveryDialogOpen = true;
    session.defaultSession.clearCache().catch(() => {});
    const isOom = details.reason === 'oom';
    dialog
      .showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Dulos editor — Recuperación',
        message: isOom
          ? 'El editor se quedó sin memoria disponible.'
          : 'La pantalla del editor se detuvo inesperadamente.',
        detail: isOom
          ? 'Cierra otras aplicaciones pesadas o recarga el editor para continuar trabajando con fluidez.'
          : 'Puedes recargar el editor o iniciar en modo gráfico seguro si el problema persiste.',
        buttons: ['Recargar editor', 'Modo gráfico seguro', 'Cerrar'],
        defaultId: 0,
        cancelId: 2,
      })
      .then(({ response }) => {
        isRecoveryDialogOpen = false;
        if (response === 0 && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(targetUrl).catch(() => {});
        } else if (response === 1) {
          relaunchInSafeGpuMode(details.reason || 'renderer-gone');
        } else {
          isForceQuitting = true;
          app.quit();
        }
      })
      .catch(() => {
        isRecoveryDialogOpen = false;
      });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || (url.startsWith('http://') && !url.startsWith(serverOrigin))) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    } else if (
      input.type === 'keyDown' &&
      process.platform === 'darwin' &&
      input.meta &&
      input.key.toLowerCase() === 'q'
    ) {
      event.preventDefault();
      mainWindow?.close();
    }
  });

  mainWindow.on('close', (event) => {
    if (isForceQuitting) {
      return;
    }
    if (!rendererHasUnsavedChanges) {
      isForceQuitting = true;
      cleanupAllTempFiles();
      return;
    }
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.webContents &&
      !mainWindow.webContents.isDestroyed()
    ) {
      event.preventDefault();
      mainWindow.webContents.send('app:request-close');
    }
  });

  mainWindow.on('closed', () => {
    clearTimeout(showFallbackTimer);
    mainWindow = null;
  });

  await mainWindow.loadURL(targetUrl);
}

function forceWindowRepaint() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.invalidate();
    }
  } catch {
    // ignore repaint errors
  }
}

function relaunchInSafeGpuMode(reason) {
  if (isForceQuitting) return;
  isForceQuitting = true;
  writeGpuStabilityState({ gpuSafeMode: true, userSelected: true, reason, updatedAt: Date.now() });
  const nextArgs = process.argv.slice(1).filter((a) => a !== '--safe-gpu');
  nextArgs.push('--safe-gpu');
  app.relaunch({ args: nextArgs });
  app.exit(0);
}

const gpuCrashTimestamps = [];
let gpuPromptShown = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('child-process-gone', (_event, details) => {
    if (!details || details.type !== 'GPU' || isForceQuitting) return;
    appendCrashLog(`gpu-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
    const now = Date.now();
    gpuCrashTimestamps.push(now);
    while (gpuCrashTimestamps.length > 0 && now - gpuCrashTimestamps[0] > 60000) {
      gpuCrashTimestamps.shift();
    }

    // Never silently kill & relaunch the app on GPU resets; Chromium recovers automatically.
    // Only offer safe mode via dialog if the GPU driver repeatedly crashes.
    if (!isGpuSafeMode && gpuCrashTimestamps.length >= 3 && !gpuPromptShown && mainWindow && !mainWindow.isDestroyed()) {
      gpuPromptShown = true;
      dialog
        .showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Dulos editor — Estabilidad gráfica',
          message: 'El controlador gráfico de Windows se reinició varias veces.',
          detail: '¿Deseas reiniciar Dulos editor en modo gráfico seguro para evitar congelamientos?',
          buttons: ['Continuar normal', 'Reiniciar en modo seguro'],
          defaultId: 0,
          cancelId: 0,
        })
        .then(({ response }) => {
          if (response === 1) {
            relaunchInSafeGpuMode(details.reason || 'gpu-process-gone');
          }
        })
        .catch(() => {});
      return;
    }

    setTimeout(forceWindowRepaint, 250);
    setTimeout(forceWindowRepaint, 1000);
  });

  app.whenReady().then(() => {
    powerMonitor.on('resume', () => {
      setTimeout(forceWindowRepaint, 300);
    });
    powerMonitor.on('unlock-screen', () => {
      setTimeout(forceWindowRepaint, 300);
    });
    return createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('will-quit', () => {
    cleanupAllTempFiles();
    if (localServer) {
      localServer.close();
      localServer = null;
    }
  });
}

// ============================================================================
// FFmpeg Native Hardware-Accelerated Export IPC
// ============================================================================
const exportSessions = new Map();

function cleanupAllTempFiles() {
  ffmpegHelper.cancelAllFFmpegJobs();
  for (const dir of exportSessions.values()) {
    ffmpegHelper.removeTempDir(dir);
  }
  exportSessions.clear();
  ffmpegHelper.cleanupAllSessionTempDirs();
}

ipcMain.handle('media:get-local-url', (_event, { filePath }) => {
  return registerLocalMediaFile(filePath);
});

ipcMain.handle('ffmpeg:info', async () => {
  return await ffmpegHelper.detectFFmpeg();
});

ipcMain.handle('ffmpeg:create-session', () => {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dir = ffmpegHelper.createTempDir();
  exportSessions.set(sessionId, dir);
  return sessionId;
});

ipcMain.handle('ffmpeg:write-file', async (_event, { sessionId, fileName, data }) => {
  const dir = exportSessions.get(sessionId);
  if (!dir) throw new Error('Invalid export session');
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(dir, safeName);
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  await fs.promises.writeFile(filePath, buf);
  return safeName;
});

ipcMain.handle('ffmpeg:append-file-chunk', async (_event, { sessionId, fileName, data, isFirst }) => {
  const dir = exportSessions.get(sessionId);
  if (!dir) throw new Error('Invalid export session');
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(dir, safeName);
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (isFirst) {
    await fs.promises.writeFile(filePath, buf);
  } else {
    await fs.promises.appendFile(filePath, buf);
  }
  return safeName;
});

function escapeFFmpegFilterPath(fullPath) {
  return fullPath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

function resolveTempFilterTokens(text, dir) {
  return String(text).replace(/__TEMP_FILTER__:([a-zA-Z0-9._-]+)/g, (_m, rel) => {
    const cleanRel = path.basename(rel).replace(/[^a-zA-Z0-9._-]/g, '_');
    return escapeFFmpegFilterPath(path.join(dir, cleanRel));
  });
}

ipcMain.handle('ffmpeg:write-text-file', async (_event, { sessionId, fileName, content }) => {
  const dir = exportSessions.get(sessionId);
  if (!dir) throw new Error('Invalid export session');
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(dir, safeName);
  const resolved = resolveTempFilterTokens(content, dir);
  await fs.promises.writeFile(filePath, resolved, 'utf8');
  return safeName;
});

ipcMain.handle('ffmpeg:write-concat-file', async (_event, { sessionId, fileName, content }) => {
  const dir = exportSessions.get(sessionId);
  if (!dir) throw new Error('Invalid export session');
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(dir, safeName);
  const resolvedContent = String(content).replace(/__TEMP__:([^\r\n']+)/g, (_m, rel) => {
    const cleanRel = path.basename(rel).replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(dir, cleanRel).replace(/\\/g, '/').replace(/'/g, "'\\''");
  });
  await fs.promises.writeFile(filePath, resolvedContent, 'utf8');
  return safeName;
});

ipcMain.handle('ffmpeg:probe-file', async (_event, { sessionId, fileName }) => {
  const dir = exportSessions.get(sessionId);
  if (!dir) return null;
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return await ffmpegHelper.probeMediaFile(path.join(dir, safeName));
});

ipcMain.handle('ffmpeg:probe-path', async (_event, { filePath }) => {
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) return null;
  return await ffmpegHelper.probeMediaFile(filePath);
});

ipcMain.handle('ffmpeg:get-encoder-args', async (_event, { encoder, bitrateMbps }) => {
  return ffmpegHelper.getEncoderArgs(encoder, bitrateMbps);
});

ipcMain.handle('ffmpeg:pick-save-path', async (_event, { defaultName }) => {
  const safeDefault = path.basename(defaultName || 'video.mp4').replace(/[<>:"/\\|?*]/g, '_');
  const targetDir = ffmpegHelper.getBestExportOutputDir(app.getPath('downloads'));
  const res = await dialog.showSaveDialog(mainWindow || undefined, {
    title: 'Guardar video exportado',
    defaultPath: path.join(targetDir, safeDefault),
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
  });
  return res.canceled ? null : res.filePath || null;
});

ipcMain.handle('ffmpeg:show-in-folder', (_event, { filePath }) => {
  if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('ffmpeg:share-file', async (_event, { filePath, target }) => {
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    return { ok: false, error: 'Archivo no encontrado' };
  }

  try {
    if (process.platform === 'darwin' && target !== 'whatsapp' && typeof ShareMenu === 'function') {
      const shareMenu = new ShareMenu({ filePaths: [filePath] });
      shareMenu.popup({ window: mainWindow || undefined });
      return { ok: true, mode: 'native-share' };
    }

    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        execFile(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'param([string]$p) Set-Clipboard -LiteralPath $p',
            filePath,
          ],
          { windowsHide: true, timeout: 6000 },
          () => resolve()
        );
      });

      if (target === 'whatsapp') {
        try {
          await shell.openExternal('whatsapp://');
        } catch {
          await shell.openExternal('https://web.whatsapp.com');
        }
        return { ok: true, mode: 'clipboard-whatsapp' };
      }

      shell.showItemInFolder(filePath);
      return { ok: true, mode: 'clipboard-folder' };
    }

    if (target === 'whatsapp') {
      await shell.openExternal('https://web.whatsapp.com');
      shell.showItemInFolder(filePath);
      return { ok: true, mode: 'whatsapp-web' };
    }

    shell.showItemInFolder(filePath);
    return { ok: true, mode: 'folder' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

function resolveUniqueDownloadsPath(fileName) {
  const targetDir = ffmpegHelper.getBestExportOutputDir(app.getPath('downloads'));
  fs.mkdirSync(targetDir, { recursive: true });
  const safeBase = path.basename(fileName || 'video.mp4').replace(/[<>:"/\\|?*]/g, '_');
  const parsed = path.parse(safeBase);
  let candidate = path.join(targetDir, safeBase);
  let idx = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(targetDir, `${parsed.name} (${idx++})${parsed.ext || '.mp4'}`);
  }
  return candidate;
}

async function moveFileAcrossDrives(src, dst) {
  await fs.promises.mkdir(path.dirname(dst), { recursive: true });
  try {
    await fs.promises.rename(src, dst);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      await fs.promises.copyFile(src, dst);
      await fs.promises.unlink(src).catch(() => {});
    } else {
      throw err;
    }
  }
}

ipcMain.handle(
  'ffmpeg:run-export',
  async (event, { jobId, sessionId, args, totalDurationSec, outputFileName, directOutputPath, saveToDownloadsName }) => {
    const dir = exportSessions.get(sessionId);
    if (!dir) throw new Error('Invalid export session');

    const safeOut = path.basename(outputFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const resolvedArgs = args.map((arg) => {
      // LUT files inside filtergraphs are resolved relative to the session dir (FFmpeg cwd)
      if (typeof arg === 'string' && arg.includes('__TEMP_FILTER__:')) {
        arg = arg.replace(/__TEMP_FILTER__:/g, '');
      }
      if (typeof arg === 'string' && arg.startsWith('__TEMP__:')) {
        const rel = path.basename(arg.slice(9)).replace(/[^a-zA-Z0-9._-]/g, '_');
        return path.join(dir, rel);
      }
      if (typeof arg === 'string' && arg.startsWith('__FILE__:')) {
        const realPath = arg.slice(9);
        if (!fs.existsSync(realPath)) {
          throw new Error(`Source file not found: ${realPath}`);
        }
        return realPath;
      }
      if (typeof arg === 'string' && arg.includes('__TEMP_FILTER__:')) {
        return resolveTempFilterTokens(arg, dir);
      }
      return arg;
    });
    const finalTarget =
      directOutputPath && typeof directOutputPath === 'string'
        ? directOutputPath
        : saveToDownloadsName && typeof saveToDownloadsName === 'string'
        ? resolveUniqueDownloadsPath(saveToDownloadsName)
        : null;

    // Write directly to the final destination path to avoid duplicating multi-GB files across drives
    const outPath = finalTarget || path.join(dir, safeOut);
    if (finalTarget) {
      await fs.promises.mkdir(path.dirname(finalTarget), { recursive: true });
    }
    resolvedArgs.push(outPath);

    try {
      await ffmpegHelper.runFFmpegWithProgress(jobId, resolvedArgs, totalDurationSec, (prog) => {
        try {
          event.sender.send('ffmpeg:progress', { jobId, ...prog });
        } catch {}
      }, dir);
    } catch (err) {
      if (finalTarget) {
        await fs.promises.unlink(finalTarget).catch(() => {});
      }
      throw err;
    }

    if (finalTarget) {
      const stat = await fs.promises.stat(finalTarget);
      return { directPath: finalTarget, sizeBytes: stat.size };
    }

    const outBuffer = await fs.promises.readFile(outPath);
    return new Uint8Array(outBuffer.buffer, outBuffer.byteOffset, outBuffer.byteLength);
  }
);

ipcMain.handle('ffmpeg:transcode-path-to-fast-mp4', async (_event, { filePath }) => {
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) return null;
  const info = await ffmpegHelper.detectFFmpeg();
  if (!info.available) return null;

  const dir = ffmpegHelper.createTempDir();
  try {
    const outPath = path.join(dir, 'fast.mp4');
    const probe = await ffmpegHelper.probeMediaFile(filePath);
    const isAlreadyH264 = probe && probe.videoCodec === 'h264';
    const args = isAlreadyH264
      ? ['-i', filePath, '-c:v', 'copy', '-an', '-movflags', '+faststart', outPath]
      : [
          '-i', filePath,
          '-an',
          ...ffmpegHelper.getEncoderArgs(info.encoder, 16),
          '-g', '30',
          '-movflags', '+faststart',
          outPath,
        ];

    await ffmpegHelper.runFFmpegWithProgress(`transcode_${Date.now()}`, args, probe?.duration || 0, null);
    const outBuf = await fs.promises.readFile(outPath);
    return new Uint8Array(outBuf.buffer, outBuf.byteOffset, outBuf.byteLength);
  } catch {
    return null;
  } finally {
    ffmpegHelper.removeTempDir(dir);
  }
});

ipcMain.handle('ffmpeg:transcode-to-fast-mp4', async (_event, { data, ext }) => {
  const info = await ffmpegHelper.detectFFmpeg();
  if (!info.available) return null;

  const dir = ffmpegHelper.createTempDir();
  try {
    const safeExt = (ext || 'mp4').replace(/[^a-zA-Z0-9]/g, '') || 'mp4';
    const inPath = path.join(dir, `input.${safeExt}`);
    const outPath = path.join(dir, 'fast.mp4');
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.promises.writeFile(inPath, buf);

    const probe = await ffmpegHelper.probeMediaFile(inPath);
    const isAlreadyH264 = probe && probe.videoCodec === 'h264';
    const args = isAlreadyH264
      ? ['-i', inPath, '-c:v', 'copy', '-an', '-movflags', '+faststart', outPath]
      : [
          '-i', inPath,
          '-an',
          ...ffmpegHelper.getEncoderArgs(info.encoder, 16),
          '-g', '30',
          '-movflags', '+faststart',
          outPath,
        ];

    await ffmpegHelper.runFFmpegWithProgress(`transcode_${Date.now()}`, args, probe?.duration || 0, null);
    const outBuf = await fs.promises.readFile(outPath);
    return new Uint8Array(outBuf.buffer, outBuf.byteOffset, outBuf.byteLength);
  } catch {
    return null;
  } finally {
    ffmpegHelper.removeTempDir(dir);
  }
});

ipcMain.handle('ffmpeg:cancel', (_event, { jobId }) => {
  return ffmpegHelper.cancelFFmpegJob(jobId);
});

ipcMain.on('app:set-unsaved-changes', (_event, hasUnsaved) => {
  rendererHasUnsavedChanges = Boolean(hasUnsaved);
});

ipcMain.handle('app:confirm-quit', () => {
  isForceQuitting = true;
  rendererHasUnsavedChanges = false;
  cleanupAllTempFiles();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.quit();
  return true;
});

ipcMain.handle('app:quit', () => {
  isForceQuitting = true;
  rendererHasUnsavedChanges = false;
  cleanupAllTempFiles();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  app.quit();
  return true;
});

ipcMain.handle('ffmpeg:cleanup-session', (_event, { sessionId }) => {
  const dir = exportSessions.get(sessionId);
  if (dir) {
    exportSessions.delete(sessionId);
    ffmpegHelper.removeTempDir(dir);
  }
  return true;
});
