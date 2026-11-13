"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await api("/api/auth/signout", { body: {} }).catch(() => {});
        router.replace("/");
        router.refresh();
      }}
    >
      <LogOut size={15} /> ログアウト
    </Button>
  );
}

export function UpgradeButton({ enabled, isPro }: { enabled: boolean; isPro: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isPro) return <div className="mt-4 text-sm font-bold text-gold">ご利用中のプランです</div>;
  return (
    <>
      <Button
        variant="gold"
        className="mt-4 w-full"
        disabled={!enabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await api<{ url: string }>("/api/stripe/checkout", { body: {} });
            window.location.href = r.url;
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy && <Spinner />} {enabled ? "PROにアップグレード" : "準備中"}
      </Button>
      {error && <div className="mt-2"><Notice tone="error">{error}</Notice></div>}
    </>
  );
}

export function DangerZone() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteConversations() {
    if (!window.confirm("AI社員とのチャット・会議の履歴をすべて削除します。よろしいですか？（成果物は残ります）")) return;
    setBusy(true);
    try {
      await api("/api/conversations", { method: "DELETE", body: { confirm: true } });
      setMsg({ tone: "info", text: "会話履歴を削除しました" });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api("/api/account", { method: "DELETE", body: { confirm } });
      await api("/api/auth/signout", { body: {} }).catch(() => {});
      router.replace("/");
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 text-sm font-bold">会話履歴の削除</div>
        <p className="mb-2 text-xs text-muted">AI社員とのチャットと会議の履歴を削除します。</p>
        <Button variant="danger" size="sm" disabled={busy} onClick={deleteConversations}>
          <Trash2 size={15} /> 会話履歴を削除
        </Button>
      </div>
      <div>
        <div className="mb-1 text-sm font-bold">アカウントと全データの削除</div>
        <p className="mb-2 text-xs text-muted">会社・社員・会話・成果物・個人情報をすべて削除します。元に戻せません。確認のため「削除する」と入力してください。</p>
        <div className="flex gap-2">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="削除する" aria-label="削除の確認" className="max-w-[10rem]" />
          <Button variant="danger" disabled={busy || confirm !== "削除する"} onClick={deleteAccount}>
            アカウント削除
          </Button>
        </div>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
