import { createHmac, timingSafeEqual } from 'node:crypto';

// Stripe REST API を依存パッケージなしで呼ぶ（npm から SDK を取得できない環境のため）。
// リクエストは application/x-www-form-urlencoded、ネストは a[b][c]=v の形で送る。

export class StripeError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function encodeForm(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? encodeForm(item, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`)));
    else if (typeof v === 'object') encodeForm(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out.join('&');
}

export function createStripe({ secretKey, apiBase = 'https://api.stripe.com' }) {
  async function request(method, path, params) {
    const res = await fetch(`${apiBase}/v1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${secretKey}`,
        ...(params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: params ? encodeForm(params) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new StripeError(data?.error?.message || `Stripe API ${res.status}`, res.status);
    return data;
  }
  return {
    createCustomer: (params) => request('POST', '/customers', params),
    createCheckoutSession: (params) => request('POST', '/checkout/sessions', params),
    createPortalSession: (params) => request('POST', '/billing_portal/sessions', params),
    retrieveSubscription: (id) => request('GET', `/subscriptions/${encodeURIComponent(id)}`),
  };
}

/**
 * Webhook 署名の検証（Stripe-Signature: t=時刻,v1=署名）。
 * 署名対象は `${t}.${生のボディ}`。時刻が古すぎるものは再送攻撃として拒否する。
 */
export function verifyWebhook(rawBody, header, secret, { toleranceSec = 300, now = Date.now() } = {}) {
  if (!header || !secret) return false;
  const parts = Object.create(null);
  const v1 = [];
  for (const kv of String(header).split(',')) {
    const [k, v] = kv.split('=');
    if (k === 'v1') v1.push(v);
    else parts[k] = v;
  }
  const t = Number(parts.t);
  if (!t || !v1.length || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
  return v1.some((sig) => {
    const got = Buffer.from(sig || '', 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** テスト用: 署名ヘッダーを作る */
export function signWebhook(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')}`;
}

/** Stripe のサブスクリプションから、こちらの subscriptions 行に入れる値を取り出す */
export function subscriptionFields(sub) {
  const item = sub.items?.data?.[0];
  // API バージョンによって期間の終わりがサブスク本体か項目側にある
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  return {
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    interval: item?.price?.recurring?.interval ?? null,
    subscriptionId: sub.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
  };
}
