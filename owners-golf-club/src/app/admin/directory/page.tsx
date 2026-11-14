import { prisma } from "@/lib/db";
import { AdminTitle, StatusBadge, Table, td } from "@/components/admin";
import { Badge, btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { updateDirectoryFlagsAction } from "@/actions/admin";

export default async function AdminDirectory() {
  const rows = await prisma.memberProfile.findMany({
    include: { user: { select: { name: true, memberNumber: true, status: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <AdminTitle title="会員企業紹介・PR掲載管理" />
      <p className="mb-4 text-xs text-mute">掲載可否・公開項目は会員本人が設定します。運営は PR 掲載（優先表示）と非掲載の指定ができます。</p>
      <Table head={["会員", "会社名", "本人の掲載設定", "運営設定"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{r.user.name}<br /><span className="text-xs text-mute">{r.user.memberNumber}</span> <StatusBadge status={r.user.status} /></td>
            <td className={td}>{r.companyName}</td>
            <td className={td}>{r.listed ? <Badge tone="green">掲載する</Badge> : <Badge tone="mute">掲載しない</Badge>}</td>
            <td className={td}>
              <form action={updateDirectoryFlagsAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={r.id} />
                <Check name="featured" label="PR掲載" defaultChecked={r.featured} />
                <Check name="hiddenByAdmin" label="非掲載にする" defaultChecked={r.hiddenByAdmin} />
                <SubmitButton className={btn.small}>更新</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
