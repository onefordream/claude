import {
  hashPassword, verifyPassword, burnPasswordCheck, newSessionToken, hashToken, RateLimiter, isValidEmail,
} from '../lib/auth.js';
import { HttpError, readJson, sendJson, appendCookie, str, num } from '../lib/http.js';
import { publicMe } from '../services.js';
import { TERMS_VERSION } from '../lib/legal.js';

export const SESSION_COOKIE = 'gn_session';

export function registerAuthRoutes(router, app) {
  const { repo, config } = app;
  const loginByIp = new RateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
  const loginByEmail = new RateLimiter({ max: 8, windowMs: 15 * 60 * 1000 });
  const signupByIp = new RateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });
  const resetByIp = new RateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });
  const resetByEmail = new RateLimiter({ max: 3, windowMs: 60 * 60 * 1000 });
  app.onClose(() => [loginByIp, loginByEmail, signupByIp, resetByIp, resetByEmail].forEach((l) => l.close()));

  function validPassword(v) {
    const password = str(v, { min: 8, max: 200, field: 'パスワード', trim: false });
    if (password.length < 8) throw new HttpError(400, 'invalid_input', 'パスワードは8文字以上にしてください');
    return password;
  }

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
    const password = validPassword(body.password);
    if (body.agree !== true) throw new HttpError(400, 'terms_required', '利用規約とプライバシーポリシーへの同意が必要です');
    const displayName = str(body.displayName || email.split('@')[0], { min: 1, max: 30, field: 'ニックネーム' });
    signupByIp.hit(ctx.ip);
    if (repo.users.findByEmail(email)) throw new HttpError(409, 'email_taken', 'このメールアドレスはすでに登録されています');
    const user = repo.users.create({ email, passwordHash: await hashPassword(password), displayName });
    repo.users.acceptTerms(user.id, TERMS_VERSION);
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
  // ---- パスワードを忘れたとき ----
  // 登録の有無がわからないよう、結果は常に同じ応答にする
  router.post('/api/auth/password/forgot', async (ctx) => {
    const body = await readJson(ctx.req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) throw new HttpError(400, 'invalid_input', 'メールアドレスの形式が正しくありません');
    const ok = { ok: true, message: '登録されているメールアドレスなら、再設定の案内を送りました' };
    if (resetByIp.isLimited(ctx.ip) || resetByEmail.isLimited(email)) return sendJson(ctx.res, 200, ok);
    resetByIp.hit(ctx.ip);
    resetByEmail.hit(email);
    const user = repo.users.findByEmail(email);
    if (user) {
      const token = newSessionToken();
      repo.passwordResets.create(user.id, hashToken(token), new Date(Date.now() + 60 * 60 * 1000).toISOString());
      const base = config.appUrl || `${config.trustProxy && ctx.req.headers['x-forwarded-proto'] ? ctx.req.headers['x-forwarded-proto'] : 'http'}://${ctx.req.headers.host}`;
      try {
        await app.mailer.send({
          to: user.email,
          subject: '【Growth Note】パスワードの再設定',
          text: `${user.display_name} さん\n\nパスワード再設定のご依頼を受け付けました。\n下のリンクを開いて、新しいパスワードを設定してください（1時間有効）。\n\n${base}/#/reset?token=${token}\n\nお心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。\n\nGrowth Note`,
        });
      } catch (err) {
        app.reportError?.(`パスワード再設定メールの送信に失敗: ${err.message}`);
      }
    }
    sendJson(ctx.res, 200, ok);
  }, { auth: false });

  router.post('/api/auth/password/reset', async (ctx) => {
    const body = await readJson(ctx.req);
    const reset = body.token ? repo.passwordResets.findValid(hashToken(String(body.token))) : null;
    if (!reset) throw new HttpError(400, 'invalid_token', 'リンクの有効期限が切れているか、すでに使われています。もう一度お手続きください');
    const password = validPassword(body.password);
    repo.tx(() => {
      repo.passwordResets.consume(reset.user_id);
      repo.sessions.removeAllForUser(reset.user_id);
    });
    repo.users.setPassword(reset.user_id, await hashPassword(password));
    startSession(ctx, reset.user_id);
    sendJson(ctx.res, 200, app.me(repo.users.get(reset.user_id)));
  }, { auth: false });

  /** ログイン中のパスワード変更（ほかの端末はログアウトさせる） */
  router.post('/api/me/password', async (ctx) => {
    const body = await readJson(ctx.req);
    if (!(await verifyPassword(String(body.current || ''), ctx.user.password_hash))) {
      throw new HttpError(401, 'invalid_credentials', '現在のパスワードが違います');
    }
    const password = validPassword(body.password);
    repo.users.setPassword(ctx.user.id, await hashPassword(password));
    const current = ctx.sessionToken ? repo.sessions.findByHash(hashToken(ctx.sessionToken)) : null;
    repo.sessions.removeAllForUser(ctx.user.id, current?.id ?? null);
    sendJson(ctx.res, 200, { ok: true });
  });

  /** 規約の改定後に同意し直す */
  router.post('/api/me/accept-terms', async (ctx) => {
    repo.users.acceptTerms(ctx.user.id, TERMS_VERSION);
    sendJson(ctx.res, 200, app.me(repo.users.get(ctx.user.id)));
  });

  router.post('/api/me/delete', async (ctx) => {
    const body = await readJson(ctx.req);
    if (!(await verifyPassword(String(body.password || ''), ctx.user.password_hash))) {
      throw new HttpError(401, 'invalid_credentials', 'パスワードが違います');
    }
    // 有料プランの請求を必ず止めてから削除する（止められなければ削除しない）
    try {
      await app.cancelSubscriptionForDeletion?.(ctx.user.id);
    } catch (err) {
      app.reportError?.(`退会時のサブスク解約に失敗 user=${ctx.user.id}: ${err.message}`);
      throw new HttpError(502, 'billing_error', 'お支払いの解約処理に失敗しました。時間をおいてもう一度お試しください');
    }
    repo.stores.handOverOrDelete(ctx.user.id);
    await app.storage.removeUserDir(ctx.user.id);
    repo.users.remove(ctx.user.id);
    appendCookie(ctx.res, SESSION_COOKIE, '', { maxAge: 0, secure: config.cookieSecure });
    sendJson(ctx.res, 200, { ok: true });
  });
}

export { publicMe };
