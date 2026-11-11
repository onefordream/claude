// Shrinks an uploaded video's file size in the background after upload, using
// the system `ffmpeg` binary via a child process — no npm dependency needed.
// Render's native Node runtime ships ffmpeg; if it's ever missing (a
// different host, a stripped-down container), every function here just
// reports "not available" and the caller keeps serving the original file
// unchanged. Nothing about an upload ever depends on this succeeding.
import { spawn } from 'node:child_process';
import { statSync, existsSync, unlinkSync } from 'node:fs';

const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000; // generous — this only runs in the background

function runFfmpeg(args) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn('ffmpeg', args);
    } catch {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve(false);
    }, FFMPEG_TIMEOUT_MS);
    proc.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

let availableCache = null;

// Cached after the first call — a missing binary doesn't come back mid-process.
export async function isVideoCompressionAvailable() {
  if (availableCache === null) {
    availableCache = await runFfmpeg(['-version']);
    if (!availableCache) {
      console.log('[info] ffmpeg が見つからないため、アップロードされた動画は元のサイズのまま保存されます。');
    }
  }
  return availableCache;
}

// Re-encodes the video at `filePath` to a smaller H.264/AAC mp4 (capped at
// 720p). Returns { path, size } for the new file when it's meaningfully
// smaller, or null if compression isn't available, fails, or the original
// was already small/efficient enough that re-encoding wouldn't help. Never
// touches or deletes the original file — the caller decides when it's safe
// to do that (after its own DB row is updated to point at the new one).
export async function compressVideo(filePath) {
  if (!(await isVideoCompressionAvailable())) return null;
  if (!existsSync(filePath)) return null;

  const outPath = `${filePath}.compressed.mp4`;
  const ok = await runFfmpeg([
    '-y',
    '-i', filePath,
    '-vf', "scale='-2:min(720,ih)'",
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '26',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-movflags', '+faststart',
    outPath,
  ]);

  if (!ok || !existsSync(outPath)) {
    if (existsSync(outPath)) unlinkSync(outPath);
    return null;
  }

  const originalSize = statSync(filePath).size;
  const newSize = statSync(outPath).size;

  // Re-encoding didn't meaningfully shrink it (already-compressed footage,
  // a short clip, etc.) — keep the original rather than swap for no benefit.
  if (newSize >= originalSize * 0.9) {
    unlinkSync(outPath);
    return null;
  }

  return { path: outPath, size: newSize };
}
