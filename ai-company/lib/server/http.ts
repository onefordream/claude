import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { AIServiceError } from "./ai";
import { getSessionUser, getUserStore, type SessionUser } from "./auth";
import type { UserStore } from "./store/types";
import { backendMode } from "@/lib/config";

export function jsonError(status: number, error: string, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

/** 同一オリジンからのリクエストかを確認（CSRF対策の多層防御） */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // 同一オリジンの fetch では省略される場合がある（Cookie は SameSite=Lax）
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const MAX_BODY = 64 * 1024;

type Handler<T> = (ctx: { req: NextRequest; user: SessionUser; store: UserStore; body: T }) => Promise<Response>;

/**
 * 認証必須の API ハンドラ。未ログイン→401、入力検証失敗→400、AI上限→429 を統一的に返す。
 */
export function withUser<S extends z.ZodTypeAny>(schema: S | null, handler: Handler<z.output<S>>) {
  return async (req: NextRequest) => {
    try {
      if (backendMode() === "unconfigured") return jsonError(503, "サーバーの設定が完了していません（Supabase未設定）", "not_configured");
      if (req.method !== "GET" && !sameOrigin(req)) return jsonError(403, "不正なリクエストです", "bad_origin");
      const user = await getSessionUser();
      if (!user) return jsonError(401, "ログインが必要です", "unauthorized");
      let body: unknown = undefined;
      if (schema) {
        const len = Number(req.headers.get("content-length") ?? "0");
        if (len > MAX_BODY) return jsonError(413, "入力が大きすぎます", "too_large");
        const text = await req.text();
        if (text.length > MAX_BODY) return jsonError(413, "入力が大きすぎます", "too_large");
        let raw: unknown;
        try {
          raw = text ? JSON.parse(text) : {};
        } catch {
          return jsonError(400, "入力形式が正しくありません", "bad_json");
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) return jsonError(400, "入力内容を確認してください", "invalid_input");
        body = parsed.data;
      }
      const store = await getUserStore(user);
      return await handler({ req, user, store, body: body as z.output<S> });
    } catch (e) {
      if (e instanceof AIServiceError) return jsonError(e.status, e.message, e.code);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "company_not_found") return jsonError(404, "会社がまだ設立されていません", "no_company");
      console.error("[api] unhandled error:", e);
      return jsonError(500, "エラーが発生しました。時間をおいて再度お試しください。", "internal");
    }
  };
}
