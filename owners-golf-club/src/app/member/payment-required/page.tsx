import { redirect } from "next/navigation";
import { requireMemberArea } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Card, btn } from "@/components/ui";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "お支払いのご確認" };

export default async function PaymentRequiredPage() {
  const user = await requireMemberArea();
  if (user.status !== "PAST_DUE") redirect("/member");
  return (
    <div className="mx-auto max-w-xl">
      <MemberTitle en="PAYMENT" title="お支払いのご確認" />
      <Card>
        <p className="text-sm leading-loose">
          月会費のお支払いが確認できていないため、現在は一部の会員サービスをご利用いただけません。
          お手数ですが、下のボタンからカード情報の変更・お支払い状況のご確認をお願いいたします。
          お支払いが確認でき次第、すべてのサービスをご利用いただけます。
        </p>
        <form action="/api/billing/portal" method="post" className="mt-6">
          <SubmitButton className={`${btn.green} w-full`}>カード情報を変更する</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
