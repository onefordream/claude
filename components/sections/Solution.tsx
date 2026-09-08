const items = [
  { label: "TODAY'S LESSON", ja: "今日やったこと" },
  { label: "DISCOVERY", ja: "今日の気づき" },
  { label: "NEXT ACTION", ja: "次回までにやること" },
  { label: "GOAL", ja: "現在の目標" },
  { label: "PRACTICE", ja: "自主練習" },
  { label: "RESULT", ja: "試合・ラウンド・テストなどの成果" },
];

export default function Solution() {
  return (
    <section className="section-pad">
      <div className="container-narrow">
        <p className="section-label">SOLUTION</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          記録するのは、生徒自身。
        </h2>
        <p className="mt-5 text-[15px] text-muted leading-relaxed max-w-xl">
          レッスンを受けて終わりではなく、自分の言葉で記録する。
        </p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.label} className="card p-5">
              <p className="text-[11px] font-bold tracking-[0.1em] text-accent mb-2">
                {it.label}
              </p>
              <p className="text-[14px] text-ink leading-relaxed">{it.ja}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-lg sm:text-xl font-bold text-ink text-center leading-relaxed">
          「受けるだけのレッスン」から、
          <br className="sm:hidden" />
          「自分で成長を振り返るレッスン」へ。
        </p>
      </div>
    </section>
  );
}
