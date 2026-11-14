import { requireMemberArea } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Alert, BackLink } from "@/components/ui";

export const metadata = { title: "カード変更（モック）" };

export default async function PortalMock() {
  await requireMemberArea();
  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/member/account">会員情報管理</BackLink>
      <div className="mt-4"><MemberTitle en="BILLING" title="カード変更・領収書（モック）" /></div>
      <Alert kind="warn">
        モック決済モードのため、Stripe Customer Portal の代わりにこの画面を表示しています。Stripe を設定すると、ここからカード変更・領収書確認の画面（Stripe）へ移動します。
      </Alert>
    </div>
  );
}
