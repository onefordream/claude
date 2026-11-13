import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";

// 重要な決定事項として記録（AI社員の会話コンテキストに使われる）
const Body = z.object({ title: z.string().trim().min(2).max(160) });

export const POST = withUser(Body, async ({ store, body }) => {
  await store.logActivity("decision", body.title, { source: "president" });
  return NextResponse.json({ ok: true });
});
