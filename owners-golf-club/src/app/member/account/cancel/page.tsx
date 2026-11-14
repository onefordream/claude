import { prisma } from "@/lib/db";
import { requireMemberArea } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Alert, BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { fmtDate } from "@/lib/format";
import { requestCancellationAction, withdrawCancellationAction } from "@/actions/member";

export const metadata = { title: "退会申請" };

export default async function CancelPage() {
  const user = await requireMemberArea();
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/member/account">会員情報管理</BackLink>
      <div className="mt-4"><MemberTitle en="CANCELLATION" title="退会申請" /></div>
      <Card>
        <h2 className="font-serif text-lg">退会についての注意事項</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>退会申請後、事務局にて確認のうえ、現在の請求期間の末日をもって退会となります。</li>
          <li>退会日までは会員サービスをご利用いただけます。退会後は会員エリアにログインできなくなります。</li>
          <li>お支払い済みの入会金は返金いたしません。【未確定】</li>
          <li>月会費の日割り返金はありません。【未確定】</li>
          <li>会員番号は再入会時にも再利用されません。</li>
        </ul>
      </Card>
      <div className="mt-6">
        {user.status === "CANCEL_REQUESTED" ? (
          <Card>
            {sub?.cancelAtPeriodEnd ? (
              <Alert kind="info">退会手続きを承りました。{fmtDate(sub.currentPeriodEnd)} をもって退会となります。取り消しをご希望の場合は事務局へお問い合わせください。</Alert>
            ) : (
              <div className="space-y-4">
                <Alert kind="info">退会申請中です。事務局で確認しています。</Alert>
                <ConfirmForm action={withdrawCancellationAction} className={btn.small} confirm="退会申請を取り下げますか？">退会申請を取り下げる</ConfirmForm>
              </div>
            )}
          </Card>
        ) : user.status === "ACTIVE" ? (
          <Card>
            <ActionForm action={requestCancellationAction}>
              <Field label="退会理由（任意）" name="reason">
                <textarea id="reason" name="reason" rows={4} maxLength={1000} className={inputCls} />
              </Field>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="agree" required className="mt-1" />
                上記の注意事項（入会金は返金されないことを含む）を確認しました
              </label>
              <SubmitButton className={btn.smallDanger} confirm="退会を申請します。よろしいですか？">退会を申請する</SubmitButton>
            </ActionForm>
          </Card>
        ) : (
          <Alert kind="warn">現在のステータスではオンラインで退会申請できません。事務局へお問い合わせください。</Alert>
        )}
      </div>
    </div>
  );
}
