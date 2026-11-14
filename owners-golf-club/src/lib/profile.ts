import type { MemberProfile, User } from "@prisma/client";
import { prisma } from "./db";
import { FULL_ACCESS_STATUSES } from "./constants";

/** 会員紹介で公開範囲を設定できる項目 */
export const PROFILE_FIELDS = [
  ["companyName", "会社名"],
  ["position", "役職"],
  ["industry", "業種"],
  ["businessDescription", "事業内容"],
  ["website", "会社Webサイト"],
  ["sns", "SNSアカウント"],
  ["prefecture", "活動エリア（都道府県）"],
  ["golfHistory", "ゴルフ歴"],
  ["averageScore", "平均スコア"],
  ["message", "ひとこと・PR"],
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number][0];
export type Visibility = Partial<Record<ProfileField, boolean>>;

export type PublicProfile = {
  id: string;
  name: string;
  featured: boolean;
  fields: Partial<Record<ProfileField, string>>;
};

export function parseVisibility(v: unknown): Visibility {
  const out: Visibility = {};
  if (v && typeof v === "object") {
    for (const [k] of PROFILE_FIELDS) if ((v as Record<string, unknown>)[k] === true) out[k] = true;
  }
  return out;
}

/**
 * 他の会員に見せてよい項目だけを含むオブジェクトを作る。
 * 非公開項目はこのオブジェクトに含めないため、画面にも API レスポンスにも出ない。
 */
export function toPublicProfile(p: MemberProfile & { user: Pick<User, "name"> }): PublicProfile {
  const vis = parseVisibility(p.visibility);
  const fields: PublicProfile["fields"] = {};
  for (const [k] of PROFILE_FIELDS) {
    const value = p[k];
    if (vis[k] && typeof value === "string" && value.trim() !== "") fields[k] = value;
  }
  return { id: p.id, name: p.user.name, featured: p.featured, fields };
}

const listedWhere = {
  listed: true,
  hiddenByAdmin: false,
  user: { role: "MEMBER" as const, status: { in: FULL_ACCESS_STATUSES } },
};

export async function listPublicProfiles(q?: string): Promise<PublicProfile[]> {
  const rows = await prisma.memberProfile.findMany({
    where: listedWhere,
    include: { user: { select: { name: true } } },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });
  const list = rows.map(toPublicProfile);
  if (!q) return list;
  const needle = q.toLowerCase();
  // 検索も公開項目のみを対象にする
  return list.filter((p) => [p.name, ...Object.values(p.fields)].some((v) => v?.toLowerCase().includes(needle)));
}

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  const row = await prisma.memberProfile.findFirst({ where: { id, ...listedWhere }, include: { user: { select: { name: true } } } });
  return row ? toPublicProfile(row) : null;
}
