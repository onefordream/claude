export default function Price() {
  return (
    <section className="section-pad bg-ink text-white">
      <div className="container-narrow">
        <p className="text-xs tracking-[0.25em] font-semibold text-white/50 mb-4">
          PRICE
        </p>
        <h2 className="text-[24px] sm:text-3xl font-bold leading-snug max-w-xl">
          必要な機能・カスタマイズ内容に合わせて
          個別にお見積りします。
        </h2>

        <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="rounded-card border border-white/15 p-6">
            <p className="text-[11px] font-bold tracking-[0.1em] text-white/50 mb-2">
              初期導入費
            </p>
            <p className="text-[14px] text-white/80 leading-relaxed">
              ロゴ・カラー・記録項目・AI機能などの設計と構築費用
            </p>
          </div>
          <div className="rounded-card border border-white/15 p-6">
            <p className="text-[11px] font-bold tracking-[0.1em] text-white/50 mb-2">
              月額利用料
            </p>
            <p className="text-[14px] text-white/80 leading-relaxed">
              運用・サポート・アップデートを含む月額費用
            </p>
          </div>
        </div>

        <p className="mt-8 text-[13px] text-white/50 max-w-xl leading-relaxed">
          スクール規模、機能範囲、カスタマイズの内容によって費用は変わります。
          まずはお気軽にご相談ください。
        </p>

        <div className="mt-8">
          <a href="#contact" className="btn-primary !bg-white !text-ink">
            料金について相談する
          </a>
        </div>
      </div>
    </section>
  );
}
