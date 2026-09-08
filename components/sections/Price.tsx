export default function Price() {
  return (
    <section className="section band-white" id="price">
      <div className="wrap">
        <p className="eyebrow justify-center">PRICE</p>
        <h2 className="h2 center">料金</h2>
        <p className="lead center">スクール規模・必要な機能・カスタマイズ内容に合わせてご提案します。</p>

        {/* 金額が決まり次第、各tileの<p>内に金額を追記してください */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-9 max-w-[680px] mx-auto">
          <div className="price-tile">
            <h4>INITIAL — 初期導入費</h4>
            <p>ヒアリング・デザイン・カスタマイズ・専用環境の構築費用</p>
          </div>
          <div className="price-tile">
            <h4>MONTHLY — 月額利用料</h4>
            <p>運用・サポート・アップデートを含む月額費用</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-6">
          <span className="chip">専用デザイン</span>
          <span className="chip">初期設定</span>
          <span className="chip">カスタマイズ</span>
          <span className="chip">運用環境</span>
        </div>

        <p className="lead center mt-6">※金額は内容確定後にお見積りします。現時点で確定した料金表はございません。</p>

        <div className="cta-row center">
          <a href="#contact" className="btn btn-primary">料金について相談する</a>
        </div>
      </div>
    </section>
  );
}
