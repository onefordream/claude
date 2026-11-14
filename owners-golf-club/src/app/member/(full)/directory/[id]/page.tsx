import { notFound } from "next/navigation";
import { getPublicProfile, PROFILE_FIELDS } from "@/lib/profile";
import { MemberTitle } from "@/components/member";
import { BackLink, DL } from "@/components/ui";

export default async function DirectoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPublicProfile(id);
  if (!p) notFound();
  const items = PROFILE_FIELDS.filter(([k]) => p.fields[k]).map(([k, label]) => {
    const v = p.fields[k]!;
    const node = k === "website" && /^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-green underline">{v}</a> : v;
    return [label, node] as [string, React.ReactNode];
  });
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/member/directory">会員紹介</BackLink>
      <div className="mt-4"><MemberTitle en="MEMBER" title={p.name} /></div>
      <DL items={items} />
    </div>
  );
}
