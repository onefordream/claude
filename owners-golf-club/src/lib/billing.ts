import "server-only";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getStripe, isMockMode } from "./stripe";
import { transitionStatus } from "./status";
import { sendMail, MAIL_FOOTER } from "./mail";
import { appUrl } from "./request";
import { ENTRY_FEE_INCL, MONTHLY_FEE_INCL } from "./constants";
import { randomToken } from "./crypto";

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// 会員番号の採番（OGC-000001形式。Counter を原子的にインクリメントするので再利用されない）
// ---------------------------------------------------------------------------
export async function nextMemberNumber(tx: Tx): Promise<string> {
  const c = await tx.counter.upsert({
    where: { key: "member_number" },
    create: { key: "member_number", value: 1 },
    update: { value: { increment: 1 } },
  });
  return `OGC-${String(c.value).padStart(6, "0")}`;
}

/** 決済画面 / Checkout作成API 共通のサーバー側検証: APPROVED の申請者のみ */
export async function assertCanCheckout(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "APPLICANT" || user.status !== "APPROVED") {
    throw new CheckoutNotAllowedError();
  }
  return user;
}
export class CheckoutNotAllowedError extends Error {
  constructor() {
    super("決済に進めるのは審査で承認された方のみです");
  }
}

// ---------------------------------------------------------------------------
// Checkout 作成（入会金 + 初月会費を1回の Checkout（subscription モード）で決済）
// ---------------------------------------------------------------------------
export async function createCheckout(userId: string): Promise<string> {
  const user = await assertCanCheckout(userId);

  if (isMockMode()) {
    const sessionId = `mock_cs_${randomToken(12)}`;
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, checkoutSessionId: sessionId, isMock: true },
      update: { checkoutSessionId: sessionId, isMock: true },
    });
    return `/apply/payment/mock?session_id=${encodeURIComponent(sessionId)}`;
  }

  const stripe = getStripe();
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  let customerId = sub?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    sub = await prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId, isMock: false },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    locale: "ja",
    line_items: [
      { price: process.env.STRIPE_PRICE_MONTHLY as string, quantity: 1 }, // 月会費（税込2,178円）
      { price: process.env.STRIPE_PRICE_ENTRY_FEE as string, quantity: 1 }, // 入会金（税込11,000円・初回のみ）
    ],
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    success_url: `${appUrl()}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/apply/payment?canceled=1`,
  });
  await prisma.subscription.update({ where: { userId }, data: { checkoutSessionId: session.id } });
  if (!session.url) throw new Error("Checkout URL could not be created");
  return session.url;
}

// ---------------------------------------------------------------------------
// 会員化（決済完了時）。Webhook / 成功リダイレクト / モック から呼ばれ、冪等に動作する。
// ---------------------------------------------------------------------------
export async function activateMembership(params: {
  userId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
  isMock?: boolean;
  currentPeriodEnd?: Date | null;
  subscriptionStatus?: string | null;
}): Promise<boolean> {
  const activated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: params.userId } });
    if (!user) return false;

    await tx.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeCustomerId: params.customerId ?? null,
        stripeSubscriptionId: params.subscriptionId ?? null,
        checkoutSessionId: params.checkoutSessionId ?? null,
        status: params.subscriptionStatus ?? "active",
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        isMock: params.isMock ?? false,
      },
      update: {
        ...(params.customerId ? { stripeCustomerId: params.customerId } : {}),
        ...(params.subscriptionId ? { stripeSubscriptionId: params.subscriptionId } : {}),
        ...(params.checkoutSessionId ? { checkoutSessionId: params.checkoutSessionId } : {}),
        status: params.subscriptionStatus ?? "active",
        ...(params.currentPeriodEnd ? { currentPeriodEnd: params.currentPeriodEnd } : {}),
        isMock: params.isMock ?? false,
      },
    });

    if (user.status !== "APPROVED") return false; // 既に会員化済み、または承認されていない
    const memberNumber = user.memberNumber ?? (await nextMemberNumber(tx));
    const ok = await transitionStatus(tx, {
      userId: user.id,
      to: "ACTIVE",
      expectedFrom: ["APPROVED"],
      note: params.isMock ? "決済完了（モック決済）" : "決済完了（Stripe）",
      extra: { role: "MEMBER", memberNumber, memberSince: user.memberSince ?? new Date() },
    });
    if (!ok) return false;
    await tx.cardShipment.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    const app = await tx.application.findUnique({ where: { userId: user.id } });
    await tx.memberProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: app?.companyName,
        position: app?.position,
        industry: app?.industry,
        businessDescription: app?.businessDescription,
        website: app?.website,
        sns: app?.sns,
        golfHistory: app?.golfHistory,
        averageScore: app?.averageScore,
      },
      update: {},
    });
    return true;
  });

  if (activated) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (user) {
      await sendMail({
        to: user.email,
        subject: "【OWNERS GOLF CLUB】ご入会手続きが完了しました",
        text:
          `${user.name} 様\n\nOWNERS GOLF CLUBへのご入会ありがとうございます。\n` +
          `会員番号: ${user.memberNumber}\n\n会員証とオリジナルネームプレートを準備し、ご登録住所へ発送いたします。\n` +
          `会員エリア: ${appUrl()}/member` +
          MAIL_FOOTER,
      });
    }
  }
  return activated;
}

// ---------------------------------------------------------------------------
// モック決済（Stripe 未設定時のみ）
// ---------------------------------------------------------------------------
export async function completeMockCheckout(userId: string, sessionId: string): Promise<boolean> {
  if (!isMockMode()) throw new Error("mock mode only");
  await assertCanCheckout(userId);
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.checkoutSessionId !== sessionId) throw new Error("invalid mock session");
  const periodEnd = addOneMonth(new Date());
  const ok = await activateMembership({
    userId,
    customerId: `mock_cus_${userId}`,
    subscriptionId: `mock_sub_${userId}`,
    checkoutSessionId: sessionId,
    isMock: true,
    currentPeriodEnd: periodEnd,
  });
  if (ok) {
    await prisma.payment.create({
      data: {
        userId,
        type: "INITIAL",
        status: "PAID",
        amount: ENTRY_FEE_INCL + MONTHLY_FEE_INCL,
        stripeInvoiceId: `mock_in_${randomToken(10)}`,
        description: "入会金＋初月会費（モック決済）",
        paidAt: new Date(),
        isMock: true,
      },
    });
  }
  return ok;
}

/** モック: 月次課金のシミュレーション（管理画面から実行） */
export async function simulateMockInvoice(userId: string, succeeded: boolean): Promise<void> {
  if (!isMockMode()) throw new Error("mock mode only");
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.isMock) throw new Error("not a mock subscription");
  await recordInvoice({
    userId,
    invoiceId: `mock_in_${randomToken(10)}`,
    amount: MONTHLY_FEE_INCL,
    paid: succeeded,
    type: "MONTHLY",
    paymentIntentId: null,
    isMock: true,
  });
  if (succeeded) {
    await prisma.subscription.update({
      where: { userId },
      data: { status: "active", currentPeriodEnd: addOneMonth(sub.currentPeriodEnd ?? new Date()) },
    });
  } else {
    await prisma.subscription.update({ where: { userId }, data: { status: "past_due" } });
  }
}

/** モック: 期間末到来（解約予約済みの会員を CANCELLED にする） */
export async function simulateMockPeriodEnd(userId: string): Promise<void> {
  if (!isMockMode()) throw new Error("mock mode only");
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.isMock || !sub.cancelAtPeriodEnd) throw new Error("退会承認済み（期間末解約予約）のモック会員のみ実行できます");
  await finalizeCancellation(userId, "期間末到来による退会（モック）");
}

function addOneMonth(d: Date): Date {
  const n = new Date(d);
  n.setMonth(n.getMonth() + 1);
  return n;
}

// ---------------------------------------------------------------------------
// 請求記録・支払い失敗・退会確定（Webhook / モック共通）
// ---------------------------------------------------------------------------
async function recordInvoice(p: {
  userId: string;
  invoiceId: string;
  amount: number;
  paid: boolean;
  type: "INITIAL" | "MONTHLY";
  paymentIntentId: string | null;
  isMock?: boolean;
}) {
  await prisma.payment.upsert({
    where: { stripeInvoiceId: p.invoiceId },
    create: {
      userId: p.userId,
      type: p.type,
      status: p.paid ? "PAID" : "FAILED",
      amount: p.amount,
      stripeInvoiceId: p.invoiceId,
      stripePaymentIntentId: p.paymentIntentId,
      description: p.type === "INITIAL" ? "入会金＋初月会費" : "月会費",
      paidAt: p.paid ? new Date() : null,
      isMock: p.isMock ?? false,
    },
    update: {
      // 一度 PAID になったものは失敗で上書きしない
      ...(p.paid ? { status: "PAID", paidAt: new Date() } : {}),
      ...(p.paymentIntentId ? { stripePaymentIntentId: p.paymentIntentId } : {}),
    },
  });

  if (p.paid) {
    // 支払い遅延から回復
    await prisma.$transaction((tx) =>
      transitionStatus(tx, { userId: p.userId, to: "ACTIVE", expectedFrom: ["PAST_DUE"], note: "未払い請求の支払いを確認" }),
    );
  } else {
    const changed = await prisma.$transaction((tx) =>
      transitionStatus(tx, { userId: p.userId, to: "PAST_DUE", expectedFrom: ["ACTIVE"], note: "月会費の支払いに失敗" }),
    );
    if (changed) {
      const user = await prisma.user.findUnique({ where: { id: p.userId } });
      if (user) await sendPaymentFailedMail(user.email, user.name);
    }
  }
}

export async function sendPaymentFailedMail(email: string, name: string) {
  await sendMail({
    to: email,
    subject: "【OWNERS GOLF CLUB】月会費のお支払いが確認できませんでした",
    text:
      `${name} 様\n\n月会費のお支払いが確認できませんでした。\n` +
      `お手数ですが、会員情報管理ページからお支払い方法（カード）の変更をお願いいたします。\n` +
      `${appUrl()}/member/account` +
      MAIL_FOOTER,
  });
}

async function finalizeCancellation(userId: string, note: string) {
  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { userId }, data: { status: "canceled", cancelAtPeriodEnd: false } });
    await transitionStatus(tx, {
      userId,
      to: "CANCELLED",
      expectedFrom: ["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCEL_REQUESTED"],
      note,
    });
  });
  // 退会者のセッションを無効化
  await prisma.session.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// 退会承認（管理者）: Stripe 上は期間末で解約
// ---------------------------------------------------------------------------
export async function approveCancellation(userId: string, adminId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user || user.status !== "CANCEL_REQUESTED") throw new Error("退会申請中の会員ではありません");
  const sub = user.subscription;
  let periodEnd: Date | null = sub?.currentPeriodEnd ?? null;
  if (sub?.stripeSubscriptionId && !sub.isMock) {
    const s = await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    periodEnd = subscriptionPeriodEnd(s) ?? periodEnd;
  }
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd },
    });
    await tx.statusHistory.create({
      data: {
        userId,
        fromStatus: "CANCEL_REQUESTED",
        toStatus: "CANCEL_REQUESTED",
        changedById: adminId,
        note: "退会申請を承認（期間末で解約予約）",
      },
    });
  });
  await sendMail({
    to: user.email,
    subject: "【OWNERS GOLF CLUB】退会手続きを承りました",
    text:
      `${user.name} 様\n\n退会申請を承りました。現在の請求期間の末日（${periodEnd ? periodEnd.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) : "請求期間末"}）をもって退会となります。\n` +
      `それまでは会員エリアをご利用いただけます。` +
      MAIL_FOOTER,
  });
}

/** 退会申請の取り下げ（管理者操作）: ACTIVE に戻し、期間末解約予約も解除 */
export async function revertCancellation(userId: string, adminId: string, note?: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.cancelAtPeriodEnd && sub.stripeSubscriptionId && !sub.isMock) {
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
  }
  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { userId }, data: { cancelAtPeriodEnd: false } });
    await transitionStatus(tx, {
      userId,
      to: "ACTIVE",
      expectedFrom: ["CANCEL_REQUESTED"],
      changedById: adminId,
      note: note || "退会申請の取り下げ",
    });
  });
}

// ---------------------------------------------------------------------------
// Customer Portal（カード変更・領収書確認）
// ---------------------------------------------------------------------------
export async function createPortalUrl(userId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (isMockMode() || !sub?.stripeCustomerId || sub.isMock) return "/member/account/portal-mock";
  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl()}/member/account`,
    locale: "ja",
  });
  return portal.url;
}

// ---------------------------------------------------------------------------
// Webhook イベント処理
// ---------------------------------------------------------------------------
function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

function subscriptionPeriodEnd(s: Stripe.Subscription): Date | null {
  const legacy = (s as unknown as { current_period_end?: number }).current_period_end;
  const fromItem = s.items?.data?.[0]?.current_period_end;
  const ts = fromItem ?? legacy;
  return ts ? new Date(ts * 1000) : null;
}

function invoiceSubscriptionInfo(inv: Stripe.Invoice): { subscriptionId: string | null; userId: string | null } {
  const details = inv.parent?.subscription_details ?? null;
  const legacySub = (inv as unknown as { subscription?: string | { id: string } | null }).subscription;
  return {
    subscriptionId: idOf(details?.subscription as string | { id: string } | null | undefined) ?? idOf(legacySub),
    userId: (details?.metadata?.userId as string | undefined) ?? null,
  };
}

function invoicePaymentIntent(inv: Stripe.Invoice): string | null {
  const legacy = (inv as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
  return idOf(legacy);
}

async function resolveUserId(opts: {
  subscriptionId?: string | null;
  customerId?: string | null;
  metadataUserId?: string | null;
}): Promise<string | null> {
  if (opts.subscriptionId) {
    const s = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: opts.subscriptionId } });
    if (s) return s.userId;
  }
  if (opts.customerId) {
    const s = await prisma.subscription.findUnique({ where: { stripeCustomerId: opts.customerId } });
    if (s) return s.userId;
  }
  if (opts.metadataUserId) {
    const u = await prisma.user.findUnique({ where: { id: opts.metadataUserId }, select: { id: true } });
    if (u) return u.id;
  }
  return null;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode !== "subscription") return;
      if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return;
      await completeFromCheckoutSession(s);
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const info = invoiceSubscriptionInfo(inv);
      const userId = await resolveUserId({
        subscriptionId: info.subscriptionId,
        customerId: idOf(inv.customer as string | { id: string } | null),
        metadataUserId: info.userId,
      });
      if (!userId || !inv.id) {
        console.warn(`[stripe] ${event.type}: user not resolved (event=${event.id})`);
        return;
      }
      await recordInvoice({
        userId,
        invoiceId: inv.id,
        amount: event.type === "invoice.paid" ? inv.amount_paid : inv.amount_due,
        paid: event.type === "invoice.paid",
        type: inv.billing_reason === "subscription_create" ? "INITIAL" : "MONTHLY",
        paymentIntentId: invoicePaymentIntent(inv),
      });
      return;
    }
    case "customer.subscription.updated": {
      const s = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId({
        subscriptionId: s.id,
        customerId: idOf(s.customer as string | { id: string }),
        metadataUserId: s.metadata?.userId ?? null,
      });
      if (!userId) return;
      await prisma.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: s.id,
          status: s.status,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          currentPeriodEnd: subscriptionPeriodEnd(s),
        },
      });
      if (s.status === "past_due" || s.status === "unpaid") {
        await prisma.$transaction((tx) =>
          transitionStatus(tx, { userId, to: "PAST_DUE", expectedFrom: ["ACTIVE"], note: `Stripe: subscription ${s.status}` }),
        );
      }
      return;
    }
    case "customer.subscription.deleted": {
      const s = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId({
        subscriptionId: s.id,
        customerId: idOf(s.customer as string | { id: string }),
        metadataUserId: s.metadata?.userId ?? null,
      });
      if (!userId) return;
      await finalizeCancellation(userId, "Stripe: サブスクリプション終了（期間末解約）");
      return;
    }
    default:
      return;
  }
}

/** checkout.session.completed / 成功リダイレクト 共通 */
export async function completeFromCheckoutSession(s: Stripe.Checkout.Session): Promise<boolean> {
  const userId = s.metadata?.userId ?? s.client_reference_id;
  if (!userId) return false;
  const subscriptionId = idOf(s.subscription as string | { id: string } | null);
  let periodEnd: Date | null = null;
  let subStatus: string | null = null;
  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      periodEnd = subscriptionPeriodEnd(sub);
      subStatus = sub.status;
    } catch (e) {
      console.warn("[stripe] subscription retrieve failed", e instanceof Error ? e.message : e);
    }
  }
  return activateMembership({
    userId,
    customerId: idOf(s.customer as string | { id: string } | null),
    subscriptionId,
    checkoutSessionId: s.id,
    currentPeriodEnd: periodEnd,
    subscriptionStatus: subStatus,
  });
}
