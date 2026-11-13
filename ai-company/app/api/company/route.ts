import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";

const Body = z
  .object({
    name: z.string().trim().min(1).max(40),
    presidentName: z.string().trim().max(20),
    tagline: z.string().trim().max(80),
    concept: z.string().trim().max(600),
    philosophy: z.string().trim().max(300),
    vision: z.string().trim().max(300),
    mainBusiness: z.string().trim().max(300),
    actionPlan: z.array(z.object({ step: z.string().trim().min(1).max(80), detail: z.string().trim().max(300) })).max(6),
  })
  .partial();

export const PATCH = withUser(Body, async ({ store, body }) => {
  const company = await store.updateCompany(body);
  await store.logActivity("profile_updated", "会社プロフィールを更新");
  return NextResponse.json({ company });
});
