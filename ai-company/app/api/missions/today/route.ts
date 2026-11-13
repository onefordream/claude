import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { ensureDailyMissions } from "@/lib/server/work";

// 今日のミッションを取得（未作成なら作成）
export const POST = withUser(null, async ({ store }) => {
  const r = await ensureDailyMissions(store);
  return NextResponse.json(r);
});
