import Link from "next/link";
import type { Region } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MemberTitle } from "@/components/member";
import { Card, DL, Empty, SampleBadge } from "@/components/ui";
import { PARTNER_TYPE_LABEL, REGION_LABEL } from "@/lib/constants";

export const metadata = { title: "提携ゴルフ場" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const { region } = await searchParams;
  const rows = await prisma.partnerCourse.findMany({
    where: { published: true, ...(region && region in REGION_LABEL ? { region: region as Region } : {}) },
    orderBy: [{ type: "asc" }, { region: "asc" }, { sortOrder: "asc" }],
  });
  const groups = (Object.keys(REGION_LABEL) as Region[]).map((r) => [r, rows.filter((x) => x.region === r)] as const).filter(([, l]) => l.length > 0);
  return (
    <>
      <MemberTitle en="PARTNERS" title="提携ゴルフ場・優待">提携先ごとの優待条件と利用方法をご確認ください。</MemberTitle>
      <div className="mb-6 flex gap-2 text-xs">
        {[["", "すべて"], ["KANSAI", "関西"], ["KANTO", "関東"], ["OTHER", "その他"]].map(([v, l]) => (
          <Link key={v} href={v ? `/member/courses?region=${v}` : "/member/courses"} className={`border px-3 py-1.5 ${(region ?? "") === v ? "border-ink bg-ink text-white" : "border-line"}`}>{l}</Link>
        ))}
      </div>
      {groups.length === 0 ? <Empty>提携先は現在調整中です。決定次第こちらでご案内します。</Empty> : null}
      {groups.map(([r, list]) => (
        <section key={r} className="mb-10">
          <h2 className="mb-4 border-b border-line pb-2 font-serif text-xl">{REGION_LABEL[r]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center gap-2 text-xs text-gold">{PARTNER_TYPE_LABEL[p.type]}{p.isSample ? <SampleBadge /> : null}</div>
                <h3 className="mt-1 font-serif text-lg">{p.name}</h3>
                {p.prefecture ? <p className="text-xs text-mute">{p.prefecture}</p> : null}
                <p className="mt-3 text-sm whitespace-pre-wrap text-mute">{p.description}</p>
                <div className="mt-4"><DL items={[["優待条件", p.benefit], ["利用方法", p.howToUse]]} /></div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
