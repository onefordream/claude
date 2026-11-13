import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { backendMode } from "@/lib/config";
import { DEV_COOKIE, encodeDevSession } from "@/lib/server/auth";

// ローカル開発モード専用のログイン（DEV_LOCAL_MODE=1 かつ Supabase 未設定時のみ）
const Body = z.object({ email: z.string().trim().email().max(120) });

export async function POST(req: NextRequest) {
  if (backendMode() !== "memory") return NextResponse.json({ error: "not available" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "メールアドレスを確認してください" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  // メールアドレスから決定的なIDを作る（同じメールで再ログインすると同じデータ）
  const h = createHash("sha256").update(email).digest("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEV_COOKIE, encodeDevSession(id, email), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
