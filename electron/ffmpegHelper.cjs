const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let cachedFFmpegInfo = null;
const activeProcesses = new Map();

function resolveBinaryPath(binaryName) {
  const exeName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'bin', exeName));
  }
  candidates.push(path.join(__dirname, '..', 'build-resources', 'bin', exeName));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }

  return binaryName;
}

function getFFmpegBin() {
  return resolveBinaryPath('ffmpeg');
}

function getFFprobeBin() {
  return resolveBinaryPath('ffprobe');
}

function getOutputPixFmt(encoder) {
  if (encoder === 'h264_qsv' || encoder === 'h264_mf' || encoder === 'hevc_qsv' || encoder === 'hevc_mf') {
    return 'nv12';
  }
  return 'yuv420p';
}

function getEncoderArgs(encoder, bitrateMbps) {
  const br = `${Math.max(1, Math.round(bitrateMbps * 1000))}k`;
  const maxrate = `${Math.max(2, Math.round(bitrateMbps * 1500))}k`;
  const bufsize = `${Math.max(4, Math.round(bitrateMbps * 2000))}k`;

  switch (encoder) {
    case 'h264_nvenc':
      return [
        '-c:v', 'h264_nvenc',
        '-preset', 'p1',
        '-tune', 'll',
        '-zerolatency', '1',
        '-rc-lookahead', '0',
        '-no-scenecut', '1',
        '-spatial-aq', '0',
        '-rc', 'vbr',
        '-b:v', br,
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-pix_fmt', 'yuv420p',
      ];
    case 'h264_amf':
      return [
        '-c:v', 'h264_amf',
        '-quality', 'speed',
        '-rc', 'vbr_latency',
        '-b:v', br,
        '-maxrate', maxrate,
        '-pix_fmt', 'yuv420p',
      ];
    case 'h264_qsv':
      return [
        '-c:v', 'h264_qsv',
        '-low_power', '1',
        '-preset', 'veryfast',
        '-bf', '0',
        '-look_ahead', '0',
        '-async_depth', '4',
        '-b:v', br,
        '-maxrate', maxrate,
        '-pix_fmt', 'nv12',
      ];
    case 'h264_mf':
      return [
        '-c:v', 'h264_mf',
        '-rate_control', 'u_vbr',
        '-b:v', br,
        '-pix_fmt', 'nv12',
      ];
    default:
      return [
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'fastdecode',
        '-b:v', br,
        '-maxrate', maxrate,
        '-bufsize', bufsize,
        '-pix_fmt', 'yuv420p',
        '-threads', '0',
      ];
  }
}

function testCommand(cmd, args, timeoutMs = 4000) {
  return new Promise((resolve) => {
    try {
      const child = execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err) => {
        resolve(!err);
      });
      child.on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

async function detectFFmpeg() {
  if (cachedFFmpegInfo) return cachedFFmpegInfo;

  const ffmpegBin = getFFmpegBin();
  const ffprobeBin = getFFprobeBin();

  const hasFFmpeg = await testCommand(ffmpegBin, ['-version'], 3000);
  if (!hasFFmpeg) {
    cachedFFmpegInfo = { available: false, encoder: null, hasFFprobe: false };
    return cachedFFmpegInfo;
  }

  const hasFFprobe = await testCommand(ffprobeBin, ['-version'], 3000);

  // Test hardware encoders in order of speed/quality on Windows/macOS/Linux
  const candidates = ['h264_nvenc', 'h264_amf', 'h264_qsv', 'h264_mf', 'libx264'];
  let chosen = 'libx264';

  for (const enc of candidates) {
    if (enc === 'libx264') {
      chosen = 'libx264';
      break;
    }
    const ok = await testCommand(
      ffmpegBin,
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=256x256:d=0.04:r=25',
        '-frames:v', '1',
        '-c:v', enc,
        '-f', 'null',
        '-',
      ],
      3500
    );
    if (ok) {
      chosen = enc;
      break;
    }
  }

  cachedFFmpegInfo = {
    available: true,
    encoder: chosen,
    hasFFprobe,
  };
  return cachedFFmpegInfo;
}

function probeMediaFile(filePath) {
  return new Promise((resolve) => {
    execFile(
      getFFprobeBin(),
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        filePath,
      ],
      { timeout: 5000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        try {
          const data = JSON.parse(stdout);
          const streams = Array.isArray(data.streams) ? data.streams : [];
          const videoStream = streams.find((s) => s.codec_type === 'video');
          const audioStream = streams.find((s) => s.codec_type === 'audio');
          let fps = 30;
          if (videoStream && videoStream.avg_frame_rate) {
            const parts = String(videoStream.avg_frame_rate).split('/');
            const num = Number(parts[0]) || 0;
            const den = Number(parts[1]) || 1;
            if (num > 0 && den > 0) fps = num / den;
          }
          resolve({
            hasVideo: Boolean(videoStream),
            hasAudio: Boolean(audioStream),
            videoCodec: videoStream?.codec_name || '',
            audioCodec: audioStream?.codec_name || '',
            width: Number(videoStream?.width) || 0,
            height: Number(videoStream?.height) || 0,
            fps,
            duration: Number(data.format?.duration) || 0,
          });
        } catch {
          resolve(null);
        }
      }
    );
  });
}

function runFFmpegWithProgress(jobId, args, totalDurationSec, onProgress, cwd) {
  return new Promise((resolve, reject) => {
    const fullArgs = [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      ...args,
      '-progress', 'pipe:1',
      '-nostats',
    ];

    const proc = spawn(getFFmpegBin(), fullArgs, { windowsHide: true, ...(cwd ? { cwd } : {}) });
    activeProcesses.set(jobId, proc);

    let stderrBuf = '';
    let stdoutBuf = '';
    let cancelled = false;

    proc.on('error', (err) => {
      activeProcesses.delete(jobId);
      reject(err);
    });

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      if (stderrBuf.length > 4000) {
        stderrBuf = stderrBuf.slice(-4000);
      }
    });

    let lastSpeed = '';
    let lastFrame = 0;

    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('frame=')) {
          const f = Number(line.slice(6).trim()) || 0;
          if (f > 0) lastFrame = f;
        } else if (line.startsWith('speed=')) {
          lastSpeed = line.slice(6).trim();
        } else if (line.startsWith('out_time_us=')) {
          const us = Number(line.slice(12)) || 0;
          if (totalDurationSec > 0 && onProgress && us > 0) {
            const sec = us / 1_000_000;
            const pct = Math.max(0, Math.min(99, Math.round((sec / totalDurationSec) * 98)));
            onProgress({ percentage: pct, outTimeSec: sec, frame: lastFrame, speed: lastSpeed });
          }
        }
      }
    });

    proc.on('close', (code) => {
      const wasTracked = activeProcesses.has(jobId);
      activeProcesses.delete(jobId);
      if (!wasTracked) cancelled = true;
      if (cancelled) {
        reject(new Error('Export cancelled by user'));
        return;
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderrBuf.trim()}`));
      }
    });
  });
}

function cancelFFmpegJob(jobId) {
  const proc = activeProcesses.get(jobId);
  if (proc) {
    activeProcesses.delete(jobId);
    try {
      proc.kill('SIGKILL');
    } catch {}
    return true;
  }
  return false;
}

function cancelAllFFmpegJobs() {
  for (const [jobId, proc] of activeProcesses.entries()) {
    activeProcesses.delete(jobId);
    try {
      proc.kill('SIGKILL');
    } catch {}
  }
}

function getFreeDiskBytes(targetPath) {
  try {
    let probePath = targetPath;
    while (probePath && !fs.existsSync(probePath)) {
      const parent = path.dirname(probePath);
      if (parent === probePath) break;
      probePath = parent;
    }
    if (!probePath || !fs.existsSync(probePath)) return 0;
    const stats = fs.statfsSync(probePath);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch {
    return 0;
  }
}

function getBestTempRoot() {
  const candidates = [];
  const appRoot = path.dirname(__dirname);
  if (!appRoot.includes('.asar')) {
    candidates.push(path.join(appRoot, '.dulos-temp'));
  }
  candidates.push(os.tmpdir());

  if (process.platform === 'win32') {
    for (const letter of ['D', 'E', 'F', 'G']) {
      const root = `${letter}:\\`;
      try {
        if (fs.existsSync(root)) {
          candidates.push(path.join(root, '.dulos-temp'));
        }
      } catch {}
    }
  }

  let bestDir = os.tmpdir();
  let bestFree = -1;
  const seenRoots = new Set();

  for (const dir of candidates) {
    const driveKey = path.parse(path.resolve(dir)).root.toUpperCase();
    if (seenRoots.has(driveKey)) continue;
    seenRoots.add(driveKey);
    const free = getFreeDiskBytes(dir);
    if (free > bestFree) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        bestFree = free;
        bestDir = dir;
      } catch {}
    }
  }

  return bestDir;
}

function getBestExportOutputDir(defaultDownloadsDir) {
  const MIN_PREFERRED_FREE = 10 * 1024 * 1024 * 1024; // 10 GB
  const downloadsFree = getFreeDiskBytes(defaultDownloadsDir);
  if (downloadsFree >= MIN_PREFERRED_FREE) {
    return defaultDownloadsDir;
  }

  const bestTempRoot = getBestTempRoot();
  const bestDriveRoot = path.parse(path.resolve(bestTempRoot)).root;
  const bestFree = getFreeDiskBytes(bestDriveRoot);

  if (bestFree > downloadsFree + 1024 * 1024 * 1024) {
    const fallbackDir = path.join(bestDriveRoot, 'Dulos Exportados');
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
      return fallbackDir;
    } catch {}
  }

  return defaultDownloadsDir;
}

const sessionTempDirs = new Set();

function createTempDir() {
  const id = crypto.randomBytes(6).toString('hex');
  const baseDir = getBestTempRoot();
  const dir = path.join(baseDir, `dulos-export-${id}`);
  fs.mkdirSync(dir, { recursive: true });
  sessionTempDirs.add(dir);
  return dir;
}

function removeTempDir(dir) {
  if (!dir || !dir.includes('dulos-export-')) return;
  sessionTempDirs.delete(dir);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

function cleanupAllSessionTempDirs() {
  for (const dir of Array.from(sessionTempDirs)) {
    removeTempDir(dir);
  }
  sessionTempDirs.clear();
}

module.exports = {
  detectFFmpeg,
  getEncoderArgs,
  getOutputPixFmt,
  probeMediaFile,
  runFFmpegWithProgress,
  cancelFFmpegJob,
  cancelAllFFmpegJobs,
  getFreeDiskBytes,
  getBestExportOutputDir,
  createTempDir,
  removeTempDir,
  cleanupAllSessionTempDirs,
};
