import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { Badge, SampleBadge, btn } from "@/components/ui";
import { yen } from "@/lib/format";
import { withTax } from "@/lib/constants";

export default async function AdminProducts() {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <AdminTitle title="商品管理" actions={<Link href="/admin/products/new" className={btn.small}>新規作成</Link>} />
      <Table head={["商品名", "価格（税抜／税込）", "在庫", "公開", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{r.name} {r.isSample ? <SampleBadge /> : null}</td>
            <td className={td}>{yen(r.price)} / {yen(withTax(r.price))}</td>
            <td className={td}>{r.stock}</td>
            <td className={td}>{r.published ? <Badge tone="green">公開</Badge> : <Badge tone="mute">非公開</Badge>}</td>
            <td className={td}><Link href={`/admin/products/${r.id}`} className={btn.small}>編集</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
