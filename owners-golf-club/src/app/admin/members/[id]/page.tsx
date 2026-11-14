import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminTitle, StatusBadge, Table, td } from "@/components/admin";
import { HistoryList } from "@/components/history";
import { Alert, BackLink, Card, DL, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { fmtDate, fmtDateTime, yen } from "@/lib/format";
import { ADMIN_TRANSITIONS } from "@/lib/status";
import { SHIPMENT_LABEL, STATUS_LABEL } from "@/lib/constants";
import { isMockMode } from "@/lib/stripe";
import { approveCancellationAction, memberStatusAction, mockSimulateAction } from "@/actions/admin";

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await prisma.user.findUnique({
    where: { id },
    include: {
      application: true,
      subscription: true,
      cardShipment: true,
      payments: { orderBy: { createdAt: "desc" }, take: 50 },
      statusHistory: { include: { changedBy: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!m) notFound();
  if (m.role !== "MEMBER") {
    return <p className="text-sm">この方はまだ会員ではありません。<Link className={btn.link} href={`/admin/applications/${m.id}`}>申請詳細へ</Link></p>;
  }
  const a = m.application;
  const sub = m.subscription;
  const options = ADMIN_TRANSITIONS[m.status] ?? [];

  return (
    <>
      <BackLink href="/admin/members">会員一覧</BackLink>
      <AdminTitle title={`${m.name} 様（${m.memberNumber}）`} actions={<StatusBadge status={m.status} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {m.status === "CANCEL_REQUESTED" ? (
            <Card>
              <h2 className="mb-3 font-serif text-lg">退会申請</h2>
              {sub?.cancelAtPeriodEnd ? (
                <Alert kind="info">退会承認済みです。{fmtDate(sub.currentPeriodEnd)} の期間末で解約され、退会（CANCELLED）になります。</Alert>
              ) : (
                <ActionForm action={approveCancellationAction}>
                  <input type="hidden" name="userId" value={m.id} />
                  <p className="text-sm">退会申請を承認すると、Stripe 上で「期間末で解約」に設定されます。期間末の到来で自動的に退会となります。</p>
                  <SubmitButton className={btn.primary} confirm="退会申請を承認します。よろしいですか？">退会申請を承認する</SubmitButton>
                </ActionForm>
              )}
            </Card>
          ) : null}
          <Card>
            <h2 className="mb-3 font-serif text-lg">会員情報</h2>
            <DL
              items={[
                ["会員番号", m.memberNumber],
                ["入会日", fmtDate(m.memberSince)],
                ["メール", m.email],
                ["電話番号", a?.phone],
                ["会社名 / 役職", `${a?.companyName ?? ""} / ${a?.position ?? ""}`],
                ["郵送先", a ? `〒${a.postalCode}\n${a.mailingAddress}` : "—"],
                ["会員証表記名", a?.cardDisplayName],
                ["会員証・ネームプレート", m.cardShipment ? SHIPMENT_LABEL[m.cardShipment.status] : "—"],
              ]}
            />
            <Link href={`/admin/applications/${m.id}`} className={`${btn.link} mt-3 inline-block text-xs`}>申請内容（全項目）を見る</Link>
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-lg">サブスクリプション</h2>
            <DL
              items={[
                ["状態", `${sub?.status ?? "—"}${sub?.isMock ? "（モック）" : ""}`],
                ["次回請求日（期間末）", fmtDate(sub?.currentPeriodEnd)],
                ["期間末解約", sub?.cancelAtPeriodEnd ? "予約済み" : "なし"],
                ["Stripe Customer ID", sub?.stripeCustomerId],
                ["Stripe Subscription ID", sub?.stripeSubscriptionId],
              ]}
            />
            {isMockMode() && sub?.isMock ? (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <p className="text-xs text-mute">モック決済モードの動作確認用</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["invoice_paid", "月次課金（成功）"],
                    ["invoice_failed", "月次課金（失敗）"],
                    ["period_end", "期間末到来"],
                  ].map(([k, label]) => (
                    <ActionForm key={k} action={mockSimulateAction} className="inline">
                      <input type="hidden" name="userId" value={m.id} />
                      <input type="hidden" name="kind" value={k} />
                      <SubmitButton className={btn.small}>{label}</SubmitButton>
                    </ActionForm>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-lg">決済履歴</h2>
            <Table head={["日時", "内容", "金額（税込）", "結果"]}>
              {m.payments.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{fmtDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td className={td}>{p.description}{p.isMock ? "（モック）" : ""}</td>
                  <td className={td}>{yen(p.amount)}</td>
                  <td className={td}>{p.status === "PAID" ? "支払済み" : <span className="text-red-800">失敗</span>}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-serif text-lg">ステータス変更</h2>
            {options.length === 0 ? (
              <p className="text-sm text-mute">現在のステータスから手動で変更できる先はありません。</p>
            ) : (
              <ActionForm action={memberStatusAction}>
                <input type="hidden" name="userId" value={m.id} />
                <Field label="変更先" name="to" required>
                  <select id="to" name="to" className={inputCls}>
                    {options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}{m.status === "CANCEL_REQUESTED" && s === "ACTIVE" ? "（退会申請の取り下げ）" : ""}</option>)}
                  </select>
                </Field>
                <Field label="メモ" name="note">
                  <textarea id="note" name="note" rows={3} className={inputCls} />
                </Field>
                <SubmitButton className={`${btn.primary} w-full`} confirm="ステータスを変更します。よろしいですか？">変更する</SubmitButton>
              </ActionForm>
            )}
            <p className="mt-3 text-xs text-mute">支払い遅延・退会（期間末）・会員化は決済状況に応じて自動で遷移します。</p>
          </Card>
          <Card>
            <h2 className="mb-3 font-serif text-lg">ステータス履歴</h2>
            <HistoryList items={m.statusHistory} />
          </Card>
        </div>
      </div>
    </>
  );
}
