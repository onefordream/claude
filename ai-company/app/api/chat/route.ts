import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/server/http";
import { chatWithEmployee } from "@/lib/server/work";

const Body = z.object({ employeeId: z.string().uuid(), message: z.string().trim().min(1).max(2000) });

export const POST = withUser(Body, async ({ store, body }) => {
  const r = await chatWithEmployee(store, body.employeeId, body.message);
  return NextResponse.json(r);
});
