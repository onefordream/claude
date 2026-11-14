import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { Badge, Card, Empty, SampleBadge } from "@/components/ui";
import { REGION_LABEL, REGISTRATION_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import type { Region } from "@prisma/client";

export const metadata = { title: "イベント" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const { region } = await searchParams;
  const user = (await getCurrentUser())!;
  const regionFilter = region && region in REGION_LABEL ? (region as Region) : undefined;
  const events = await prisma.event.findMany({
    where: { published: true, startsAt: { gte: new Date() }, ...(regionFilter ? { region: regionFilter } : {}) },
    include: { registrations: { where: { userId: user.id } } },
    orderBy: { startsAt: "asc" },
  });
  return (
    <>
      <MemberTitle en="EVENTS" title="ゴルフイベント">名門コースを中心に、原則キャディ付きで毎月開催します。</MemberTitle>
      <div className="mb-6 flex gap-2 text-xs">
        {[["", "すべて"], ["KANSAI", "関西"], ["KANTO", "関東"]].map(([v, l]) => (
          <Link key={v} href={v ? `/member/events?region=${v}` : "/member/events"} className={`border px-3 py-1.5 ${(region ?? "") === v ? "border-ink bg-ink text-white" : "border-line"}`}>{l}</Link>
        ))}
      </div>
      {events.length === 0 ? <Empty>現在募集中のイベントはありません。</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => {
            const reg = e.registrations[0];
            return (
              <Card key={e.id}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
                  <span>{fmtDateTime(e.startsAt)}</span>
                  <Badge>{REGION_LABEL[e.region]}</Badge>
                  {e.withCaddie ? <Badge tone="mute">キャディ付き</Badge> : null}
                  {e.isSample ? <SampleBadge /> : null}
                </div>
                <Link href={`/member/events/${e.id}`} className="mt-2 block font-serif text-lg hover:text-green">{e.title}</Link>
                <p className="mt-1 text-sm text-mute">{e.venue}</p>
                {reg && reg.status !== "CANCELLED" ? <p className="mt-3"><Badge tone="green">{REGISTRATION_LABEL[reg.status]}</Badge></p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
