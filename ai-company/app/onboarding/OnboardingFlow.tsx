"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Lightbulb, PenLine, Plus, SendHorizonal, SkipForward, Sparkles, Trash2 } from "lucide-react";
import type { BusinessIdea, Company, CompanyPlan, EmployeeRole } from "@/lib/types";
import { Avatar } from "@/components/game/Avatar";
import { CompanyLogo } from "@/components/game/CompanyLogo";
import { Typewriter } from "@/components/game/Typewriter";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { Notice, Pill, ProgressBar, Spinner } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { templateFor } from "@/lib/game/employees";
import { generateLogo } from "@/lib/game/logo";
import { cn } from "@/lib/utils";

type Phase = "loading" | "opening" | "name" | "interview" | "decide" | "ideas" | "designing" | "review" | "founding";

interface ViewState {
  status: "interview" | "ideas" | "plan" | "completed";
  presidentName: string;
  transcript: { role: "user" | "assistant"; content: string }[];
  ideas: BusinessIdea[];
  chosenIdea: BusinessIdea | null;
  plan: CompanyPlan | null;
  progress: { done: number; total: number };
  canFinish: boolean;
  interviewDone: boolean;
  suggestIdeas: boolean;
}

const OPENING = [
  "はじめまして、社長。",
  "今日からあなたは、この会社の代表になります。",
  "でも、まだ会社の名前も、社員も、事業も決まっていません。",
  "これから私と一緒に、あなたの夢を形にしていきましょう。",
  "まずは、いくつか質問をさせてください。",
];

export function OnboardingFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<ViewState | null>(null);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [flowError, setFlowError] = useState("");

  useEffect(() => {
    api<{ state: ViewState | null; hasCompany: boolean }>("/api/onboarding")
      .then((r) => {
        if (r.hasCompany) return router.replace("/office");
        const s = r.state;
        setState(s);
        if (!s || s.status === "completed") setPhase("opening");
        else if (s.status === "plan" && s.plan) setPhase("review");
        else if (s.status === "ideas" && s.ideas.length) setPhase("ideas");
        else if (s.interviewDone) setPhase("decide");
        else setPhase("interview");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("opening");
      });
  }, [router]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }} className="relative">
          {phase === "loading" && (
            <div className="flex min-h-dvh items-center justify-center">
              <Spinner className="h-8 w-8 text-gold" />
            </div>
          )}
          {phase === "opening" && <Opening onDone={() => setPhase("name")} />}
          {phase === "name" && (
            <NameStep
              onStarted={(s) => {
                setState(s);
                setPhase("interview");
              }}
            />
          )}
          {phase === "interview" && state && (
            <Interview
              initial={state}
              onDone={(s) => {
                setState(s);
                setPhase("decide");
              }}
            />
          )}
          {phase === "decide" && state && (
            <Decide
              state={state}
              onIdeas={(s) => {
                setState(s);
                setPhase("ideas");
              }}
              onPlan={(s) => {
                setState(s);
                setPhase("review");
              }}
              setDesigning={() => setPhase("designing")}
              initialError={flowError}
              onError={(m) => {
                setFlowError(m);
                setPhase("decide");
              }}
            />
          )}
          {phase === "ideas" && state && (
            <Ideas
              state={state}
              setDesigning={() => setPhase("designing")}
              onPlan={(s) => {
                setState(s);
                setPhase("review");
              }}
              initialError={flowError}
              onError={(m) => {
                setFlowError(m);
                setPhase("ideas");
              }}
            />
          )}
          {phase === "designing" && <Designing />}
          {phase === "review" && state?.plan && (
            <Review
              plan={state.plan}
              presidentName={state.presidentName}
              onFounded={(c) => {
                setCompany(c);
                setPhase("founding");
              }}
            />
          )}
          {phase === "founding" && company && <Founding company={company} onEnter={() => router.replace("/office")} />}
        </motion.div>
      </AnimatePresence>
      {error && phase === "opening" && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function MioSpeech({ children, talking, size = 220 }: { children: React.ReactNode; talking?: boolean; size?: number }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="absolute inset-4 -z-10 rounded-full bg-sky/25 blur-3xl" />
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity }}>
          <Avatar role="secretary" size={size} talking={talking} />
        </motion.div>
      </div>
      <div className="panel panel-gold relative -mt-4 w-full max-w-md px-5 py-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gold">
          ミオ <span className="font-normal text-muted">社長秘書</span>
        </div>
        <div className="min-h-[3.2em] text-[1.02rem] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Opening({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);
  const [skip, setSkip] = useState(false);
  const next = () => {
    if (!typed) {
      setSkip(true);
      return;
    }
    if (i < OPENING.length - 1) {
      setI(i + 1);
      setTyped(false);
      setSkip(false);
    } else onDone();
  };
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg cursor-pointer flex-col justify-center px-5 py-10" onClick={next}>
      <MioSpeech talking={!typed}>
        <Typewriter key={i} text={OPENING[i]} skip={skip} onDone={() => setTyped(true)} />
      </MioSpeech>
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {OPENING.map((_, k) => (
          <span key={k} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-gold" : "w-1.5 bg-white/20")} />
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <Button variant={typed ? "gold" : "ghost"} onClick={(e) => (e.stopPropagation(), next())}>
          {i === OPENING.length - 1 && typed ? "面談を始める" : "次へ"} <ChevronRight size={18} />
        </Button>
      </div>
      <button className="mt-3 text-center text-xs text-muted underline-offset-2 hover:underline" onClick={(e) => (e.stopPropagation(), onDone())}>
        スキップ
      </button>
    </div>
  );
}

function NameStep({ onStarted }: { onStarted: (s: ViewState) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start(n: string) {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ state: ViewState }>("/api/onboarding", { body: { action: "start", presidentName: n } });
      onStarted(r.state);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <MioSpeech size={180}>
        <Typewriter text="まず、社長のお名前を教えてください。呼ばれたいお名前で大丈夫です。" />
      </MioSpeech>
      <form
        className="mx-auto mt-6 w-full max-w-md space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(name.trim());
        }}
      >
        <Input autoFocus maxLength={20} value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" aria-label="社長のお名前" />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy || !name.trim()}>
          {busy ? <Spinner /> : <ArrowRight size={18} />} この名前で始める
        </Button>
        <button type="button" disabled={busy} className="w-full text-center text-xs text-muted hover:text-text" onClick={() => start("")}>
          名前は後で決める（スキップ）
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Interview({ initial, onDone }: { initial: ViewState; onDone: (s: ViewState) => void }) {
  const [s, setS] = useState(initial);
  const [msgs, setMsgs] = useState(initial.transcript);
  const [suggestions, setSuggestions] = useState<string[]>(
    initial.transcript.length <= 1 ? ["自由な働き方をしたい", "好きなことで生きたい", "誰かの役に立ちたい"] : [],
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  const send = useCallback(
    async (body: Record<string, unknown>, shown?: string) => {
      setError("");
      setBusy(true);
      setSuggestions([]);
      if (shown) setMsgs((m) => [...m, { role: "user", content: shown }]);
      try {
        const r = await api<{ state: ViewState; reply: string; suggestions?: string[]; done?: boolean }>("/api/onboarding", { body });
        setS(r.state);
        setMsgs(r.state.transcript);
        setSuggestions(r.suggestions ?? []);
        if (r.done) setDone(true);
      } catch (e) {
        setError((e as Error).message);
        if (shown) setMsgs((m) => m.slice(0, -1));
        if (shown) setText(shown);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const submit = (v: string) => {
    const t = v.trim();
    if (!t || busy) return;
    setText("");
    send({ action: "answer", text: t }, t);
  };

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b border-line bg-ink/80 px-4 py-3 backdrop-blur">
        <Avatar role="secretary" size={44} talking={busy} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">会社設立面談</div>
          <div className="mt-1 flex items-center gap-2">
            <ProgressBar value={s.progress.done / s.progress.total} className="h-1.5" />
            <span className="shrink-0 text-[11px] text-muted">
              {s.progress.done}/{s.progress.total}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && <Avatar role="secretary" size={34} className="mt-1 shrink-0" />}
            <div
              className={cn(
                "max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed",
                m.role === "assistant" ? "rounded-tl-sm border border-line bg-navy-800/80" : "rounded-tr-sm bg-gradient-to-br from-sky/90 to-[#3b6fd9] text-white",
              )}
            >
              {m.content}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex items-center gap-2.5">
            <Avatar role="secretary" size={34} talking />
            <div className="flex gap-1 rounded-2xl border border-line bg-navy-800/80 px-4 py-3">
              {[0, 1, 2].map((k) => (
                <motion.span key={k} className="h-1.5 w-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: k * 0.2 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line bg-navy-950/90 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        {error && (
          <div className="mb-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {done ? (
          <Button variant="gold" size="lg" className="w-full" onClick={() => onDone(s)}>
            <Sparkles size={18} /> 会社の設計に進む
          </Button>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto">
                {suggestions.map((sg) => (
                  <button key={sg} onClick={() => submit(sg)} disabled={busy} className="shrink-0 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs text-gold-soft hover:bg-gold/10">
                    {sg}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit(text);
              }}
            >
              <Textarea
                rows={1}
                value={text}
                maxLength={1000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit(text);
                  }
                }}
                placeholder="ミオに答える…"
                aria-label="回答を入力"
                className="max-h-32 min-h-[48px]"
              />
              <Button type="submit" size="icon" className="h-12 w-12 shrink-0" disabled={busy || !text.trim()} aria-label="送信">
                <SendHorizonal size={19} />
              </Button>
            </form>
            <div className="mt-2 flex justify-between">
              <button disabled={busy} onClick={() => send({ action: "skip" }, "（スキップ）")} className="flex items-center gap-1 text-xs text-muted hover:text-text">
                <SkipForward size={14} /> この質問はスキップ
              </button>
              {s.canFinish && (
                <button disabled={busy} onClick={() => send({ action: "finish_interview" })} className="text-xs font-semibold text-gold-soft hover:underline">
                  面談を終えて設計に進む →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Decide({
  state,
  onIdeas,
  onPlan,
  setDesigning,
  onError,
  initialError,
}: {
  state: ViewState;
  onIdeas: (s: ViewState) => void;
  onPlan: (s: ViewState) => void;
  setDesigning: () => void;
  onError: (message: string) => void;
  initialError: string;
}) {
  const [busy, setBusy] = useState<"" | "ideas" | "plan">("");
  const [error, setError] = useState(initialError);
  async function run(action: "ideas" | "plan") {
    setBusy(action);
    setError("");
    if (action === "plan") setDesigning();
    try {
      const r = await api<{ state: ViewState }>("/api/onboarding", { body: { action } });
      if (action === "ideas") onIdeas(r.state);
      else onPlan(r.state);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
      onError((e as Error).message);
    }
  }
  const options = [
    { key: "ideas" as const, icon: Lightbulb, title: "事業アイデアを提案してほしい", desc: "あなたの興味・経験・強みから、ミオとカイトが3つの事業案を提案します" },
    { key: "plan" as const, icon: PenLine, title: "事業は決まっている", desc: "面談の内容をもとに、そのまま会社を設計します" },
  ];
  const recommended = state.suggestIdeas ? "ideas" : "plan";
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <MioSpeech size={170}>
        <Typewriter text="面談ありがとうございました。最後に確認です。会社の事業は、もう決まっていますか？" />
      </MioSpeech>
      <div className="mt-6 space-y-3">
        {options.map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            disabled={!!busy}
            onClick={() => run(key)}
            className={cn("panel flex w-full items-start gap-3 p-4 text-left transition hover:border-gold/50", recommended === key && "panel-gold")}
          >
            <Icon className="mt-0.5 shrink-0 text-gold" size={22} />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-bold">
                {title}
                {recommended === key && <Pill tone="gold">おすすめ</Pill>}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{desc}</div>
            </div>
            {busy === key ? <Spinner className="mt-1" /> : <ChevronRight className="mt-0.5 text-muted" size={18} />}
          </button>
        ))}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </div>
  );
}

function Ideas({
  state,
  setDesigning,
  onPlan,
  onError,
  initialError,
}: {
  state: ViewState;
  setDesigning: () => void;
  onPlan: (s: ViewState) => void;
  onError: (message: string) => void;
  initialError: string;
}) {
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  async function choose(index: number) {
    setBusy(true);
    setError("");
    try {
      await api("/api/onboarding", { body: { action: "choose_idea", index } });
      setDesigning();
      const r = await api<{ state: ViewState }>("/api/onboarding", { body: { action: "plan" } });
      onPlan(r.state);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      onError((e as Error).message);
    }
  }
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Avatar role="planner" size={56} />
        <div>
          <div className="text-xs font-bold text-gold">カイト（企画担当）</div>
          <p className="text-sm leading-relaxed">社長の強みを活かせる事業案を3つ考えました。気になるものを選んでください。</p>
        </div>
      </div>
      <div className="space-y-3">
        {state.ideas.map((idea, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className="panel p-5">
            <div className="mb-1 font-display text-xs font-bold tracking-widest text-sky-soft">PLAN {String.fromCharCode(65 + i)}</div>
            <h3 className="text-lg font-black">{idea.title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{idea.summary}</p>
            <dl className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
              <div><dt className="inline font-bold text-text">対象：</dt><dd className="inline">{idea.target}</dd></div>
              <div><dt className="inline font-bold text-text">向いている理由：</dt><dd className="inline">{idea.whyYou}</dd></div>
              <div><dt className="inline font-bold text-text">最初の一歩：</dt><dd className="inline">{idea.firstStep}</dd></div>
            </dl>
            <Button variant="gold" className="mt-4 w-full" disabled={busy} onClick={() => choose(i)}>
              この事業で会社をつくる
            </Button>
          </motion.div>
        ))}
      </div>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
    </div>
  );
}

function Designing() {
  const steps = ["面談内容を整理しています", "社名を考えています", "理念と目標をまとめています", "最初の行動計画を作っています", "初日のミッションを準備しています"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 2200);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="mb-6 rounded-full border border-dashed border-gold/40 p-3">
        <Avatar role="secretary" size={120} talking />
      </motion.div>
      <div className="text-lg font-bold">会社を設計しています…</div>
      <div className="mt-5 w-full space-y-2 text-left">
        {steps.map((s, k) => (
          <div key={s} className={cn("flex items-center gap-2 text-sm transition", k <= i ? "text-text" : "text-muted/40")}>
            {k < i ? <Check size={16} className="text-success" /> : k === i ? <Spinner className="text-gold" /> : <span className="h-4 w-4" />}
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Review({ plan: initial, presidentName, onFounded }: { plan: CompanyPlan; presidentName: string; onFounded: (c: Company) => void }) {
  const [plan, setPlan] = useState<CompanyPlan>(initial);
  const [president, setPresident] = useState(presidentName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof CompanyPlan>(k: K, v: CompanyPlan[K]) => setPlan((p) => ({ ...p, [k]: v }));
  const logo = generateLogo(plan.companyName || "AI");

  async function found() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ company: Company }>("/api/onboarding", { body: { action: "found", plan: { ...plan, presidentName: president } } });
      onFounded(r.company);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-36 pt-8">
      <div className="mb-6 flex items-start gap-3">
        <Avatar role="secretary" size={56} happy />
        <div className="panel flex-1 px-4 py-3 text-sm leading-relaxed">
          社長、会社の設計図ができました！内容を確認して、自由に書き換えてください。よろしければ「設立する」を押してください。
        </div>
      </div>

      <section className="panel panel-gold mb-4 p-5">
        <div className="flex items-center gap-4">
          <CompanyLogo logo={logo} size={72} />
          <div className="min-w-0 flex-1">
            <Label>社名</Label>
            <Input value={plan.companyName} maxLength={40} onChange={(e) => set("companyName", e.target.value)} aria-label="社名" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {plan.companyNameCandidates.map((c) => (
            <button
              key={c}
              onClick={() => set("companyName", c)}
              className={cn("rounded-full border px-3 py-1 text-xs", plan.companyName === c ? "border-gold bg-gold/15 text-gold-soft" : "border-line text-muted hover:text-text")}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>社長名</Label>
            <Input value={president} maxLength={20} onChange={(e) => setPresident(e.target.value)} />
          </div>
          <div>
            <Label>キャッチコピー</Label>
            <Input value={plan.tagline} maxLength={80} onChange={(e) => set("tagline", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel mb-4 space-y-4 p-5">
        {(
          [
            ["concept", "事業コンセプト", 600, 4],
            ["philosophy", "会社の理念", 300, 2],
            ["vision", "目指す未来", 300, 2],
            ["mainBusiness", "主要事業", 300, 3],
          ] as const
        ).map(([k, label, max, rows]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Textarea rows={rows} maxLength={max} value={plan[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </section>

      <section className="panel mb-4 p-5">
        <Label>目標</Label>
        <div className="space-y-2">
          {plan.goals.map((g, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={g.title}
                maxLength={100}
                onChange={(e) => set("goals", plan.goals.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))}
              />
              <Input
                className="w-24 shrink-0"
                value={g.horizon}
                maxLength={40}
                onChange={(e) => set("goals", plan.goals.map((x, k) => (k === i ? { ...x, horizon: e.target.value } : x)))}
                aria-label="期間"
              />
              {plan.goals.length > 1 && (
                <button aria-label="削除" className="px-1 text-muted hover:text-danger" onClick={() => set("goals", plan.goals.filter((_, k) => k !== i))}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          {plan.goals.length < 4 && (
            <button className="flex items-center gap-1 text-xs text-sky-soft" onClick={() => set("goals", [...plan.goals, { title: "", description: "", horizon: "" }])}>
              <Plus size={14} /> 目標を追加
            </button>
          )}
        </div>
        <Label className="mt-5">最初の行動計画</Label>
        <ol className="space-y-2">
          {plan.actionPlan.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-3 w-5 shrink-0 text-center font-display text-sm font-bold text-gold">{i + 1}</span>
              <Input value={a.step} maxLength={80} onChange={(e) => set("actionPlan", plan.actionPlan.map((x, k) => (k === i ? { ...x, step: e.target.value } : x)))} />
            </li>
          ))}
        </ol>
      </section>

      <section className="panel mb-4 p-5">
        <Label>配属されるAI社員</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["secretary", "planner", "marketer"] as EmployeeRole[]).map((r) => {
            const t = templateFor(r);
            const reason = plan.recommendedEmployees.find((e) => e.role === r)?.reason;
            return (
              <div key={r} className="rounded-xl border border-line bg-navy-950/50 p-2 text-center">
                <Avatar role={r} size={64} className="mx-auto" />
                <div className="mt-1 text-sm font-bold">{t.defaultName}</div>
                <div className="text-[10px] text-muted">{t.title}</div>
                {reason && <div className="mt-1 line-clamp-3 text-[10px] leading-snug text-muted/80">{reason}</div>}
              </div>
            );
          })}
        </div>
        <Label className="mt-5">初日のミッション</Label>
        <ul className="space-y-2">
          {plan.firstDayMissions.map((m, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-navy-950/50 p-3">
              <Avatar role={m.employeeRole} size={32} className="shrink-0" />
              <div>
                <div className="text-sm font-bold">{m.title}</div>
                <div className="text-xs text-muted">{m.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mb-2 text-center text-[11px] text-muted">※ アプリ内の仮想的な会社設立です。法的な登記・届出は行われません。</p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-navy-950/90 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {error && <div className="mb-2"><Notice tone="error">{error}</Notice></div>}
          <Button
            variant="gold"
            size="lg"
            className="w-full"
            disabled={busy || !plan.companyName.trim() || plan.goals.some((g) => !g.title.trim()) || plan.actionPlan.some((a) => !a.step.trim())}
            onClick={found}
          >
            {busy ? <Spinner /> : <Sparkles size={18} />} この内容で会社を設立する
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Founding({ company, onEnter }: { company: Company; onEnter: () => void }) {
  const lines = ["会社設立の準備が整いました", "社名を登録しています……", "オフィスを準備しています……", "AI社員を配置しています……"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step > lines.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 1300);
    return () => clearTimeout(t);
  }, [step, lines.length]);
  const celebrating = step > lines.length;

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 py-10 text-center">
      {!celebrating ? (
        <div className="w-full space-y-3">
          {lines.map((l, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i < step ? 1 : 0, x: i < step ? 0 : -10 }}
              className="flex items-center justify-center gap-2 text-base"
            >
              {i < step - 1 ? <Check className="text-success" size={18} /> : <Spinner className="text-gold" />}
              {l}
            </motion.div>
          ))}
        </div>
      ) : (
        <>
          <Confetti />
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="font-display text-4xl font-extrabold tracking-wide text-gold-gradient shine sm:text-5xl">
            Congratulations!
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-2 text-lg font-bold">
            あなたの会社が誕生しました！
          </motion.p>
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.7, type: "spring", damping: 10 }} className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gold/30 blur-2xl" />
              <CompanyLogo logo={company.logo} size={132} className="relative" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="mt-5">
            <div className="text-3xl font-black">{company.name}</div>
            {company.tagline && <div className="mt-1 text-sm text-gold-soft">{company.tagline}</div>}
            <div className="mt-2 text-xs text-muted">代表 {company.presidentName || "社長"}</div>
          </motion.div>
          <div className="mt-8 flex justify-center gap-3">
            {(["planner", "secretary", "marketer"] as EmployeeRole[]).map((r, i) => (
              <motion.div key={r} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + i * 0.2, type: "spring" }} className="text-center">
                <Avatar role={r} size={r === "secretary" ? 92 : 76} happy />
                <div className="mt-1 text-xs font-bold">{templateFor(r).defaultName}</div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }} className="mt-8 w-full">
            <div className="panel mb-4 px-4 py-3 text-sm">
              <span className="font-bold text-gold">ミオ</span>「社長、おめでとうございます！さっそく社長室へご案内しますね。初日のミッションも用意してあります。」
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={onEnter}>
              社長室へ出社する <ArrowRight size={18} />
            </Button>
            <p className="mt-3 text-[11px] text-muted">※ アプリ内の仮想的な会社です。法的な法人登記ではありません。</p>
          </motion.div>
        </>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((i) => (
        <motion.span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: ["#d4af37", "#f3d98b", "#5b9dff", "#9cc3ff", "#ffffff"][i % 5] }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", rotate: 360 * (i % 2 ? 1 : -1), opacity: [1, 1, 0.6] }}
          transition={{ duration: 2.6 + (i % 5) * 0.4, delay: (i % 9) * 0.12, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
