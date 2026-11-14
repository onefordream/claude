import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle } from "@/components/admin";
import { BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { toJstInput } from "@/lib/format";
import { deleteNoticeAction, saveNoticeAction } from "@/actions/admin";

export default async function NoticeEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = id === "new" ? null : await prisma.notice.findUnique({ where: { id } });
  if (id !== "new" && !n) notFound();
  return (
    <>
      <BackLink href="/admin/notices">お知らせ一覧</BackLink>
      <AdminTitle title={n ? `編集：${n.title}` : "お知らせの作成"} />
      <Card className="max-w-2xl">
        <ActionForm action={saveNoticeAction}>
          <input type="hidden" name="id" value={n?.id ?? ""} />
          <Field label="タイトル" name="title" required><input id="title" name="title" required defaultValue={n?.title} className={inputCls} /></Field>
          <Field label="公開日時（日本時間）" name="publishedAt"><input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={toJstInput(n?.publishedAt ?? new Date())} className={inputCls} /></Field>
          <Field label="本文" name="body" required><textarea id="body" name="body" rows={10} required defaultValue={n?.body} className={inputCls} /></Field>
          <div className="flex flex-wrap gap-4">
            <Check name="published" label="公開する" defaultChecked={n?.published} />
            <Check name="isSample" label="サンプルデータ" defaultChecked={n?.isSample} />
            <Check name="sendEmail" label="保存時に会員へメール配信する" />
          </div>
          <SubmitButton className={`${btn.primary} w-full`}>保存</SubmitButton>
        </ActionForm>
        {n ? <div className="mt-6 text-right"><ConfirmForm action={deleteNoticeAction} hidden={{ id: n.id }} className={btn.smallDanger} confirm="削除しますか？">削除</ConfirmForm></div> : null}
      </Card>
    </>
  );
}
