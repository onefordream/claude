import Link from "next/link";
import type { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, StatusBadge, Table, td } from "@/components/admin";
import { btn } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const TABS: [string, string][] = [
  ["", "すべて"],
  ["ACTIVE", "正式会員"],
  ["PAST_DUE", "支払い遅延"],
  ["CANCEL_REQUESTED", "退会申請中"],
  ["SUSPENDED", "停止"],
  ["CANCELLED", "退会"],
];

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "", q = "" } = await searchParams;
  const members = await prisma.user.findMany({
    where: {
      role: "MEMBER",
      ...(f ? { status: f as MemberStatus } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { memberNumber: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { application: { select: { companyName: true } }, subscription: true },
    orderBy: { memberNumber: "asc" },
    take: 300,
  });
  return (
    <>
      <AdminTitle title="会員管理" />
      <FilterTabs base="/admin/members" current={f} tabs={TABS} />
      <form className="mb-4 flex gap-2">
        {f ? <input type="hidden" name="f" value={f} /> : null}
        <input name="q" defaultValue={q} placeholder="氏名・メール・会員番号で検索" className="w-full max-w-xs border border-line bg-white px-3 py-1.5 text-sm" />
        <button className={btn.small}>検索</button>
      </form>
      <Table head={["会員番号", "氏名 / 会社", "入会日", "ステータス", "課金", ""]}>
        {members.map((m) => (
          <tr key={m.id}>
            <td className={`${td} font-mono text-xs`}>{m.memberNumber}</td>
            <td className={td}>{m.name}<br /><span className="text-xs text-mute">{m.application?.companyName}</span></td>
            <td className={td}>{fmtDate(m.memberSince)}</td>
            <td className={td}>
              <StatusBadge status={m.status} />
              {m.subscription?.cancelAtPeriodEnd ? <p className="mt-1 text-[11px] text-mute">期間末解約予約済み</p> : null}
            </td>
            <td className={`${td} text-xs`}>{m.subscription?.status ?? "—"}{m.subscription?.isMock ? "（モック）" : ""}</td>
            <td className={td}><Link href={`/admin/members/${m.id}`} className={btn.small}>詳細</Link></td>
          </tr>
        ))}
      </Table>
      {members.length === 0 ? <p className="mt-4 text-sm text-mute">該当する会員はいません。</p> : null}
    </>
  );
}
