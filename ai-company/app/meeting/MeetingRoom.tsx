"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardList, Gavel, Sparkles } from "lucide-react";
import type { EmployeeRole } from "@/lib/types";
import { templateFor } from "@/lib/game/employees";
import { Avatar } from "@/components/game/Avatar";
import { Markdown } from "@/components/game/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Card, Notice, Pill, SectionTitle, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";

export interface PastMeeting {
  id: string;
  topic: string;
  createdAt: string;
  summary: string;
}

interface Result {
  opinions: { role: "secretary" | "planner" | "marketer"; content: string }[];
  summary: string;
  tasks: { title: string; owner: "secretary" | "planner" | "marketer" }[];
  names: Partial<Record<EmployeeRole, string>>;
}

const EXAMPLES = ["月10万円の売上を目指したい", "最初の商品を何にするか決めたい", "SNSでお客様を集めたい", "今週やるべきことを決めたい"];

export function MeetingRoom({
  employees,
  remaining,
  dailyLimit,
  plan,
  past,
}: {
  employees: { id: string; role: EmployeeRole; name: string }[];
  remaining: number;
  dailyLimit: number;
  plan: "free" | "pro";
  past: PastMeeting[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [left, setLeft] = useState(remaining);
  const nameOf = (r: EmployeeRole) => employees.find((e) => e.role === r)?.name ?? templateFor(r).defaultName;

  async function start() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api<Result>("/api/meeting", { body: { topic: topic.trim() } });
      setResult(r);
      setLeft((n) => Math.max(0, n - 1));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-black">AI社内会議</h1>
      <p className="mb-5 text-sm text-muted">テーマを出すと、企画・マーケ・秘書がそれぞれの立場から意見を出し、秘書がタスクにまとめます。</p>

      {/* 会議室 */}
      <Card gold className="mb-5">
        <div className="mb-4 flex items-end justify-center gap-3">
          {(["planner", "secretary", "marketer"] as const).map((r, i) => (
            <motion.div
              key={r}
              animate={busy ? { y: [0, -6, 0] } : {}}
              transition={{ duration: 1.2, repeat: busy ? Infinity : 0, delay: i * 0.3 }}
              className="text-center"
            >
              <Avatar role={r} size={r === "secretary" ? 84 : 68} talking={busy} />
              <div className="mt-1 text-xs font-bold">{nameOf(r)}</div>
              <div className="text-[10px] text-muted">{templateFor(r).title}</div>
            </motion.div>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setTopic(ex)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-gold/40 hover:text-gold-soft">
              {ex}
            </button>
          ))}
        </div>
        <Textarea rows={2} maxLength={500} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="会議のテーマを入力（例：月10万円の売上を目指したい）" aria-label="会議のテーマ" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            本日の会議 残り{left}回 <span className="text-muted/70">（{plan === "pro" ? "PRO" : "無料"}：{dailyLimit}回/日）</span>
          </span>
          <Button variant="gold" disabled={busy || topic.trim().length < 2 || left <= 0} onClick={start}>
            {busy ? <Spinner /> : <Gavel size={17} />} 会議を始める
          </Button>
        </div>
        {left <= 0 && plan === "free" && <p className="mt-2 text-xs text-gold-soft">無料プランは1日{dailyLimit}回までお試しいただけます。PROプランで回数が増えます（準備中）。</p>}
        {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      </Card>

      {busy && (
        <div className="mb-5 flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner className="text-gold" /> 社員たちが議論しています…
        </div>
      )}

      {result && (
        <section className="mb-8 space-y-3">
          {result.opinions.map((o, i) => (
            <motion.div key={o.role} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.5 }} className="flex gap-3">
              <Avatar role={o.role} size={44} className="shrink-0" />
              <div className="panel flex-1 px-4 py-3">
                <div className="mb-1 text-xs font-bold text-gold">
                  {result.names[o.role] ?? nameOf(o.role)} <span className="font-normal text-muted">{templateFor(o.role).title}</span>
                </div>
                <Markdown>{o.content}</Markdown>
              </div>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: result.opinions.length * 0.5 }}>
            <Card gold>
              <SectionTitle>会議のまとめ</SectionTitle>
              <Markdown>{result.summary}</Markdown>
              <div className="mt-4 mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
                <ClipboardList size={14} /> 決まったタスク
              </div>
              <ul className="space-y-2">
                {result.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl border border-line bg-navy-950/50 p-2.5 text-sm">
                    <Avatar role={t.owner} size={28} />
                    <span className="flex-1">{t.title}</span>
                    <Pill tone="sky">{nameOf(t.owner)}</Pill>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1 text-[11px] text-muted">
                <Sparkles size={12} /> 議事録は成果物に保存され、まとめは「決定事項」としてAI社員に共有されました。
              </p>
            </Card>
          </motion.div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <SectionTitle>過去の会議</SectionTitle>
          <ul className="space-y-2">
            {past.map((p) => (
              <li key={p.id}>
                <details className="panel group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-bold">
                    {p.topic}
                    <span className="ml-2 text-[11px] font-normal text-muted">{new Date(p.createdAt).toLocaleDateString("ja-JP")}</span>
                  </summary>
                  {p.summary && <div className="mt-2 text-sm text-muted"><Markdown>{p.summary}</Markdown></div>}
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
