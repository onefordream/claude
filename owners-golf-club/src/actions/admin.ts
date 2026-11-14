"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MemberStatus, ShipmentStatus, OrderStatus, RegistrationStatus, InquiryStatus, Region, PartnerType, ContentKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertAdmin } from "@/lib/auth";
import { canAdminTransition, transitionStatus } from "@/lib/status";
import { approveCancellation, revertCancellation, sendPaymentFailedMail, simulateMockInvoice, simulateMockPeriodEnd } from "@/lib/billing";
import { sendMail, MAIL_FOOTER } from "@/lib/mail";
import { appUrl } from "@/lib/request";
import { STATUS_LABEL } from "@/lib/constants";
import { fromJstInput } from "@/lib/format";
import { bool, done, fail, int, optStr, str, type ActionState } from "@/lib/action-state";

const MEMBER_STATUSES = Object.keys(STATUS_LABEL) as MemberStatus[];

// ---------------------------------------------------------------------------
// 審査
// ---------------------------------------------------------------------------
export async function saveReviewNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const userId = str(fd, "userId");
  await prisma.application.update({ where: { userId }, data: { reviewNote: optStr(fd, "reviewNote") } });
  revalidatePath(`/admin/applications/${userId}`);
  return done("審査メモを保存しました");
}

export async function reviewDecisionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const userId = str(fd, "userId");
  const decision = str(fd, "decision") as MemberStatus;
  const note = optStr(fd, "note");
  if (!["APPROVED", "REJECTED", "NEEDS_INFO", "APPLIED"].includes(decision)) return fail("不正な操作です");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "APPLICANT") return fail("申請者が見つかりません");
  if (!canAdminTransition(user.status, decision)) {
    return fail(`「${STATUS_LABEL[user.status]}」から「${STATUS_LABEL[decision]}」には変更できません`);
  }
  if (decision === "NEEDS_INFO" && !note) return fail("追加情報の依頼内容を入力してください");

  const ok = await prisma.$transaction(async (tx) => {
    const changed = await transitionStatus(tx, {
      userId,
      to: decision,
      expectedFrom: [user.status],
      changedById: admin.id,
      note: note ?? undefined,
    });
    if (!changed) return false;
    await tx.application.update({
      where: { userId },
      data: {
        reviewedAt: new Date(),
        ...(decision === "NEEDS_INFO" ? { infoRequestMessage: note } : {}),
      },
    });
    return true;
  });
  if (!ok) return fail("ステータスが他の操作で変更されています。再読み込みしてください。");

  const mails: Partial<Record<MemberStatus, { subject: string; text: string }>> = {
    APPROVED: {
      subject: "【OWNERS GOLF CLUB】審査結果のお知らせ（承認）",
      text: `${user.name} 様\n\n審査の結果、ご入会を承認いたしました。\n以下のページからお支払い手続きにお進みください。\n${appUrl()}/apply/payment`,
    },
    REJECTED: {
      subject: "【OWNERS GOLF CLUB】審査結果のお知らせ",
      text: `${user.name} 様\n\nこの度は入会申請をいただきありがとうございました。\n慎重に審査いたしました結果、誠に恐れ入りますが今回はご入会を見送らせていただくこととなりました。`,
    },
    NEEDS_INFO: {
      subject: "【OWNERS GOLF CLUB】追加情報ご提出のお願い",
      text: `${user.name} 様\n\n審査にあたり、追加情報のご提出をお願いいたします。\n\n${note ?? ""}\n\n以下のページからご提出ください。\n${appUrl()}/apply/status`,
    },
  };
  const m = mails[decision];
  if (m) await sendMail({ to: user.email, subject: m.subject, text: m.text + MAIL_FOOTER });
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${userId}`);
  return done(`ステータスを「${STATUS_LABEL[decision]}」に変更しました`);
}

// ---------------------------------------------------------------------------
// 会員管理
// ---------------------------------------------------------------------------
export async function memberStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const userId = str(fd, "userId");
  const to = str(fd, "to") as MemberStatus;
  const note = optStr(fd, "note");
  if (!MEMBER_STATUSES.includes(to)) return fail("不正なステータスです");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user || user.role !== "MEMBER") return fail("会員が見つかりません");
  if (user.status === "CANCEL_REQUESTED" && to === "ACTIVE") {
    try {
      await revertCancellation(userId, admin.id, note ?? undefined);
    } catch (e) {
      return fail(`Stripe の更新に失敗しました: ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    if (!canAdminTransition(user.status, to)) return fail(`「${STATUS_LABEL[user.status]}」から「${STATUS_LABEL[to]}」には変更できません`);
    if (user.status === "SUSPENDED" && to === "ACTIVE" && user.subscription?.status && !["active", "trialing"].includes(user.subscription.status)) {
      return fail("サブスクリプションが有効ではないため ACTIVE に戻せません（支払い状況を確認してください）");
    }
    const ok = await prisma.$transaction((tx) =>
      transitionStatus(tx, { userId, to, expectedFrom: [user.status], changedById: admin.id, note }),
    );
    if (!ok) return fail("ステータスが他の操作で変更されています。再読み込みしてください。");
    if (to === "SUSPENDED") await prisma.session.deleteMany({ where: { userId } });
  }
  revalidatePath(`/admin/members/${userId}`);
  return done(`ステータスを「${STATUS_LABEL[to]}」に変更しました`);
}

export async function approveCancellationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const userId = str(fd, "userId");
  try {
    await approveCancellation(userId, admin.id);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "退会承認に失敗しました");
  }
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return done("退会申請を承認しました（期間末で解約）");
}

export async function mockSimulateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const userId = str(fd, "userId");
  const kind = str(fd, "kind");
  try {
    if (kind === "invoice_paid") await simulateMockInvoice(userId, true);
    else if (kind === "invoice_failed") await simulateMockInvoice(userId, false);
    else if (kind === "period_end") await simulateMockPeriodEnd(userId);
    else return fail("不正な操作です");
  } catch (e) {
    return fail(e instanceof Error ? e.message : "失敗しました");
  }
  revalidatePath(`/admin/members/${userId}`);
  return done("モック処理を実行しました");
}

export async function sendPaymentReminderAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const user = await prisma.user.findUnique({ where: { id: str(fd, "userId") } });
  if (user && user.status === "PAST_DUE") await sendPaymentFailedMail(user.email, user.name);
  redirect("/admin/payments?reminded=1");
}

// ---------------------------------------------------------------------------
// 会員証・ネームプレート発送
// ---------------------------------------------------------------------------
export async function updateShipmentAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") as ShipmentStatus;
  if (!["NOT_REQUESTED", "REQUESTED", "PREPARING", "SHIPPED"].includes(status)) return;
  const current = await prisma.cardShipment.findUnique({ where: { id } });
  if (!current) return;
  await prisma.cardShipment.update({
    where: { id },
    data: {
      status,
      note: optStr(fd, "note"),
      trackingInfo: optStr(fd, "trackingInfo"),
      requestedAt: status === "NOT_REQUESTED" ? null : current.requestedAt ?? new Date(),
      shippedAt: status === "SHIPPED" ? current.shippedAt ?? new Date() : null,
    },
  });
  revalidatePath("/admin/shipments");
}

// ---------------------------------------------------------------------------
// イベント
// ---------------------------------------------------------------------------
const REGIONS: Region[] = ["KANSAI", "KANTO", "OTHER"];

export async function saveEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id");
  const region = str(fd, "region") as Region;
  const startsAt = fromJstInput(str(fd, "startsAt"));
  if (!str(fd, "title") || !str(fd, "venue") || !startsAt || !REGIONS.includes(region)) {
    return fail("タイトル・会場・開催日時・地域は必須です");
  }
  const data = {
    title: str(fd, "title"),
    description: str(fd, "description"),
    region,
    venue: str(fd, "venue"),
    startsAt,
    capacity: int(fd, "capacity"),
    feeNote: optStr(fd, "feeNote"),
    withCaddie: bool(fd, "withCaddie"),
    published: bool(fd, "published"),
    isSample: bool(fd, "isSample"),
    pairingMemo: optStr(fd, "pairingMemo"),
  };
  if (id) {
    await prisma.event.update({ where: { id }, data });
    revalidatePath(`/admin/events/${id}`);
    return done("保存しました");
  }
  const ev = await prisma.event.create({ data });
  redirect(`/admin/events/${ev.id}`);
}

export async function updateRegistrationAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") as RegistrationStatus;
  if (!["APPLIED", "CONFIRMED", "WAITLIST", "CANCELLED"].includes(status)) return;
  const reg = await prisma.eventRegistration.update({ where: { id }, data: { status, adminNote: optStr(fd, "adminNote") } });
  revalidatePath(`/admin/events/${reg.eventId}`);
}

export async function deleteEventAction(fd: FormData): Promise<void> {
  await assertAdmin();
  await prisma.event.delete({ where: { id: str(fd, "id") } });
  redirect("/admin/events");
}

// ---------------------------------------------------------------------------
// 提携ゴルフ場・メーカー
// ---------------------------------------------------------------------------
export async function savePartnerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id");
  const region = str(fd, "region") as Region;
  const type = str(fd, "type") as PartnerType;
  if (!str(fd, "name") || !REGIONS.includes(region) || !["GOLF_COURSE", "MAKER"].includes(type)) return fail("名称・種別・地域は必須です");
  const data = {
    type,
    name: str(fd, "name"),
    region,
    prefecture: optStr(fd, "prefecture"),
    description: str(fd, "description"),
    benefit: str(fd, "benefit"),
    howToUse: str(fd, "howToUse"),
    sortOrder: int(fd, "sortOrder") ?? 0,
    published: bool(fd, "published"),
    isSample: bool(fd, "isSample"),
  };
  if (id) {
    await prisma.partnerCourse.update({ where: { id }, data });
    revalidatePath("/admin/partners");
    return done("保存しました");
  }
  await prisma.partnerCourse.create({ data });
  redirect("/admin/partners");
}

export async function deletePartnerAction(fd: FormData): Promise<void> {
  await assertAdmin();
  await prisma.partnerCourse.delete({ where: { id: str(fd, "id") } });
  redirect("/admin/partners");
}

// ---------------------------------------------------------------------------
// 商品・注文
// ---------------------------------------------------------------------------
export async function saveProductAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id");
  const price = int(fd, "price");
  const stock = int(fd, "stock");
  if (!str(fd, "name") || price === null || price < 0 || stock === null || stock < 0) return fail("商品名・価格（税抜・0以上の整数）・在庫数は必須です");
  const data = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    price,
    stock,
    published: bool(fd, "published"),
    isSample: bool(fd, "isSample"),
  };
  if (id) {
    await prisma.product.update({ where: { id }, data });
    revalidatePath("/admin/products");
    return done("保存しました");
  }
  await prisma.product.create({ data });
  redirect("/admin/products");
}

export async function updateOrderAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") as OrderStatus;
  if (!["RECEIVED", "CONFIRMED", "PREPARING", "SHIPPED", "CANCELLED"].includes(status)) return;
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return;
    // キャンセル時は在庫を戻す（キャンセルからの復帰時は再度引き当て）
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      for (const it of order.items) await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
    }
    if (order.status === "CANCELLED" && status !== "CANCELLED") {
      for (const it of order.items) await tx.product.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity } } });
    }
    await tx.order.update({
      where: { id },
      data: { status, adminNote: optStr(fd, "adminNote"), shippedAt: status === "SHIPPED" ? order.shippedAt ?? new Date() : null },
    });
  });
  revalidatePath("/admin/orders");
}

// ---------------------------------------------------------------------------
// 会員企業紹介・PR掲載
// ---------------------------------------------------------------------------
export async function updateDirectoryFlagsAction(fd: FormData): Promise<void> {
  await assertAdmin();
  await prisma.memberProfile.update({
    where: { id: str(fd, "id") },
    data: { featured: bool(fd, "featured"), hiddenByAdmin: bool(fd, "hiddenByAdmin") },
  });
  revalidatePath("/admin/directory");
}

// ---------------------------------------------------------------------------
// 勉強会・お知らせ
// ---------------------------------------------------------------------------
export async function saveContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id");
  const kind = str(fd, "kind") as ContentKind;
  if (!str(fd, "title") || !["SEMINAR", "ARCHIVE"].includes(kind)) return fail("種別とタイトルは必須です");
  const videoUrl = optStr(fd, "videoUrl");
  if (videoUrl && !/^https:\/\//.test(videoUrl)) return fail("録画URLは https:// から入力してください");
  const data = {
    kind,
    title: str(fd, "title"),
    description: str(fd, "description"),
    scheduledAt: fromJstInput(str(fd, "scheduledAt")),
    location: optStr(fd, "location"),
    videoUrl,
    published: bool(fd, "published"),
    isSample: bool(fd, "isSample"),
  };
  if (id) {
    await prisma.content.update({ where: { id }, data });
    revalidatePath("/admin/contents");
    return done("保存しました");
  }
  await prisma.content.create({ data });
  redirect("/admin/contents");
}

export async function deleteContentAction(fd: FormData): Promise<void> {
  await assertAdmin();
  await prisma.content.delete({ where: { id: str(fd, "id") } });
  redirect("/admin/contents");
}

export async function saveNoticeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = str(fd, "id");
  if (!str(fd, "title") || !str(fd, "body")) return fail("タイトルと本文は必須です");
  const data = {
    title: str(fd, "title"),
    body: str(fd, "body"),
    published: bool(fd, "published"),
    publishedAt: fromJstInput(str(fd, "publishedAt")) ?? new Date(),
    isSample: bool(fd, "isSample"),
  };
  const sendEmail = bool(fd, "sendEmail");
  let noticeId = id;
  if (id) await prisma.notice.update({ where: { id }, data });
  else noticeId = (await prisma.notice.create({ data })).id;
  if (sendEmail && data.published) {
    const members = await prisma.user.findMany({
      where: { role: "MEMBER", status: { in: ["ACTIVE", "PAST_DUE", "CANCEL_REQUESTED"] } },
      select: { email: true, name: true },
    });
    for (const m of members) {
      await sendMail({
        to: m.email,
        subject: `【OWNERS GOLF CLUB】${data.title}`,
        text: `${m.name} 様\n\n${data.body}\n\n${appUrl()}/member/notices/${noticeId}` + MAIL_FOOTER,
      });
    }
  }
  revalidatePath("/admin/notices");
  if (!id) redirect("/admin/notices");
  return done(sendEmail && data.published ? "保存し、会員にメール配信しました" : "保存しました");
}

export async function deleteNoticeAction(fd: FormData): Promise<void> {
  await assertAdmin();
  await prisma.notice.delete({ where: { id: str(fd, "id") } });
  redirect("/admin/notices");
}

// ---------------------------------------------------------------------------
// お問い合わせ
// ---------------------------------------------------------------------------
export async function updateInquiryAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const status = str(fd, "status") as InquiryStatus;
  if (!["NEW", "IN_PROGRESS", "CLOSED"].includes(status)) return;
  await prisma.inquiry.update({ where: { id: str(fd, "id") }, data: { status, adminNote: optStr(fd, "adminNote") } });
  revalidatePath("/admin/inquiries");
}
