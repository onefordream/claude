import { NextResponse } from "next/server";
import Stripe from "stripe";
import { jsonError, withUser } from "@/lib/server/http";
import { serverConfig } from "@/lib/config";

// PRO プランの Checkout セッションを作成。有料判定は Webhook でのみ行う。
export const POST = withUser(null, async ({ user }) => {
  const { secretKey, proPriceId } = serverConfig.stripe;
  if (!secretKey || !proPriceId) return jsonError(503, "有料プランは準備中です（決済未設定）", "stripe_not_configured");
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: proPriceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id },
    success_url: `${serverConfig.siteUrl}/settings?checkout=success`,
    cancel_url: `${serverConfig.siteUrl}/settings?checkout=cancel`,
  });
  return NextResponse.json({ url: session.url });
});
