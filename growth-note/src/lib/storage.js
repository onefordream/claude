import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { HttpError } from './http.js';

export const MIME_TYPES = {
  'image/jpeg': { kind: 'image', ext: 'jpg' },
  'image/png': { kind: 'image', ext: 'png' },
  'image/webp': { kind: 'image', ext: 'webp' },
  'image/gif': { kind: 'image', ext: 'gif' },
  'image/heic': { kind: 'image', ext: 'heic' },
  'image/heif': { kind: 'image', ext: 'heif' },
  'video/mp4': { kind: 'video', ext: 'mp4' },
  'video/quicktime': { kind: 'video', ext: 'mov' },
  'video/webm': { kind: 'video', ext: 'webm' },
  'audio/webm': { kind: 'audio', ext: 'weba' },
  'audio/mp4': { kind: 'audio', ext: 'm4a' },
  'audio/x-m4a': { kind: 'audio', ext: 'm4a' },
  'audio/aac': { kind: 'audio', ext: 'aac' },
  'audio/mpeg': { kind: 'audio', ext: 'mp3' },
  'audio/ogg': { kind: 'audio', ext: 'ogg' },
  'audio/wav': { kind: 'audio', ext: 'wav' },
};

/**
 * ローカルディスク上のファイル保存。
 * 将来 S3 / R2 などに移すときは、同じインターフェースの実装に差し替える。
 */
export function createLocalStorage(dataDir) {
  const base = path.join(dataDir, 'uploads');
  const tmpDir = path.join(base, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  function abs(rel) {
    const p = path.resolve(base, rel);
    if (!p.startsWith(base + path.sep)) throw new Error('invalid storage path');
    return p;
  }

  return {
    abs,

    /**
     * リクエストボディをメモリに溜めずに、ストリームのままディスクへ書き込む。
     * 事前に宣言サイズ(Content-Length)で上限チェックを済ませておくこと。
     * ここでは実際に流れてきたバイト数も数え、宣言と違えば中断する。
     */
    async saveStream(input, { userId, id, ext, expectedBytes }) {
      const rel = path.join(userId, `${id}.${ext}`);
      const tmp = path.join(tmpDir, `${id}.part`);
      let received = 0;
      const counter = new Transform({
        transform(chunk, _enc, cb) {
          received += chunk.length;
          if (received > expectedBytes) cb(new HttpError(400, 'size_mismatch', 'ファイルサイズが一致しません'));
          else cb(null, chunk);
        },
      });
      try {
        await pipeline(input, counter, fs.createWriteStream(tmp, { flags: 'wx' }));
        if (received !== expectedBytes) throw new HttpError(400, 'incomplete_upload', 'アップロードが途中で終了しました');
        await fsp.mkdir(path.dirname(abs(rel)), { recursive: true });
        await fsp.rename(tmp, abs(rel));
        return { path: rel, size: received };
      } catch (err) {
        await fsp.rm(tmp, { force: true });
        throw err;
      }
    },

    async remove(rel) {
      await fsp.rm(abs(rel), { force: true });
    },

    async removeUserDir(userId) {
      await fsp.rm(path.join(base, userId), { recursive: true, force: true });
    },

    stat(rel) {
      return fsp.stat(abs(rel));
    },

    createReadStream(rel, opts) {
      return fs.createReadStream(abs(rel), opts);
    },
  };
}
