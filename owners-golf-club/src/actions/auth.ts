"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroyAllSessions,
  dummyVerify,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { appUrl, clientIp } from "@/lib/request";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendMail, MAIL_FOOTER } from "@/lib/mail";
import { done, fail, str, optStr, type ActionState } from "@/lib/action-state";
import { MEMBER_AREA_STATUSES } from "@/lib/constants";
import { transitionStatus } from "@/lib/status";

const EMAIL_TOKEN_TTL_H = 24;
const RESET_TOKEN_TTL_MIN = 60;

const password = z
  .string()
  .min(10, "パスワードは10文字以上で設定してください")
  .max(128, "パスワードは128文字以内で設定してください")
  .regex(/[A-Za-z]/, "パスワードには英字を含めてください")
  .regex(/[0-9]/, "パスワードには数字を含めてください");

const req = (label: string, max = 200) => z.string().min(1, `${label}を入力してください`).max(max, `${label}は${max}文字以内で入力してください`);
const opt = (max = 200) => z.string().max(max).nullable();

const applySchema = z.object({
  name: req("氏名", 100),
  email: z.string().email("メールアドレスの形式が正しくありません").max(254),
  phone: z.string().regex(/^[0-9+\-() ]{10,20}$/, "電話番号の形式が正しくありません"),
  companyName: req("会社名"),
  companyAddress: req("会社所在地", 300),
  position: req("役職", 100),
  industry: req("業種", 100),
  businessDescription: req("事業内容", 2000),
  website: z.string().url("会社WebサイトのURLを https:// から入力してください").max(300),
  sns: opt(300),
  golfHistory: opt(100),
  averageScore: opt(50),
  postalCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号は 123-4567 の形式で入力してください"),
  mailingAddress: req("郵送先住所", 300),
  cardDisplayName: req("会員証・ネームプレート用表記名", 40),
  password,
});

const APPLY_FIELDS = [
  "name", "email", "phone", "companyName", "companyAddress", "position", "industry", "businessDescription",
  "website", "sns", "golfHistory", "averageScore", "postalCode", "mailingAddress", "cardDisplayName",
] as const;

async function issueEmailVerification(userId: string, email: string, name: string) {
  const token = randomToken();
  await prisma.emailVerificationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_H * 3600 * 1000) },
  });
  await sendMail({
    to: email,
    subject: "【OWNERS GOLF CLUB】メールアドレスのご確認",
    text:
      `${name} 様\n\nOWNERS GOLF CLUBへの入会申請ありがとうございます。\n` +
      `以下のリンクからメールアドレスの確認を完了してください（有効期限 ${EMAIL_TOKEN_TTL_H}時間）。\n\n` +
      `${appUrl()}/verify-email?token=${token}` +
      MAIL_FOOTER,
  });
}

export async function applyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values: Record<string, string> = {};
  for (const k of APPLY_FIELDS) values[k] = str(fd, k);

  const ip = await clientIp();
  if (!(await rateLimit(`apply:${ip}`, 5, 3600))) return fail(RATE_LIMIT_MESSAGE, undefined, values);
  if (fd.get("agreeTerms") !== "on" || fd.get("agreePrivacy") !== "on") {
    return fail("入会規約と個人情報保護方針への同意が必要です", undefined, values);
  }
  if (str(fd, "password") !== str(fd, "passwordConfirm")) {
    return fail("確認用パスワードが一致しません", undefined, values);
  }
  const parsed = applySchema.safeParse({
    ...values,
    email: values.email.toLowerCase(),
    sns: optStr(fd, "sns"),
    golfHistory: optStr(fd, "golfHistory"),
    averageScore: optStr(fd, "averageScore"),
    password: str(fd, "password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message, undefined, values);
  const d = parsed.data;

  const passwordHash = await hashPassword(d.password);
  const now = new Date();
  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: d.email, passwordHash, name: d.name, role: "APPLICANT", status: "APPLIED" },
      });
      await tx.application.create({
        data: {
          userId: user.id,
          phone: d.phone,
          companyName: d.companyName,
          companyAddress: d.companyAddress,
          position: d.position,
          industry: d.industry,
          businessDescription: d.businessDescription,
          website: d.website,
          sns: d.sns,
          golfHistory: d.golfHistory,
          averageScore: d.averageScore,
          postalCode: d.postalCode,
          mailingAddress: d.mailingAddress,
          cardDisplayName: d.cardDisplayName,
          agreedTermsAt: now,
          agreedPrivacyAt: now,
        },
      });
      await tx.statusHistory.create({
        data: { userId: user.id, fromStatus: null, toStatus: "APPLIED", changedById: user.id, note: "入会申請" },
      });
      return user.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("このメールアドレスでは申請できません。既に申請済みの方はログインして申請状況をご確認ください。", undefined, values);
    }
    throw e;
  }

  await issueEmailVerification(userId, d.email, d.name);
  await createSession({ id: userId, role: "APPLICANT" });
  redirect("/apply/submitted");
}

export async function resendVerificationAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.emailVerifiedAt) redirect("/apply/status");
  if (await rateLimit(`verify-resend:${user.id}`, 3, 3600)) {
    await issueEmailVerification(user.id, user.email, user.name);
    redirect("/apply/status?resent=1");
  }
  redirect("/apply/status?resent=limit");
}

export async function verifyEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`verify:${ip}`, 20, 3600))) return fail(RATE_LIMIT_MESSAGE);
  const token = str(fd, "token");
  if (!token) return fail("リンクが無効です");
  const now = new Date();
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < now) {
    return fail("リンクが無効か、有効期限が切れています。ログイン後の申請状況画面から確認メールを再送してください。");
  }
  const used = await prisma.emailVerificationToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (used.count !== 1) return fail("リンクは既に使用されています");
  await prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
  return done("メールアドレスの確認が完了しました。");
}

function safeNext(next: string): string | null {
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const pw = str(fd, "password");
  const ip = await clientIp();
  const values = { email };
  if (!(await rateLimit(`login-ip:${ip}`, 30, 900)) || !(await rateLimit(`login-email:${email}`, 10, 900))) {
    return fail(RATE_LIMIT_MESSAGE, undefined, values);
  }
  if (!email || !pw) return fail("メールアドレスとパスワードを入力してください", undefined, values);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await dummyVerify(pw);
    return fail("メールアドレスまたはパスワードが正しくありません", undefined, values);
  }
  if (!(await verifyPassword(pw, user.passwordHash))) {
    return fail("メールアドレスまたはパスワードが正しくありません", undefined, values);
  }
  if (user.status === "CANCELLED" && user.role !== "ADMIN") {
    return fail("退会済みのアカウントではログインできません", undefined, values);
  }
  await createSession(user);
  const next = safeNext(str(fd, "next"));
  if (user.role === "ADMIN") redirect(next?.startsWith("/admin") ? next : "/admin");
  if (user.role === "MEMBER" && MEMBER_AREA_STATUSES.includes(user.status)) redirect(next?.startsWith("/member") ? next : "/member");
  redirect("/apply/status");
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`forgot-ip:${ip}`, 10, 3600)) || !(await rateLimit(`forgot-email:${email}`, 3, 3600))) {
    return fail(RATE_LIMIT_MESSAGE);
  }
  const genericMsg = "ご入力のメールアドレスが登録されている場合、パスワード再設定用のメールをお送りしました。";
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user && user.status !== "CANCELLED") {
    const token = randomToken();
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000) },
    });
    await sendMail({
      to: user.email,
      subject: "【OWNERS GOLF CLUB】パスワード再設定のご案内",
      text:
        `${user.name} 様\n\n以下のリンクからパスワードを再設定してください（有効期限 ${RESET_TOKEN_TTL_MIN}分・1回限り）。\n\n` +
        `${appUrl()}/password/reset?token=${token}\n\nお心当たりがない場合は、本メールを破棄してください。` +
        MAIL_FOOTER,
    });
  }
  return done(genericMsg);
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`reset:${ip}`, 10, 3600))) return fail(RATE_LIMIT_MESSAGE);
  const token = str(fd, "token");
  const pw = str(fd, "password");
  if (pw !== str(fd, "passwordConfirm")) return fail("確認用パスワードが一致しません");
  const parsed = password.safeParse(pw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const now = new Date();
  const row = token ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } }) : null;
  if (!row || row.usedAt || row.expiresAt < now) {
    return fail("リンクが無効か、有効期限が切れています。もう一度再設定をお申し込みください。");
  }
  const used = await prisma.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (used.count !== 1) return fail("リンクは既に使用されています");
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(pw) } });
  await destroyAllSessions(row.userId);
  return done("パスワードを再設定しました。新しいパスワードでログインしてください。");
}

/** 追加情報の提出（NEEDS_INFO の申請者本人のみ）→ 審査待ちに戻す */
export async function submitAdditionalInfoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "APPLICANT") return fail("ログインしてください");
  if (user.status !== "NEEDS_INFO") return fail("現在、追加情報の提出は受け付けていません");
  if (!(await rateLimit(`addinfo:${user.id}`, 10, 3600))) return fail(RATE_LIMIT_MESSAGE);
  const info = str(fd, "additionalInfo");
  if (!info || info.length > 4000) return fail("追加情報を4000文字以内で入力してください");
  await prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { userId: user.id }, data: { additionalInfo: info, additionalInfoAt: new Date() } });
    await transitionStatus(tx, {
      userId: user.id,
      to: "APPLIED",
      expectedFrom: ["NEEDS_INFO"],
      changedById: user.id,
      note: "申請者が追加情報を提出",
    });
  });
  redirect("/apply/status?info_submitted=1");
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("ログインしてください");
  if (!(await rateLimit(`chpw:${user.id}`, 5, 900))) return fail(RATE_LIMIT_MESSAGE);
  if (!(await verifyPassword(str(fd, "current"), user.passwordHash))) return fail("現在のパスワードが正しくありません");
  const pw = str(fd, "password");
  if (pw !== str(fd, "passwordConfirm")) return fail("確認用パスワードが一致しません");
  const parsed = password.safeParse(pw);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw) } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createSession(user);
  return done("パスワードを変更しました。");
}
