import Link from "next/link";
import { redirect } from "next/navigation";
import { backendMode } from "@/lib/config";
import { getSessionUser } from "@/lib/server/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  const mode = backendMode();
  if (mode !== "unconfigured" && (await getSessionUser())) redirect("/");
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-center font-display text-lg font-extrabold tracking-[0.25em] text-gold-gradient">
        AI COMPANY
      </Link>
      <LoginForm
        backend={mode}
        initialMode={sp.mode === "signup" ? "signup" : "signin"}
        authError={sp.error === "auth"}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}
      />
      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        続行すると<Link href="/terms" className="underline">利用規約</Link>と
        <Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなされます。
      </p>
    </main>
  );
}
