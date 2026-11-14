import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { isMockMode } from "@/lib/stripe";
import { LogoutButton } from "@/components/logout";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "管理画面", template: "%s | 管理画面" }, robots: { index: false } };

const NAV: [string, string][] = [
  ["/admin", "ダッシュボード"],
  ["/admin/applications", "申請・審査"],
  ["/admin/members", "会員管理"],
  ["/admin/payments", "決済管理"],
  ["/admin/shipments", "会員証・発送"],
  ["/admin/events", "イベント"],
  ["/admin/partners", "提携先・優待"],
  ["/admin/products", "商品"],
  ["/admin/orders", "注文・発送"],
  ["/admin/directory", "会員企業・PR"],
  ["/admin/contents", "勉強会"],
  ["/admin/notices", "お知らせ"],
  ["/admin/inquiries", "お問い合わせ"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/admin" className="font-serif text-sm tracking-[0.2em]">
            OWNERS <span className="text-gold">GOLF</span> CLUB <span className="ml-2 text-xs text-white/60">管理画面</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-white/60 sm:inline">{admin.email}</span>
            <LogoutButton className="text-xs text-white/70 hover:text-gold" />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 text-xs lg:hidden">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap px-2 py-2 text-white/80 hover:text-gold">{label}</Link>
          ))}
        </nav>
      </header>
      {isMockMode() ? (
        <div className="border-b border-gold/50 bg-[#fbf7ea] px-4 py-1.5 text-xs text-[#6b5512]">モック決済モード（Stripe 未設定）で動作しています。</div>
      ) : null}
      <div className="flex">
        <aside className="hidden w-52 shrink-0 border-r border-line bg-white lg:block">
          <nav className="sticky top-12 flex flex-col py-4 text-sm">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="px-5 py-2 text-ink/80 hover:bg-cream hover:text-green">{label}</Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
