import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { withUser } from "@/lib/server/http";
import { DEV_COOKIE } from "@/lib/server/auth";

// アカウントと全データの削除（確認文字列が必要）
const Body = z.object({ confirm: z.literal("削除する") });

export const DELETE = withUser(Body, async ({ store }) => {
  await store.deleteAccount();
  (await cookies()).delete(DEV_COOKIE);
  return NextResponse.json({ ok: true });
});
