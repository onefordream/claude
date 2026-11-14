import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe の環境変数がすべて揃っている場合のみ実決済モード。揃っていなければモック決済モード。 */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_ENTRY_FEE &&
      process.env.STRIPE_PRICE_MONTHLY,
  );
}

export function isMockMode(): boolean {
  return !isStripeConfigured();
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured (mock mode)");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}
