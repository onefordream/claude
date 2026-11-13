import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withUser } from "@/lib/server/http";

// チャットの回答を成果物として保存
const Body = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
});

export const POST = withUser(Body, async ({ store, body }) => {
  const conv = await store.getConversation(body.conversationId);
  if (!conv) return jsonError(404, "会話が見つかりません");
  const msgs = await store.listMessages(conv.id, 200);
  const msg = msgs.find((m) => m.id === body.messageId && m.role === "assistant");
  if (!msg) return jsonError(404, "メッセージが見つかりません");
  const artifact = await store.createArtifact({ employeeId: msg.employeeId, type: "note", title: body.title, content: msg.content, conversationId: conv.id });
  await store.logActivity("artifact_created", artifact.title, { artifact_id: artifact.id });
  return NextResponse.json({ artifact });
});
