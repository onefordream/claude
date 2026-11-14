import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { Badge, SampleBadge, btn } from "@/components/ui";
import { CONTENT_KIND_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";

export default async function AdminContents() {
  const rows = await prisma.content.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <AdminTitle title="勉強会・コンテンツ管理" actions={<Link href="/admin/contents/new" className={btn.small}>新規作成</Link>} />
      <Table head={["種別", "タイトル", "開催日時", "公開", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{CONTENT_KIND_LABEL[r.kind]}</td>
            <td className={td}>{r.title} {r.isSample ? <SampleBadge /> : null}</td>
            <td className={td}>{fmtDateTime(r.scheduledAt)}</td>
            <td className={td}>{r.published ? <Badge tone="green">公開</Badge> : <Badge tone="mute">非公開</Badge>}</td>
            <td className={td}><Link href={`/admin/contents/${r.id}`} className={btn.small}>編集</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
