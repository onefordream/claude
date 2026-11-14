import Link from "next/link";
import { listPublicProfiles } from "@/lib/profile";
import { MemberTitle } from "@/components/member";
import { Badge, Card, Empty, btn } from "@/components/ui";

export const metadata = { title: "会員企業・経営者紹介" };

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const profiles = await listPublicProfiles(q.slice(0, 100));
  return (
    <>
      <MemberTitle en="MEMBERS" title="会員企業・経営者紹介">
        各会員が公開を選んだ項目のみ表示しています。<Link href="/member/account/profile" className={btn.link}>ご自身の掲載設定はこちら</Link>
      </MemberTitle>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="会社名・業種などで検索" className="w-full max-w-sm border border-line px-3 py-2 text-sm" />
        <button className={btn.small}>検索</button>
      </form>
      {profiles.length === 0 ? <Empty>掲載中の会員はいません。</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Link key={p.id} href={`/member/directory/${p.id}`} className="group">
              <Card className="h-full">
                {p.featured ? <Badge tone="gold">PICK UP</Badge> : null}
                <p className="mt-2 font-serif text-lg group-hover:text-green">{p.fields.companyName ?? "（会社名非公開）"}</p>
                <p className="text-sm">{p.name}{p.fields.position ? ` ／ ${p.fields.position}` : ""}</p>
                {p.fields.industry ? <p className="mt-2 text-xs text-mute">{p.fields.industry}</p> : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
