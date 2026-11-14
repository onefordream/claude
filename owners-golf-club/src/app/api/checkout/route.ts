import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutNotAllowedError, createCheckout } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";

/** Checkout 作成API。サーバー側で APPROVED を必ず検証する（assertCanCheckout）。 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/apply/payment", req.url), 303);
  if (!(await rateLimit(`checkout:${user.id}`, 10, 600))) {
    return NextResponse.redirect(new URL("/apply/payment?error=rate", req.url), 303);
  }
  try {
    const url = await createCheckout(user.id);
    return NextResponse.redirect(new URL(url, req.url), 303);
  } catch (e) {
    if (e instanceof CheckoutNotAllowedError) {
      return NextResponse.redirect(new URL("/apply/status?error=not_approved", req.url), 303);
    }
    console.error("[checkout] create failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.redirect(new URL("/apply/payment?error=checkout", req.url), 303);
  }
}
