import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe, isMockMode } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Stripe Webhook。
 * - 署名検証必須（STRIPE_WEBHOOK_SECRET）
 * - イベントIDで冪等化（StripeEvent テーブル）。処理失敗時は記録を消して 500 を返し、Stripe の再送に任せる
 * - 生ペイロードはログに出さない
 */
export async function POST(req: NextRequest) {
  if (isMockMode()) return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch {
    console.warn("[stripe] webhook signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw e;
  }

  try {
    await handleStripeEvent(event);
  } catch (e) {
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    console.error(`[stripe] handling failed type=${event.type} id=${event.id}`, e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
