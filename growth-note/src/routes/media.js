import { randomUUID } from 'node:crypto';
import { HttpError, sendJson } from '../lib/http.js';
import { MIME_TYPES } from '../lib/storage.js';
import { entitlementsOf, MB } from '../services.js';

const LIMIT_KEY = { image: 'maxImageMB', video: 'maxVideoMB', audio: 'maxAudioMB' };
const KIND_LABEL = { image: '写真', video: '動画', audio: '音声' };

export function registerMediaRoutes(router, app) {
  const { repo, storage } = app;

  /**
   * アップロード: 1ファイルを生のボディで受け取る（multipart は使わない）。
   * 1) Content-Type と Content-Length だけを見て、ボディを読む前に上限チェック
   * 2) 問題なければストリームのままディスクへ書き込む（メモリに溜めない）
   */
  router.post('/api/media', async (ctx) => {
    const mime = (ctx.req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const type = MIME_TYPES[mime];
    if (!type) throw new HttpError(415, 'unsupported_media_type', 'この形式のファイルはアップロードできません');
    const lenHeader = ctx.req.headers['content-length'];
    if (lenHeader === undefined) throw new HttpError(411, 'length_required', 'ファイルサイズが不明です');
    const size = Number(lenHeader);
    if (!Number.isSafeInteger(size) || size <= 0) throw new HttpError(400, 'invalid_size', 'ファイルが空です');

    const ent = entitlementsOf(repo, ctx.user.id);
    if (type.kind === 'video' && !ent.can('videoUpload')) {
      throw new HttpError(402, 'plan_required', '動画のアップロードは有料プランで利用できます');
    }
    const limitMB = ent.limit(LIMIT_KEY[type.kind]);
    if (size > limitMB * MB) {
      throw new HttpError(413, 'file_too_large', `${KIND_LABEL[type.kind]}は${limitMB}MBまでアップロードできます`, { limitMB });
    }
    const used = repo.billing.usage(ctx.user.id, 'all', 'storage_bytes');
    if (used + size > ent.limit('storageMB') * MB) {
      throw new HttpError(413, 'storage_quota', '保存容量の上限に達しています。不要な記録を削除するか、プランをご検討ください');
    }

    const id = randomUUID();
    const saved = await storage.saveStream(ctx.req, { userId: ctx.user.id, id, ext: type.ext, expectedBytes: size });
    const row = repo.tx(() => {
      repo.billing.addUsage(ctx.user.id, 'all', 'storage_bytes', saved.size);
      return repo.media.create(ctx.user.id, { id, kind: type.kind, mime, size: saved.size, path: saved.path });
    });
    sendJson(ctx.res, 201, { id: row.id, kind: row.kind, mime: row.mime, size: row.size, url: `/api/media/${row.id}` });
  });

  /** 配信: 本人のみ。動画・音声のシーク用に Range リクエストに対応 */
  router.get('/api/media/:id', async (ctx) => {
    const m = repo.media.get(ctx.user.id, ctx.params.id);
    if (!m) throw new HttpError(404, 'not_found', 'ファイルが見つかりません');
    let stat;
    try {
      stat = await storage.stat(m.path);
    } catch {
      throw new HttpError(404, 'not_found', 'ファイルが見つかりません');
    }
    const headers = {
      'Content-Type': m.mime,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline',
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(ctx.req.headers.range || '');
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
      start = Math.max(0, start);
      end = Math.min(end, stat.size - 1);
      if (start > end || start >= stat.size) {
        ctx.res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        return ctx.res.end();
      }
      ctx.res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
      if (ctx.req.method === 'HEAD') return ctx.res.end();
      return storage.createReadStream(m.path, { start, end }).pipe(ctx.res);
    }
    ctx.res.writeHead(200, { ...headers, 'Content-Length': stat.size });
    if (ctx.req.method === 'HEAD') return ctx.res.end();
    storage.createReadStream(m.path).pipe(ctx.res);
  });

  /** 下書き中（未添付）のファイルを取り消す */
  router.delete('/api/media/:id', async (ctx) => {
    const m = repo.media.get(ctx.user.id, ctx.params.id);
    if (!m) throw new HttpError(404, 'not_found', 'ファイルが見つかりません');
    if (m.entry_id) throw new HttpError(409, 'attached', '記録に添付済みのファイルは、記録ごと削除してください');
    await storage.remove(m.path);
    repo.tx(() => {
      repo.media.remove(ctx.user.id, m.id);
      repo.billing.addUsage(ctx.user.id, 'all', 'storage_bytes', -m.size);
    });
    sendJson(ctx.res, 200, { ok: true });
  });
}
