import { redirect } from "next/navigation";
import { PageHeader, Card, Alert, btn } from "@/components/ui";
import { requireApplicant } from "@/lib/auth";
import { ENTRY_FEE, ENTRY_FEE_INCL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";
import { isMockMode } from "@/lib/stripe";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "お支払い手続き" };
export const dynamic = "force-dynamic";

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ canceled?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireApplicant();
  // 審査で承認された申請者のみ（サーバー側検証。Checkout作成APIでも再検証する）
  if (user.status !== "APPROVED") redirect("/apply/status?error=not_approved");

  return (
    <>
      <PageHeader en="PAYMENT" title="お支払い手続き" />
      <div className="mx-auto max-w-xl space-y-6 px-4 py-12">
        {sp.canceled ? <Alert kind="info">お支払いはキャンセルされました。準備ができましたら再度お進みください。</Alert> : null}
        {sp.error === "checkout" ? <Alert kind="error">決済画面を開けませんでした。時間をおいて再度お試しください。</Alert> : null}
        {sp.error === "rate" ? <Alert kind="error">操作回数の上限に達しました。しばらく時間をおいてお試しください。</Alert> : null}
        {isMockMode() ? <Alert kind="warn">現在は開発用のモック決済モードです（Stripe未設定）。実際の請求は発生しません。</Alert> : null}
        <Card>
          <h2 className="font-serif text-lg">初回のお支払い内容</h2>
          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-3">入会金（初回のみ）</td>
                <td className="py-3 text-right">{yen(ENTRY_FEE)}（税抜）<br /><span className="text-xs text-mute">税込 {yen(ENTRY_FEE_INCL)}</span></td>
              </tr>
              <tr>
                <td className="py-3">月会費（初月分）</td>
                <td className="py-3 text-right">{yen(MONTHLY_FEE)}（税抜）<br /><span className="text-xs text-mute">税込 {yen(MONTHLY_FEE_INCL)}</span></td>
              </tr>
              <tr className="font-medium">
                <td className="py-3">合計</td>
                <td className="py-3 text-right">{yen(ENTRY_FEE + MONTHLY_FEE)}（税抜）<br /><span className="text-xs">税込 {yen(ENTRY_FEE_INCL + MONTHLY_FEE_INCL)}</span></td>
              </tr>
            </tbody>
          </table>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-mute">
            <li>カード登録・入会金・初月会費のお支払いが1回の手続きで完了します。</li>
            <li>2ヶ月目以降の月会費（税込{yen(MONTHLY_FEE_INCL)}）は、決済完了日を起算日として毎月同日に自動で請求します（日割りなし）。</li>
            <li>カード情報は決済代行会社（Stripe）が管理し、当クラブのシステムには保存されません。</li>
            <li>入会金は返金いたしません。</li>
          </ul>
        </Card>
        <form action="/api/checkout" method="post">
          <SubmitButton className={`${btn.green} w-full`} pendingText="決済画面を準備しています…">決済画面へ進む</SubmitButton>
        </form>
      </div>
    </>
  );
}
