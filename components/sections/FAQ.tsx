const faqs = [
  {
    q: "個人のインストラクターでも利用できますか？",
    a: "はい。スクールだけでなく、個人で指導されているコーチ・インストラクターにも対応できます。",
  },
  {
    q: "自社のロゴやカラーに変更できますか？",
    a: "可能です。",
  },
  {
    q: "記録項目は変更できますか？",
    a: "指導方法に合わせて設計できます。",
  },
  {
    q: "AI機能は必須ですか？",
    a: "必要な機能に合わせて設計できます。",
  },
  {
    q: "どんな業種でも利用できますか？",
    a: "レッスン・指導・練習・成長記録があるサービスであれば、まずはご相談ください。",
  },
  {
    q: "まだ具体的な仕様が決まっていません。",
    a: "問題ありません。現在の指導方法を伺いながら一緒に整理します。",
  },
];

export default function FAQ() {
  return (
    <section className="section-pad bg-offwhite">
      <div className="container-narrow">
        <p className="section-label">FAQ</p>
        <h2 className="text-[26px] sm:text-3xl font-bold text-ink leading-snug mb-10">
          よくある質問
        </h2>

        <div className="space-y-3 max-w-2xl">
          {faqs.map((f) => (
            <details key={f.q} className="card p-5 group open:pb-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-[14px] font-semibold text-ink pr-4">
                  {f.q}
                </span>
                <span className="text-muted text-lg shrink-0 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[13px] text-muted leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
