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

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-test-'));
  const config = loadConfig({ port: 0, host: '127.0.0.1', dataDir, workerIntervalMs: 50 });
  config.ai = { ...config.ai, apiKey: '' }; // テストでは簡易分析モード
  app = createApp(config, { log: { error() {} } });
  const addr = await app.start();
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

/** Cookie を保持する簡易クライアント */
function client() {
  let cookie = '';
  return async function call(method, url, body, headers = {}) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body !== undefined && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json() : await res.arrayBuffer() };
  };
}

async function signup(email) {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { email, password: 'password123', displayName: 'テスト' });
  assert.equal(r.status, 201);
  return c;
}

const waitFor = async (fn, ms = 3000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('timeout');
};

test('登録・ログイン・ログアウト', async () => {
  const c = await signup('a@example.com');
  assert.equal((await c('GET', '/api/me')).data.plan.id, 'free');
  const dup = await client()('POST', '/api/auth/signup', { email: 'A@example.com', password: 'password123' });
  assert.equal(dup.status, 409);
  await c('POST', '/api/auth/logout', {});
  assert.equal((await c('GET', '/api/me')).status, 401);
  const bad = await c('POST', '/api/auth/login', { email: 'a@example.com', password: 'wrong-pass' });
  assert.equal(bad.status, 401);
  const ok = await c('POST', '/api/auth/login', { email: 'a@example.com', password: 'password123' });
  assert.equal(ok.status, 200);
});

test('記録の作成 → AI(簡易)分析 → ホームに反映', async () => {
  const c = await signup('b@example.com');
  const r = await c('POST', '/api/entries', { body: 'スクワットを50回できた。フォームも安定してきた。', mood: 4 });
  assert.equal(r.status, 201);
  assert.equal(r.data.celebration.streak, 1);
  assert.equal(r.data.celebration.firstToday, true);
  assert.ok(r.data.celebration.newBadges.some((b) => b.id === 'entries1'));

  const id = r.data.entry.id;
  const entry = await waitFor(async () => {
    const e = (await c('GET', `/api/entries/${id}`)).data.entry;
    return e.insight.status === 'done' ? e : null;
  });
  assert.equal(entry.insight.provider, 'local');
  assert.ok(entry.insight.data.next_actions.length > 0);
  assert.ok(entry.insight.data.tags.includes('運動'));

  const home = (await c('GET', '/api/home')).data;
  assert.equal(home.recordedToday, true);
  assert.equal(home.streak.current, 1);
  assert.equal(home.totals.entries, 1);
});

test('日本語の検索（3文字以上は全文検索、2文字以下は部分一致）', async () => {
  const c = await signup('c@example.com');
  await c('POST', '/api/entries', { body: '英単語を30個覚えた' });
  await c('POST', '/api/entries', { body: 'ギターでコードを練習' });
  const r1 = await c('GET', '/api/entries?q=' + encodeURIComponent('英単語'));
  assert.equal(r1.data.items.length, 1);
  const r2 = await c('GET', '/api/entries?q=' + encodeURIComponent('練習'));
  assert.equal(r2.data.items.length, 1);
  const r3 = await c('GET', '/api/entries?q=' + encodeURIComponent('"* OR'));
  assert.equal(r3.status, 200);
});

test('ユーザー間のデータ分離', async () => {
  const alice = await signup('alice@example.com');
  const bob = await signup('bob@example.com');
  const e = (await alice('POST', '/api/entries', { body: 'アリスの秘密の記録' })).data.entry;
  const up = await alice('POST', '/api/media', new Uint8Array([1, 2, 3, 4]), { 'content-type': 'image/png' });
  assert.equal(up.status, 201);

  assert.equal((await bob('GET', `/api/entries/${e.id}`)).status, 404);
  assert.equal((await bob('DELETE', `/api/entries/${e.id}`)).status, 404);
  assert.equal((await bob('GET', `/api/media/${up.data.id}`)).status, 404);
  assert.equal((await bob('GET', '/api/entries?q=' + encodeURIComponent('アリス'))).data.items.length, 0);
  // 他人のメディアIDを添付しようとしても紐づかない
  const e2 = (await bob('POST', '/api/entries', { body: 'x', mediaIds: [up.data.id] })).data.entry;
  assert.equal(e2.media.length, 0);
});

test('メディア: アップロード・配信・Range・上限超過はボディを読まずに拒否', async () => {
  const c = await signup('d@example.com');
  const bytes = new Uint8Array(1000).map((_, i) => i % 256);
  const up = await c('POST', '/api/media', bytes, { 'content-type': 'image/jpeg' });
  assert.equal(up.status, 201);
  const e = (await c('POST', '/api/entries', { body: '', mediaIds: [up.data.id] })).data.entry;
  assert.equal(e.media.length, 1);

  const full = await c('GET', `/api/media/${up.data.id}`);
  assert.equal(full.status, 200);
  assert.equal(full.data.byteLength, 1000);
  const part = await c('GET', `/api/media/${up.data.id}`, undefined, { range: 'bytes=10-19' });
  assert.equal(part.status, 206);
  assert.deepEqual([...new Uint8Array(part.data)], [...bytes.slice(10, 20)]);

  assert.equal((await c('POST', '/api/media', bytes, { 'content-type': 'application/x-msdownload' })).status, 415);

  // 宣言サイズが上限(100MB)を超える動画: 1バイトも送らずに 413 が返ること
  // 生の http.request で送るため、ログインし直して Cookie を取り出す
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'd@example.com', password: 'password123' }),
  });
  const sid = login.headers.get('set-cookie').split(';')[0];
  const status = await new Promise((resolve, reject) => {
    const u = new URL(base);
    const req = http.request({
      host: u.hostname, port: u.port, path: '/api/media', method: 'POST',
      headers: { 'content-type': 'video/mp4', 'content-length': String(500 * 1024 * 1024), cookie: sid },
    }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.flushHeaders(); // ヘッダーだけ送ってボディは送らない
  });
  assert.equal(status, 413);

  // 削除すると容量が戻る
  const before = (await c('GET', '/api/me')).data.usage.storageBytes;
  assert.equal(before, 1000);
  await c('DELETE', `/api/entries/${e.id}`);
  assert.equal((await c('GET', '/api/me')).data.usage.storageBytes, 0);
});

test('目標: 作成・進捗・達成・無料プランの上限', async () => {
  const c = await signup('e@example.com');
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const g = (await c('POST', '/api/goals', { title: '本を3冊読む', icon: '📚', targetValue: 3, unit: '冊', dueDate: due })).data.goal;
  assert.equal(g.progress, 0);
  const p = await c('POST', `/api/goals/${g.id}/progress`, { delta: 1 });
  assert.equal(p.data.goal.currentValue, 1);
  const r = await c('POST', '/api/entries', { body: '2冊読み終えた', goalId: g.id, goalDelta: 2 });
  assert.equal(r.data.celebration.goalCompleted.id, g.id);

  await c('POST', '/api/goals', { title: 'B', targetValue: 1, dueDate: due });
  await c('POST', '/api/goals', { title: 'C', targetValue: 1, dueDate: due });
  await c('POST', '/api/goals', { title: 'D', targetValue: 1, dueDate: due });
  const over = await c('POST', '/api/goals', { title: 'E', targetValue: 1, dueDate: due });
  assert.equal(over.status, 402);
  assert.equal(over.data.error.code, 'plan_limit');
});

test('プラン: 週間ふりかえりはプロのみ', async () => {
  const c = await signup('f@example.com');
  assert.equal((await c('POST', '/api/insights/weekly', {})).status, 402);
  const me = (await c('GET', '/api/me')).data;
  app.repo.billing.setPlan(me.user.id, { plan: 'pro', provider: 'manual' });
  await c('POST', '/api/entries', { body: '今週もがんばった' });
  const r = await c('POST', '/api/insights/weekly', {});
  assert.equal(r.status, 202);
  const done = await waitFor(async () => {
    const w = (await c('GET', '/api/insights/weekly')).data.review;
    return w.status === 'done' ? w : null;
  });
  assert.ok(done.data.summary);
});

test('CSRF: 別オリジンからの書き込みは拒否', async () => {
  const r = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ email: 'z@example.com', password: 'password123' }),
  });
  assert.equal(r.status, 403);
});

test('静的ファイル: パストラバーサル不可・SPA フォールバック', async () => {
  const r = await fetch(base + '/..%2f..%2fpackage.json');
  assert.notEqual(r.status, 200);
  const page = await fetch(base + '/goals');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
});
