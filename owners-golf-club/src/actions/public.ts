"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { done, fail, str, optStr, type ActionState } from "@/lib/action-state";
import { sendMail, MAIL_FOOTER } from "@/lib/mail";

const contactSchema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("メールアドレスの形式が正しくありません").max(254),
  company: z.string().max(200).nullable(),
  message: z.string().min(1, "お問い合わせ内容を入力してください").max(4000),
});

export async function submitContact(_: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, "website_hp")) return done("送信しました。"); // ハニーポット
  const ip = await clientIp();
  if (!(await rateLimit(`contact:${ip}`, 5, 3600))) return fail(RATE_LIMIT_MESSAGE);
  const parsed = contactSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    company: optStr(fd, "company"),
    message: str(fd, "message"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await prisma.inquiry.create({ data: { kind: "CONTACT", ...parsed.data } });
  await sendMail({
    to: parsed.data.email,
    subject: "【OWNERS GOLF CLUB】お問い合わせを受け付けました",
    text: `${parsed.data.name} 様\n\nお問い合わせを受け付けました。内容を確認のうえ、事務局よりご連絡いたします。` + MAIL_FOOTER,
  });
  return done("お問い合わせを受け付けました。事務局よりご連絡いたします。");
}

const preSchema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("メールアドレスの形式が正しくありません").max(254),
  company: z.string().min(1, "会社名を入力してください").max(200),
  position: z.string().max(100).nullable(),
  message: z.string().max(2000).nullable(),
});

export async function submitPreRegistration(_: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, "website_hp")) return done("登録しました。");
  const ip = await clientIp();
  if (!(await rateLimit(`prereg:${ip}`, 5, 3600))) return fail(RATE_LIMIT_MESSAGE);
  if (fd.get("agree") !== "on") return fail("個人情報保護方針への同意が必要です");
  const parsed = preSchema.safeParse({
    name: str(fd, "name"),
    email: str(fd, "email"),
    company: str(fd, "company"),
    position: optStr(fd, "position"),
    message: optStr(fd, "message"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await prisma.inquiry.create({ data: { kind: "PRE_REGISTRATION", ...parsed.data } });
  await sendMail({
    to: parsed.data.email,
    subject: "【OWNERS GOLF CLUB】事前登録を受け付けました",
    text: `${parsed.data.name} 様\n\n事前登録ありがとうございます。始動に向けた最新情報を順次お知らせします。` + MAIL_FOOTER,
  });
  return done("事前登録を受け付けました。最新情報を順次お知らせします。");
}
