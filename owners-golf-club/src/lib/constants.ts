import type { MemberStatus, Region, ShipmentStatus, OrderStatus, RegistrationStatus, InquiryStatus, PartnerType, ContentKind } from "@prisma/client";

export const TAX_RATE = 0.1;

/** 料金（税抜・円）。表示は税抜を主表記、税込を併記する。 */
export const ENTRY_FEE = 10000;
export const MONTHLY_FEE = 1980;

export function withTax(amountExcl: number): number {
  return Math.floor(amountExcl * (1 + TAX_RATE));
}

export const ENTRY_FEE_INCL = withTax(ENTRY_FEE); // 11,000
export const MONTHLY_FEE_INCL = withTax(MONTHLY_FEE); // 2,178

export const STATUS_LABEL: Record<MemberStatus, string> = {
  APPLIED: "審査待ち",
  NEEDS_INFO: "追加情報依頼中",
  APPROVED: "承認済み・決済待ち",
  ACTIVE: "正式会員",
  PAST_DUE: "支払い遅延",
  REJECTED: "否認",
  SUSPENDED: "停止",
  CANCEL_REQUESTED: "退会申請中",
  CANCELLED: "退会",
};

export const REGION_LABEL: Record<Region, string> = {
  KANSAI: "関西",
  KANTO: "関東",
  OTHER: "その他",
};

export const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  NOT_REQUESTED: "未依頼",
  REQUESTED: "製作依頼済み",
  PREPARING: "準備中",
  SHIPPED: "発送済み",
};

export const ORDER_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "注文受付",
  CONFIRMED: "確認済み",
  PREPARING: "準備中",
  SHIPPED: "発送済み",
  CANCELLED: "キャンセル",
};

export const REGISTRATION_LABEL: Record<RegistrationStatus, string> = {
  APPLIED: "申込受付",
  CONFIRMED: "参加確定",
  WAITLIST: "キャンセル待ち",
  CANCELLED: "キャンセル",
};

export const INQUIRY_LABEL: Record<InquiryStatus, string> = {
  NEW: "未対応",
  IN_PROGRESS: "対応中",
  CLOSED: "完了",
};

export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = {
  GOLF_COURSE: "提携ゴルフ場",
  MAKER: "提携メーカー",
};

export const CONTENT_KIND_LABEL: Record<ContentKind, string> = {
  SEMINAR: "勉強会・セミナー",
  ARCHIVE: "録画アーカイブ",
};

/** 会員エリアに入れるステータス */
export const MEMBER_AREA_STATUSES: MemberStatus[] = ["ACTIVE", "PAST_DUE", "CANCEL_REQUESTED"];
/** 会員エリアの全機能を使えるステータス（PAST_DUE は会員情報管理のみ） */
export const FULL_ACCESS_STATUSES: MemberStatus[] = ["ACTIVE", "CANCEL_REQUESTED"];
