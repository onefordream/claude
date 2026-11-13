import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { backendMode, serverConfig } from "@/lib/config";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { SupabaseAdminStore, SupabaseUserStore } from "./store/supabase";
import { MemoryAdminStore, MemoryUserStore, memEnsureUser } from "./store/memory";
import type { AdminStore, UserStore } from "./store/types";

export interface SessionUser {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

export const DEV_COOKIE = "aic_dev_session";

function sign(value: string) {
  const secret = serverConfig.devSessionSecret || "local-dev-only";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function encodeDevSession(id: string, email: string) {
  const payload = Buffer.from(JSON.stringify({ id, email })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeDevSession(token: string | undefined): { id: string; email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof v.id === "string" && typeof v.email === "string") return v;
  } catch {}
  return null;
}

/** 現在のログインユーザー（未ログインなら null） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const mode = backendMode();
  if (mode === "supabase") {
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const email = data.user.email ?? null;
    let isAdmin = !!email && serverConfig.adminEmails.includes(email.toLowerCase());
    if (!isAdmin) {
      const { data: p } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
      isAdmin = Boolean((p as { is_admin?: boolean } | null)?.is_admin);
    }
    return { id: data.user.id, email, isAdmin };
  }
  if (mode === "memory") {
    const store = await cookies();
    const s = decodeDevSession(store.get(DEV_COOKIE)?.value);
    if (!s) return null;
    memEnsureUser(s.id, s.email, "");
    return { id: s.id, email: s.email, isAdmin: serverConfig.adminEmails.includes(s.email.toLowerCase()) };
  }
  return null;
}

export async function getUserStore(user: SessionUser): Promise<UserStore> {
  if (backendMode() === "supabase") {
    return new SupabaseUserStore(user.id, await createUserClient(), createAdminClient());
  }
  return new MemoryUserStore(user.id);
}

export function getAdminStore(): AdminStore {
  if (backendMode() === "supabase") return new SupabaseAdminStore(createAdminClient());
  return new MemoryAdminStore();
}
