"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, refreshSessionCookie } from "@/lib/auth";
import { completeMockCheckout } from "@/lib/billing";
import { isMockMode } from "@/lib/stripe";

export async function completeMockCheckoutAction(fd: FormData): Promise<void> {
  if (!isMockMode()) redirect("/apply/payment");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sessionId = String(fd.get("session_id") ?? "");
  try {
    await completeMockCheckout(user.id, sessionId);
  } catch {
    redirect("/apply/status?error=not_approved");
  }
  await refreshSessionCookie();
  redirect("/apply/complete");
}
