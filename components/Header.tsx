export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur border-b border-line">
      <div className="container-narrow flex items-center justify-between px-6 sm:px-8 h-16">
        <span className="text-[14px] font-bold tracking-tight text-ink">
          オリジナルAI成長ノート
        </span>
        <a
          href="#contact"
          className="hidden sm:inline-flex btn-primary !px-5 !py-2.5 text-[13px]"
        >
          デモを見てみる
        </a>
      </div>
    </header>
  );
}
