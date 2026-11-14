import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Alert, BackLink, Badge, Card, DL, Field, SampleBadge, btn, inputCls } from "@/components/ui";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { REGION_LABEL, REGISTRATION_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { cancelRegistrationAction, registerEventAction } from "@/actions/member";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const ev = await prisma.event.findFirst({
    where: { id, published: true },
    include: { registrations: { where: { userId: user.id } } },
  });
  if (!ev) notFound();
  const activeCount = await prisma.eventRegistration.count({ where: { eventId: id, status: { in: ["APPLIED", "CONFIRMED"] } } });
  const reg = ev.registrations[0];
  const isOpen = ev.startsAt > new Date();
  const registered = reg && reg.status !== "CANCELLED";

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/member/events">イベント一覧</BackLink>
      <div className="mt-4"><MemberTitle en="EVENT" title={ev.title} /></div>
      {ev.isSample ? <div className="mb-4"><SampleBadge /></div> : null}
      <DL
        items={[
          ["開催日時", fmtDateTime(ev.startsAt)],
          ["地域", REGION_LABEL[ev.region]],
          ["会場", ev.venue],
          ["キャディ", ev.withCaddie ? "キャディ付き" : "セルフ"],
          ["定員", ev.capacity ? `${ev.capacity}名（現在 ${activeCount}名）` : "—"],
          ["参加費", ev.feeNote ?? "未確定"],
        ]}
      />
      <div className="mt-6 text-sm leading-loose whitespace-pre-wrap">{ev.description}</div>
      <Card className="mt-8">
        {registered ? (
          <div className="space-y-4">
            <p className="text-sm">お申し込み状況：<Badge tone="green">{REGISTRATION_LABEL[reg.status]}</Badge></p>
            {reg.adminNote && reg.status === "CONFIRMED" ? <Alert kind="info">事務局より：{reg.adminNote}</Alert> : null}
            {isOpen ? (
              <ConfirmForm action={cancelRegistrationAction} hidden={{ eventId: ev.id }} className={btn.small} confirm="お申し込みをキャンセルします。よろしいですか？">申込をキャンセルする</ConfirmForm>
            ) : null}
          </div>
        ) : isOpen ? (
          <ActionForm action={registerEventAction}>
            <input type="hidden" name="eventId" value={ev.id} />
            <Field label="備考（同伴希望・ご要望など）" name="memberNote">
              <textarea id="memberNote" name="memberNote" rows={3} maxLength={1000} className={inputCls} />
            </Field>
            <SubmitButton className={`${btn.green} w-full`}>このイベントに申し込む</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-mute">このイベントの申込は終了しました。</p>
        )}
      </Card>
    </div>
  );
}
