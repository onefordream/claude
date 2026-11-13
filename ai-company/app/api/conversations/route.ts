import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";

// 会話履歴（チャット・会議）をすべて削除
const Body = z.object({ confirm: z.literal(true) });

export const DELETE = withUser(Body, async ({ store }) => {
  await store.deleteAllConversations();
  return NextResponse.json({ ok: true });
});
