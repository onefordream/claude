import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Alert, BackLink, Badge, Card, Empty } from "@/components/ui";
import { ORDER_LABEL } from "@/lib/constants";
import { fmtDateTime, yen } from "@/lib/format";

export const metadata = { title: "注文履歴" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ ordered?: string }> }) {
  const { ordered } = await searchParams;
  const user = (await getCurrentUser())!;
  const orders = await prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/member/store">ストア</BackLink>
      <div className="mt-4"><MemberTitle en="ORDERS" title="注文履歴" /></div>
      {ordered ? <div className="mb-6"><Alert kind="success">ご注文を受け付けました。お支払い方法・お届けについては事務局よりご案内いたします。</Alert></div> : null}
      {orders.length === 0 ? <Empty>注文履歴はありません。</Empty> : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
                <span>{fmtDateTime(o.createdAt)} ・ 注文番号 {o.id.slice(-8)}</span>
                <Badge tone={o.status === "CANCELLED" ? "mute" : "green"}>{ORDER_LABEL[o.status]}</Badge>
              </div>
              <ul className="mt-3 text-sm">{o.items.map((i) => <li key={i.id}>{i.name} × {i.quantity}</li>)}</ul>
              <p className="mt-2 text-sm">{yen(o.subtotal)}（税抜）<span className="text-xs text-mute"> ／ 税込 {yen(o.total)}</span></p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
