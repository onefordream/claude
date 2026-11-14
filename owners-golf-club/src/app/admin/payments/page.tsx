import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, Stat, StatusBadge, Table, td } from "@/components/admin";
import { Alert, btn } from "@/components/ui";
import { ConfirmForm } from "@/components/forms";
import { fmtDate, fmtDateTime, yen } from "@/lib/format";
import { sendPaymentReminderAction } from "@/actions/admin";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ f?: string; reminded?: string }> }) {
  const { f = "", reminded } = await searchParams;
  const [pastDue, payments, initialSum, monthlySum, failedCount] = await Promise.all([
    prisma.user.findMany({ where: { status: "PAST_DUE" }, include: { subscription: true }, orderBy: { updatedAt: "desc" } }),
    prisma.payment.findMany({
      where: f === "FAILED" ? { status: "FAILED" } : f === "INITIAL" ? { type: "INITIAL" } : f === "MONTHLY" ? { type: "MONTHLY" } : {},
      include: { user: { select: { id: true, name: true, memberNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PAID", type: "INITIAL" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PAID", type: "MONTHLY" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
  ]);
  return (
    <>
      <AdminTitle title="決済管理" />
      {reminded ? <div className="mb-4"><Alert kind="success">再決済のご案内メールを送信しました。</Alert></div> : null}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="入会金＋初月会費（累計）" value={yen(initialSum._sum.amount ?? 0)} sub={`${initialSum._count}件`} />
        <Stat label="月会費（累計）" value={yen(monthlySum._sum.amount ?? 0)} sub={`${monthlySum._count}件`} />
        <Stat label="支払い失敗（記録）" value={failedCount} />
        <Stat label="支払い遅延中の会員" value={pastDue.length} />
      </div>

      <h2 className="mb-3 font-serif text-lg">支払い遅延中の会員</h2>
      {pastDue.length === 0 ? (
        <p className="mb-8 text-sm text-mute">支払い遅延中の会員はいません。</p>
      ) : (
        <div className="mb-8">
          <Table head={["会員", "ステータス", "期間末", ""]}>
            {pastDue.map((u) => (
              <tr key={u.id}>
                <td className={td}><Link href={`/admin/members/${u.id}`} className={btn.link}>{u.name}</Link><br /><span className="text-xs text-mute">{u.memberNumber}</span></td>
                <td className={td}><StatusBadge status={u.status} /></td>
                <td className={td}>{fmtDate(u.subscription?.currentPeriodEnd)}</td>
                <td className={td}>
                  <ConfirmForm action={sendPaymentReminderAction} hidden={{ userId: u.id }} className={btn.small} confirm="カード変更（再決済）のご案内メールを送信します。">
                    再決済の案内を送る
                  </ConfirmForm>
                </td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-mute">Stripe は設定に従って自動で再請求を行います。カードの変更は会員本人が Customer Portal から行います。</p>
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg">決済履歴</h2>
      <FilterTabs base="/admin/payments" current={f} tabs={[["", "すべて"], ["INITIAL", "入会金＋初月"], ["MONTHLY", "月会費"], ["FAILED", "失敗"]]} />
      <Table head={["日時", "会員", "内容", "金額（税込）", "結果", "Stripe Invoice"]}>
        {payments.map((p) => (
          <tr key={p.id}>
            <td className={td}>{fmtDateTime(p.paidAt ?? p.createdAt)}</td>
            <td className={td}><Link href={`/admin/members/${p.user.id}`} className={btn.link}>{p.user.name}</Link></td>
            <td className={td}>{p.description}{p.isMock ? "（モック）" : ""}</td>
            <td className={td}>{yen(p.amount)}</td>
            <td className={td}>{p.status === "PAID" ? "支払済み" : <span className="text-red-800">失敗</span>}</td>
            <td className={`${td} font-mono text-[11px] text-mute`}>{p.stripeInvoiceId}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
