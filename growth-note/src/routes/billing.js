import { HttpError, readJson, sendJson } from '../lib/http.js';
import { createStripe, verifyWebhook, subscriptionFields, StripeError } from '../lib/stripe.js';
import { PRICING } from '../lib/plans.js';

// サブスクリプション（プロプラン）の申し込み・管理・Stripe からの通知。
// Stripe のキーが未設定のときは「デモ決済」で流れだけ試せる（本番では BILLING_DEMO=1 のときのみ）。

async function readRaw(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'payload_too_large', 'データが大きすぎます');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function billingSummary(repo, userId, config) {
  const sub = repo.billing.subscription(userId) || {};
  return {
    status: sub.status || 'active',
    plan: sub.plan || 'free',
    interval: sub.billing_interval || null,
    currentPeriodEnd: sub.current_period_end || null,
    trialEnd: sub.trial_end || null,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    provider: sub.provider || null,
    trialAvailable: !sub.trial_used,
    mode: config.stripe.secretKey ? 'stripe' : config.billingDemo ? 'demo' : 'unavailable',
  };
}

export function registerBillingRoutes(router, app) {
  const { repo, config, log = console } = app;
  const sc = config.stripe;
  const stripe = sc.secretKey ? createStripe({ secretKey: sc.secretKey, apiBase: sc.apiBase }) : null;
  const priceFor = (interval) => (interval === 'year' ? sc.priceYearly : sc.priceMonthly);

  function baseUrl(ctx) {
    if (config.appUrl) return config.appUrl;
    const proto = config.trustProxy && ctx.req.headers['x-forwarded-proto'] ? ctx.req.headers['x-forwarded-proto'] : 'http';
    return `${proto}://${ctx.req.headers.host}`;
  }

  /** 退会時に呼ばれる: Stripe の契約が生きていれば即時解約して請求を止める */
  app.cancelSubscriptionForDeletion = async (userId) => {
    const sub = repo.billing.subscription(userId);
    if (!sub || sub.provider !== 'stripe' || !sub.provider_subscription_id) return;
    if (!['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(sub.status)) return;
    if (!stripe) throw new Error('Stripe is not configured');
    try {
      await stripe.cancelSubscription(sub.provider_subscription_id);
    } catch (err) {
      // すでに解約済み（404）なら問題なし
      if (!(err instanceof StripeError && err.status === 404)) throw err;
    }
  };

  router.get('/api/billing', async (ctx) => {
    sendJson(ctx.res, 200, { billing: billingSummary(repo, ctx.user.id, config), pricing: PRICING });
  });

  /** プロへの申し込み: Stripe の決済ページの URL を返す */
  router.post('/api/billing/checkout', async (ctx) => {
    const body = await readJson(ctx.req);
    const interval = body.interval === 'year' ? 'year' : 'month';
    const user = ctx.user;
    const summary = billingSummary(repo, user.id, config);
    if (summary.plan === 'pro' && ['active', 'trialing', 'past_due'].includes(summary.status)) {
      throw new HttpError(409, 'already_subscribed', 'すでにプロプランをご利用中です');
    }

    if (stripe) {
      if (!priceFor(interval)) throw new HttpError(503, 'not_configured', '料金プランの設定が完了していません');
      let customerId = repo.billing.subscription(user.id)?.provider_customer_id;
      try {
        if (!customerId) {
          const customer = await stripe.createCustomer({ email: user.email, name: user.display_name, metadata: { userId: user.id } });
          customerId = customer.id;
          repo.billing.setCustomer(user.id, customerId);
        }
        const session = await stripe.createCheckoutSession({
          mode: 'subscription',
          customer: customerId,
          client_reference_id: user.id,
          line_items: [{ price: priceFor(interval), quantity: 1 }],
          subscription_data: {
            metadata: { userId: user.id },
            ...(summary.trialAvailable ? { trial_period_days: PRICING.trialDays } : {}),
          },
          allow_promotion_codes: 'true',
          locale: 'ja',
          success_url: `${baseUrl(ctx)}/#/billing/success`,
          cancel_url: `${baseUrl(ctx)}/#/pricing`,
        });
        sendJson(ctx.res, 200, { url: session.url });
      } catch (err) {
        if (err instanceof StripeError) {
          log.error?.('[billing] checkout', err.message);
          throw new HttpError(502, 'payment_error', '決済ページを開けませんでした。時間をおいてお試しください');
        }
        throw err;
      }
      return;
    }

    if (!config.billingDemo) throw new HttpError(503, 'not_available', '有料プランは準備中です');
    // デモ決済: 実際の請求はせずにプロを有効にする
    const trial = summary.trialAvailable;
    const now = new Date();
    const end = new Date(now.getTime() + (trial ? PRICING.trialDays : interval === 'year' ? 365 : 30) * 86400000);
    repo.billing.applySubscription(user.id, {
      plan: 'pro', status: trial ? 'trialing' : 'active', provider: 'demo', interval,
      currentPeriodEnd: end.toISOString(), trialEnd: trial ? end.toISOString() : null, cancelAtPeriodEnd: false,
    });
    sendJson(ctx.res, 200, { url: '/#/billing/success', demo: true });
  });

  /** 解約・支払い方法の変更（Stripe のカスタマーポータル） */
  router.post('/api/billing/portal', async (ctx) => {
    const sub = repo.billing.subscription(ctx.user.id);
    if (stripe && sub?.provider_customer_id) {
      const session = await stripe.createPortalSession({ customer: sub.provider_customer_id, return_url: `${baseUrl(ctx)}/#/billing` });
      sendJson(ctx.res, 200, { url: session.url });
      return;
    }
    throw new HttpError(400, 'no_portal', 'お支払い情報が見つかりません');
  });

  /** デモ決済の解約（期間の終わりで無料に戻る）・すぐに無料へ戻す */
  router.post('/api/billing/demo/cancel', async (ctx) => {
    if (!config.billingDemo || stripe) throw new HttpError(404, 'not_found', '見つかりません');
    const body = await readJson(ctx.req);
    const sub = repo.billing.subscription(ctx.user.id);
    if (sub?.provider !== 'demo') throw new HttpError(400, 'invalid', 'デモ決済の契約がありません');
    if (body.immediately) {
      repo.billing.applySubscription(ctx.user.id, { plan: 'free', status: 'canceled', provider: 'demo', cancelAtPeriodEnd: false });
    } else {
      repo.billing.applySubscription(ctx.user.id, {
        plan: sub.plan, status: sub.status, provider: 'demo', interval: sub.billing_interval,
        currentPeriodEnd: sub.current_period_end, trialEnd: sub.trial_end, cancelAtPeriodEnd: true,
      });
    }
    sendJson(ctx.res, 200, { billing: billingSummary(repo, ctx.user.id, config) });
  });

  /** Stripe からの通知。署名を検証し、同じイベントは1回だけ反映する */
  router.post('/api/billing/webhook', async (ctx) => {
    const raw = await readRaw(ctx.req);
    if (!sc.webhookSecret || !verifyWebhook(raw, ctx.req.headers['stripe-signature'], sc.webhookSecret)) {
      throw new HttpError(400, 'invalid_signature', 'invalid signature');
    }
    const event = JSON.parse(raw);
    if (!repo.billing.recordEvent(event.id, event.type)) {
      sendJson(ctx.res, 200, { received: true, duplicate: true });
      return;
    }
    const obj = event.data?.object || {};

    const apply = (sub, fallbackUserId) => {
      const f = subscriptionFields(sub);
      const userId = sub.metadata?.userId || fallbackUserId || (f.customerId && repo.billing.userIdByCustomer(f.customerId));
      if (!userId || !repo.users.get(userId)) return;
      repo.billing.applySubscription(userId, {
        ...f,
        plan: ['active', 'trialing', 'past_due'].includes(f.status) ? 'pro' : 'free',
        provider: 'stripe',
      });
    };

    if (event.type === 'checkout.session.completed' && obj.mode === 'subscription' && obj.subscription && stripe) {
      if (obj.client_reference_id && obj.customer) repo.billing.setCustomer(obj.client_reference_id, obj.customer);
      apply(await stripe.retrieveSubscription(obj.subscription), obj.client_reference_id);
    } else if (event.type.startsWith('customer.subscription.')) {
      apply(obj);
    }
    sendJson(ctx.res, 200, { received: true });
  }, { auth: false });
}
