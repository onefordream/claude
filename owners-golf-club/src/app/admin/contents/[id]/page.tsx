import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle } from "@/components/admin";
import { BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { CONTENT_KIND_LABEL } from "@/lib/constants";
import { toJstInput } from "@/lib/format";
import { deleteContentAction, saveContentAction } from "@/actions/admin";

export default async function ContentEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = id === "new" ? null : await prisma.content.findUnique({ where: { id } });
  if (id !== "new" && !c) notFound();
  return (
    <>
      <BackLink href="/admin/contents">コンテンツ一覧</BackLink>
      <AdminTitle title={c ? `編集：${c.title}` : "コンテンツの追加"} />
      <Card className="max-w-2xl">
        <ActionForm action={saveContentAction}>
          <input type="hidden" name="id" value={c?.id ?? ""} />
          <Field label="種別" name="kind" required>
            <select id="kind" name="kind" defaultValue={c?.kind ?? "SEMINAR"} className={inputCls}>
              {Object.entries(CONTENT_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="タイトル" name="title" required><input id="title" name="title" required defaultValue={c?.title} className={inputCls} /></Field>
          <Field label="開催日時（日本時間）" name="scheduledAt"><input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={toJstInput(c?.scheduledAt)} className={inputCls} /></Field>
          <Field label="会場・形式" name="location"><input id="location" name="location" defaultValue={c?.location ?? ""} placeholder="オンライン／会場名" className={inputCls} /></Field>
          <Field label="録画URL（アーカイブ）" name="videoUrl" hint="限定公開の動画URLなど。https:// から入力"><input id="videoUrl" name="videoUrl" type="url" defaultValue={c?.videoUrl ?? ""} className={inputCls} /></Field>
          <Field label="説明" name="description"><textarea id="description" name="description" rows={5} defaultValue={c?.description} className={inputCls} /></Field>
          <div className="flex gap-4">
            <Check name="published" label="会員に公開" defaultChecked={c?.published} />
            <Check name="isSample" label="サンプルデータ" defaultChecked={c?.isSample} />
          </div>
          <SubmitButton className={`${btn.primary} w-full`}>保存</SubmitButton>
        </ActionForm>
        {c ? <div className="mt-6 text-right"><ConfirmForm action={deleteContentAction} hidden={{ id: c.id }} className={btn.smallDanger} confirm="削除しますか？">削除</ConfirmForm></div> : null}
      </Card>
    </>
  );
}
