import type { InquiryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, FilterTabs, Table, td } from "@/components/admin";
import { btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { INQUIRY_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { updateInquiryAction } from "@/actions/admin";

export default async function AdminInquiries({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "" } = await searchParams;
  const rows = await prisma.inquiry.findMany({
    where: f === "PRE_REGISTRATION" || f === "CONTACT" ? { kind: f } : f ? { status: f as InquiryStatus } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <AdminTitle title="お問い合わせ管理" />
      <FilterTabs base="/admin/inquiries" current={f} tabs={[["", "すべて"], ["NEW", "未対応"], ["IN_PROGRESS", "対応中"], ["CLOSED", "完了"], ["CONTACT", "お問い合わせ"], ["PRE_REGISTRATION", "事前登録"]]} />
      <Table head={["受付日時", "種別", "お名前 / 連絡先", "内容", "対応"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{fmtDateTime(r.createdAt)}</td>
            <td className={td}>{r.kind === "CONTACT" ? "お問い合わせ" : "事前登録"}</td>
            <td className={td}>{r.name}<br /><span className="text-xs text-mute">{r.email}<br />{r.company} {r.position}</span></td>
            <td className={`${td} max-w-sm text-xs whitespace-pre-wrap`}>{r.message}</td>
            <td className={td}>
              <form action={updateInquiryAction} className="flex min-w-[12rem] flex-col gap-1.5">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="border border-line px-2 py-1 text-sm">
                  {(Object.keys(INQUIRY_LABEL) as InquiryStatus[]).map((s) => <option key={s} value={s}>{INQUIRY_LABEL[s]}</option>)}
                </select>
                <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="対応メモ" className="border border-line px-2 py-1 text-sm" />
                <SubmitButton className={btn.small}>更新</SubmitButton>
              </form>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
