import Link from "next/link";
import type { MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, StatusBadge, Table, td } from "@/components/admin";
import { Badge, btn } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

const TABS: [string, string][] = [
  ["", "対応中（審査待ち・追加情報・決済待ち）"],
  ["APPLIED", "審査待ち"],
  ["NEEDS_INFO", "追加情報依頼中"],
  ["APPROVED", "承認済み・決済待ち"],
  ["REJECTED", "否認"],
  ["unverified", "メール未確認"],
];

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "", q = "" } = await searchParams;
  const statusFilter: MemberStatus[] = f && f !== "unverified" ? [f as MemberStatus] : ["APPLIED", "NEEDS_INFO", "APPROVED"];
  const users = await prisma.user.findMany({
    where: {
      role: "APPLICANT",
      status: { in: statusFilter },
      ...(f === "unverified" ? { emailVerifiedAt: null } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { application: { companyName: { contains: q, mode: "insensitive" } } }] } : {}),
    },
    include: { application: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <>
      <AdminTitle title="申請・審査管理" />
      <FilterTabs base="/admin/applications" current={f} tabs={TABS} />
      <form className="mb-4 flex gap-2">
        {f ? <input type="hidden" name="f" value={f} /> : null}
        <input name="q" defaultValue={q} placeholder="氏名・メール・会社名で検索" className="w-full max-w-xs border border-line bg-white px-3 py-1.5 text-sm" />
        <button className={btn.small}>検索</button>
      </form>
      <Table head={["申請日時", "氏名", "会社名 / 役職", "メール確認", "ステータス", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <td className={td}>{fmtDateTime(u.createdAt)}</td>
            <td className={td}>{u.name}<br /><span className="text-xs text-mute">{u.email}</span></td>
            <td className={td}>{u.application?.companyName}<br /><span className="text-xs text-mute">{u.application?.position}</span></td>
            <td className={td}>{u.emailVerifiedAt ? <Badge tone="green">確認済み</Badge> : <Badge tone="red">未確認</Badge>}</td>
            <td className={td}><StatusBadge status={u.status} /></td>
            <td className={td}><Link href={`/admin/applications/${u.id}`} className={btn.small}>審査</Link></td>
          </tr>
        ))}
      </Table>
      {users.length === 0 ? <p className="mt-4 text-sm text-mute">該当する申請はありません。</p> : null}
    </>
  );
}
