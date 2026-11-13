import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { serverConfig, supabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/server";

// Stripe Webhook（署名検証必須）。subscriptions テーブルを唯一ここから更新する。
export async function POST(req: NextRequest) {
  const { secretKey, webhookSecret } = serverConfig.stripe;
  if (!secretKey || !webhookSecret || !supabaseConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const stripe = new Stripe(secretKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const upsertFromSubscription = async (sub: Stripe.Subscription, userIdHint?: string | null) => {
    const userId = (sub.metadata?.user_id as string | undefined) ?? userIdHint;
    if (!userId) return;
    const active = ["active", "trialing"].includes(sub.status);
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end;
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripe_subscription_id: sub.id,
        status: sub.status,
        plan: active ? "pro" : "free",
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      },
      { onConflict: "user_id" },
    );
    await admin.from("profiles").update({ plan: active ? "pro" : "free" }).eq("id", userId);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription" && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
        await upsertFromSubscription(sub, s.client_reference_id);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertFromSubscription(event.data.object as Stripe.Subscription);
      break;
  }
  return NextResponse.json({ received: true });
}
