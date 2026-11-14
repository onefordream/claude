import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { btn } from "./ui";

const NAV = [
  ["/concept", "コンセプト"],
  ["/benefits", "会員特典"],
  ["/events", "ゴルフイベント"],
  ["/partners", "提携ゴルフ場・メーカー"],
  ["/pricing", "料金"],
  ["/membership", "入会資格・審査"],
  ["/faq", "FAQ"],
  ["/contact", "お問い合わせ"],
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`font-serif text-base tracking-[0.25em] md:text-lg ${light ? "text-white" : "text-ink"}`}>
      OWNERS <span className="text-gold">GOLF</span> CLUB
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const accountHref = !user ? "/login" : user.role === "ADMIN" ? "/admin" : user.role === "MEMBER" ? "/member" : "/apply/status";
  const accountLabel = !user ? "ログイン" : user.role === "ADMIN" ? "管理画面" : user.role === "MEMBER" ? "会員エリア" : "申請状況";
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16">
        <Logo light />
        <nav className="hidden items-center gap-5 text-xs tracking-wider lg:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-white/80 hover:text-gold">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href={accountHref} className="hidden text-xs tracking-wider text-white/80 hover:text-gold sm:inline">
            {accountLabel}
          </Link>
          {!user ? (
            <Link href="/apply" className="border border-gold px-3 py-1.5 text-xs tracking-widest text-gold hover:bg-gold hover:text-ink">
              入会申請
            </Link>
          ) : null}
          <details className="relative lg:hidden">
            <summary className="flex h-9 w-9 cursor-pointer list-none flex-col items-center justify-center gap-1.5 [&::-webkit-details-marker]:hidden" aria-label="メニュー">
              <span className="block h-px w-5 bg-white" />
              <span className="block h-px w-5 bg-white" />
              <span className="block h-px w-5 bg-white" />
            </summary>
            <nav className="fixed inset-x-0 top-14 border-t border-white/10 bg-ink px-4 pb-6 text-sm">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="block border-b border-white/10 py-3 text-white/90">
                  {label}
                </Link>
              ))}
              <Link href={accountHref} className="block border-b border-white/10 py-3 text-gold">
                {accountLabel}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Logo light />
        <p className="mt-3 text-xs">経営者のための、完全審査制 会員制ゴルフ＆ビジネスコミュニティ</p>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-4">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-gold">
              {label}
            </Link>
          ))}
          <Link href="/pre-register" className="hover:text-gold">事前登録</Link>
          <Link href="/terms" className="hover:text-gold">入会規約</Link>
          <Link href="/privacy" className="hover:text-gold">個人情報保護方針</Link>
          <Link href="/tokushoho" className="hover:text-gold">特定商取引法に基づく表記</Link>
        </div>
        <p className="mt-10 text-[11px] text-white/40">© OWNERS GOLF CLUB</p>
      </div>
    </footer>
  );
}

export function CtaBand() {
  return (
    <section className="bg-green text-white">
      <div className="mx-auto max-w-5xl px-4 py-14 text-center">
        <p className="text-xs tracking-[0.3em] text-gold">MEMBERSHIP</p>
        <h2 className="mt-3 font-serif text-2xl md:text-3xl">入会は、審査制です。</h2>
        <p className="mt-4 text-sm text-white/80">お申し込み後、運営事務局にて審査を行います。承認された方のみ、お手続きにお進みいただけます。</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/apply" className="inline-flex items-center justify-center border border-gold bg-gold px-8 py-3 text-sm tracking-widest text-ink hover:bg-transparent hover:text-gold">
            入会を申請する
          </Link>
          <Link href="/pre-register" className={`${btn.outline} border-white text-white hover:bg-white hover:text-ink`}>
            事前登録（情報を受け取る）
          </Link>
        </div>
      </div>
    </section>
  );
}
