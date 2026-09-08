// Product UI mock screens — built in CSS/HTML for the initial launch.
// Swap-out point: replace each screen's inner markup with a real product
// screenshot (<Image src="/screens/home.png" ... />) once available.

function ScreenHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 pt-2 pb-4">
      <p className="text-[11px] text-muted tracking-wide">{sub}</p>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
    </div>
  );
}

export function HomeScreen({
  accent = "#2E5E4E",
  schoolName = "AI GROWTH NOTE",
  studentName = "Yuto K.",
  goal = "スイングの再現性を上げる",
  task = "素振り 50回 / 動画チェック",
  records = [
    { label: "レッスン記録", time: "今日" },
    { label: "自主練習", time: "昨日" },
    { label: "ラウンド結果", time: "3日前" },
  ],
}: {
  accent?: string;
  schoolName?: string;
  studentName?: string;
  goal?: string;
  task?: string;
  records?: { label: string; time: string }[];
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.15em] text-muted font-semibold">
            {schoolName}
          </p>
          <p className="text-sm font-bold text-ink">{studentName}</p>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: accent }}
        >
          {studentName.charAt(0)}
        </div>
      </div>

      <div className="px-5">
        <div
          className="rounded-2xl p-4 text-white mb-4"
          style={{ backgroundColor: accent }}
        >
          <p className="text-[10px] tracking-wide opacity-80 mb-1">CURRENT GOAL</p>
          <p className="text-[15px] font-bold leading-snug">{goal}</p>
        </div>

        <div className="rounded-2xl border border-line p-4 mb-4">
          <p className="text-[10px] tracking-wide text-muted mb-1">NEXT ACTION</p>
          <p className="text-[13px] font-semibold text-ink">{task}</p>
        </div>

        <p className="text-[11px] font-semibold text-muted mb-2">最近の記録</p>
        <div className="space-y-2">
          {records.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-xl bg-offwhite px-4 py-3"
            >
              <span className="text-[13px] font-medium text-ink">{r.label}</span>
              <span className="text-[11px] text-muted">{r.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-5 gap-1 px-3 py-3 border-t border-line">
        {["HOME", "練習", "記録", "成長", "AI"].map((t, i) => (
          <div
            key={t}
            className={`flex flex-col items-center gap-1 text-[9px] font-semibold ${
              i === 0 ? "text-ink" : "text-muted/60"
            }`}
          >
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: i === 0 ? accent : "#E5E5E1" }}
            />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonScreen() {
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader sub="LESSON RECORD" title="今日のレッスン記録" />
      <div className="px-5 space-y-3">
        <Field label="TODAY'S LESSON" text="アプローチの距離感を練習した" />
        <Field label="DISCOVERY" text="手首を固定すると方向性が安定する" />
        <Field label="NEXT ACTION" text="次回までに30ヤード地点で反復練習" />
        <div className="rounded-xl bg-offwhite p-4">
          <p className="text-[10px] font-semibold text-muted mb-1">COACH COMMENT</p>
          <p className="text-[13px] text-ink leading-relaxed">
            いいスイングでした。次回は方向性を一緒に確認しましょう。
          </p>
        </div>
      </div>
    </div>
  );
}

export function PracticeScreen() {
  const logs = [
    { date: "9/07", title: "素振り 100回", note: "リズムを意識" },
    { date: "9/05", title: "パター練習 30分", note: "距離感の確認" },
    { date: "9/02", title: "アプローチ練習", note: "50球" },
  ];
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader sub="PRACTICE LOG" title="自主練習の記録" />
      <div className="px-5 space-y-3">
        {logs.map((l) => (
          <div key={l.date} className="rounded-xl border border-line p-4 flex gap-4">
            <div className="text-[11px] font-bold text-muted w-10 shrink-0">{l.date}</div>
            <div>
              <p className="text-[13px] font-semibold text-ink">{l.title}</p>
              <p className="text-[12px] text-muted mt-0.5">{l.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultScreen() {
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader sub="ROUND / RESULT" title="ラウンド結果" />
      <div className="px-5 space-y-3">
        <div className="rounded-xl bg-ink text-white p-4">
          <p className="text-[10px] opacity-70 mb-1">2026.09.06 — 〇〇カントリークラブ</p>
          <p className="text-2xl font-bold">89</p>
        </div>
        <Field label="GOOD POINT" text="ドライバーの方向性が安定していた" />
        <Field label="CHALLENGE" text="ショートパットの精度に課題" />
        <Field label="NEXT GOAL" text="1.5m以内のパット成功率を上げる" />
      </div>
    </div>
  );
}

export function GrowthScreen() {
  const items = [
    { m: "9月", v: 78 },
    { m: "8月", v: 62 },
    { m: "7月", v: 55 },
    { m: "6月", v: 40 },
  ];
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader sub="GROWTH HISTORY" title="成長の記録" />
      <div className="px-5">
        <div className="rounded-xl border border-line p-4 mb-4">
          <div className="flex items-end gap-3 h-28">
            {items
              .slice()
              .reverse()
              .map((it) => (
                <div key={it.m} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-accent/80"
                    style={{ height: `${it.v}%` }}
                  />
                  <span className="text-[10px] text-muted">{it.m}</span>
                </div>
              ))}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-muted mb-2">振り返り</p>
        <div className="rounded-xl bg-offwhite p-4">
          <p className="text-[13px] text-ink leading-relaxed">
            この3ヶ月でアプローチの記録が増え、狙った距離への再現性が高まっています。
          </p>
        </div>
      </div>
    </div>
  );
}

export function AICoachScreen() {
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader sub="AI COACH" title="AIに相談する" />
      <div className="px-5 space-y-3 pb-4">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-ink text-white px-4 py-2.5 text-[13px]">
            今日何を練習したらいい？
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-offwhite text-ink px-4 py-2.5 text-[13px] leading-relaxed">
            直近のレッスンでは「アプローチの距離感」が課題に挙がっていました。
            今日はまず30ヤード地点の反復から始めてみましょう。
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-ink text-white px-4 py-2.5 text-[13px]">
            目標まであと何が必要？
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-offwhite text-ink px-4 py-2.5 text-[13px] leading-relaxed">
            過去の記録を見ると、ショートパットの成功率が課題として残っています。
            次のラウンドまでに練習を重ねましょう。
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-[10px] font-semibold text-muted mb-1 tracking-wide">{label}</p>
      <p className="text-[13px] text-ink leading-relaxed">{text}</p>
    </div>
  );
}
