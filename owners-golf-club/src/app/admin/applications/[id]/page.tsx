import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle, StatusBadge } from "@/components/admin";
import { HistoryList } from "@/components/history";
import { Badge, BackLink, Card, DL, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { fmtDateTime } from "@/lib/format";
import { ADMIN_TRANSITIONS } from "@/lib/status";
import { STATUS_LABEL } from "@/lib/constants";
import { reviewDecisionAction, saveReviewNoteAction } from "@/actions/admin";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      application: true,
      statusHistory: { include: { changedBy: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!user || !user.application) notFound();
  if (user.role === "MEMBER") {
    return (
      <p className="text-sm">この方は会員化済みです。<Link className={btn.link} href={`/admin/members/${user.id}`}>会員管理へ</Link></p>
    );
  }
  const a = user.application;
  const options = (ADMIN_TRANSITIONS[user.status] ?? []).filter((s) => ["APPROVED", "REJECTED", "NEEDS_INFO", "APPLIED"].includes(s));

  return (
    <>
      <BackLink href="/admin/applications">申請一覧</BackLink>
      <AdminTitle title={`${user.name} 様の申請`} actions={<StatusBadge status={user.status} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <DL
              items={[
                ["申請日時", fmtDateTime(a.createdAt)],
                ["氏名", user.name],
                ["メールアドレス", <span key="e">{user.email} {user.emailVerifiedAt ? <Badge tone="green">確認済み</Badge> : <Badge tone="red">未確認</Badge>}</span>],
                ["電話番号", a.phone],
                ["会社名", a.companyName],
                ["会社所在地", a.companyAddress],
                ["役職", a.position],
                ["業種", a.industry],
                ["事業内容", a.businessDescription],
                ["会社Webサイト", <a key="w" href={a.website} target="_blank" rel="noopener noreferrer nofollow" className={btn.link}>{a.website}</a>],
                ["SNS", a.sns],
                ["ゴルフ歴", a.golfHistory],
                ["平均スコア", a.averageScore],
                ["郵送先", `〒${a.postalCode}\n${a.mailingAddress}`],
                ["会員証表記名", a.cardDisplayName],
                ["規約同意", fmtDateTime(a.agreedTermsAt)],
                ["個人情報保護方針同意", fmtDateTime(a.agreedPrivacyAt)],
              ]}
            />
          </Card>
          {a.infoRequestMessage || a.additionalInfo ? (
            <Card>
              <h2 className="mb-3 font-serif text-lg">追加情報</h2>
              <DL items={[["依頼内容", a.infoRequestMessage], ["提出内容", a.additionalInfo], ["提出日時", fmtDateTime(a.additionalInfoAt)]]} />
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-serif text-lg">審査の操作</h2>
            {options.length === 0 ? (
              <p className="text-sm text-mute">現在のステータスでは操作できません。</p>
            ) : (
              <ActionForm action={reviewDecisionAction}>
                <input type="hidden" name="userId" value={user.id} />
                <Field label="変更先" name="decision" required>
                  <select id="decision" name="decision" className={inputCls} required>
                    {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </Field>
                <Field label="メモ／追加情報の依頼内容" name="note" hint="「追加情報の依頼」の場合、この内容が申請者に表示・送信されます。それ以外は履歴にのみ記録します。">
                  <textarea id="note" name="note" rows={4} className={inputCls} />
                </Field>
                <SubmitButton className={`${btn.primary} w-full`} confirm="ステータスを変更します。よろしいですか？（申請者にメールが送信されます）">ステータスを変更</SubmitButton>
              </ActionForm>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-lg">審査メモ（社内用）</h2>
            <ActionForm action={saveReviewNoteAction}>
              <input type="hidden" name="userId" value={user.id} />
              <textarea name="reviewNote" rows={5} defaultValue={a.reviewNote ?? ""} className={inputCls} />
              <SubmitButton className={btn.small}>保存</SubmitButton>
            </ActionForm>
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-lg">ステータス履歴</h2>
            <HistoryList items={user.statusHistory} />
          </Card>
        </div>
      </div>
    </>
  );
}
