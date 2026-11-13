"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Save, Share2, X } from "lucide-react";
import type { Company } from "@/lib/types";
import { Markdown } from "@/components/game/Markdown";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Notice, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";

export function ProfileEditor({ company }: { company: Company }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: company.name,
    presidentName: company.presidentName,
    tagline: company.tagline,
    concept: company.concept,
    philosophy: company.philosophy,
    vision: company.vision,
    mainBusiness: company.mainBusiness,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/company", { method: "PATCH", body: f });
      setMsg({ tone: "info", text: "保存しました" });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const fields: [keyof typeof f, string, number, number][] = [
    ["concept", "事業コンセプト", 600, 4],
    ["philosophy", "理念", 300, 2],
    ["vision", "目指す未来", 300, 2],
    ["mainBusiness", "主要事業", 300, 3],
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>社名</Label>
          <Input value={f.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label>社長名</Label>
          <Input value={f.presidentName} maxLength={20} onChange={(e) => set("presidentName", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>キャッチコピー</Label>
        <Input value={f.tagline} maxLength={80} onChange={(e) => set("tagline", e.target.value)} />
      </div>
      {fields.map(([k, label, max, rows]) => (
        <div key={k}>
          <Label>{label}</Label>
          <Textarea rows={rows} maxLength={max} value={f[k]} onChange={(e) => set(k, e.target.value)} />
        </div>
      ))}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button variant="gold" className="w-full" disabled={busy || !f.name.trim()} onClick={save}>
        {busy ? <Spinner /> : <Save size={16} />} 保存する
      </Button>
      <p className="text-[11px] text-muted">ロゴは社名から自動生成されています（設立時の社名）。</p>
    </div>
  );
}

export function ArtifactList({ artifacts }: { artifacts: { id: string; title: string; content: string; type: string; createdAt: string }[] }) {
  const [open, setOpen] = useState<(typeof artifacts)[number] | null>(null);
  const [copied, setCopied] = useState(false);
  if (!artifacts.length) return <p className="text-sm text-muted">AI社員への業務依頼や、チャットの「成果物として保存」で作成した資料がここに貯まります。</p>;
  return (
    <>
      <ul className="space-y-1.5">
        {artifacts.map((a) => (
          <li key={a.id}>
            <button onClick={() => setOpen(a)} className="flex w-full items-center gap-2 rounded-xl border border-line bg-navy-950/40 px-3 py-2.5 text-left text-sm hover:border-sky/40">
              <FileText size={16} className="shrink-0 text-sky-soft" />
              <span className="flex-1 truncate">{a.title}</span>
              <span className="shrink-0 text-[10px] text-muted">{new Date(a.createdAt).toLocaleDateString("ja-JP")}</span>
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="panel max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-b-none p-5 sm:rounded-b-[1.25rem]"
              role="dialog"
              aria-modal="true"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-lg font-black">{open.title}</h3>
                <button onClick={() => setOpen(null)} aria-label="閉じる" className="text-muted">
                  <X size={20} />
                </button>
              </div>
              <Markdown>{open.content}</Markdown>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  await navigator.clipboard.writeText(open.content).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "コピーしました" : "テキストをコピー"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** 実績のSNS共有：端末の共有シートを開くだけ（自動投稿はしない） */
export function ShareButton({ text }: { text: string }) {
  const [done, setDone] = useState("");
  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setDone("共有用テキストをコピーしました");
    } catch {
      /* 共有キャンセル */
    }
  }
  return (
    <div className="text-center">
      <Button variant="outline" size="sm" onClick={share}>
        <Share2 size={15} /> 実績をシェア
      </Button>
      {done && <div className="mt-1 text-[10px] text-success">{done}</div>}
    </div>
  );
}
