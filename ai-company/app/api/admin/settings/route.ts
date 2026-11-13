import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withUser } from "@/lib/server/http";
import { getAdminStore } from "@/lib/server/auth";

const Limits = z.object({
  chatDaily: z.number().int().min(0).max(10000),
  chatMonthly: z.number().int().min(0).max(300000),
  meetingDaily: z.number().int().min(0).max(1000),
  onboardingDaily: z.number().int().min(0).max(1000),
  maxEmployees: z.number().int().min(1).max(50),
  perMinute: z.number().int().min(1).max(120),
});
const Body = z.object({
  plans: z.object({ free: Limits, pro: Limits }),
  proPriceJpy: z.number().int().min(0).max(1000000),
  abuseHourlyThreshold: z.number().int().min(1).max(100000),
});

export const PUT = withUser(Body, async ({ user, body }) => {
  if (!user.isAdmin) return jsonError(403, "権限がありません", "forbidden");
  await getAdminStore().updateSettings(body);
  return NextResponse.json({ ok: true });
});
