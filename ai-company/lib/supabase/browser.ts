"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey);
}
