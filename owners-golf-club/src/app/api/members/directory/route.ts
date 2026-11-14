import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { FULL_ACCESS_STATUSES } from "@/lib/constants";
import { listPublicProfiles } from "@/lib/profile";

/** 会員紹介API。各会員が公開に設定した項目のみを返す（toPublicProfile で非公開項目を除外）。 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER" || !FULL_ACCESS_STATUSES.includes(user.status)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const members = await listPublicProfiles(q);
  return NextResponse.json({ members }, { headers: { "Cache-Control": "private, no-store" } });
}
