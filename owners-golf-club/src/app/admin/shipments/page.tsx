import type { ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, Table, td } from "@/components/admin";
import { btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { SHIPMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { updateShipmentAction } from "@/actions/admin";

const STATUSES = Object.keys(SHIPMENT_LABEL) as ShipmentStatus[];

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "" } = await searchParams;
  const rows = await prisma.cardShipment.findMany({
    where: f ? { status: f as ShipmentStatus } : { status: { not: "SHIPPED" } },
    include: { user: { select: { name: true, memberNumber: true, application: { select: { postalCode: true, mailingAddress: true, cardDisplayName: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <AdminTitle title="会員証・ネームプレート発送管理" />
      <FilterTabs base="/admin/shipments" current={f} tabs={[["", "未発送すべて"], ...STATUSES.map((s) => [s, SHIPMENT_LABEL[s]] as [string, string])]} />
      <Table head={["会員", "表記名 / 発送先", "状況", "更新"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{r.user.name}<br /><span className="font-mono text-xs text-mute">{r.user.memberNumber}</span></td>
            <td className={`${td} text-xs`}>
              <p className="text-sm">{r.user.application?.cardDisplayName}</p>
              〒{r.user.application?.postalCode} {r.user.application?.mailingAddress}
            </td>
            <td className={`${td} text-xs`}>
              {SHIPMENT_LABEL[r.status]}
              <br />依頼: {fmtDate(r.requestedAt)} / 発送: {fmtDate(r.shippedAt)}
            </td>
            <td className={td}>
              <form action={updateShipmentAction} className="flex min-w-[16rem] flex-col gap-1.5">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="border border-line px-2 py-1 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{SHIPMENT_LABEL[s]}</option>)}
                </select>
                <input name="trackingInfo" defaultValue={r.trackingInfo ?? ""} placeholder="追跡番号など" className="border border-line px-2 py-1 text-sm" />
                <input name="note" defaultValue={r.note ?? ""} placeholder="メモ" className="border border-line px-2 py-1 text-sm" />
                <SubmitButton className={btn.small}>更新</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      {rows.length === 0 ? <p className="mt-4 text-sm text-mute">該当するデータはありません。</p> : null}
    </>
  );
}
