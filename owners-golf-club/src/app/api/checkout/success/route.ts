import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, refreshSessionCookie } from "@/lib/auth";
import { completeFromCheckoutSession } from "@/lib/billing";
import { getStripe, isMockMode } from "@/lib/stripe";

/**
 * Stripe Checkout の success_url。Webhook の到着を待たずに Stripe から直接セッションを取得して
 * 支払い済みであれば会員化する（処理は冪等で Webhook と二重になっても問題ない）。
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/apply/status", req.url));
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!isMockMode() && sessionId) {
    try {
      const s = await getStripe().checkout.sessions.retrieve(sessionId);
      const owner = s.metadata?.userId ?? s.client_reference_id;
      if (owner === user.id && s.mode === "subscription" && s.payment_status === "paid") {
        await completeFromCheckoutSession(s);
      }
    } catch (e) {
      console.error("[checkout] success verify failed", e instanceof Error ? e.message : "unknown");
    }
  }
  const fresh = await refreshSessionCookie();
  if (fresh?.status === "ACTIVE") return NextResponse.redirect(new URL("/apply/complete", req.url));
  // Webhook 待ち
  return NextResponse.redirect(new URL("/apply/status?processing=1", req.url));
}
