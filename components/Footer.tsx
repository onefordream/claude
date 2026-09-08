export default function Footer() {
  return (
    <footer className="band-dark" style={{ paddingBlock: "64px 120px" }}>
      <div className="wrap">
        <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr] gap-9">
          <div className="foot-about">
            <p className="foot-brand">ORIGINAL AI GROWTH NOTE</p>
            <p className="foot-sub">by CRAFTORY</p>
            <p>AI・Web・システムを組み合わせ、ビジネスに実際に使われるサービスを設計・開発しています。</p>
          </div>
          <div className="foot-links">
            <h5>MENU</h5>
            <ul>
              <li><a href="#top">TOP</a></li>
              <li><a href="#problem">特徴</a></li>
              <li><a href="#product">機能</a></li>
              <li><a href="#customize">カスタマイズ</a></li>
              <li><a href="#casestudy">導入事例</a></li>
            </ul>
          </div>
          <div className="foot-links">
            <h5>SUPPORT</h5>
            <ul>
              <li><a href="#price">料金</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#contact">お問い合わせ</a></li>
            </ul>
          </div>
        </div>
        <div
          className="flex flex-wrap justify-between gap-2.5 text-[11.5px] mt-12 pt-6"
          style={{ borderTop: "1px solid var(--line-on-dark)", color: "var(--muted-on-dark)" }}
        >
          <span>© {new Date().getFullYear()} CRAFTORY. All rights reserved.</span>
          <span>プライバシーポリシー</span>
        </div>
      </div>
    </footer>
  );
}
