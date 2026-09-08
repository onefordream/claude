export default function FinalCTA() {
  return (
    <section className="section finalcta">
      <div className="wrap max-w-[640px] text-center">
        <p className="badge-line">ORIGINAL AI GROWTH NOTE</p>
        <h2 className="h2">
          あなたのスクールにも、
          <br />
          オリジナルの「<span className="accent-text">成長ノート</span>」を。
        </h2>
        <p className="lead mx-auto" style={{ color: "var(--muted-on-dark)" }}>
          まずは実際のデモをご覧ください。
          <br />
          「うちなら、こんな使い方できる？」という相談からでも大丈夫です。
        </p>
        <div className="cta-row center">
          <a href="#contact" className="btn btn-primary">無料デモを見る</a>
          <a href="#contact" className="btn btn-secondary">導入について相談する</a>
        </div>
      </div>
    </section>
  );
}
