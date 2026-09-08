const cases = [
  { en: "GOLF", ja: "ゴルフスクール" },
  { en: "TENNIS", ja: "テニススクール" },
  { en: "SOCCER", ja: "サッカースクール" },
  { en: "BASEBALL", ja: "野球スクール" },
  { en: "FITNESS", ja: "トレーナー" },
  { en: "EDUCATION", ja: "学習塾" },
  { en: "MUSIC", ja: "音楽教室" },
];

export default function UseCase() {
  return (
    <section className="section-pad bg-offwhite">
      <div className="container-narrow">
        <p className="section-label">USE CASE</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug">
          スポーツだけではありません。
        </h2>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cases.map((c) => (
            <div key={c.en} className="card p-5">
              <p className="text-[11px] font-bold tracking-[0.1em] text-accent">
                {c.en}
              </p>
              <p className="text-[14px] font-semibold text-ink mt-1">{c.ja}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[14px] text-muted leading-relaxed max-w-xl">
          その他、「教える」「練習する」「成長する」サービスであれば、
          カスタマイズ可能です。
        </p>
      </div>
    </section>
  );
}
