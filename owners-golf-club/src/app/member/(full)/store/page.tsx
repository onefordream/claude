import Link from "next/link";
import { prisma } from "@/lib/db";
import { readCart } from "@/lib/cart";
import { MemberTitle } from "@/components/member";
import { Card, Empty, SampleBadge, btn } from "@/components/ui";
import { withTax } from "@/lib/constants";
import { yen } from "@/lib/format";

export const metadata = { title: "会員限定ストア" };

export default async function StorePage() {
  const [products, cart] = await Promise.all([prisma.product.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }), readCart()]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <>
      <MemberTitle en="STORE" title="会員限定ストア" />
      <div className="mb-6 flex gap-3 text-sm">
        <Link href="/member/store/cart" className={btn.small}>カート（{count}）</Link>
        <Link href="/member/store/orders" className={btn.small}>注文履歴</Link>
      </div>
      {products.length === 0 ? <Empty>現在販売中の商品はありません。</Empty> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {products.map((p) => (
            <Link key={p.id} href={`/member/store/${p.id}`} className="group">
              <Card className="h-full p-3 md:p-4">
                <div className="flex aspect-square items-center justify-center bg-cream text-[10px] tracking-widest text-mute">IMAGE</div>
                <p className="mt-3 text-sm group-hover:text-green">{p.name}</p>
                {p.isSample ? <SampleBadge /> : null}
                <p className="mt-1 text-sm">{yen(p.price)}<span className="text-xs">（税抜）</span></p>
                <p className="text-xs text-mute">税込 {yen(withTax(p.price))}</p>
                {p.stock <= 0 ? <p className="mt-1 text-xs text-red-800">在庫切れ</p> : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
