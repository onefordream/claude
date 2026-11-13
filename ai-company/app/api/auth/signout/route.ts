import { NextResponse } from "next/server";
import { backendMode } from "@/lib/config";
import { createUserClient } from "@/lib/supabase/server";
import { DEV_COOKIE } from "@/lib/server/auth";

export async function POST() {
  if (backendMode() === "supabase") {
    const supabase = await createUserClient();
    await supabase.auth.signOut();
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEV_COOKIE);
  return res;
}
