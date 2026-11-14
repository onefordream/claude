import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { Badge, SampleBadge, btn } from "@/components/ui";
import { REGION_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";

export default async function AdminEvents() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
  });
  return (
    <>
      <AdminTitle title="イベント管理" actions={<Link href="/admin/events/new" className={btn.small}>新規作成</Link>} />
      <Table head={["開催日時", "タイトル", "地域 / 会場", "申込数", "公開", ""]}>
        {events.map((e) => (
          <tr key={e.id}>
            <td className={td}>{fmtDateTime(e.startsAt)}</td>
            <td className={td}>{e.title} {e.isSample ? <SampleBadge /> : null}</td>
            <td className={td}>{REGION_LABEL[e.region]} / {e.venue}</td>
            <td className={td}>{e._count.registrations}{e.capacity ? ` / ${e.capacity}` : ""}</td>
            <td className={td}>{e.published ? <Badge tone="green">公開</Badge> : <Badge tone="mute">非公開</Badge>}</td>
            <td className={td}><Link href={`/admin/events/${e.id}`} className={btn.small}>編集・申込管理</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
