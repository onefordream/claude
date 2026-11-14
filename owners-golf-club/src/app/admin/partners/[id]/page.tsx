import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle } from "@/components/admin";
import { BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { PARTNER_TYPE_LABEL, REGION_LABEL } from "@/lib/constants";
import { deletePartnerAction, savePartnerAction } from "@/actions/admin";

export default async function PartnerEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = id === "new" ? null : await prisma.partnerCourse.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <>
      <BackLink href="/admin/partners">提携先一覧</BackLink>
      <AdminTitle title={p ? `編集：${p.name}` : "提携先の追加"} />
      <Card className="max-w-2xl">
        <ActionForm action={savePartnerAction}>
          <input type="hidden" name="id" value={p?.id ?? ""} />
          <Field label="種別" name="type" required>
            <select id="type" name="type" defaultValue={p?.type ?? "GOLF_COURSE"} className={inputCls}>
              {Object.entries(PARTNER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="名称" name="name" required><input id="name" name="name" required defaultValue={p?.name} className={inputCls} /></Field>
          <Field label="地域" name="region" required>
            <select id="region" name="region" defaultValue={p?.region ?? "KANSAI"} className={inputCls}>
              {Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="都道府県" name="prefecture"><input id="prefecture" name="prefecture" defaultValue={p?.prefecture ?? ""} className={inputCls} /></Field>
          <Field label="紹介文" name="description"><textarea id="description" name="description" rows={4} defaultValue={p?.description} className={inputCls} /></Field>
          <Field label="優待条件" name="benefit"><textarea id="benefit" name="benefit" rows={3} defaultValue={p?.benefit} className={inputCls} /></Field>
          <Field label="利用方法" name="howToUse"><textarea id="howToUse" name="howToUse" rows={3} defaultValue={p?.howToUse} className={inputCls} /></Field>
          <Field label="表示順" name="sortOrder"><input id="sortOrder" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={inputCls} /></Field>
          <div className="flex gap-4">
            <Check name="published" label="会員に公開" defaultChecked={p?.published} />
            <Check name="isSample" label="サンプルデータ" defaultChecked={p?.isSample} />
          </div>
          <SubmitButton className={`${btn.primary} w-full`}>保存</SubmitButton>
        </ActionForm>
        {p ? <div className="mt-6 text-right"><ConfirmForm action={deletePartnerAction} hidden={{ id: p.id }} className={btn.smallDanger} confirm="削除しますか？">削除</ConfirmForm></div> : null}
      </Card>
    </>
  );
}
