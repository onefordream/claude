import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPortalUrl } from "@/lib/billing";
import { MEMBER_AREA_STATUSES } from "@/lib/constants";

/** カード変更・領収書確認用の Stripe Customer Portal へ */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER" || !MEMBER_AREA_STATUSES.includes(user.status)) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }
  try {
    const url = await createPortalUrl(user.id);
    return NextResponse.redirect(new URL(url, req.url), 303);
  } catch (e) {
    console.error("[portal] failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.redirect(new URL("/member/account?error=portal", req.url), 303);
  }
}
