const before = ["レッスン", "先生が記録", "生徒は帰宅", "自主練習", "情報が分散"];
const after = [
  "レッスン",
  "生徒が記録",
  "成長ノートに蓄積",
  "自主練習も記録",
  "AIで振り返り",
  "次回レッスン",
];

function Flow({ steps, tone }: { steps: string[]; tone: "before" | "after" }) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`flex-1 rounded-xl px-4 py-3 text-[13px] font-medium ${
              tone === "before"
                ? "bg-white border border-line text-muted"
                : "bg-ink text-white"
            }`}
          >
            {s}
          </div>
          {i < steps.length - 1 && (
            <span className="text-muted/50 text-xs shrink-0">↓</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BeforeAfter() {
  return (
    <section className="section-pad bg-offwhite">
      <div className="container-narrow">
        <p className="section-label">BEFORE / AFTER</p>
        <h2 className="text-[24px] sm:text-3xl font-bold text-ink leading-snug max-w-xl">
          レッスンとレッスンの間にも、成長は続いている。
        </h2>

        <div className="mt-12 grid sm:grid-cols-2 gap-10">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted mb-4">
              BEFORE
            </p>
            <Flow steps={before} tone="before" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-accent mb-4">
              AFTER
            </p>
            <Flow steps={after} tone="after" />
          </div>
        </div>
      </div>
    </section>
  );
}
