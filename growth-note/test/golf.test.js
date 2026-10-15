import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { roundStats, aggregate, potentials, skillAxes, bracketOf, holeDerived } from '../src/lib/golf.js';

const PARS = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];

test('ホールの自動計算: パーオン・寄せワン・サンドセーブ', () => {
  // パー4を2オン2パット → パーオン
  assert.equal(holeDerived({ par: 4, score: 4, putts: 2 }).gir, true);
  // パー4を3オン1パット → パーオンではないが寄せワン
  const d = holeDerived({ par: 4, score: 4, putts: 1, bunker: 1 });
  assert.equal(d.gir, false);
  assert.equal(d.scramble, true);
  assert.equal(d.sandSave, true);
  // パー3のティーショット方向は FW キープの対象外
  assert.equal(holeDerived({ par: 3, score: 3, putts: 2, fairway: 'fw' }).fwChance, false);
});

test('ラウンドの成績（ホールごと）', () => {
  const holes = PARS.map((par, i) => ({
    hole_no: i + 1, par,
    score: par + (i % 3 === 0 ? 1 : 0), // 6ホールでボギー
    putts: i % 6 === 0 ? 3 : 2,
    fairway: par >= 4 ? (i % 2 ? 'fw' : 'right') : null,
    ob: i === 4 ? 1 : 0, bunker: i === 2 ? 1 : 0, penalty: 0,
  }));
  const s = roundStats({ mode: 'hole', holes_count: 18, pars: PARS }, holes);
  assert.equal(s.complete, true);
  assert.equal(s.score, 78);
  assert.equal(s.toPar, 6);
  assert.equal(s.putts, 39);
  assert.equal(s.threePutts, 3);
  assert.equal(s.ob, 1);
  assert.equal(s.fwChances, 14);
  assert.equal(s.dist.bogey, 6);
  assert.equal(s.front.score + s.back.score, 78);
});

test('合計入力のラウンドと、9ホールの混在した集計', () => {
  const total = roundStats({ mode: 'total', holes_count: 18, pars: PARS, totals: { score: 96, putts: 36, fwHit: 6, fwChances: 14, gir: 3, ob: 2, penalties: 1 } }, []);
  assert.equal(total.toPar, 24);
  assert.equal(total.fwPct, 42.9);
  const nine = roundStats({ mode: 'total', holes_count: 9, pars: PARS.slice(0, 9), totals: { score: 50, putts: 18, ob: 1 } }, []);
  const agg = aggregate([total, nine]);
  assert.equal(agg.rounds, 2);
  assert.equal(agg.score18, 97.3); // (96 + 50) / 27 × 18
  assert.equal(agg.putts18, 36);
  assert.equal(bracketOf(agg.score18).key, '90s');

  const pot = potentials(agg);
  assert.equal(pot.target.key, '80s');
  assert.ok(pot.items.length > 0);
  assert.equal(pot.items[0].key, 'putting'); // 36パット → 目標33で3打
  for (let i = 1; i < pot.items.length; i++) assert.ok(pot.items[i - 1].strokes >= pot.items[i].strokes);
  for (const a of skillAxes(agg)) assert.ok(a.score >= 0 && a.score <= 100);
});

describe('ラウンド記録の API', () => {
  let app;
  let base;
  let dataDir;
  before(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-golf-test-'));
    const config = loadConfig({ port: 0, host: '127.0.0.1', dataDir, workerIntervalMs: 50, billingDemo: true });
    config.ai = { ...config.ai, apiKey: '' };
    app = createApp(config, { log: { error() {} } });
    base = `http://127.0.0.1:${(await app.start()).port}`;
  });
  after(async () => {
    await app.close();
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
      return { status: res.status, data: await res.json().catch(() => null) };
    };
  }
  const waitFor = async (fn, ms = 4000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const v = await fn();
      if (v) return v;
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('timeout');
  };

  test('ホール入力 → 終了で成長ノートに記録 → 分析（無料はロック、プロで解放）→ AIコーチ', async () => {
    const c = client();
    await c('POST', '/api/auth/signup', { email: 'golfer@example.com', password: 'password123', displayName: 'ゴルファー' });

    const created = await c('POST', '/api/golf/rounds', { courseName: '青山カントリー', holesCount: 18 });
    assert.equal(created.status, 201);
    const id = created.data.round.id;
    assert.deepEqual(created.data.round.pars, PARS);

    assert.equal((await c('PUT', `/api/golf/rounds/${id}/holes/1`, { score: 4, putts: 4 })).status, 400);
    for (let i = 1; i <= 18; i++) {
      const par = PARS[i - 1];
      const r = await c('PUT', `/api/golf/rounds/${id}/holes/${i}`, {
        score: par + 1, putts: 2, fairway: par >= 4 ? (i % 2 ? 'fw' : 'left') : 'fw', ob: i === 7 ? 1 : 0, bunker: i === 3,
      });
      assert.equal(r.status, 200);
    }
    const mid = (await c('GET', `/api/golf/rounds/${id}`)).data;
    assert.equal(mid.stats.score, 90);
    assert.equal(mid.holes[2].fairway, null); // パー3の方向は保存しない

    // 無料: 分析はロック（伸びしろの名前だけ見える）
    let fin = await c('POST', `/api/golf/rounds/${id}/finish`, { note: '後半パターが入らなかった', mood: 3 });
    assert.equal(fin.status, 200);
    assert.equal(fin.data.firstRound, true);
    const entry = (await c('GET', `/api/entries/${fin.data.entryId}`)).data.entry;
    assert.match(entry.body, /^⛳ 青山カントリー（18H） 90（\+18）/);
    assert.match(entry.body, /後半パターが入らなかった/);
    assert.equal(entry.golf.score, 90);

    // もう一度終える（メモ修正）と、記録は増えずに更新される
    fin = await c('POST', `/api/golf/rounds/${id}/finish`, { note: '後半パターが入らなかった。次は距離感。' });
    assert.equal(fin.data.entryId, entry.id);
    assert.equal((await c('GET', '/api/entries')).data.items.length, 1);

    // コースのパーを覚えている
    assert.equal((await c('GET', '/api/golf/courses')).data.courses[0].name, '青山カントリー');

    let a = (await c('GET', '/api/golf/analysis')).data;
    assert.equal(a.locked, true);
    assert.ok(a.teaser.topArea);
    assert.equal(a.axes, undefined);
    assert.equal((await c('POST', '/api/golf/coach', {})).status, 402);

    // 合計入力でもう1ラウンド
    const r2 = (await c('POST', '/api/golf/rounds', { courseName: '海辺GC', mode: 'total' })).data.round;
    await c('PATCH', `/api/golf/rounds/${r2.id}`, { totals: { score: 95, putts: 37, fwHit: 5, fwChances: 14, gir: 2, ob: 3 }, driveDistance: 210 });
    await c('POST', `/api/golf/rounds/${r2.id}/finish`, {});

    const list = (await c('GET', '/api/golf/rounds')).data;
    assert.equal(list.summary.rounds, 2);
    assert.equal(list.summary.best, 90);

    // プロにすると分析が見える
    await c('POST', '/api/billing/checkout', { interval: 'month' });
    a = (await c('GET', '/api/golf/analysis')).data;
    assert.equal(a.locked, false);
    assert.equal(a.agg.rounds, 2);
    assert.ok(a.axes.some((x) => x.key === 'distance'));
    assert.ok(a.potentials.items.length > 0);
    assert.equal(a.trend.length, 2);

    assert.equal((await c('POST', '/api/golf/coach', {})).status, 202);
    const coach = await waitFor(async () => {
      const x = (await c('GET', '/api/golf/analysis')).data.coach.latest;
      return x?.status === 'done' ? x : null;
    });
    assert.ok(coach.data.priorities.length > 0);
    assert.ok(coach.data.next_round_plan.length > 0);
  });

  test('他人のラウンドは見られない', async () => {
    const a = client();
    const b = client();
    await a('POST', '/api/auth/signup', { email: 'ga@example.com', password: 'password123' });
    await b('POST', '/api/auth/signup', { email: 'gb@example.com', password: 'password123' });
    const r = (await a('POST', '/api/golf/rounds', { courseName: 'X' })).data.round;
    assert.equal((await b('GET', `/api/golf/rounds/${r.id}`)).status, 404);
    assert.equal((await b('PUT', `/api/golf/rounds/${r.id}/holes/1`, { score: 4 })).status, 404);
    assert.equal((await b('DELETE', `/api/golf/rounds/${r.id}`)).status, 404);
  });
});
