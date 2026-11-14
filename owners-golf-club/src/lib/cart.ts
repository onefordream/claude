import "server-only";
import { cookies } from "next/headers";

export const CART_COOKIE = "ogc_cart";
export type Cart = Record<string, number>; // productId -> quantity

export async function readCart(): Promise<Cart> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as unknown;
    const out: Cart = {};
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 99 && /^[a-z0-9]{10,40}$/.test(k)) out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeCart(cart: Cart): Promise<void> {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/member",
    maxAge: 60 * 60 * 24 * 7,
  });
}
