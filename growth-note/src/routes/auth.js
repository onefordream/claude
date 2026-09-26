import {
  hashPassword, verifyPassword, burnPasswordCheck, newSessionToken, hashToken, RateLimiter, isValidEmail,
} from '../lib/auth.js';
import { HttpError, readJson, sendJson, appendCookie, str, num } from '../lib/http.js';
import { publicMe } from '../services.js';

export const SESSION_COOKIE = 'gn_session';

export function registerAuthRoutes(router, app) {
  const { repo, config } = app;
  const loginByIp = new RateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
  const loginByEmail = new RateLimiter({ max: 8, windowMs: 15 * 60 * 1000 });
  const signupByIp = new RateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });
  app.onClose(() => [loginByIp, loginByEmail, signupByIp].forEach((l) => l.close()));

  function startSession(ctx, userId) {
    const token = newSessionToken();
    const maxAge = config.sessionDays * 24 * 60 * 60;
    repo.sessions.create(userId, hashToken(token), new Date(Date.now() + maxAge * 1000).toISOString(), ctx.req.headers['user-agent']);
    appendCookie(ctx.res, SESSION_COOKIE, token, { maxAge, secure: config.cookieSecure });
  }

  router.post('/api/auth/signup', async (ctx) => {
    if (signupByIp.isLimited(ctx.ip)) throw new HttpError(429, 'rate_limited', 'しばらく時間をおいてからお試しください');
    const body = await readJson(ctx.req);
    const email = str(body.email, { max: 254, min: 1, field: 'メールアドレス' }).toLowerCase();
    if (!isValidEmail(email)) throw new HttpError(400, 'invalid_input', 'メールアドレスの形式が正しくありません');
    const password = str(body.password, { min: 8, max: 200, field: 'パスワード', trim: false });
    if (password.length < 8) throw new HttpError(400, 'invalid_input', 'パスワードは8文字以上にしてください');
    const displayName = str(body.displayName || email.split('@')[0], { min: 1, max: 30, field: 'ニックネーム' });
    signupByIp.hit(ctx.ip);
    if (repo.users.findByEmail(email)) throw new HttpError(409, 'email_taken', 'このメールアドレスはすでに登録されています');
    const user = repo.users.create({ email, passwordHash: await hashPassword(password), displayName });
    startSession(ctx, user.id);
    sendJson(ctx.res, 201, app.me(user));
  }, { auth: false });

  router.post('/api/auth/login', async (ctx) => {
    const body = await readJson(ctx.req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (loginByIp.isLimited(ctx.ip) || loginByEmail.isLimited(email)) {
      throw new HttpError(429, 'rate_limited', 'ログインの試行回数が多すぎます。15分ほど待ってからお試しください');
    }
    const user = email ? repo.users.findByEmail(email) : null;
    const ok = user ? await verifyPassword(password, user.password_hash) : (await burnPasswordCheck(password), false);
    if (!ok) {
      loginByIp.hit(ctx.ip);
      loginByEmail.hit(email);
      throw new HttpError(401, 'invalid_credentials', 'メールアドレスまたはパスワードが違います');
    }
    loginByEmail.reset(email);
    startSession(ctx, user.id);
    sendJson(ctx.res, 200, app.me(user));
  }, { auth: false });

  router.post('/api/auth/logout', async (ctx) => {
    if (ctx.sessionToken) repo.sessions.removeByHash(hashToken(ctx.sessionToken));
    appendCookie(ctx.res, SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure });
    sendJson(ctx.res, 200, { ok: true });
  }, { auth: false });

  router.get('/api/me', async (ctx) => {
    sendJson(ctx.res, 200, app.me(ctx.user));
  });

  router.patch('/api/me', async (ctx) => {
    const body = await readJson(ctx.req);
    const patch = {};
    if (body.displayName !== undefined) patch.displayName = str(body.displayName, { min: 1, max: 30, field: 'ニックネーム' });
    if (body.weeklyTarget !== undefined) patch.weeklyTarget = num(body.weeklyTarget, { min: 1, max: 7, integer: true, field: '週の目標日数' });
    const user = repo.users.update(ctx.user.id, patch);
    sendJson(ctx.res, 200, app.me(user));
  });

  // 退会: 本人確認のためパスワードを再入力してもらう
  router.post('/api/me/delete', async (ctx) => {
    const body = await readJson(ctx.req);
    if (!(await verifyPassword(String(body.password || ''), ctx.user.password_hash))) {
      throw new HttpError(401, 'invalid_credentials', 'パスワードが違います');
    }
    await app.storage.removeUserDir(ctx.user.id);
    repo.users.remove(ctx.user.id);
    appendCookie(ctx.res, SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure });
    sendJson(ctx.res, 200, { ok: true });
  });
}

export { publicMe };
