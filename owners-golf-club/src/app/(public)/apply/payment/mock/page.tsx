import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card, Alert, btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { requireApplicant } from "@/lib/auth";
import { isMockMode } from "@/lib/stripe";
import { ENTRY_FEE_INCL, MONTHLY_FEE_INCL } from "@/lib/constants";
import { yen } from "@/lib/format";
import { completeMockCheckoutAction } from "@/actions/mock";

export const dynamic = "force-dynamic";
export const metadata = { title: "モック決済" };

export default async function MockCheckoutPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  if (!isMockMode()) redirect("/apply/payment");
  const user = await requireApplicant();
  if (user.status !== "APPROVED") redirect("/apply/status?error=not_approved");
  const { session_id = "" } = await searchParams;
  return (
    <>
      <PageHeader en="MOCK CHECKOUT" title="モック決済（開発用）" />
      <div className="mx-auto max-w-md space-y-6 px-4 py-12">
        <Alert kind="warn">Stripe が未設定のため、開発用のモック決済画面を表示しています。カード情報の入力はなく、実際の請求も発生しません。</Alert>
        <Card>
          <p className="text-sm">お支払い金額（税込）</p>
          <p className="mt-1 font-serif text-3xl">{yen(ENTRY_FEE_INCL + MONTHLY_FEE_INCL)}</p>
          <p className="text-xs text-mute">入会金 {yen(ENTRY_FEE_INCL)} ＋ 月会費 {yen(MONTHLY_FEE_INCL)}</p>
        </Card>
        <form action={completeMockCheckoutAction}>
          <input type="hidden" name="session_id" value={session_id} />
          <SubmitButton className={`${btn.green} w-full`}>テスト決済を完了する</SubmitButton>
        </form>
        <Link href="/apply/payment?canceled=1" className={`${btn.outline} w-full`}>キャンセル</Link>
      </div>
    </>
  );
}
