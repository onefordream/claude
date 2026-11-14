import { NextResponse, type NextRequest } from "next/server";
import { refreshSessionCookie } from "@/lib/auth";
import { MEMBER_AREA_STATUSES } from "@/lib/constants";

/** Cookie 内のロールを DB の最新状態に合わせて再発行し、適切な画面へ振り分ける */
export async function GET(req: NextRequest) {
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/member";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/member";
  const user = await refreshSessionCookie();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  if (user.role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
  if (user.role === "MEMBER" && MEMBER_AREA_STATUSES.includes(user.status)) {
    return NextResponse.redirect(new URL(next.startsWith("/member") ? next : "/member", req.url));
  }
  return NextResponse.redirect(new URL("/apply/status", req.url));
}
