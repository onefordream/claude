import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, Table, td } from "@/components/admin";
import { btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { ORDER_LABEL } from "@/lib/constants";
import { fmtDateTime, yen } from "@/lib/format";
import { updateOrderAction } from "@/actions/admin";

const STATUSES = Object.keys(ORDER_LABEL) as OrderStatus[];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "" } = await searchParams;
  const orders = await prisma.order.findMany({
    where: f ? { status: f as OrderStatus } : {},
    include: { items: true, user: { select: { name: true, memberNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <AdminTitle title="注文・発送管理" />
      <FilterTabs base="/admin/orders" current={f} tabs={[["", "すべて"], ...STATUSES.map((s) => [s, ORDER_LABEL[s]] as [string, string])]} />
      <Table head={["注文日時", "会員", "内容", "金額", "発送先", "状況"]}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className={td}>{fmtDateTime(o.createdAt)}<br /><span className="font-mono text-[11px] text-mute">{o.id.slice(-8)}</span></td>
            <td className={td}>{o.user.name}<br /><span className="text-xs text-mute">{o.user.memberNumber}</span></td>
            <td className={`${td} text-xs`}>{o.items.map((i) => <p key={i.id}>{i.name} × {i.quantity}</p>)}{o.note ? <p className="mt-1 text-mute">備考: {o.note}</p> : null}</td>
            <td className={`${td} text-xs`}>{yen(o.subtotal)}（税抜）<br />税込 {yen(o.total)}</td>
            <td className={`${td} text-xs`}>{o.shippingName}<br />〒{o.postalCode} {o.shippingAddress}</td>
            <td className={td}>
              <form action={updateOrderAction} className="flex min-w-[12rem] flex-col gap-1.5">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="border border-line px-2 py-1 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{ORDER_LABEL[s]}</option>)}
                </select>
                <input name="adminNote" defaultValue={o.adminNote ?? ""} placeholder="管理メモ・追跡番号" className="border border-line px-2 py-1 text-sm" />
                <SubmitButton className={btn.small}>更新</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
