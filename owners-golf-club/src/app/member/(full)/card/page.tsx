import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LiveClock } from "@/components/clock";
import { fmtDate } from "@/lib/format";
import { FULL_ACCESS_STATUSES } from "@/lib/constants";

export const metadata = { title: "デジタル会員証" };

export default async function CardPage() {
  const user = (await getCurrentUser())!;
  const app = await prisma.application.findUnique({ where: { userId: user.id }, select: { cardDisplayName: true } });
  const valid = FULL_ACCESS_STATUSES.includes(user.status);
  return (
    <div className="mx-auto max-w-md">
      <div className="relative aspect-[1.586] overflow-hidden border border-gold/60 bg-ink p-6 text-white shadow-xl">
        <div className="absolute inset-y-0 right-0 w-1/4 bg-green" aria-hidden />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <p className="font-serif text-sm tracking-[0.25em]">OWNERS <span className="text-gold">GOLF</span> CLUB</p>
            <p className="mt-1 text-[10px] tracking-[0.3em] text-white/50">MEMBERSHIP CARD</p>
          </div>
          <div>
            <p className="font-serif text-xl tracking-wider">{app?.cardDisplayName ?? user.name}</p>
            <p className="mt-1 font-mono text-sm tracking-[0.2em] text-gold">{user.memberNumber}</p>
          </div>
          <div className="flex items-end justify-between text-[10px] text-white/60">
            <span>MEMBER SINCE {fmtDate(user.memberSince)}</span>
            <span className={`border px-2 py-0.5 text-xs ${valid ? "border-gold text-gold" : "border-red-400 text-red-300"}`}>{valid ? "有効" : "無効"}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-1 text-center text-sm">
        <p>氏名：{user.name}</p>
        <p>会員番号：<span className="font-mono">{user.memberNumber}</span></p>
        <p>ステータス：{valid ? "有効" : "無効"}</p>
        <p className="text-xs text-mute">表示時刻 <LiveClock /></p>
      </div>
    </div>
  );
}
