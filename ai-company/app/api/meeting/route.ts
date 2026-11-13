import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";
import { holdMeeting } from "@/lib/server/work";

const Body = z.object({ topic: z.string().trim().min(2).max(500) });

export const POST = withUser(Body, async ({ store, body }) => {
  const r = await holdMeeting(store, body.topic);
  return NextResponse.json(r);
});
