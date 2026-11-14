import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Stat } from "@/components/admin";
import { yen } from "@/lib/format";
import { btn } from "@/components/ui";

function monthStartJst(): Date {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 9 * 3600 * 1000);
}

export default async function AdminDashboard() {
  const since = monthStartJst();
  const [members, pending, needsInfo, approvedWaiting, newApps, approvals, revenue, pastDue, cancelReq, subStatuses, inquiriesNew, unshipped] =
    await Promise.all([
      prisma.user.count({ where: { role: "MEMBER", status: { in: ["ACTIVE", "PAST_DUE", "CANCEL_REQUESTED"] } } }),
      prisma.user.count({ where: { role: "APPLICANT", status: "APPLIED" } }),
      prisma.user.count({ where: { role: "APPLICANT", status: "NEEDS_INFO" } }),
      prisma.user.count({ where: { role: "APPLICANT", status: "APPROVED" } }),
      prisma.application.count({ where: { createdAt: { gte: since } } }),
      prisma.statusHistory.count({ where: { toStatus: "APPROVED", createdAt: { gte: since } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID", paidAt: { gte: since } } }),
      prisma.user.count({ where: { status: "PAST_DUE" } }),
      prisma.user.count({ where: { status: "CANCEL_REQUESTED" } }),
      prisma.subscription.groupBy({ by: ["status"], _count: true }),
      prisma.inquiry.count({ where: { status: "NEW" } }),
      prisma.cardShipment.count({ where: { status: { not: "SHIPPED" } } }),
    ]);

  return (
    <>
      <AdminTitle title="ダッシュボード" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="会員数（有効）" value={members} sub="正式会員・支払い遅延・退会申請中" />
        <Stat label="審査待ち" value={pending} sub={`追加情報依頼中 ${needsInfo}件`} />
        <Stat label="今月の新規申請" value={newApps} />
        <Stat label="今月の承認数" value={approvals} sub={`決済待ち ${approvedWaiting}名`} />
        <Stat label="今月の売上（税込）" value={yen(revenue._sum.amount ?? 0)} sub="入会金・月会費の入金額" />
        <Stat label="支払い遅延" value={pastDue} sub={<Link href="/admin/payments" className={btn.link}>決済管理へ</Link>} />
        <Stat label="退会申請中" value={cancelReq} sub={<Link href="/admin/members?f=CANCEL_REQUESTED" className={btn.link}>確認する</Link>} />
        <Stat label="未対応お問い合わせ" value={inquiriesNew} sub={`会員証 未発送 ${unshipped}件`} />
      </div>
      <h2 className="mt-10 mb-3 font-serif text-lg">継続課金の状況</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {subStatuses.length === 0 ? <p className="text-sm text-mute">データがありません</p> : null}
        {subStatuses.map((s) => (
          <Stat key={s.status ?? "none"} label={`subscription: ${s.status ?? "未作成"}`} value={s._count} />
        ))}
      </div>
    </>
  );
}
