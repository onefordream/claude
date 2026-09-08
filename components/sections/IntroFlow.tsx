const steps = [
  { no: "01", en: "TALK", ja: "まずはスクールについて教えてください。" },
  { no: "02", en: "DESIGN", ja: "必要な項目・機能を整理。" },
  { no: "03", en: "CUSTOMIZE", ja: "ロゴ・カラー・機能を設定。" },
  { no: "04", en: "BUILD", ja: "専用環境を構築。" },
  { no: "05", en: "START", ja: "生徒へ案内して利用開始。" },
  { no: "06", en: "UPDATE", ja: "運用しながら改善。" },
];

export default function IntroFlow() {
  return (
    <section className="section-pad">
      <div className="container-narrow">
        <p className="section-label">FLOW</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          導入はシンプルです。
        </h2>
        <p className="mt-4 text-[14px] text-muted leading-relaxed max-w-xl">
          ITに詳しくなくても、専任チームと一緒に進めていくので安心です。
        </p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.no} className="card p-6">
              <p className="text-2xl font-bold text-ink/15">{s.no}</p>
              <p className="text-[12px] font-bold tracking-[0.1em] text-accent mt-1">
                {s.en}
              </p>
              <p className="text-[13px] text-ink mt-2 leading-relaxed">{s.ja}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
