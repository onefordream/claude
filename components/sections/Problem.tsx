const counts = ["10人", "30人", "50人", "100人"];

export default function Problem() {
  return (
    <section className="section-pad bg-offwhite">
      <div className="container-narrow">
        <h2 className="text-[24px] sm:text-3xl font-bold text-ink leading-snug max-w-2xl">
          レッスンカルテ、
          <br />
          先生が毎回書いていませんか？
        </h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {counts.map((c, i) => (
            <div
              key={c}
              className="card px-5 py-4 flex items-center gap-3"
              style={{ opacity: 0.55 + i * 0.15 }}
            >
              <span className="text-lg font-bold text-ink">{c}</span>
              {i === counts.length - 1 && (
                <span className="text-xs text-muted">記録する仕事も増えていく</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-[15px] text-muted leading-relaxed max-w-xl">
          生徒が増えるほど、記録する仕事も増えていく。
        </p>

        <div className="mt-14 grid sm:grid-cols-3 gap-4">
          {[
            "せっかく先生が書いても、生徒が見返していない。",
            "次のレッスンまでに内容を忘れてしまう。",
            "自主練習につながっていない。",
          ].map((t) => (
            <div key={t} className="card p-5">
              <p className="text-[14px] text-ink leading-relaxed">{t}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-lg sm:text-xl font-bold text-ink text-center">
          そこで、「誰が記録するのか？」という考え方を変えます。
        </p>
      </div>
    </section>
  );
}
