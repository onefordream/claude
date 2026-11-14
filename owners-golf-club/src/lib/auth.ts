import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { randomToken, sha256 } from "./crypto";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession, verifySession } from "./session-token";
import { FULL_ACCESS_STATUSES, MEMBER_AREA_STATUSES } from "./constants";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// タイミング攻撃対策用（存在しないユーザーでも同程度の時間をかける）
let dummyHash: string | null = null;
export async function dummyVerify(pw: string): Promise<void> {
  if (!dummyHash) dummyHash = await bcrypt.hash("dummy-password-for-timing", BCRYPT_ROUNDS);
  await bcrypt.compare(pw, dummyHash);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** ログイン: DB セッションを作成し署名付き Cookie を発行（Server Action / Route Handler 内でのみ呼ぶ） */
export async function createSession(user: Pick<User, "id" | "role">): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt } });
  await writeSessionCookie(token, user, expiresAt);
}

async function writeSessionCookie(token: string, user: Pick<User, "id" | "role">, expiresAt: Date) {
  const value = await signSession({
    t: token,
    uid: user.id,
    role: user.role,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, cookieOptions(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))));
}

/** Cookie 内のロール表記を DB の最新ロールに合わせて再発行（Server Action / Route Handler 内でのみ） */
export async function refreshSessionCookie(): Promise<User | null> {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(payload.t) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  await writeSessionCookie(payload.t, session.user, session.expiresAt);
  return session.user;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (payload) await prisma.session.deleteMany({ where: { tokenHash: sha256(payload.t) } });
  jar.set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** 現在のユーザー（署名検証 + DB セッション照合）。未ログインなら null */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(payload.t) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || session.userId !== payload.uid) return null;
  return session.user;
}

export async function requireUser(next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** 申請者（会員化前）ページ用 */
export async function requireApplicant(): Promise<User> {
  const user = await requireUser("/apply/status");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "MEMBER" && MEMBER_AREA_STATUSES.includes(user.status)) redirect("/member");
  return user;
}

/** 会員エリア（会員情報管理など PAST_DUE でも使える画面） */
export async function requireMemberArea(): Promise<User> {
  const user = await requireUser("/member");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role !== "MEMBER" || !MEMBER_AREA_STATUSES.includes(user.status)) redirect("/apply/status");
  return user;
}

/** 会員エリアの全機能（ACTIVE / CANCEL_REQUESTED のみ）。PAST_DUE は支払い案内へ */
export async function requireActiveMember(): Promise<User> {
  const user = await requireMemberArea();
  if (!FULL_ACCESS_STATUSES.includes(user.status)) redirect("/member/payment-required");
  return user;
}

/** Server Action 用: 例外を投げる版（redirect ではなくエラーで中断したい場合） */
export class AuthError extends Error {}
export async function assertAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new AuthError("権限がありません");
  return user;
}

/** Server Action 用: 会員エリアの全機能を使える会員（ACTIVE / CANCEL_REQUESTED） */
export async function assertActiveMember(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER" || !FULL_ACCESS_STATUSES.includes(user.status)) throw new AuthError("権限がありません");
  return user;
}
/** Server Action 用: 会員情報管理を使える会員（PAST_DUE 含む） */
export async function assertMemberArea(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER" || !MEMBER_AREA_STATUSES.includes(user.status)) throw new AuthError("権限がありません");
  return user;
}
