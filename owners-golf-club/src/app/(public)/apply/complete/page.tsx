import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card, btn, GoldRule } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "ご入会ありがとうございます" };
export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/apply/status");
  return (
    <>
      <PageHeader en="WELCOME" title="ご入会手続きが完了しました" />
      <div className="mx-auto max-w-xl space-y-8 px-4 py-12 text-center">
        <Card>
          <p className="text-xs tracking-[0.3em] text-gold">MEMBER NUMBER</p>
          <p className="mt-2 font-serif text-2xl tracking-widest">{user.memberNumber}</p>
          <GoldRule className="mx-auto mt-6" />
          <p className="mt-6 text-sm leading-loose">
            OWNERS GOLF CLUBへのご入会ありがとうございます。会員証とオリジナルネームプレートを準備し、ご登録住所へ発送いたします。
          </p>
        </Card>
        <Link href="/member" className={`${btn.primary} w-full`}>会員エリアへ</Link>
      </div>
    </>
  );
}
