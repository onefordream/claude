import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";
import { runCapability } from "@/lib/server/work";

const Body = z.object({
  employeeId: z.string().uuid(),
  capability: z.string().min(1).max(40),
  input: z.string().trim().max(1500).default(""),
});

export const POST = withUser(Body, async ({ store, body }) => {
  const r = await runCapability(store, body.employeeId, body.capability, body.input);
  return NextResponse.json(r);
});
