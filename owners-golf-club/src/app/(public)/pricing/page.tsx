import { PageHeader, Card, DL } from "@/components/ui";
import { CtaBand } from "@/components/site";
import { ENTRY_FEE, ENTRY_FEE_INCL, MONTHLY_FEE, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";

export const metadata = { title: "料金" };

export default function PricingPage() {
  return (
    <>
      <PageHeader en="FEE" title="料金のご案内" />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="text-center">
            <p className="text-sm text-mute">入会金（初回のみ）</p>
            <p className="mt-2 font-serif text-3xl">{yen(ENTRY_FEE)}<span className="text-sm">（税抜）</span></p>
            <p className="text-xs text-mute">税込 {yen(ENTRY_FEE_INCL)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-mute">月会費</p>
            <p className="mt-2 font-serif text-3xl">{yen(MONTHLY_FEE)}<span className="text-sm">（税抜）</span></p>
            <p className="text-xs text-mute">税込 {yen(MONTHLY_FEE_INCL)}</p>
          </Card>
        </div>
        <DL
          items={[
            ["お支払い方法", "クレジットカード（Stripeによる決済）"],
            ["お支払いのタイミング", "審査で承認された後、決済画面にて入会金と初月会費をまとめてお支払いいただきます。審査前に料金が発生することはありません。"],
            ["初回のお支払い額", `${yen(ENTRY_FEE + MONTHLY_FEE)}（税抜）／ 税込 ${yen(ENTRY_FEE_INCL + MONTHLY_FEE_INCL)}`],
            ["月会費の請求日", "決済完了日を起算日とし、以後毎月同日に自動で請求します（日割り計算はありません）。"],
            ["カード情報の取り扱い", "カード情報は決済代行会社（Stripe）が管理し、当クラブのシステムには保存されません。"],
            ["退会", "会員情報管理ページから退会申請ができます。運営確認後、現在の請求期間の末日をもって退会となります。入会金の返金はいたしません（詳細は入会規約をご確認ください）。"],
          ]}
        />
        <p className="text-xs text-mute">※イベント参加費・ストアの商品代金は別途となります。</p>
      </div>
      <CtaBand />
    </>
  );
}
