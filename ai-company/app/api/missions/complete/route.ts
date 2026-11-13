import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withUser } from "@/lib/server/http";
import { levelTitle } from "@/lib/game/levels";
import { dateInTz } from "@/lib/game/dates";
import { serverConfig } from "@/lib/config";

// 完了には「成果物メモ（10文字以上）」または「保存済み成果物」が必要
const Body = z
  .object({
    missionId: z.string().uuid(),
    deliverable: z.string().trim().max(3000).default(""),
    artifactId: z.string().uuid().nullable().default(null),
  })
  .refine((b) => b.deliverable.length >= 10 || b.artifactId, { message: "deliverable_required" });

const ERR: Record<string, [number, string]> = {
  not_found: [404, "ミッションが見つかりません"],
  already_completed: [409, "このミッションは完了済みです"],
  invalid_artifact: [400, "成果物が見つかりません"],
};

export const POST = withUser(Body, async ({ store, body }) => {
  // 完了できるのは当日のミッションのみ
  const todays = await store.listMissions({ date: dateInTz(serverConfig.timezone) });
  if (!todays.some((m) => m.id === body.missionId)) return jsonError(400, "当日のミッションのみ完了できます", "expired");
  const r = await store.completeMission(body.missionId, body.deliverable, body.artifactId);
  if (!r.ok) {
    const [status, msg] = ERR[r.error ?? "not_found"];
    return jsonError(status, msg, r.error);
  }
  return NextResponse.json({ ...r, levelTitle: levelTitle(r.level ?? 1) });
});
