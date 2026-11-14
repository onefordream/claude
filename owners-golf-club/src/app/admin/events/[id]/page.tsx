import { notFound } from "next/navigation";
import type { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AdminTitle, Table, td } from "@/components/admin";
import { BackLink, Card, Field, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { Check } from "@/components/checkbox";
import { REGION_LABEL, REGISTRATION_LABEL } from "@/lib/constants";
import { fmtDateTime, toJstInput } from "@/lib/format";
import { deleteEventAction, saveEventAction, updateRegistrationAction } from "@/actions/admin";

export default async function AdminEventEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const ev = isNew
    ? null
    : await prisma.event.findUnique({
        where: { id },
        include: {
          registrations: {
            include: { user: { select: { name: true, memberNumber: true, application: { select: { companyName: true, averageScore: true } } } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
  if (!isNew && !ev) notFound();

  return (
    <>
      <BackLink href="/admin/events">イベント一覧</BackLink>
      <AdminTitle title={isNew ? "イベント作成" : `イベント編集：${ev!.title}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <ActionForm action={saveEventAction}>
            <input type="hidden" name="id" value={ev?.id ?? ""} />
            <Field label="タイトル" name="title" required><input id="title" name="title" required defaultValue={ev?.title} className={inputCls} /></Field>
            <Field label="開催日時（日本時間）" name="startsAt" required><input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={toJstInput(ev?.startsAt)} className={inputCls} /></Field>
            <Field label="地域" name="region" required>
              <select id="region" name="region" defaultValue={ev?.region ?? "KANSAI"} className={inputCls}>
                {Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="会場（ゴルフ場名）" name="venue" required><input id="venue" name="venue" required defaultValue={ev?.venue} className={inputCls} /></Field>
            <Field label="定員" name="capacity"><input id="capacity" name="capacity" type="number" min={1} defaultValue={ev?.capacity ?? ""} className={inputCls} /></Field>
            <Field label="参加費の表記" name="feeNote" hint="未確定の場合は「未確定」と記載"><input id="feeNote" name="feeNote" defaultValue={ev?.feeNote ?? ""} className={inputCls} /></Field>
            <Field label="詳細" name="description"><textarea id="description" name="description" rows={6} defaultValue={ev?.description} className={inputCls} /></Field>
            <Field label="組み合わせメモ（管理者のみ）" name="pairingMemo"><textarea id="pairingMemo" name="pairingMemo" rows={6} defaultValue={ev?.pairingMemo ?? ""} className={inputCls} /></Field>
            <div className="flex flex-wrap gap-4">
              <Check name="withCaddie" label="キャディ付き" defaultChecked={ev?.withCaddie ?? true} />
              <Check name="published" label="会員に公開" defaultChecked={ev?.published} />
              <Check name="isSample" label="サンプルデータ" defaultChecked={ev?.isSample} />
            </div>
            <SubmitButton className={`${btn.primary} w-full`}>保存</SubmitButton>
          </ActionForm>
          {ev ? (
            <div className="mt-6 text-right">
              <ConfirmForm action={deleteEventAction} hidden={{ id: ev.id }} className={btn.smallDanger} confirm="このイベントと申込データを削除します。よろしいですか？">削除</ConfirmForm>
            </div>
          ) : null}
        </Card>
        {ev ? (
          <div>
            <h2 className="mb-3 font-serif text-lg">申込一覧（{ev.registrations.filter((r) => r.status !== "CANCELLED").length}件）</h2>
            <Table head={["申込日時", "会員", "会員メモ", "状態・管理メモ"]}>
              {ev.registrations.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{fmtDateTime(r.createdAt)}</td>
                  <td className={td}>{r.user.name}<br /><span className="text-xs text-mute">{r.user.memberNumber} / {r.user.application?.companyName} / 平均 {r.user.application?.averageScore ?? "—"}</span></td>
                  <td className={`${td} text-xs whitespace-pre-wrap`}>{r.memberNote}</td>
                  <td className={td}>
                    <form action={updateRegistrationAction} className="flex min-w-[12rem] flex-col gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status} className="border border-line px-2 py-1 text-sm">
                        {(Object.keys(REGISTRATION_LABEL) as RegistrationStatus[]).map((s) => <option key={s} value={s}>{REGISTRATION_LABEL[s]}</option>)}
                      </select>
                      <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="管理メモ（組・スタート等）" className="border border-line px-2 py-1 text-sm" />
                      <SubmitButton className={btn.small}>更新</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        ) : null}
      </div>
    </>
  );
}
