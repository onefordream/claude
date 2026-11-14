import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle } from "@/components/admin";
import { BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { saveProductAction } from "@/actions/admin";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = id === "new" ? null : await prisma.product.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <>
      <BackLink href="/admin/products">商品一覧</BackLink>
      <AdminTitle title={p ? `編集：${p.name}` : "商品の追加"} />
      <Card className="max-w-2xl">
        <ActionForm action={saveProductAction}>
          <input type="hidden" name="id" value={p?.id ?? ""} />
          <Field label="商品名" name="name" required><input id="name" name="name" required defaultValue={p?.name} className={inputCls} /></Field>
          <Field label="価格（税抜・円）" name="price" required hint="会員には税抜を主表記、税込（10%）を併記して表示します"><input id="price" name="price" type="number" min={0} required defaultValue={p?.price} className={inputCls} /></Field>
          <Field label="在庫数" name="stock" required><input id="stock" name="stock" type="number" min={0} required defaultValue={p?.stock ?? 0} className={inputCls} /></Field>
          <Field label="商品説明" name="description"><textarea id="description" name="description" rows={5} defaultValue={p?.description} className={inputCls} /></Field>
          <div className="flex gap-4">
            <Check name="published" label="会員に公開" defaultChecked={p?.published} />
            <Check name="isSample" label="サンプルデータ" defaultChecked={p?.isSample} />
          </div>
          <SubmitButton className={`${btn.primary} w-full`}>保存</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-xs text-mute">注文履歴のある商品は削除できないため、非公開にしてください。</p>
      </Card>
    </>
  );
}
