import Link from "next/link";
import type { ReactNode } from "react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-ink px-6 py-3 text-sm font-medium tracking-widest text-white transition hover:bg-green disabled:opacity-50",
  green:
    "inline-flex items-center justify-center gap-2 bg-green px-6 py-3 text-sm font-medium tracking-widest text-white transition hover:bg-ink disabled:opacity-50",
  outline:
    "inline-flex items-center justify-center gap-2 border border-ink px-6 py-3 text-sm font-medium tracking-widest text-ink transition hover:bg-ink hover:text-white disabled:opacity-50",
  small:
    "inline-flex items-center justify-center gap-1 border border-ink px-3 py-1.5 text-xs tracking-wider text-ink transition hover:bg-ink hover:text-white disabled:opacity-50",
  smallDanger:
    "inline-flex items-center justify-center gap-1 border border-red-800 px-3 py-1.5 text-xs tracking-wider text-red-800 transition hover:bg-red-800 hover:text-white disabled:opacity-50",
  link: "text-green underline underline-offset-4 hover:text-ink",
};

export const inputCls =
  "block w-full border border-line bg-white px-3 py-2.5 text-base text-ink outline-none transition focus:border-green focus:ring-1 focus:ring-green";

export function GoldRule({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`block h-px w-12 bg-gold ${className}`} />;
}

export function SectionTitle({ en, ja, center = false }: { en: string; ja: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <p className="text-xs tracking-[0.3em] text-gold">{en}</p>
      <h2 className="mt-2 font-serif text-2xl md:text-3xl">{ja}</h2>
      <GoldRule className={`mt-4 ${center ? "mx-auto" : ""}`} />
    </div>
  );
}

export function PageHeader({ en, title, lead }: { en: string; title: string; lead?: ReactNode }) {
  return (
    <header className="border-b border-line bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <p className="text-xs tracking-[0.3em] text-gold">{en}</p>
        <h1 className="mt-2 font-serif text-2xl md:text-4xl">{title}</h1>
        <GoldRule className="mt-4" />
        {lead ? <div className="mt-6 max-w-3xl text-sm text-mute md:text-base">{lead}</div> : null}
      </div>
    </header>
  );
}

export function Field({
  label,
  name,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  name?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="flex items-center gap-2 text-sm font-medium">
        {label}
        {required ? <span className="bg-green px-1.5 py-0.5 text-[10px] text-white">必須</span> : <span className="border border-line px-1.5 py-0.5 text-[10px] text-mute">任意</span>}
      </label>
      {children}
      {hint ? <p className="text-xs text-mute">{hint}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-line bg-white p-5 md:p-6 ${className}`}>{children}</div>;
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const cls = {
    info: "border-green/30 bg-green-soft text-green",
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-green/30 bg-green-soft text-green",
    warn: "border-gold/60 bg-[#fbf7ea] text-[#6b5512]",
  }[kind];
  return <div className={`border px-4 py-3 text-sm ${cls}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "green" | "gold" | "red" | "mute" }) {
  const cls = {
    default: "border-ink text-ink",
    green: "border-green bg-green text-white",
    gold: "border-gold text-[#7a6214]",
    red: "border-red-700 text-red-800",
    mute: "border-line text-mute",
  }[tone];
  return <span className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[11px] tracking-wider ${cls}`}>{children}</span>;
}

export function SampleBadge() {
  return <Badge tone="gold">サンプル</Badge>;
}

export function Unconfirmed({ children = "【未確定】" }: { children?: ReactNode }) {
  return <span className="text-[#7a6214]">{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-line px-4 py-10 text-center text-sm text-mute">{children}</p>;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-mute hover:text-ink">
      ← {children}
    </Link>
  );
}

export function DL({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line border-y border-line text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[12rem_1fr] md:gap-4">
          <dt className="text-mute">{k}</dt>
          <dd className="break-words whitespace-pre-wrap">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
