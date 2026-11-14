import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Card, Empty, SampleBadge, btn } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { CONTENT_KIND_LABEL, REGION_LABEL, SHIPMENT_LABEL } from "@/lib/constants";

export default async function MemberHome() {
  const user = (await getCurrentUser())!;
  const now = new Date();
  const [notices, events, contents, shipment] = await Promise.all([
    prisma.notice.findMany({ where: { published: true, publishedAt: { lte: now } }, orderBy: { publishedAt: "desc" }, take: 5 }),
    prisma.event.findMany({ where: { published: true, startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 3 }),
    prisma.content.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.cardShipment.findUnique({ where: { userId: user.id } }),
  ]);
  return (
    <>
      <MemberTitle en="DASHBOARD" title={`ようこそ、${user.name} 様`}>
        会員番号 <span className="font-mono">{user.memberNumber}</span>
        {shipment ? <> ・ 会員証・ネームプレート：{SHIPMENT_LABEL[shipment.status]}</> : null}
      </MemberTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center justify-between font-serif text-lg">お知らせ</h2>
          {notices.length === 0 ? <Empty>現在お知らせはありません。</Empty> : (
            <ul className="divide-y divide-line border-y border-line">
              {notices.map((n) => (
                <li key={n.id} className="py-3">
                  <Link href={`/member/notices/${n.id}`} className="group flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <span className="shrink-0 text-xs text-mute">{fmtDate(n.publishedAt)}</span>
                    <span className="text-sm group-hover:text-green">{n.title} {n.isSample ? <SampleBadge /> : null}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 font-serif text-lg">次回のイベント</h2>
          {events.length === 0 ? <Empty>予定されているイベントはありません。</Empty> : (
            <div className="space-y-3">
              {events.map((e) => (
                <Card key={e.id}>
                  <p className="text-xs text-mute">{fmtDateTime(e.startsAt)} ・ {REGION_LABEL[e.region]}</p>
                  <Link href={`/member/events/${e.id}`} className="mt-1 block font-serif hover:text-green">{e.title}</Link>
                  {e.isSample ? <div className="mt-2"><SampleBadge /></div> : null}
                </Card>
              ))}
            </div>
          )}
          <Link href="/member/events" className={`${btn.link} mt-3 inline-block text-sm`}>イベント一覧へ</Link>
        </section>
      </div>
      <section className="mt-10">
        <h2 className="mb-3 font-serif text-lg">最新の勉強会・コンテンツ</h2>
        {contents.length === 0 ? <Empty>コンテンツはまだありません。</Empty> : (
          <div className="grid gap-3 md:grid-cols-3">
            {contents.map((c) => (
              <Card key={c.id}>
                <p className="text-xs text-gold">{CONTENT_KIND_LABEL[c.kind]}</p>
                <p className="mt-1 font-serif">{c.title}</p>
                {c.isSample ? <div className="mt-2"><SampleBadge /></div> : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
