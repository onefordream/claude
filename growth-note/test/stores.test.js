import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';

let app;
let base;
let dataDir;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-store-test-'));
  const config = loadConfig({ port: 0, host: '127.0.0.1', dataDir, workerIntervalMs: 50 });
  config.ai = { ...config.ai, apiKey: '' };
  app = createApp(config, { log: { error() {} } });
  const addr = await app.start();
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async function call(method, url, body, headers = {}) {
    const isBin = body instanceof Uint8Array;
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body !== undefined && !isBin ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isBin ? body : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json() : null };
  };
}

async function signup(email, name) {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { email, password: 'password123', displayName: name });
  assert.equal(r.status, 201);
  return c;
}

test('店舗IDで連携 → 承認 → 共有した記録だけ店舗に見える → コメント → 連携解除で見えなくなる', async () => {
  const coach = await signup('coach@example.com', 'コーチ');
  const student = await signup('student@example.com', '生徒A');
  const other = await signup('other@example.com', '生徒B');

  // 店舗を作る
  const created = await coach('POST', '/api/stores', { name: 'みなとゴルフスクール', category: 'スポーツ', description: '' });
  assert.equal(created.status, 201);
  const store = created.data.store;
  assert.match(store.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // 小文字・ハイフンなしでも見つかる
  const lookup = await student('GET', `/api/stores/lookup?code=${store.code.replace('-', '').toLowerCase()}`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.data.store.name, 'みなとゴルフスクール');
  assert.equal((await student('GET', '/api/stores/lookup?code=ZZZZ-ZZZZ')).status, 404);

  // 連携申請（承認制なので pending）
  const req = await student('POST', '/api/links', { code: store.code, shareMode: 'selected' });
  assert.equal(req.status, 201);
  assert.equal(req.data.link.status, 'pending');
  assert.equal((await student('POST', '/api/links', { code: store.code })).status, 409);

  // 承認前に記録しても共有されない
  const e0 = (await student('POST', '/api/entries', { body: '承認前の記録', storeIds: [store.id] })).data.entry;
  assert.equal(e0.shares.length, 0);

  // 店舗側で承認
  const members = (await coach('GET', `/api/stores/${store.id}/members`)).data.members;
  assert.equal(members.length, 1);
  assert.equal(members[0].status, 'pending');
  assert.equal((await coach('POST', `/api/stores/${store.id}/members/${members[0].linkId}/approve`, {})).status, 200);

  // 共有する記録としない記録
  const shared = (await student('POST', '/api/entries', { body: 'ドライバーの練習。右に曲がる', storeIds: [store.id] })).data.entry;
  const priv = (await student('POST', '/api/entries', { body: '個人的な日記', storeIds: [] })).data.entry;
  assert.equal(shared.shares[0].storeName, 'みなとゴルフスクール');
  assert.equal(priv.shares.length, 0);

  const feed = (await coach('GET', `/api/stores/${store.id}/feed`)).data.items;
  assert.deepEqual(feed.map((e) => e.body), ['ドライバーの練習。右に曲がる']);
  assert.equal(feed[0].member.name, '生徒A');
  assert.equal(feed[0].insight, undefined); // AI のふりかえりは店舗に見せない

  // 関係ない人は店舗の情報を見られない
  assert.equal((await other('GET', `/api/stores/${store.id}/feed`)).status, 404);
  assert.equal((await other('GET', `/api/stores/${store.id}/members`)).status, 404);

  // 共有していない記録にはコメントできない
  assert.equal((await coach('POST', `/api/stores/${store.id}/entries/${priv.id}/comments`, { body: 'x' })).status, 404);
  const cm = await coach('POST', `/api/stores/${store.id}/entries/${shared.id}/comments`, { body: 'グリップを少し弱めてみましょう' });
  assert.equal(cm.status, 201);

  // 生徒のホームに未読コメント → 記録を開くと既読
  const home = (await student('GET', '/api/home')).data;
  assert.equal(home.storeComments.length, 1);
  assert.equal(home.storeComments[0].storeName, 'みなとゴルフスクール');
  const opened = (await student('GET', `/api/entries/${shared.id}`)).data.entry;
  assert.equal(opened.comments[0].body, 'グリップを少し弱めてみましょう');
  assert.equal((await student('GET', '/api/home')).data.storeComments.length, 0);

  // 生徒が連携を解除すると、その瞬間から見えなくなる
  const links = (await student('GET', '/api/links')).data.links;
  assert.equal(links.length, 1);
  assert.equal((await student('DELETE', `/api/links/${links[0].id}`)).status, 200);
  assert.equal((await coach('GET', `/api/stores/${store.id}/feed`)).data.items.length, 0);
  assert.equal((await coach('POST', `/api/stores/${store.id}/entries/${shared.id}/comments`, { body: 'x' })).status, 404);
  assert.equal((await student('GET', `/api/entries/${shared.id}`)).data.entry.shares.length, 0);
});

test('「すべて共有」モードと承認不要の店舗、共有された写真だけスタッフが見られる', async () => {
  const coach = await signup('coach2@example.com', '先生');
  const student = await signup('student2@example.com', '生徒C');
  const store = (await coach('POST', '/api/stores', { name: 'ピアノ教室', category: '音楽', description: '' })).data.store;
  await coach('PATCH', `/api/stores/${store.id}`, { requireApproval: false });

  const link = (await student('POST', '/api/links', { code: store.code, shareMode: 'all' })).data.link;
  assert.equal(link.status, 'active');

  const upShared = (await student('POST', '/api/media', new Uint8Array([1, 2, 3]), { 'content-type': 'image/png' })).data;
  const upPrivate = (await student('POST', '/api/media', new Uint8Array([4, 5, 6]), { 'content-type': 'image/png' })).data;
  // storeIds を省略すると「すべて共有」の店舗に共有される
  const e1 = (await student('POST', '/api/entries', { body: 'ハノン1番', mediaIds: [upShared.id] })).data.entry;
  assert.equal(e1.shares.length, 1);
  await student('POST', '/api/entries', { body: '非公開', mediaIds: [upPrivate.id], storeIds: [] });

  assert.equal((await coach('GET', `/api/media/${upShared.id}`)).status, 200);
  assert.equal((await coach('GET', `/api/media/${upPrivate.id}`)).status, 404);

  // 共有先をあとから外す
  await student('PUT', `/api/entries/${e1.id}/shares`, { storeIds: [] });
  assert.equal((await coach('GET', `/api/media/${upShared.id}`)).status, 404);
  assert.equal((await coach('GET', `/api/stores/${store.id}/feed`)).data.items.length, 0);
});

test('スタッフ招待・オーナー権限・自分の店舗とは連携できない', async () => {
  const owner = await signup('owner3@example.com', 'オーナー');
  const staff = await signup('staff3@example.com', 'スタッフ');
  const store = (await owner('POST', '/api/stores', { name: '英会話サロン', category: '語学', description: '' })).data.store;
  assert.ok(store.staffCode);

  assert.equal((await owner('POST', '/api/links', { code: store.code })).status, 409);

  const joined = await staff('POST', '/api/stores/join-staff', { code: store.staffCode });
  assert.equal(joined.status, 200);
  assert.equal(joined.data.store.role, 'staff');
  assert.equal(joined.data.store.staffCode, null); // スタッフには招待コードを見せない

  assert.equal((await staff('PATCH', `/api/stores/${store.id}`, { name: '乗っ取り' })).status, 403);
  const regen = await owner('POST', `/api/stores/${store.id}/regenerate-code`, { type: 'member' });
  assert.notEqual(regen.data.store.code, store.code);
  // 古いIDではもう見つからない
  assert.equal((await staff('GET', `/api/stores/lookup?code=${store.code}`)).status, 404);
});
