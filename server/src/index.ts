// Cloudflare Worker：POST /coach で AIコーチの指導を返す。
// API キーはこのサーバーの環境変数（シークレット）にだけ置き、アプリには入れない。
import Anthropic from "@anthropic-ai/sdk";
import { CoachRefusal, InputError, parseInput, runCoach } from "./coach.ts";

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** 許可するオリジン（カンマ区切り）。例: https://onefordream.github.io,aigolf://app */
  ALLOWED_ORIGINS?: string;
  /** アプリに埋め込む簡易キー。本番では App Store の購入情報の検証に置き換える */
  APP_KEY?: string;
  /** Cloudflare のレート制限（任意） */
  RATE_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

const MAX_BODY = 20_000;

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

export async function handle(req: Request, env: Env, makeClient: () => Anthropic = () => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })): Promise<Response> {
  const h = cors(req, env);
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (url.pathname !== "/coach" || req.method !== "POST") return json({ error: "not_found" }, 404, h);
  if (!h["Access-Control-Allow-Origin"] && req.headers.get("Origin")) return json({ error: "origin_not_allowed" }, 403, h);
  if (env.APP_KEY && req.headers.get("X-App-Key") !== env.APP_KEY) return json({ error: "unauthorized" }, 401, h);

  if (env.RATE_LIMITER) {
    const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json({ error: "rate_limited", message: "短時間に使いすぎです。少し待ってからお試しください。" }, 429, h);
  }

  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: "too_large" }, 413, h);

  let input;
  try {
    input = parseInput(JSON.parse(text));
  } catch (e) {
    const message = e instanceof InputError ? e.message : "JSON を読み取れませんでした";
    return json({ error: "bad_request", message }, 400, h);
  }

  try {
    const { output, model } = await runCoach(makeClient(), input);
    return json({ coach: output, model }, 200, h);
  } catch (e) {
    if (e instanceof CoachRefusal) return json({ error: "refused", message: "このデータでは指導を作れませんでした。" }, 422, h);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy", message: "混み合っています。少し待ってからお試しください。" }, 503, h);
    if (e instanceof Anthropic.APIError) {
      console.error("anthropic", e.status, e.message);
      return json({ error: "upstream", message: "AIコーチに接続できませんでした。" }, 502, h);
    }
    console.error("coach", e);
    return json({ error: "internal", message: "AIコーチの応答を読み取れませんでした。" }, 500, h);
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
};
