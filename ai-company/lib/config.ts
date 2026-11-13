import "server-only";

/**
 * サーバー専用の環境設定。APIキー等はここでのみ読み込み、クライアントには渡さない。
 */

function bool(v: string | undefined) {
  return v === "1" || v === "true";
}

export const isVercelProduction = process.env.VERCEL_ENV === "production";

/** Supabase/OpenAI なしで動くローカル開発モード。本番では強制的に無効。 */
export const devLocalMode = bool(process.env.DEV_LOCAL_MODE) && !isVercelProduction;

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const serverConfig = {
  timezone: process.env.APP_TIMEZONE || "Asia/Tokyo",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  ai: {
    provider: (process.env.AI_PROVIDER || (devLocalMode ? "mock" : "openai")) as "openai" | "mock",
    openaiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    priceInputPerMTok: Number(process.env.AI_PRICE_INPUT_PER_MTOK || "0.40"),
    priceOutputPerMTok: Number(process.env.AI_PRICE_OUTPUT_PER_MTOK || "1.60"),
    globalDailyBudgetUsd: Number(process.env.AI_GLOBAL_DAILY_BUDGET_USD || "20"),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || "",
  },
  devSessionSecret: process.env.DEV_SESSION_SECRET || "",
};

export function backendMode(): "supabase" | "memory" | "unconfigured" {
  if (supabaseConfigured) return "supabase";
  if (devLocalMode) return "memory";
  return "unconfigured";
}
