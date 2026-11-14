import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { Badge, SampleBadge, btn } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export default async function AdminNotices() {
  const rows = await prisma.notice.findMany({ orderBy: { publishedAt: "desc" } });
  return (
    <>
      <AdminTitle title="お知らせ配信管理" actions={<Link href="/admin/notices/new" className={btn.small}>新規作成</Link>} />
      <Table head={["公開日時", "タイトル", "公開", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{fmtDateTime(r.publishedAt)}</td>
            <td className={td}>{r.title} {r.isSample ? <SampleBadge /> : null}</td>
            <td className={td}>{r.published ? <Badge tone="green">公開</Badge> : <Badge tone="mute">下書き</Badge>}</td>
            <td className={td}><Link href={`/admin/notices/${r.id}`} className={btn.small}>編集</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
