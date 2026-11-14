import Link from "next/link";
import { requireMemberArea } from "@/lib/auth";
import { LogoutButton } from "@/components/logout";
import { SiteFooter } from "@/components/site";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "会員エリア", template: "%s | 会員エリア" }, robots: { index: false } };

const NAV: [string, string][] = [
  ["/member", "ホーム"],
  ["/member/events", "イベント"],
  ["/member/courses", "提携ゴルフ場"],
  ["/member/store", "ストア"],
  ["/member/directory", "会員紹介"],
  ["/member/learning", "勉強会"],
  ["/member/card", "会員証"],
  ["/member/account", "会員情報"],
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMemberArea();
  return (
    <>
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/member" className="font-serif text-sm tracking-[0.2em] md:text-base">
            OWNERS <span className="text-gold">GOLF</span> CLUB
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-white/70 sm:inline">{user.name} 様</span>
            <LogoutButton className="text-xs text-white/70 hover:text-gold" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-white/10 px-2 text-xs">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap px-3 py-2.5 text-white/80 hover:text-gold">{label}</Link>
          ))}
        </nav>
      </header>
      {user.status === "PAST_DUE" ? (
        <div className="bg-red-50 px-4 py-2 text-center text-xs text-red-800">
          月会費のお支払いが確認できていません。<Link href="/member/account" className="underline">会員情報</Link>からカード情報をご確認ください。
        </div>
      ) : null}
      {user.status === "CANCEL_REQUESTED" ? (
        <div className="bg-[#fbf7ea] px-4 py-2 text-center text-xs text-[#6b5512]">退会申請中です。退会日まで会員サービスをご利用いただけます。</div>
      ) : null}
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8 md:py-12">{children}</main>
      <SiteFooter />
    </>
  );
}
