import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireMemberArea } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Alert, Card, DL, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { STATUS_LABEL, SHIPMENT_LABEL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { fmtDate, fmtDateTime, yen } from "@/lib/format";
import { updateShippingAction } from "@/actions/member";
import { changePasswordAction } from "@/actions/auth";

export const metadata = { title: "会員情報管理" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireMemberArea();
  const [app, sub, payments, shipment] = await Promise.all([
    prisma.application.findUnique({ where: { userId: user.id } }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 24 }),
    prisma.cardShipment.findUnique({ where: { userId: user.id } }),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <MemberTitle en="ACCOUNT" title="会員情報管理" />
      {error === "portal" ? <Alert kind="error">カード変更画面を開けませんでした。時間をおいて再度お試しください。</Alert> : null}

      <Card>
        <h2 className="mb-4 font-serif text-lg">会員ステータス</h2>
        <DL
          items={[
            ["会員番号", <span key="n" className="font-mono">{user.memberNumber}</span>],
            ["ステータス", STATUS_LABEL[user.status] + (sub?.cancelAtPeriodEnd ? `（${fmtDate(sub.currentPeriodEnd)} に退会予定）` : "")],
            ["入会日", fmtDate(user.memberSince)],
            ["月会費", `${yen(MONTHLY_FEE)}（税抜）／ 税込 ${yen(MONTHLY_FEE_INCL)}`],
            ["次回請求日", sub?.cancelAtPeriodEnd ? "—（退会予定）" : fmtDate(sub?.currentPeriodEnd)],
            ["会員証・ネームプレート", shipment ? SHIPMENT_LABEL[shipment.status] : "—"],
          ]}
        />
      </Card>

      <Card>
        <h2 className="mb-2 font-serif text-lg">お支払い方法（カード）</h2>
        <p className="mb-4 text-sm text-mute">カードの変更・領収書の確認は、決済代行会社（Stripe）の管理画面で行います。</p>
        {user.status === "PAST_DUE" ? <div className="mb-4"><Alert kind="error">月会費のお支払いが確認できていません。カード情報をご確認ください。</Alert></div> : null}
        <form action="/api/billing/portal" method="post">
          <SubmitButton className={user.status === "PAST_DUE" ? btn.green : btn.outline}>カード変更・領収書の確認</SubmitButton>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 font-serif text-lg">決済履歴</h2>
        {payments.length === 0 ? <p className="text-sm text-mute">決済履歴はありません。</p> : (
          <ul className="divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>{fmtDateTime(p.paidAt ?? p.createdAt)} ・ {p.description}</span>
                <span>{yen(p.amount)}（税込） {p.status === "PAID" ? "" : <span className="text-red-800">未決済</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-serif text-lg">発送先・連絡先</h2>
        <ActionForm action={updateShippingAction}>
          <Field label="電話番号" name="phone" required><input id="phone" name="phone" required defaultValue={app?.phone} className={inputCls} /></Field>
          <Field label="郵便番号" name="postalCode" required><input id="postalCode" name="postalCode" required defaultValue={app?.postalCode} className={inputCls} /></Field>
          <Field label="郵送先住所" name="mailingAddress" required><input id="mailingAddress" name="mailingAddress" required defaultValue={app?.mailingAddress} className={inputCls} /></Field>
          <SubmitButton className={btn.primary}>更新する</SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="mb-2 font-serif text-lg">会員紹介の掲載設定</h2>
        <p className="mb-4 text-sm text-mute">会員企業・経営者紹介に掲載する項目と公開範囲を設定できます。</p>
        <Link href="/member/account/profile" className={btn.outline}>掲載設定を編集する</Link>
      </Card>

      <Card>
        <h2 className="mb-4 font-serif text-lg">パスワード変更</h2>
        <ActionForm action={changePasswordAction} resetOnSuccess>
          <Field label="現在のパスワード" name="current" required><input id="current" name="current" type="password" required autoComplete="current-password" className={inputCls} /></Field>
          <Field label="新しいパスワード" name="password" required hint="10文字以上、英字と数字を含めてください"><input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <Field label="新しいパスワード（確認）" name="passwordConfirm" required><input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <SubmitButton className={btn.primary}>変更する</SubmitButton>
        </ActionForm>
      </Card>

      <div className="text-right">
        <Link href="/member/account/cancel" className="text-xs text-mute underline hover:text-ink">退会について</Link>
      </div>
    </div>
  );
}
