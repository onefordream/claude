import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readCart } from "@/lib/cart";
import { MemberTitle } from "@/components/member";
import { Alert, BackLink, Card, Empty, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { withTax } from "@/lib/constants";
import { yen } from "@/lib/format";
import { placeOrderAction, updateCartAction } from "@/actions/member";

export const metadata = { title: "カート" };

export default async function CartPage() {
  const user = (await getCurrentUser())!;
  const cart = await readCart();
  const products = await prisma.product.findMany({ where: { id: { in: Object.keys(cart) }, published: true } });
  const app = await prisma.application.findUnique({ where: { userId: user.id } });
  const subtotal = products.reduce((s, p) => s + p.price * cart[p.id], 0);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/member/store">ストア</BackLink>
      <div className="mt-4"><MemberTitle en="CART" title="カート" /></div>
      {products.length === 0 ? <Empty>カートに商品はありません。</Empty> : (
        <>
          <ul className="divide-y divide-line border-y border-line">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm">{p.name}</p>
                  <p className="text-xs text-mute">{yen(p.price)}（税抜）× {cart[p.id]}</p>
                </div>
                <form action={updateCartAction} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={p.id} />
                  <input name="quantity" type="number" min={0} max={99} defaultValue={cart[p.id]} className="w-16 border border-line px-2 py-1 text-sm" />
                  <SubmitButton className={btn.small}>変更</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-right">
            <p>小計 {yen(subtotal)}（税抜）</p>
            <p className="text-sm text-mute">税込 {yen(withTax(subtotal))}</p>
          </div>
          <Card className="mt-8">
            <h2 className="mb-4 font-serif text-lg">お届け先</h2>
            <ActionForm action={placeOrderAction}>
              <Field label="お名前" name="shippingName" required><input id="shippingName" name="shippingName" required defaultValue={user.name} className={inputCls} /></Field>
              <Field label="郵便番号" name="postalCode" required><input id="postalCode" name="postalCode" required defaultValue={app?.postalCode} className={inputCls} /></Field>
              <Field label="住所" name="shippingAddress" required><input id="shippingAddress" name="shippingAddress" required defaultValue={app?.mailingAddress} className={inputCls} /></Field>
              <Field label="備考" name="note"><textarea id="note" name="note" rows={3} className={inputCls} /></Field>
              <Alert kind="warn">お支払い方法は【未確定】です。ご注文後、事務局よりご案内いたします。</Alert>
              <SubmitButton className={`${btn.primary} w-full`} confirm="この内容で注文します。よろしいですか？">注文を確定する</SubmitButton>
            </ActionForm>
          </Card>
        </>
      )}
    </div>
  );
}
