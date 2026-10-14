import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { axisScores, levelOf, gapsOf, AXES } from '../src/lib/growth.js';
import { signWebhook, verifyWebhook, encodeForm } from '../src/lib/stripe.js';

async function startApp(overrides = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-bill-test-'));
  const config = loadConfig({ port: 0, host: '127.0.0.1', dataDir, workerIntervalMs: 50, ...overrides });
  config.ai = { ...config.ai, apiKey: '' };
  const app = createApp(config, { log: { error() {} } });
  const addr = await app.start();
  return { app, base: `http://127.0.0.1:${addr.port}`, dataDir };
}

function client(base) {
  let cookie = '';
  return async function call(method, url, body, headers = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: (res.headers.get('content-type') || '').includes('json') ? await res.json() : null };
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

test('成長指標: 0〜100 に収まり、記録がないと低い', () => {
  const end = '2026-10-14';
  const empty = axisScores({ entries: [], goals: [], goalLogs: [], weeklyTarget: 4, end });
  for (const a of AXES) assert.ok(empty[a.key] >= 0 && empty[a.key] <= 100);
  assert.equal(empty.consistency, 0);

  const entries = Array.from({ length: 20 }, (_, i) => ({
    local_date: `2026-10-${String(14 - (i % 14)).padStart(2, '0')}`,
    body: '今日は新しいフォームに挑戦した。次は腕の角度を意識する。気づいたのはリズムが大事ということ。'.repeat(2),
    mood: 4,
    media_count: i % 2,
  }));
  // 14日分の記録・週3日目標（4週で12日）なら継続力は満点、週4日目標（16日）なら 14/16
  const s = axisScores({ entries, goals: [], goalLogs: [], weeklyTarget: 3, end });
  assert.equal(s.consistency, 100);
  assert.equal(axisScores({ entries, goals: [], goalLogs: [], weeklyTarget: 4, end }).consistency, 88);
  assert.ok(s.reflection > 80);
  assert.ok(s.challenge > 60);
  assert.equal(gapsOf(s)[0].key, 'goals'); // 目標がないので一番の伸びしろ
});

test('レベル: 累計経験値から計算', () => {
  assert.equal(levelOf(0).level, 1);
  assert.equal(levelOf(49).level, 1);
  assert.equal(levelOf(50).level, 2);
  assert.equal(levelOf(150).level, 3);
  assert.ok(Math.abs(levelOf(100).progress - 0.5) < 1e-9);
});

test('Stripe: フォームのエンコードと Webhook 署名の検証', () => {
  assert.equal(encodeForm({ a: 1, line_items: [{ price: 'p', quantity: 1 }], s: { m: { u: 'x' } } }),
    'a=1&line_items%5B0%5D%5Bprice%5D=p&line_items%5B0%5D%5Bquantity%5D=1&s%5Bm%5D%5Bu%5D=x');
  const body = '{"id":"evt_1"}';
  const sig = signWebhook(body, 'whsec_test');
  assert.ok(verifyWebhook(body, sig, 'whsec_test'));
  assert.ok(!verifyWebhook(body + ' ', sig, 'whsec_test'));
  assert.ok(!verifyWebhook(body, sig, 'whsec_other'));
  const old = signWebhook(body, 'whsec_test', Math.floor(Date.now() / 1000) - 3600);
  assert.ok(!verifyWebhook(body, old, 'whsec_test'));
});

describe('無料 → 体験 → ロック → デモ決済でプロ', () => {
  let ctx;
  before(async () => { ctx = await startApp({ billingDemo: true }); });
  after(async () => { await ctx.app.close(); fs.rmSync(ctx.dataDir, { recursive: true, force: true }); });

  test('流れ全体', async () => {
    const c = client(ctx.base);
    await c('POST', '/api/auth/signup', { email: 'f@example.com', password: 'password123', displayName: 'F' });
    assert.equal((await c('GET', '/api/me')).data.ai.trialLeft, 3);

    // 成長分析: 記録が足りないうちは準備中、無料なので数値は返らない
    let g = (await c('GET', '/api/growth')).data;
    assert.equal(g.locked, true);
    assert.equal(g.ready, false);
    assert.equal(g.axes, undefined);

    const ids = [];
    for (let i = 0; i < 4; i++) {
      const e = (await c('POST', '/api/entries', { body: `練習${i}回目。新しいやり方を試した。次は意識してみる。` })).data.entry;
      ids.push(e.id);
      await waitFor(async () => (await c('GET', `/api/entries/${e.id}`)).data.entry.insight.status === 'done');
    }
    const third = (await c('GET', `/api/entries/${ids[2]}`)).data.entry.insight;
    assert.equal(third.locked, undefined);
    assert.ok(third.data.next_actions.length > 0);
    assert.match(third.note, /残り0回/);

    // 4件目は体験回数を使い切ったのでロック。中身はサーバーから送られない
    const fourth = (await c('GET', `/api/entries/${ids[3]}`)).data.entry.insight;
    assert.equal(fourth.locked, true);
    assert.equal(fourth.summary, null);
    assert.equal(fourth.data.next_actions, undefined);
    const listed = (await c('GET', '/api/entries')).data.items.find((x) => x.id === ids[3]);
    assert.equal(listed.insight.data.insights, undefined);

    g = (await c('GET', '/api/growth')).data;
    assert.equal(g.locked, true);
    assert.equal(g.ready, true);
    assert.ok(g.teaser.topStrength);
    assert.equal(g.overall, undefined);
    assert.equal((await c('POST', '/api/growth/analysis', {})).status, 402);

    // デモ決済でプロ（初回は7日間の無料体験）
    const co = await c('POST', '/api/billing/checkout', { interval: 'month' });
    assert.equal(co.status, 200);
    assert.equal(co.data.demo, true);
    const me = (await c('GET', '/api/me')).data;
    assert.equal(me.plan.id, 'pro');
    assert.equal(me.billing.status, 'trialing');
    assert.equal(me.billing.trialAvailable, false);
    assert.equal((await c('POST', '/api/billing/checkout', { interval: 'year' })).status, 409);

    g = (await c('GET', '/api/growth')).data;
    assert.equal(g.locked, false);
    assert.equal(g.axes.length, 6);
    assert.ok(g.level.level >= 1);
    assert.equal(g.trend.length, 8);
    assert.equal(g.gaps.length, 2);

    // AI 自己分析
    assert.equal((await c('POST', '/api/growth/analysis', {})).status, 202);
    const analysis = await waitFor(async () => {
      const a = (await c('GET', '/api/growth')).data.analysis.latest;
      return a?.status === 'done' ? a : null;
    });
    assert.ok(analysis.data.actions.length > 0);

    // ロックされていた記録も、プロになったらふりかえり直せる
    await c('POST', `/api/entries/${ids[3]}/insight`, {});
    const unlocked = await waitFor(async () => {
      const i = (await c('GET', `/api/entries/${ids[3]}`)).data.entry.insight;
      return i.status === 'done' ? i : null;
    });
    assert.equal(unlocked.locked, undefined);
    assert.ok(unlocked.data.next_actions.length > 0);

    // 解約予約 → 期間中はプロのまま、即時解約 → 無料
    const cancel = (await c('POST', '/api/billing/demo/cancel', {})).data.billing;
    assert.equal(cancel.cancelAtPeriodEnd, true);
    assert.equal((await c('GET', '/api/me')).data.plan.id, 'pro');
    await c('POST', '/api/billing/demo/cancel', { immediately: true });
    assert.equal((await c('GET', '/api/me')).data.plan.id, 'free');
    assert.equal((await c('GET', '/api/growth')).data.locked, true);
    // 記録そのものは無料に戻っても見られる
    assert.equal((await c('GET', `/api/entries/${ids[0]}`)).status, 200);
  });
});

describe('Stripe 連携（偽の Stripe サーバーで確認）', () => {
  let ctx;
  let stripeServer;
  const calls = [];
  before(async () => {
    stripeServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        calls.push({ method: req.method, url: req.url, body: new URLSearchParams(body), auth: req.headers.authorization });
        res.setHeader('content-type', 'application/json');
        if (req.url === '/v1/customers') return res.end(JSON.stringify({ id: 'cus_123' }));
        if (req.url === '/v1/checkout/sessions') return res.end(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }));
        if (req.url === '/v1/billing_portal/sessions') return res.end(JSON.stringify({ url: 'https://billing.stripe.test/p' }));
        res.statusCode = 404;
        res.end('{}');
      });
    });
    await new Promise((r) => stripeServer.listen(0, '127.0.0.1', r));
    const port = stripeServer.address().port;
    ctx = await startApp({
      billingDemo: false,
      appUrl: 'https://growth.example',
      stripe: { secretKey: 'sk_test_x', webhookSecret: 'whsec_x', priceMonthly: 'price_m', priceYearly: 'price_y', apiBase: `http://127.0.0.1:${port}` },
    });
  });
  after(async () => {
    await ctx.app.close();
    stripeServer.close();
    fs.rmSync(ctx.dataDir, { recursive: true, force: true });
  });

  test('決済ページ作成 → Webhook でプロ → 二重通知は無視 → 解約で無料', async () => {
    const c = client(ctx.base);
    await c('POST', '/api/auth/signup', { email: 's@example.com', password: 'password123', displayName: 'S' });
    const me = (await c('GET', '/api/me')).data;
    assert.equal(me.billing.mode, 'stripe');

    const co = await c('POST', '/api/billing/checkout', { interval: 'year' });
    assert.equal(co.data.url, 'https://checkout.stripe.test/cs_1');
    const session = calls.find((x) => x.url === '/v1/checkout/sessions');
    assert.equal(session.auth, 'Bearer sk_test_x');
    assert.equal(session.body.get('line_items[0][price]'), 'price_y');
    assert.equal(session.body.get('subscription_data[trial_period_days]'), '7');
    assert.equal(session.body.get('client_reference_id'), me.user.id);
    assert.equal(session.body.get('success_url'), 'https://growth.example/#/billing/success');
    // まだ Webhook が来ていないので無料のまま
    assert.equal((await c('GET', '/api/me')).data.plan.id, 'free');

    const send = (event, sign = true) => {
      const raw = JSON.stringify(event);
      return fetch(ctx.base + '/api/billing/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(sign ? { 'stripe-signature': signWebhook(raw, 'whsec_x') } : {}) },
        body: raw,
      });
    };
    const sub = (status, extra = {}) => ({
      id: 'sub_1', customer: 'cus_123', status, cancel_at_period_end: false, trial_end: null,
      items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 * 365, price: { recurring: { interval: 'year' } } }] },
      ...extra,
    });

    assert.equal((await send({ id: 'evt_x', type: 'customer.subscription.created', data: { object: sub('active') } }, false)).status, 400);

    const r1 = await send({ id: 'evt_1', type: 'customer.subscription.created', data: { object: sub('trialing', { trial_end: Math.floor(Date.now() / 1000) + 7 * 86400 }) } });
    assert.equal(r1.status, 200);
    let m = (await c('GET', '/api/me')).data;
    assert.equal(m.plan.id, 'pro');
    assert.equal(m.billing.status, 'trialing');
    assert.equal(m.billing.interval, 'year');

    const dup = await (await send({ id: 'evt_1', type: 'customer.subscription.created', data: { object: sub('trialing') } })).json();
    assert.equal(dup.duplicate, true);

    assert.equal((await c('POST', '/api/billing/portal', {})).data.url, 'https://billing.stripe.test/p');

    await send({ id: 'evt_2', type: 'customer.subscription.updated', data: { object: sub('active', { cancel_at_period_end: true }) } });
    m = (await c('GET', '/api/me')).data;
    assert.equal(m.billing.cancelAtPeriodEnd, true);
    assert.equal(m.plan.id, 'pro');

    await send({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: sub('canceled') } });
    m = (await c('GET', '/api/me')).data;
    assert.equal(m.plan.id, 'free');
    assert.equal(m.billing.trialAvailable, false); // 無料体験は1回だけ
  });
});
