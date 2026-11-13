"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, MessageCircle, Sparkles, Trophy, X } from "lucide-react";
import type { EmployeeRole, Mission } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { Notice, Pill, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export interface MiniEmployee {
  id: string;
  role: EmployeeRole;
  name: string;
}

export function TodayMissions({
  employees,
  artifacts,
  initial,
}: {
  employees: MiniEmployee[];
  artifacts: { id: string; title: string }[];
  initial: Mission[];
}) {
  const [missions, setMissions] = useState<Mission[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("");
  const [active, setActive] = useState<Mission | null>(null);

  useEffect(() => {
    if (initial.length) return;
    api<{ missions: Mission[]; greeting: string }>("/api/missions/today", { body: {} })
      .then((r) => {
        setMissions(r.missions);
        setGreeting(r.greeting);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [initial.length]);

  const done = missions.filter((m) => m.status === "completed").length;

  return (
    <div>
      {greeting && <p className="mb-3 text-sm text-sky-soft">{greeting}</p>}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Spinner className="text-gold" /> ミオが今日のミッションを準備しています…
        </div>
      ) : error ? (
        <Notice tone="error">{error}</Notice>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted">
            <span className="font-display text-base font-bold text-text">
              {done}/{missions.length}
            </span>
            完了
            {done === missions.length && missions.length > 0 && <Pill tone="success">本日のミッション達成！</Pill>}
          </div>
          <ul className="space-y-2.5">
            {missions.map((m) => (
              <MissionRow key={m.id} m={m} employee={employees.find((e) => e.role === m.employeeRole)} onOpen={() => setActive(m)} />
            ))}
          </ul>
        </>
      )}
      <AnimatePresence>
        {active && (
          <CompleteModal
            mission={active}
            employee={employees.find((e) => e.role === active.employeeRole)}
            artifacts={artifacts}
            onClose={() => setActive(null)}
            onCompleted={(id) => setMissions((ms) => ms.map((x) => (x.id === id ? { ...x, status: "completed", completedAt: new Date().toISOString() } : x)))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function MissionRow({ m, employee, onOpen }: { m: Mission; employee?: MiniEmployee; onOpen?: () => void }) {
  const completed = m.status === "completed";
  return (
    <li>
      <button
        onClick={onOpen}
        disabled={completed || !onOpen}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
          completed ? "border-success/25 bg-success/[0.05]" : "border-line bg-navy-950/50 hover:border-gold/40 hover:bg-gold/[0.04]",
        )}
      >
        {completed ? <CheckCircle2 className="shrink-0 text-success" size={22} /> : <Circle className="shrink-0 text-muted" size={22} />}
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-bold", completed && "text-muted line-through decoration-success/60")}>{m.title}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-muted">{m.description}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-display text-xs font-bold text-gold">+{m.xpReward}XP</span>
          {employee && <Avatar role={employee.role} size={26} />}
        </div>
      </button>
    </li>
  );
}

function CompleteModal({
  mission,
  employee,
  artifacts,
  onClose,
  onCompleted,
}: {
  mission: Mission;
  employee?: MiniEmployee;
  artifacts: { id: string; title: string }[];
  onClose: () => void;
  onCompleted: (id: string) => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [artifactId, setArtifactId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ xpAwarded: number; level: number; leveledUp: boolean; levelTitle: string } | null>(null);
  const valid = note.trim().length >= 10 || !!artifactId;
  const prompt = encodeURIComponent(`ミッション「${mission.title}」を手伝ってください。${mission.description}`);

  async function complete() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ xpAwarded: number; level: number; leveledUp: boolean; levelTitle: string }>("/api/missions/complete", {
        body: { missionId: mission.id, deliverable: note.trim(), artifactId: artifactId || null },
      });
      setResult(r);
      onCompleted(mission.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="panel max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-[1.25rem]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {result ? (
          <div className="py-4 text-center">
            <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 9 }}>
              {result.leveledUp ? <Trophy className="mx-auto text-gold" size={64} /> : <Sparkles className="mx-auto text-gold" size={56} />}
            </motion.div>
            <div className="mt-3 font-display text-3xl font-extrabold text-gold-gradient">+{result.xpAwarded} XP</div>
            {result.leveledUp ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="mt-3 font-display text-xl font-extrabold tracking-widest text-sky-soft">LEVEL UP!</div>
                <div className="mt-1 text-lg font-black">
                  Lv.{result.level}「{result.levelTitle}」
                </div>
                <p className="mt-1 text-xs text-muted">会社レベルはゲーム内の進捗です（現実の売上とは別です）</p>
              </motion.div>
            ) : (
              <p className="mt-2 text-sm text-muted">ミッション完了！成果は会社の成長記録に保存されました。</p>
            )}
            <Button variant="gold" className="mt-6 w-full" onClick={onClose}>
              閉じる
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gold">ミッション</div>
                <h3 className="text-lg font-black">{mission.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{mission.description}</p>
              </div>
              <button onClick={onClose} aria-label="閉じる" className="text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            {employee && (
              <Link href={`/employees/${employee.id}?prompt=${prompt}`} className="mb-4 flex items-center gap-3 rounded-xl border border-sky/30 bg-sky/[0.06] p-3 text-sm hover:bg-sky/10">
                <Avatar role={employee.role} size={40} />
                <div className="flex-1">
                  <div className="font-bold">{employee.name}に手伝ってもらう</div>
                  <div className="text-xs text-muted">チャットで一緒に作業し、回答を成果物として保存できます</div>
                </div>
                <MessageCircle size={18} className="text-sky-soft" />
              </Link>
            )}
            <Label>成果物メモ（10文字以上）</Label>
            <Textarea rows={4} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mission.deliverableHint ? `例：${mission.deliverableHint}` : "やったこと・わかったことを書いてください"} />
            {artifacts.length > 0 && (
              <div className="mt-3">
                <Label>または、保存済みの成果物を添付</Label>
                <select
                  value={artifactId}
                  onChange={(e) => setArtifactId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-navy-950/70 px-3 py-3 text-[16px] text-text"
                >
                  <option value="">選択しない</option>
                  {artifacts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted">完了には、実際に取り組んだ内容のメモか成果物が必要です。</p>
            {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
            <Button variant="gold" size="lg" className="mt-4 w-full" disabled={!valid || busy} onClick={complete}>
              {busy ? <Spinner /> : <CheckCircle2 size={18} />} ミッション完了（+{mission.xpReward}XP）
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
