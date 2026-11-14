import Link from "next/link";
import { PageHeader, Card, Alert, Badge, DL, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoutButton } from "@/components/logout";
import { requireApplicant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { resendVerificationAction, submitAdditionalInfoAction } from "@/actions/auth";

export const metadata = { title: "申請状況" };
export const dynamic = "force-dynamic";

export default async function StatusPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireApplicant();
  const app = await prisma.application.findUnique({ where: { userId: user.id } });

  return (
    <>
      <PageHeader en="STATUS" title="申請状況" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        {sp.processing ? <Alert kind="info">お支払いを確認しています。反映まで少しお時間がかかる場合があります。数十秒後にこのページを再読み込みしてください。</Alert> : null}
        {sp.error === "not_approved" ? <Alert kind="error">決済に進めるのは、審査で承認された方のみです。</Alert> : null}
        {sp.info_submitted ? <Alert kind="success">追加情報を受け付けました。審査を再開します。</Alert> : null}
        {sp.resent === "1" ? <Alert kind="success">確認メールを再送しました。</Alert> : null}
        {sp.resent === "limit" ? <Alert kind="error">再送回数の上限に達しました。しばらく時間をおいてお試しください。</Alert> : null}

        <Card>
          <p className="text-xs text-mute">現在のステータス</p>
          <p className="mt-2 font-serif text-2xl">{STATUS_LABEL[user.status]}</p>
          <div className="mt-4 text-sm leading-loose">
            {user.status === "APPLIED" && <p>申請内容を審査しています。審査結果はメールでお知らせします。</p>}
            {user.status === "NEEDS_INFO" && <p>審査にあたり、追加情報のご提出をお願いしております。下記のフォームからご提出ください。</p>}
            {user.status === "APPROVED" && (
              <>
                <p>審査の結果、ご入会を承認いたしました。お支払い手続きにお進みください。</p>
                <Link href="/apply/payment" className={`${btn.green} mt-4 w-full`}>お支払い手続きへ進む</Link>
              </>
            )}
            {user.status === "REJECTED" && <p>誠に恐れ入りますが、今回はご入会を見送らせていただくこととなりました。審査の理由についてはお答えいたしかねますので、ご了承ください。</p>}
            {user.status === "SUSPENDED" && <p>現在、会員資格が停止されています。詳しくは事務局までお問い合わせください。</p>}
            {user.status === "CANCELLED" && <p>退会手続きが完了しています。</p>}
            {(user.status === "ACTIVE" || user.status === "PAST_DUE" || user.status === "CANCEL_REQUESTED") && (
              <Link href="/api/session/refresh?next=/member" className={`${btn.primary} w-full`}>会員エリアへ</Link>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-mute">メールアドレス</p>
              <p className="text-sm">{user.email}</p>
            </div>
            {user.emailVerifiedAt ? <Badge tone="green">確認済み</Badge> : <Badge tone="red">未確認</Badge>}
          </div>
          {!user.emailVerifiedAt ? (
            <form action={resendVerificationAction} className="mt-4">
              <p className="mb-3 text-xs text-mute">メールアドレスの確認が完了していない申請は、審査が遅れる場合があります。</p>
              <SubmitButton className={btn.small}>確認メールを再送する</SubmitButton>
            </form>
          ) : null}
        </Card>

        {user.status === "NEEDS_INFO" && app ? (
          <Card>
            <h2 className="font-serif text-lg">追加情報のご提出</h2>
            {app.infoRequestMessage ? (
              <div className="mt-4 border-l-2 border-gold bg-cream p-4 text-sm whitespace-pre-wrap">{app.infoRequestMessage}</div>
            ) : null}
            <div className="mt-4">
              <ActionForm action={submitAdditionalInfoAction}>
                <Field label="追加情報" name="additionalInfo" required>
                  <textarea id="additionalInfo" name="additionalInfo" required rows={6} maxLength={4000} defaultValue={app.additionalInfo ?? ""} className={inputCls} />
                </Field>
                <SubmitButton className={`${btn.primary} w-full`}>提出する</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ) : null}

        {app ? (
          <Card>
            <h2 className="mb-4 font-serif text-lg">申請内容</h2>
            <DL
              items={[
                ["申請日時", fmtDateTime(app.createdAt)],
                ["氏名", user.name],
                ["会社名", app.companyName],
                ["役職", app.position],
                ["業種", app.industry],
                ["会員証表記名", app.cardDisplayName],
              ]}
            />
            <p className="mt-3 text-xs text-mute">申請内容の変更をご希望の場合は、お問い合わせフォームからご連絡ください。</p>
          </Card>
        ) : null}

        <div className="text-right"><LogoutButton /></div>
      </div>
    </>
  );
}
