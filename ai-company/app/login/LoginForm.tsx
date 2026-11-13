"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Notice, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function LoginForm(props: {
  backend: "supabase" | "memory" | "unconfigured";
  initialMode: "signin" | "signup";
  authError: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(props.initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(props.authError ? "認証に失敗しました。もう一度お試しください。" : "");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (props.backend === "memory") {
        await api("/api/dev-login", { body: { email } });
        router.replace("/");
        router.refresh();
        return;
      }
      const supabase = createBrowserSupabase(props.supabaseUrl, props.supabaseAnonKey);
      if (mode === "signup") {
        if (password.length < 8) throw new Error("パスワードは8文字以上にしてください");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("確認メールを送信しました。メール内のリンクを開くと登録が完了します。");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("メールアドレスまたはパスワードが正しくありません");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  if (props.backend === "unconfigured") {
    return <Notice tone="error">現在ログインできません。運営者がサーバー設定（Supabase）を完了する必要があります。</Notice>;
  }

  return (
    <div className="panel p-6">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-navy-950/70 p-1 text-sm font-bold">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn("rounded-lg py-2 transition", mode === m ? "bg-navy-700 text-gold-soft" : "text-muted")}
          >
            {m === "signup" ? "新規登録" : "ログイン"}
          </button>
        ))}
      </div>
      <h1 className="mb-1 text-xl font-black">{mode === "signup" ? "社長として登録する" : "おかえりなさい、社長"}</h1>
      <p className="mb-5 text-sm text-muted">{mode === "signup" ? "無料で、あなただけの会社を設立できます。" : "今日も会社に出社しましょう。"}</p>
      {props.backend === "memory" && <div className="mb-4"><Notice tone="warn">開発モード：メールアドレスだけでログインできます（パスワード不要）。</Notice></div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>メールアドレス</Label>
          <Input aria-label="メールアドレス" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        {props.backend === "supabase" && (
          <div>
            <Label>パスワード{mode === "signup" && "（8文字以上）"}</Label>
            <Input
              aria-label="パスワード"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice>{info}</Notice>}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {mode === "signup" ? "登録して会社を設立する" : "出社する"}
        </Button>
      </form>
    </div>
  );
}
