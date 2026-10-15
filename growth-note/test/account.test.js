import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app;
let base;
let dataDir;
let stripeServer;
const stripeCalls = [];
let stripeFail = false;

before(async () => {
  stripeServer = http.createServer((req, res) => {
    stripeCalls.push({ method: req.method, url: req.url });
    res.setHeader('content-type', 'application/json');
    if (stripeFail) {
      res.statusCode = 500;
      return res.end('{"error":{"message":"down"}}');
    }
    res.end('{"id":"sub_1","status":"canceled"}');
  });
  await new Promise((r) => stripeServer.listen(0, '127.0.0.1', r));
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-acct-test-'));
  const config = loadConfig({
    port: 0, host: '127.0.0.1', dataDir, workerIntervalMs: 50, billingDemo: false,
    adminEmails: ['owner@example.com'],
    stripe: { secretKey: 'sk_test', webhookSecret: 'whsec', priceMonthly: 'p_m', priceYearly: 'p_y', apiBase: `http://127.0.0.1:${stripeServer.address().port}` },
  });
  config.ai = { ...config.ai, apiKey: '' };
  app = createApp(config, { log: { error() {}, info() {} } });
  base = `http://127.0.0.1:${(await app.start()).port}`;
});

after(async () => {
  await app.close();
  stripeServer.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  };
}

async function signup(email, extra = {}) {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { email, password: 'password123', displayName: email.split('@')[0], agree: true, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return c;
}

test('登録には規約への同意が必要', async () => {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { email: 'noagree@example.com', password: 'password123' });
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, 'terms_required');
  const ok = await signup('agree@example.com');
  assert.equal((await ok('GET', '/api/me')).data.termsOutdated, false);
});

test('パスワード再設定: メールのリンクで再設定 → 古いパスワードと他の端末は無効、リンクは1回だけ', async () => {
  const a = await signup('forgot@example.com');
  const other = client();
  await other('POST', '/api/auth/login', { email: 'forgot@example.com', password: 'password123' });

  const anon = client();
  const unknown = await anon('POST', '/api/auth/password/forgot', { email: 'nobody@example.com' });
  const known = await anon('POST', '/api/auth/password/forgot', { email: 'forgot@example.com' });
  assert.equal(unknown.status, 200);
  assert.deepEqual(unknown.data, known.data); // 登録の有無がわからない
  const mail = app.mailer.outbox.at(-1);
  assert.equal(mail.to, 'forgot@example.com');
  const token = /token=([\w-]+)/.exec(mail.text)[1];

  assert.equal((await anon('POST', '/api/auth/password/reset', { token, password: 'short' })).status, 400);
  const reset = await anon('POST', '/api/auth/password/reset', { token, password: 'newpassword456' });
  assert.equal(reset.status, 200);
  assert.equal((await anon('POST', '/api/auth/password/reset', { token, password: 'again12345' })).status, 400);

  assert.equal((await client()('POST', '/api/auth/login', { email: 'forgot@example.com', password: 'password123' })).status, 401);
  assert.equal((await client()('POST', '/api/auth/login', { email: 'forgot@example.com', password: 'newpassword456' })).status, 200);
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await other('GET', '/api/me')).status, 401);
  assert.equal((await anon('GET', '/api/me')).status, 200); // 再設定した端末はログイン済み
});

test('パスワード変更: 現在のパスワードが必要、ほかの端末はログアウト', async () => {
  const a = await signup('change@example.com');
  const b = client();
  await b('POST', '/api/auth/login', { email: 'change@example.com', password: 'password123' });
  assert.equal((await a('POST', '/api/me/password', { current: 'wrong-pass', password: 'newpassword1' })).status, 401);
  assert.equal((await a('POST', '/api/me/password', { current: 'password123', password: 'newpassword1' })).status, 200);
  assert.equal((await a('GET', '/api/me')).status, 200);
  assert.equal((await b('GET', '/api/me')).status, 401);
});

test('データの書き出しと、管理者だけが見られる数字', async () => {
  const c = await signup('export@example.com');
  await c('POST', '/api/entries', { body: '書き出しのテスト' });
  const r = (await c('POST', '/api/golf/rounds', { courseName: 'テストGC', mode: 'total' })).data.round;
  await c('PATCH', `/api/golf/rounds/${r.id}`, { totals: { score: 99 } });
  await c('POST', `/api/golf/rounds/${r.id}/finish`, {});
  const ex = await c('GET', '/api/me/export');
  assert.equal(ex.status, 200);
  assert.match(ex.headers.get('content-disposition'), /attachment; filename="growth-note-/);
  assert.equal(ex.data.user.email, 'export@example.com');
  assert.ok(ex.data.entries.some((e) => e.body === '書き出しのテスト'));
  assert.equal(ex.data.golfRounds[0].stats.score, 99);

  assert.equal((await c('GET', '/api/admin/stats')).status, 404);
  const owner = await signup('owner@example.com');
  assert.equal((await owner('GET', '/api/me')).data.isAdmin, true);
  const stats = (await owner('GET', '/api/admin/stats')).data;
  assert.ok(stats.users.total >= 2);
  assert.equal(stats.users.signupsByDay.length, 14);
  assert.equal(stats.system.billingMode, 'stripe');
});

test('退会: 有料契約は先に解約、店舗はスタッフに引き継ぐ（いなければ削除）', async () => {
  const owner = await signup('leaver@example.com');
  const staff = await signup('stays@example.com');
  const withStaff = (await owner('POST', '/api/stores', { name: '引き継ぐ店', category: 'スポーツ', description: '' })).data.store;
  const alone = (await owner('POST', '/api/stores', { name: '消える店', category: 'スポーツ', description: '' })).data.store;
  const full = (await owner('GET', `/api/stores/${withStaff.id}`)).data.store;
  await staff('POST', '/api/stores/join-staff', { code: full.staffCode });

  // Stripe の契約がある状態にする
  const me = (await owner('GET', '/api/me')).data;
  app.repo.billing.applySubscription(me.user.id, {
    plan: 'pro', status: 'active', provider: 'stripe', subscriptionId: 'sub_1', customerId: 'cus_1',
    currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
  });

  // Stripe が落ちているときは退会させない（請求が残るのを防ぐ）
  stripeFail = true;
  assert.equal((await owner('POST', '/api/me/delete', { password: 'password123' })).status, 502);
  stripeFail = false;
  const del = await owner('POST', '/api/me/delete', { password: 'password123' });
  assert.equal(del.status, 200);
  assert.ok(stripeCalls.some((x) => x.method === 'DELETE' && x.url === '/v1/subscriptions/sub_1'));

  const mine = (await staff('GET', '/api/stores')).data.stores;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].name, '引き継ぐ店');
  assert.equal(mine[0].role, 'owner');
  assert.equal(app.repo.stores.get(alone.id), undefined);
});

test('終了済みのラウンドを直すと、成長ノートの要約も更新される', async () => {
  const c = await signup('fix@example.com');
  const r = (await c('POST', '/api/golf/rounds', { courseName: '修正GC', holesCount: 9 })).data.round;
  for (let i = 1; i <= 9; i++) await c('PUT', `/api/golf/rounds/${r.id}/holes/${i}`, { score: r.pars[i - 1], putts: 2 });
  const fin = (await c('POST', `/api/golf/rounds/${r.id}/finish`, { note: 'メモ' })).data;
  assert.match((await c('GET', `/api/entries/${fin.entryId}`)).data.entry.body, /36（±0）/);
  await c('PUT', `/api/golf/rounds/${r.id}/holes/1`, { score: r.pars[0] + 2, putts: 2 });
  const body = (await c('GET', `/api/entries/${fin.entryId}`)).data.entry.body;
  assert.match(body, /38（\+2）/);
  assert.match(body, /メモ$/);
});

test('毎日のバックアップ', async () => {
  await app.worker.dailyBackup();
  const files = fs.readdirSync(path.join(dataDir, 'backups'));
  assert.equal(files.length, 1);
  assert.match(files[0], /^growth-note-\d{4}-\d{2}-\d{2}\.db$/);
});
