"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertActiveMember, assertMemberArea } from "@/lib/auth";
import { readCart, writeCart } from "@/lib/cart";
import { transitionStatus } from "@/lib/status";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { withTax } from "@/lib/constants";
import { PROFILE_FIELDS, type Visibility } from "@/lib/profile";
import { sendMail, MAIL_FOOTER } from "@/lib/mail";
import { bool, done, fail, int, optStr, str, type ActionState } from "@/lib/action-state";

// ---------------------------------------------------------------------------
// イベント予約
// ---------------------------------------------------------------------------
export async function registerEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertActiveMember();
  const eventId = str(fd, "eventId");
  const memberNote = optStr(fd, "memberNote");
  if (memberNote && memberNote.length > 1000) return fail("備考は1000文字以内で入力してください");
  const result = await prisma.$transaction(async (tx) => {
    const ev = await tx.event.findFirst({ where: { id: eventId, published: true } });
    if (!ev) return { error: "イベントが見つかりません" };
    if (ev.startsAt < new Date()) return { error: "このイベントの申込は終了しました" };
    const active = await tx.eventRegistration.count({ where: { eventId, status: { in: ["APPLIED", "CONFIRMED"] }, NOT: { userId: user.id } } });
    const status = ev.capacity && active >= ev.capacity ? "WAITLIST" : "APPLIED";
    await tx.eventRegistration.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: { eventId, userId: user.id, status, memberNote },
      update: { status, memberNote },
    });
    return { status };
  });
  if ("error" in result) return fail(result.error as string);
  revalidatePath(`/member/events/${eventId}`);
  return done(result.status === "WAITLIST" ? "定員に達しているため、キャンセル待ちで受け付けました。" : "お申し込みを受け付けました。参加確定のご連絡をお待ちください。");
}

export async function cancelRegistrationAction(fd: FormData): Promise<void> {
  const user = await assertActiveMember();
  const eventId = str(fd, "eventId");
  await prisma.eventRegistration.updateMany({ where: { eventId, userId: user.id }, data: { status: "CANCELLED" } });
  revalidatePath(`/member/events/${eventId}`);
}

// ---------------------------------------------------------------------------
// ストア
// ---------------------------------------------------------------------------
export async function addToCartAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertActiveMember();
  const productId = str(fd, "productId");
  const qty = int(fd, "quantity") ?? 1;
  if (qty < 1 || qty > 99) return fail("数量が正しくありません");
  const product = await prisma.product.findFirst({ where: { id: productId, published: true } });
  if (!product) return fail("商品が見つかりません");
  const cart = await readCart();
  const next = Math.min((cart[productId] ?? 0) + qty, 99);
  if (next > product.stock) return fail("在庫が不足しています");
  cart[productId] = next;
  await writeCart(cart);
  return done("カートに追加しました");
}

export async function updateCartAction(fd: FormData): Promise<void> {
  await assertActiveMember();
  const cart = await readCart();
  const productId = str(fd, "productId");
  const qty = int(fd, "quantity") ?? 0;
  if (qty <= 0) delete cart[productId];
  else cart[productId] = Math.min(qty, 99);
  await writeCart(cart);
  revalidatePath("/member/store/cart");
}

export async function placeOrderAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertActiveMember();
  if (!(await rateLimit(`order:${user.id}`, 10, 3600))) return fail(RATE_LIMIT_MESSAGE);
  const cart = await readCart();
  const ids = Object.keys(cart);
  if (ids.length === 0) return fail("カートが空です");
  const shippingName = str(fd, "shippingName");
  const postalCode = str(fd, "postalCode");
  const shippingAddress = str(fd, "shippingAddress");
  if (!shippingName || !/^\d{3}-?\d{4}$/.test(postalCode) || !shippingAddress) return fail("お届け先（氏名・郵便番号・住所）を正しく入力してください");

  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: ids }, published: true } });
      if (products.length !== ids.length) throw new Error("販売終了の商品がカートに含まれています");
      let subtotal = 0;
      for (const p of products) {
        const q = cart[p.id];
        const res = await tx.product.updateMany({ where: { id: p.id, stock: { gte: q } }, data: { stock: { decrement: q } } });
        if (res.count !== 1) throw new Error(`「${p.name}」の在庫が不足しています`);
        subtotal += p.price * q;
      }
      const total = withTax(subtotal);
      const order = await tx.order.create({
        data: {
          userId: user.id,
          subtotal,
          tax: total - subtotal,
          total,
          shippingName,
          postalCode,
          shippingAddress,
          note: optStr(fd, "note"),
          items: { create: products.map((p) => ({ productId: p.id, name: p.name, unitPrice: p.price, quantity: cart[p.id] })) },
        },
      });
      return order.id;
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "注文に失敗しました");
  }
  await writeCart({});
  await sendMail({
    to: user.email,
    subject: "【OWNERS GOLF CLUB】ご注文を受け付けました",
    text: `${user.name} 様\n\nご注文を受け付けました（注文番号: ${orderId.slice(-8)}）。\nお支払い方法・お届けについては事務局よりご案内いたします。` + MAIL_FOOTER,
  });
  redirect("/member/store/orders?ordered=1");
}

// ---------------------------------------------------------------------------
// 会員情報
// ---------------------------------------------------------------------------
export async function updateShippingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertMemberArea();
  const postalCode = str(fd, "postalCode");
  const mailingAddress = str(fd, "mailingAddress");
  const phone = str(fd, "phone");
  if (!/^\d{3}-?\d{4}$/.test(postalCode) || !mailingAddress || mailingAddress.length > 300) return fail("郵便番号・住所を正しく入力してください");
  if (!/^[0-9+\-() ]{10,20}$/.test(phone)) return fail("電話番号の形式が正しくありません");
  await prisma.application.update({ where: { userId: user.id }, data: { postalCode, mailingAddress, phone } });
  revalidatePath("/member/account");
  return done("発送先・連絡先を更新しました");
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertMemberArea();
  const data: Record<string, string | null> = {};
  const visibility: Visibility = {};
  for (const [k] of PROFILE_FIELDS) {
    const v = optStr(fd, k);
    if (v && v.length > 2000) return fail("入力が長すぎます");
    data[k] = v;
    if (bool(fd, `show_${k}`)) visibility[k] = true;
  }
  if (data.website && !/^https?:\/\//.test(data.website)) return fail("WebサイトのURLは https:// から入力してください");
  await prisma.memberProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data, visibility, listed: bool(fd, "listed") },
    update: { ...data, visibility, listed: bool(fd, "listed") },
  });
  revalidatePath("/member/directory");
  return done("会員紹介の設定を保存しました");
}

export async function requestCancellationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertMemberArea();
  if (user.status !== "ACTIVE") return fail("現在のステータスでは退会申請できません。事務局へお問い合わせください。");
  if (fd.get("agree") !== "on") return fail("注意事項への同意が必要です");
  const reason = optStr(fd, "reason");
  const ok = await prisma.$transaction((tx) =>
    transitionStatus(tx, {
      userId: user.id,
      to: "CANCEL_REQUESTED",
      expectedFrom: ["ACTIVE"],
      changedById: user.id,
      note: reason ? `退会申請（理由: ${reason.slice(0, 1000)}）` : "退会申請",
    }),
  );
  if (!ok) return fail("退会申請に失敗しました。再読み込みしてお試しください。");
  await sendMail({
    to: user.email,
    subject: "【OWNERS GOLF CLUB】退会申請を受け付けました",
    text: `${user.name} 様\n\n退会申請を受け付けました。事務局にて確認後、現在の請求期間の末日をもって退会となります。` + MAIL_FOOTER,
  });
  revalidatePath("/member/account");
  return done("退会申請を受け付けました。事務局の確認後、現在の請求期間の末日をもって退会となります。");
}

export async function withdrawCancellationAction(): Promise<void> {
  const user = await assertMemberArea();
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  // 運営が承認済み（期間末解約予約済み）の場合は本人では取り下げ不可
  if (user.status === "CANCEL_REQUESTED" && !sub?.cancelAtPeriodEnd) {
    await prisma.$transaction((tx) =>
      transitionStatus(tx, { userId: user.id, to: "ACTIVE", expectedFrom: ["CANCEL_REQUESTED"], changedById: user.id, note: "本人が退会申請を取り下げ" }),
    );
  }
  revalidatePath("/member/account");
  redirect("/member/account");
}
