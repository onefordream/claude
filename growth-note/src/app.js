import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from './db.js';
import { createRepos } from './repo/index.js';
import { createLocalStorage } from './lib/storage.js';
import { createAi } from './lib/ai.js';
import { createWorker } from './worker.js';
import { HttpError, Router, sendJson, parseCookies, appendCookie } from './lib/http.js';
import { hashToken } from './lib/auth.js';
import { publicMe } from './services.js';
import { registerAuthRoutes, SESSION_COOKIE } from './routes/auth.js';
import { registerEntryRoutes } from './routes/entries.js';
import { registerGoalRoutes } from './routes/goals.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerHomeRoutes } from './routes/home.js';

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
};
const PAGE_CSP = "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

export function createApp(config, { log = console } = {}) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = openDb(path.join(config.dataDir, 'growth-note.db'));
  const repo = createRepos(db);
  const storage = createLocalStorage(config.dataDir);
  const ai = createAi(config.ai);
  const worker = createWorker({ repo, ai, storage, intervalMs: config.workerIntervalMs, log });
  const closers = [];

  const app = {
    config, db, repo, storage, ai, worker,
    onClose: (fn) => closers.push(fn),
    me: (user) => ({ ...publicMe(repo, user), ai: { enabled: ai.enabled } }),
  };

  const router = new Router();
  registerAuthRoutes(router, app);
  registerHomeRoutes(router, app);
  registerEntryRoutes(router, app);
  registerGoalRoutes(router, app);
  registerMediaRoutes(router, app);
  router.get('/api/health', async (ctx) => sendJson(ctx.res, 200, { ok: true }), { auth: false });

  function clientIp(req) {
    if (config.trustProxy) {
      const fwd = req.headers['x-forwarded-for'];
      if (fwd) return String(fwd).split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /** CSRF 対策: 書き込み系は同一オリジンからのリクエストのみ受け付ける */
  function assertSameOrigin(req) {
    const origin = req.headers.origin;
    if (origin) {
      let host;
      try {
        host = new URL(origin).host;
      } catch {
        throw new HttpError(403, 'forbidden', '不正なリクエストです');
      }
      const expected = (config.trustProxy && req.headers['x-forwarded-host']) || req.headers.host;
      if (host !== expected) throw new HttpError(403, 'forbidden', '不正なリクエストです');
    } else if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) {
      throw new HttpError(403, 'forbidden', '不正なリクエストです');
    }
  }

  function authenticate(ctx) {
    const token = parseCookies(ctx.req.headers.cookie)[SESSION_COOKIE];
    ctx.sessionToken = token || null;
    if (!token) return null;
    const session = repo.sessions.findValid(hashToken(token));
    if (!session) return null;
    const user = repo.users.get(session.user_id);
    if (!user) return null;
    // 最終アクセスから1日以上経っていたら有効期限を延長（スライディング）
    if (Date.now() - new Date(session.last_seen_at).getTime() > 24 * 60 * 60 * 1000) {
      const maxAge = config.sessionDays * 24 * 60 * 60;
      repo.sessions.touch(session.id, new Date(Date.now() + maxAge * 1000).toISOString());
      appendCookie(ctx.res, SESSION_COOKIE, token, { maxAge, secure: config.cookieSecure });
    }
    return user;
  }

  async function handleApi(req, res, url) {
    const ctx = { req, res, query: url.searchParams, ip: clientIp(req), params: {} };
    try {
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      const { route, params, pathMatched } = router.match(method, url.pathname);
      if (!route) {
        throw pathMatched
          ? new HttpError(405, 'method_not_allowed', 'この操作はできません')
          : new HttpError(404, 'not_found', '見つかりません');
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      ctx.params = params;
      ctx.user = authenticate(ctx);
      if (route.auth && !ctx.user) throw new HttpError(401, 'unauthorized', 'ログインしてください');
      await route.handler(ctx);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) log.error?.(`[api] ${req.method} ${url.pathname}`, err);
      if (res.headersSent) {
        res.destroy();
        return;
      }
      // ボディを読まずにエラーを返した場合（アップロードの上限超過など）は接続を閉じる
      if (!req.complete) res.setHeader('Connection', 'close');
      sendJson(res, status, {
        error: {
          code: err instanceof HttpError ? err.code : 'internal_error',
          message: err instanceof HttpError ? err.message : 'サーバーでエラーが発生しました。時間をおいてお試しください',
          ...(err instanceof HttpError ? err.extra : {}),
        },
      });
    }
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    const webDir = config.webDir;
    let file = path.resolve(webDir, '.' + rel);
    if (file !== webDir && !file.startsWith(webDir + path.sep)) {
      res.writeHead(404);
      return res.end();
    }
    let stat = null;
    try {
      stat = fs.statSync(file);
      if (stat.isDirectory()) {
        file = path.join(file, 'index.html');
        stat = fs.statSync(file);
      }
    } catch {
      stat = null;
    }
    // 拡張子のないパスは SPA のページとして index.html を返す
    if (!stat) {
      if (path.extname(rel)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Not Found');
      }
      file = path.join(webDir, 'index.html');
      stat = fs.statSync(file);
    }
    const ext = path.extname(file);
    const headers = {
      'Content-Type': STATIC_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'Last-Modified': stat.mtime.toUTCString(),
    };
    if (ext === '.html') headers['Content-Security-Policy'] = PAGE_CSP;
    if (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']) >= new Date(stat.mtime.toUTCString())) {
      res.writeHead(304, headers);
      return res.end();
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer((req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) handleApi(req, res, url);
    else serveStatic(req, res, url);
  });
  // 大きな動画でも遅い回線で途切れないよう、リクエスト全体のタイムアウトは長めにする
  server.requestTimeout = 30 * 60 * 1000;
  server.headersTimeout = 60 * 1000;
  server.keepAliveTimeout = 5000;

  app.server = server;
  app.start = () => {
    worker.start();
    return new Promise((resolve) => server.listen(config.port, config.host, () => resolve(server.address())));
  };
  app.close = async () => {
    worker.stop();
    closers.forEach((fn) => fn());
    await new Promise((resolve) => server.close(resolve));
    server.closeAllConnections?.();
    db.close();
  };
  return app;
}
