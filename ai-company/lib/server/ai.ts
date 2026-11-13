import "server-only";
import type { z } from "zod";
import { isVercelProduction, serverConfig } from "@/lib/config";
import { OpenAIProvider } from "@/lib/ai/openai";
import { MockProvider } from "@/lib/ai/mock";
import { extractJson } from "@/lib/ai/schemas";
import type { AIProvider, AIRequest, AIResult } from "@/lib/ai/provider";
import { periodStartsUtc } from "@/lib/game/dates";
import type { PlanLimits } from "@/lib/types";
import type { UsageFeature, UserStore } from "./store/types";
import { getAdminStore } from "./auth";

export class AIServiceError extends Error {
  constructor(
    public code: "not_configured" | "daily_limit" | "monthly_limit" | "rate_limited" | "global_budget" | "provider_error" | "invalid_output",
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const LIMIT_MESSAGES: Record<string, string> = {
  daily_limit: "本日のAI利用回数の上限に達しました。明日またお話ししましょう。",
  monthly_limit: "今月のAI利用回数の上限に達しました。",
  rate_limited: "少し間隔をあけてから、もう一度お試しください。",
  global_budget: "ただいまAI機能が混み合っています。しばらくしてからお試しください。",
};

let cached: AIProvider | null = null;
export function getProvider(): AIProvider {
  if (cached) return cached;
  const { provider, openaiKey, model } = serverConfig.ai;
  if (provider === "mock") {
    if (isVercelProduction) throw new AIServiceError("not_configured", 503, "AIが設定されていません（本番でモックは使用できません）。");
    cached = new MockProvider();
  } else {
    if (!openaiKey) throw new AIServiceError("not_configured", 503, "AIが未設定です。運営者がOPENAI_API_KEYを設定する必要があります。");
    cached = new OpenAIProvider(openaiKey, model);
  }
  return cached;
}

/** 機能ごとの利用枠（どの機能の回数を合算するか・上限） */
export function limitsFor(feature: UsageFeature, plan: PlanLimits) {
  switch (feature) {
    case "chat":
    case "task":
      return { count: ["chat", "task"] as UsageFeature[], daily: plan.chatDaily, monthly: plan.chatMonthly };
    case "meeting":
      return { count: ["meeting"] as UsageFeature[], daily: plan.meetingDaily, monthly: plan.meetingDaily * 31 };
    case "onboarding":
      return { count: ["onboarding"] as UsageFeature[], daily: plan.onboardingDaily, monthly: plan.onboardingDaily * 5 };
    case "missions":
      return { count: ["missions"] as UsageFeature[], daily: 3, monthly: 93 };
    case "summary":
      return { count: ["summary"] as UsageFeature[], daily: 40, monthly: 800 };
  }
}

export function estimateCostUsd(inputTokens: number, outputTokens: number) {
  const { priceInputPerMTok, priceOutputPerMTok } = serverConfig.ai;
  return (inputTokens * priceInputPerMTok + outputTokens * priceOutputPerMTok) / 1_000_000;
}

/**
 * 利用枠をサーバー側で予約 → AI 呼び出し → 利用量・推定原価を記録。
 * 上限超過時は AI を呼ばずに例外。
 */
export async function runAI(store: UserStore, feature: UsageFeature, req: AIRequest): Promise<AIResult> {
  const provider = getProvider();
  const settings = await getAdminStore().getSettings();
  const plan = settings.plans[await store.getPlan()];
  const l = limitsFor(feature, plan);
  const period = periodStartsUtc(serverConfig.timezone);
  const r = await store.reserveUsage(
    feature,
    l.count,
    { daily: l.daily, monthly: l.monthly, perMinute: plan.perMinute },
    period,
    serverConfig.ai.globalDailyBudgetUsd,
  );
  if (!r.ok || !r.id) {
    const reason = r.reason ?? "rate_limited";
    throw new AIServiceError(reason, 429, LIMIT_MESSAGES[reason]);
  }
  try {
    const res = await provider.generate(req);
    await store.finalizeUsage(r.id, {
      status: "ok",
      model: res.model,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      costUsd: estimateCostUsd(res.inputTokens, res.outputTokens),
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ai] ${feature} failed:`, msg);
    // 失敗分は利用回数に数えない（status=error）
    await store.finalizeUsage(r.id, { status: "error", model: "", inputTokens: 0, outputTokens: 0, costUsd: 0, error: msg }).catch(() => {});
    throw new AIServiceError("provider_error", 502, "AIとの通信に失敗しました。時間をおいて再度お試しください。");
  }
}

/** 構造化出力（JSON）を取得しスキーマ検証する。失敗時は1回だけ修正を依頼。 */
export async function runStructured<S extends z.ZodTypeAny>(
  store: UserStore,
  feature: UsageFeature,
  req: AIRequest,
  schema: S,
): Promise<z.output<S>> {
  const first = await runAI(store, feature, { ...req, json: true });
  const parsed = schema.safeParse(extractJson(first.text));
  if (parsed.success) return parsed.data;

  console.warn(`[ai] ${feature} invalid JSON, retrying`, parsed.error.issues.slice(0, 3));
  const retry = await runAI(store, feature, {
    ...req,
    json: true,
    messages: [
      ...req.messages,
      { role: "assistant", content: first.text.slice(0, 4000) },
      { role: "user", content: "出力が指定のJSON形式に合っていません。指定された形式のJSONのみを出力し直してください。" },
    ],
  });
  const second = schema.safeParse(extractJson(retry.text));
  if (second.success) return second.data;
  throw new AIServiceError("invalid_output", 502, "AIの応答を読み取れませんでした。もう一度お試しください。");
}
