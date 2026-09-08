export default function Footer() {
  return (
    <footer className="border-t border-line px-6 sm:px-8 py-14">
      <div className="container-narrow">
        <p className="text-[13px] font-bold tracking-wide text-ink">
          ORIGINAL AI GROWTH NOTE
        </p>
        <p className="text-[12px] text-muted mt-1">by CRAFTORY</p>

        <div className="mt-8 pt-8 border-t border-line">
          <p className="text-[11px] font-bold tracking-[0.15em] text-muted mb-2">
            CRAFTORYについて
          </p>
          <p className="text-[13px] text-muted leading-relaxed max-w-md">
            AI・Web・システムを組み合わせ、ビジネスに実際に使われるサービスを
            設計・開発しています。
          </p>
        </div>

        <p className="mt-10 text-[11px] text-muted/60">
          © {new Date().getFullYear()} CRAFTORY. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
