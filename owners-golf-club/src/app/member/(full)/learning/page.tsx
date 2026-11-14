import { prisma } from "@/lib/db";
import { MemberTitle } from "@/components/member";
import { Card, DL, Empty, SampleBadge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "勉強会・コンテンツ" };

export default async function LearningPage() {
  const rows = await prisma.content.findMany({ where: { published: true }, orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }] });
  const seminars = rows.filter((r) => r.kind === "SEMINAR");
  const archives = rows.filter((r) => r.kind === "ARCHIVE");
  return (
    <>
      <MemberTitle en="LEARNING" title="勉強会・コンテンツ">経営・AIをテーマにした勉強会のご案内と、録画アーカイブです。</MemberTitle>
      <h2 className="mb-4 font-serif text-xl">勉強会・セミナー</h2>
      {seminars.length === 0 ? <Empty>予定されている勉強会はありません。</Empty> : (
        <div className="mb-12 grid gap-4 md:grid-cols-2">
          {seminars.map((c) => (
            <Card key={c.id}>
              <h3 className="font-serif text-lg">{c.title}</h3>
              {c.isSample ? <SampleBadge /> : null}
              <div className="mt-3"><DL items={[["日時", fmtDateTime(c.scheduledAt)], ["会場・形式", c.location ?? "未確定"]]} /></div>
              <p className="mt-3 text-sm whitespace-pre-wrap text-mute">{c.description}</p>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mb-4 mt-12 font-serif text-xl">録画アーカイブ</h2>
      {archives.length === 0 ? <Empty>アーカイブはまだありません。</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {archives.map((c) => (
            <Card key={c.id}>
              <h3 className="font-serif text-lg">{c.title}</h3>
              {c.isSample ? <SampleBadge /> : null}
              <p className="mt-2 text-sm whitespace-pre-wrap text-mute">{c.description}</p>
              {c.videoUrl ? (
                <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-green underline">録画を視聴する</a>
              ) : <p className="mt-4 text-xs text-mute">録画は準備中です。</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
