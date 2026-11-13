import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, gold, ...p }: React.HTMLAttributes<HTMLDivElement> & { gold?: boolean }) {
  return <div className={cn("panel p-4 sm:p-5", gold && "panel-gold", className)} {...p} />;
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-gold-soft">
        <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-gold-soft to-gold-deep" />
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "gold" | "sky" | "success" | "muted"; className?: string }) {
  const tones = {
    default: "border-line bg-white/5 text-text",
    gold: "border-gold/40 bg-gold/10 text-gold-soft",
    sky: "border-sky/40 bg-sky/10 text-sky-soft",
    success: "border-success/40 bg-success/10 text-success",
    muted: "border-line bg-transparent text-muted",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({ value, className, tone = "gold" }: { value: number; className?: string; tone?: "gold" | "sky" }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "gold" ? "bg-gradient-to-r from-gold-deep via-gold to-gold-soft" : "bg-gradient-to-r from-[#3b6fd9] to-sky-soft",
        )}
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden />;
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" | "error" }) {
  const tones = {
    info: "border-sky/30 bg-sky/[0.07] text-sky-soft",
    warn: "border-gold/30 bg-gold/[0.07] text-gold-soft",
    error: "border-danger/30 bg-danger/[0.08] text-danger",
  };
  return <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed", tones[tone])}>{children}</div>;
}
