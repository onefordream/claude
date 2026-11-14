import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BackLink, SampleBadge } from "@/components/ui";
import { MemberTitle } from "@/components/member";
import { fmtDate } from "@/lib/format";

export default async function NoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await prisma.notice.findFirst({ where: { id, published: true, publishedAt: { lte: new Date() } } });
  if (!n) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <BackLink href="/member">ホーム</BackLink>
      <div className="mt-4"><MemberTitle en={fmtDate(n.publishedAt)} title={n.title} /></div>
      {n.isSample ? <SampleBadge /> : null}
      <div className="mt-4 text-sm leading-loose whitespace-pre-wrap">{n.body}</div>
    </article>
  );
}
