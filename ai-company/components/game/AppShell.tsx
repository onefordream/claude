"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Crown, Settings, Target, Users, MessagesSquare } from "lucide-react";
import type { CompanyLogo as Logo } from "@/lib/types";
import { CompanyLogo } from "./CompanyLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/office", label: "社長室", icon: Crown },
  { href: "/employees", label: "社員", icon: Users },
  { href: "/meeting", label: "会議", icon: MessagesSquare },
  { href: "/missions", label: "ミッション", icon: Target },
  { href: "/company", label: "会社", icon: Building2 },
];

export function AppShell({
  company,
  children,
  wide = false,
}: {
  company: { name: string; logo: Logo; level: number };
  children: React.ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <div className="min-h-dvh md:flex">
      {/* PC サイドナビ */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-navy-950/70 p-4 backdrop-blur md:flex">
        <Link href="/office" className="mb-6 flex items-center gap-2.5">
          <CompanyLogo logo={company.logo} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{company.name}</div>
            <div className="font-display text-[11px] font-bold tracking-widest text-gold">Lv.{company.level}</div>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active(href) ? "bg-gold/10 text-gold-soft ring-1 ring-gold/30" : "text-muted hover:bg-white/5 hover:text-text",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold", active("/settings") ? "text-gold-soft" : "text-muted hover:text-text")}>
          <Settings size={18} /> 料金・設定
        </Link>
        <div className="mt-3 px-3 font-display text-[10px] tracking-[0.3em] text-muted/60">AI COMPANY</div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* スマホ ヘッダー */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-ink/80 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/office" className="flex min-w-0 items-center gap-2">
            <CompanyLogo logo={company.logo} size={30} />
            <span className="truncate text-sm font-bold">{company.name}</span>
            <span className="font-display text-[11px] font-bold text-gold">Lv.{company.level}</span>
          </Link>
          <Link href="/settings" aria-label="料金・設定" className="rounded-lg p-2 text-muted hover:text-text">
            <Settings size={20} />
          </Link>
        </header>

        <main className={cn("mx-auto w-full px-4 pb-28 pt-4 sm:px-6 md:pb-12 md:pt-8", wide ? "max-w-5xl" : "max-w-3xl")}>{children}</main>

        {/* スマホ ボトムナビ */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-navy-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition", active(href) ? "text-gold-soft" : "text-muted")}
              >
                <Icon size={21} strokeWidth={active(href) ? 2.4 : 1.8} />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
