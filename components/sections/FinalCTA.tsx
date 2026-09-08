export default function FinalCTA() {
  return (
    <section className="section-pad">
      <div className="container-narrow text-center">
        <h2 className="text-[26px] sm:text-4xl font-bold text-ink leading-snug">
          あなたのスクールにも、
          <br />
          オリジナルの成長ノートを。
        </h2>
        <p className="mt-6 text-[15px] text-muted leading-relaxed max-w-lg mx-auto">
          まだ導入を決めていただく必要はありません。
          <br />
          まずは実際のデモをご覧いただき、「自分のスクールなら、こんな使い方ができそう」
          というところからご相談ください。
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#contact" className="btn-primary">
            デモを見てみる
          </a>
          <a href="#contact" className="btn-secondary">
            導入について相談する
          </a>
        </div>
      </div>
    </section>
  );
}
