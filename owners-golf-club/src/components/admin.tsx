import Link from "next/link";
import type { ReactNode } from "react";
import type { MemberStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/constants";
import { Badge } from "./ui";

export function AdminTitle({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-serif text-xl md:text-2xl">{title}</h1>
      {actions}
    </div>
  );
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  const tone: Record<MemberStatus, "default" | "green" | "gold" | "red" | "mute"> = {
    APPLIED: "gold",
    NEEDS_INFO: "gold",
    APPROVED: "default",
    ACTIVE: "green",
    PAST_DUE: "red",
    REJECTED: "mute",
    SUSPENDED: "red",
    CANCEL_REQUESTED: "gold",
    CANCELLED: "mute",
  };
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-cream text-left text-xs text-mute">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const td = "px-3 py-2.5 align-top";

export function FilterTabs({ base, current, tabs }: { base: string; current: string; tabs: [string, string][] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 text-xs">
      {tabs.map(([v, label]) => (
        <Link
          key={v}
          href={v ? `${base}?f=${v}` : base}
          className={`border px-3 py-1.5 ${current === v ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="border border-line bg-white p-4">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-mute">{sub}</p> : null}
    </div>
  );
}
