export default function Header() {
  return (
    <header className="site sticky top-0 z-40 border-b" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--white) 86%, transparent)", backdropFilter: "blur(10px)" }}>
      <div className="wrap flex items-center justify-between h-[66px] gap-5">
        <span className="text-[14.5px] font-bold tracking-tight whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>
          オリジナルAI成長ノート
        </span>
        <nav className="hidden lg:flex gap-6 text-[13.5px]" style={{ color: "var(--muted)" }}>
          <a href="#product" className="hover:opacity-80">機能</a>
          <a href="#customize" className="hover:opacity-80">カスタマイズ</a>
          <a href="#casestudy" className="hover:opacity-80">導入事例</a>
          <a href="#price" className="hover:opacity-80">料金</a>
          <a href="#faq" className="hover:opacity-80">FAQ</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <a href="#contact" className="btn btn-secondary btn-sm hidden sm:inline-flex">相談する</a>
          <a href="#contact" className="btn btn-primary btn-sm">無料デモを見る</a>
        </div>
      </div>
    </header>
  );
}
