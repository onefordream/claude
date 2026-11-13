"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, Briefcase, Pin, SendHorizonal, X } from "lucide-react";
import type { EmployeeRole, Message } from "@/lib/types";
import { CAPABILITIES } from "@/lib/game/employees";
import { Avatar } from "@/components/game/Avatar";
import { Markdown } from "@/components/game/Markdown";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Notice, Spinner } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/client";
import { cn } from "@/lib/utils";

interface Emp {
  id: string;
  role: EmployeeRole;
  name: string;
  title: string;
  personality: string;
  capabilities: string[];
}

export function ChatRoom({
  employee,
  conversationId: initialConv,
  initialMessages,
  initialPrompt,
  remaining: initialRemaining,
  presidentName,
}: {
  employee: Emp;
  conversationId: string | null;
  initialMessages: Message[];
  initialPrompt: string;
  remaining: number;
  presidentName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [convId, setConvId] = useState(initialConv);
  const [text, setText] = useState(initialPrompt);
  const [busy, setBusy] = useState<"" | "chat" | "task">("");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);
  const [capability, setCapability] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialMessages.filter((m) => m.metadata?.artifactId).map((m) => [m.id, true])),
  );
  const [toast, setToast] = useState("");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  function handleError(e: unknown) {
    const err = e as ApiError;
    setError(err.message);
    if (err.code === "daily_limit" || err.code === "monthly_limit") setRemaining(0);
  }

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy("chat");
    setError("");
    const temp: Message = { id: `tmp-${Date.now()}`, conversationId: convId ?? "", role: "user", employeeId: null, content: t, metadata: {}, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, temp]);
    setText("");
    try {
      const r = await api<{ conversationId: string; messages: Message[] }>("/api/chat", { body: { employeeId: employee.id, message: t } });
      setConvId(r.conversationId);
      setMessages((m) => [...m.filter((x) => x.id !== temp.id), ...r.messages]);
      setRemaining((n) => Math.max(0, n - 1));
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setText(t);
      handleError(e);
    } finally {
      setBusy("");
    }
  }

  async function runTask(cap: string, input: string) {
    setCapability(null);
    setBusy("task");
    setError("");
    try {
      const r = await api<{ conversationId: string; message: Message; artifact: { id: string; title: string } }>("/api/tasks", {
        body: { employeeId: employee.id, capability: cap, input },
      });
      setConvId(r.conversationId);
      const req: Message = {
        id: `req-${Date.now()}`,
        conversationId: r.conversationId,
        role: "user",
        employeeId: null,
        content: `【業務依頼】${CAPABILITIES[cap].label}${input ? `\n${input}` : ""}`,
        metadata: {},
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, req, r.message]);
      setSaved((s) => ({ ...s, [r.message.id]: true }));
      setRemaining((n) => Math.max(0, n - 1));
      setToast(`「${r.artifact.title}」を成果物として保存しました`);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy("");
    }
  }

  async function saveArtifact(m: Message) {
    if (!convId) return;
    const title = `${employee.name}の提案（${new Date(m.createdAt).toLocaleDateString("ja-JP")}）`;
    try {
      await api("/api/artifacts", { body: { conversationId: convId, messageId: m.id, title } });
      setSaved((s) => ({ ...s, [m.id]: true }));
      setToast("成果物として保存しました");
    } catch (e) {
      handleError(e);
    }
  }

  const caps = employee.capabilities.map((c) => ({ id: c, ...CAPABILITIES[c] })).filter((c) => c.label);

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-7.5rem)] flex-col sm:-mx-6 md:mx-0 md:mt-0 md:h-[calc(100dvh-5rem)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:rounded-t-2xl md:border md:bg-navy-900/60">
        <Link href="/employees" aria-label="戻る" className="text-muted hover:text-text">
          <ArrowLeft size={20} />
        </Link>
        <Avatar role={employee.role} size={44} talking={!!busy} />
        <div className="min-w-0 flex-1">
          <div className="font-bold">
            {employee.name} <span className="text-xs font-normal text-gold">{employee.title}</span>
          </div>
          <div className="truncate text-[11px] text-muted">本日のAI相談 残り{remaining}回</div>
        </div>
        <button onClick={() => setDecisionOpen(true)} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[11px] text-muted hover:text-text">
          <Pin size={13} /> 決定を記録
        </button>
      </div>

      {/* 業務依頼 */}
      {caps.length > 0 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-line px-4 py-2.5 md:border-x">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-muted">
            <Briefcase size={13} /> 業務依頼
          </span>
          {caps.map((c) => (
            <button
              key={c.id}
              disabled={!!busy}
              onClick={() => setCapability(c.id)}
              className="shrink-0 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1.5 text-xs font-semibold text-gold-soft hover:bg-gold/15 disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* メッセージ */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:border-x md:border-line">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <Avatar role={employee.role} size={110} />
            <div className="panel mt-3 max-w-sm px-4 py-3 text-sm leading-relaxed">
              {presidentName ? `${presidentName}社長` : "社長"}、{employee.title}の{employee.name}です。{employee.personality}
              <br />
              気軽に相談するか、上の「業務依頼」から仕事を任せてください。
            </div>
          </div>
        )}
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && <Avatar role={employee.role} size={32} className="mt-1 shrink-0" />}
            <div className={cn("max-w-[86%]", m.role === "user" && "max-w-[80%]")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-[0.94rem] leading-relaxed",
                  m.role === "assistant" ? "rounded-tl-sm border border-line bg-navy-800/80" : "whitespace-pre-wrap rounded-tr-sm bg-gradient-to-br from-sky/90 to-[#3b6fd9] text-white",
                )}
              >
                {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
              </div>
              {m.role === "assistant" && !m.id.startsWith("tmp") && (
                <button
                  onClick={() => !saved[m.id] && saveArtifact(m)}
                  disabled={saved[m.id]}
                  className={cn("mt-1 flex items-center gap-1 text-[11px]", saved[m.id] ? "text-success" : "text-muted hover:text-gold-soft")}
                >
                  {saved[m.id] ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  {saved[m.id] ? "成果物に保存済み" : "成果物として保存"}
                </button>
              )}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex items-center gap-2.5">
            <Avatar role={employee.role} size={32} talking />
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-navy-800/80 px-4 py-2.5 text-xs text-muted">
              <Spinner className="text-gold" />
              {busy === "task" ? `${employee.name}が成果物を作成しています…` : `${employee.name}が考えています…`}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* 入力 */}
      <div className="border-t border-line bg-navy-950/80 px-3 pb-3 pt-2.5 md:rounded-b-2xl md:border md:pb-3">
        {error && (
          <div className="mb-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Textarea
            rows={1}
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={remaining > 0 ? `${employee.name}に相談する…` : "本日の上限に達しました"}
            aria-label="メッセージを入力"
            className="max-h-32 min-h-[48px]"
            disabled={remaining <= 0}
          />
          <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={!!busy || !text.trim() || remaining <= 0} aria-label="送信">
            <SendHorizonal size={19} />
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted/70">AI社員は提案・文章作成のみを行います。送信・投稿・購入・契約などは実行しません。</p>
      </div>

      <AnimatePresence>
        {capability && <TaskSheet capId={capability} employee={employee} onClose={() => setCapability(null)} onRun={(input) => runTask(capability, input)} />}
        {decisionOpen && <DecisionSheet onClose={() => setDecisionOpen(false)} onSaved={() => setToast("決定事項として記録しました。AI社員が今後の会話で参照します")} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl border border-success/40 bg-navy-900 px-4 py-3 text-center text-sm text-success shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="panel w-full max-w-lg rounded-b-none p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:rounded-b-[1.25rem]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button onClick={onClose} aria-label="閉じる" className="float-right text-muted hover:text-text">
          <X size={20} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function TaskSheet({ capId, employee, onClose, onRun }: { capId: string; employee: Emp; onClose: () => void; onRun: (input: string) => void }) {
  const cap = CAPABILITIES[capId];
  const [input, setInput] = useState("");
  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar role={employee.role} size={48} />
        <div>
          <div className="text-xs font-bold text-gold">{employee.name}への業務依頼</div>
          <div className="text-lg font-black">{cap.label}</div>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">{cap.description}。完成した成果物は会社の成果物フォルダに自動保存されます。</p>
      <Label>補足（任意）</Label>
      <Textarea rows={3} maxLength={1500} value={input} onChange={(e) => setInput(e.target.value)} placeholder={cap.placeholder} />
      <Button variant="gold" size="lg" className="mt-4 w-full" onClick={() => onRun(input.trim())}>
        <Briefcase size={18} /> 依頼する
      </Button>
    </Sheet>
  );
}

function DecisionSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    try {
      await api("/api/decisions", { body: { title: title.trim() } });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Sheet onClose={onClose}>
      <div className="mb-2 text-lg font-black">重要な決定事項を記録</div>
      <p className="mb-4 text-sm text-muted">記録した決定は、すべてのAI社員が会話の前提として参照します。</p>
      <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="例：最初の商品は3,000円のオンライン講座にする" aria-label="決定事項" />
      {error && <div className="mt-2"><Notice tone="error">{error}</Notice></div>}
      <Button variant="gold" className="mt-4 w-full" disabled={busy || title.trim().length < 2} onClick={save}>
        <Pin size={16} /> 記録する
      </Button>
    </Sheet>
  );
}
