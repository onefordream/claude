import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { Badge, SampleBadge, btn } from "@/components/ui";
import { PARTNER_TYPE_LABEL, REGION_LABEL } from "@/lib/constants";

export default async function AdminPartners() {
  const rows = await prisma.partnerCourse.findMany({ orderBy: [{ type: "asc" }, { region: "asc" }, { sortOrder: "asc" }] });
  return (
    <>
      <AdminTitle title="提携ゴルフ場・優待管理" actions={<Link href="/admin/partners/new" className={btn.small}>新規作成</Link>} />
      <Table head={["種別", "名称", "地域", "優待条件", "公開", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{PARTNER_TYPE_LABEL[r.type]}</td>
            <td className={td}>{r.name} {r.isSample ? <SampleBadge /> : null}</td>
            <td className={td}>{REGION_LABEL[r.region]}{r.prefecture ? ` / ${r.prefecture}` : ""}</td>
            <td className={`${td} max-w-xs truncate text-xs`}>{r.benefit}</td>
            <td className={td}>{r.published ? <Badge tone="green">公開</Badge> : <Badge tone="mute">非公開</Badge>}</td>
            <td className={td}><Link href={`/admin/partners/${r.id}`} className={btn.small}>編集</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
