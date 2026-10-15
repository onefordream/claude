import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

export function loadConfig(overrides = {}) {
  const env = process.env;
  const model = env.AI_MODEL || 'claude-opus-5';
  return {
    port: Number(env.PORT || 3000),
    host: env.HOST || '0.0.0.0',
    dataDir: path.resolve(env.DATA_DIR || path.join(ROOT, 'data')),
    webDir: path.join(ROOT, 'web'),
    // 本番(HTTPS)では Secure Cookie を必須にする
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === '1' : env.NODE_ENV === 'production',
    // リバースプロキシ配下で X-Forwarded-For を信頼するか
    trustProxy: env.TRUST_PROXY === '1',
    sessionDays: 30,
    ai: {
      apiKey: env.ANTHROPIC_API_KEY || '',
      model,
      baseUrl: (env.AI_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
      effort: env.AI_EFFORT ?? 'medium',
      timeoutMs: Number(env.AI_TIMEOUT_MS || 90_000),
    },
    // 公開URL（Stripe の戻り先に使う）
    appUrl: (env.APP_URL || '').replace(/\/$/, ''),
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY || '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
      priceMonthly: env.STRIPE_PRICE_MONTHLY || '',
      priceYearly: env.STRIPE_PRICE_YEARLY || '',
      apiBase: (env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, ''),
    },
    // Stripe 未設定でも課金の流れを試せるデモ決済。本番では明示的に BILLING_DEMO=1 のときだけ
    billingDemo: env.BILLING_DEMO ? env.BILLING_DEMO === '1' : env.NODE_ENV !== 'production',
    // メール送信（パスワード再設定など）。RESEND_API_KEY が未設定ならサーバーのログに出すだけ
    mail: {
      resendApiKey: env.RESEND_API_KEY || '',
      from: env.MAIL_FROM || 'Growth Note <no-reply@example.com>',
    },
    // 特定商取引法に基づく表記・お問い合わせ先に表示する運営者情報
    operator: {
      name: env.OPERATOR_NAME || '',
      representative: env.OPERATOR_REPRESENTATIVE || '',
      address: env.OPERATOR_ADDRESS || '',
      phone: env.OPERATOR_PHONE || '',
      email: env.OPERATOR_EMAIL || '',
    },
    // 運営者の管理画面を使えるメールアドレス（カンマ区切り）
    adminEmails: (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    // サーバーエラーを Slack / Discord などに通知する Webhook URL
    errorWebhookUrl: env.ERROR_WEBHOOK_URL || '',
    workerConcurrency: Number(env.WORKER_CONCURRENCY || 4),
    backupKeepDays: Number(env.BACKUP_KEEP_DAYS || 7),
    workerIntervalMs: 1500,
    ...overrides,
  };
}
