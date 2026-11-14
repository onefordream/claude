import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BackLink, Field, SampleBadge, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { withTax } from "@/lib/constants";
import { yen } from "@/lib/format";
import { addToCartAction } from "@/actions/member";

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.product.findFirst({ where: { id, published: true } });
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/member/store">ストア</BackLink>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center bg-cream text-xs tracking-widest text-mute">IMAGE（プレースホルダ）</div>
        <div>
          <h1 className="font-serif text-2xl">{p.name}</h1>
          {p.isSample ? <div className="mt-2"><SampleBadge /></div> : null}
          <p className="mt-4 text-xl">{yen(p.price)}<span className="text-sm">（税抜）</span></p>
          <p className="text-sm text-mute">税込 {yen(withTax(p.price))}</p>
          <p className="mt-6 text-sm leading-loose whitespace-pre-wrap">{p.description}</p>
          {p.stock > 0 ? (
            <div className="mt-8">
              <ActionForm action={addToCartAction}>
                <input type="hidden" name="productId" value={p.id} />
                <Field label="数量" name="quantity" required>
                  <select id="quantity" name="quantity" className={inputCls}>
                    {Array.from({ length: Math.min(p.stock, 10) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <SubmitButton className={`${btn.primary} w-full`}>カートに入れる</SubmitButton>
              </ActionForm>
              <Link href="/member/store/cart" className={`${btn.link} mt-3 inline-block text-sm`}>カートを見る</Link>
            </div>
          ) : <p className="mt-8 text-sm text-red-800">在庫切れ</p>}
        </div>
      </div>
    </div>
  );
}
