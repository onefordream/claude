import Link from "next/link";
import { requireCompanyPage } from "@/lib/server/page";
import { getUsageSummary } from "@/lib/server/usage";
import { getAdminStore } from "@/lib/server/auth";
import { serverConfig } from "@/lib/config";
import { AppShell } from "@/components/game/AppShell";
import { Card, Pill, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { DangerZone, SignOutButton, UpgradeButton } from "./SettingsClient";

export const metadata = { title: "料金・設定" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { user, store, company } = await requireCompanyPage();
  const sp = await searchParams;
  const [usage, settings] = await Promise.all([getUsageSummary(store), getAdminStore().getSettings()]);
  const stripeReady = Boolean(serverConfig.stripe.secretKey && serverConfig.stripe.proPriceId);
  const free = settings.plans.free;
  const pro = settings.plans.pro;

  return (
    <AppShell company={company}>
      <h1 className="mb-5 text-2xl font-black">料金・設定</h1>

      {sp.checkout === "success" && (
        <Card className="mb-4 border-success/40 text-sm text-success">お手続きありがとうございます。決済の確認（サーバー側）が完了すると、PROプランが反映されます。</Card>
      )}

      <Card className="mb-5">
        <SectionTitle>ご利用状況</SectionTitle>
        <div className="mb-3 flex items-center gap-2 text-sm">
          現在のプラン <Pill tone={usage.plan === "pro" ? "gold" : "default"}>{usage.plan === "pro" ? "PRO" : "FREE"}</Pill>
        </div>
        {[
          ["今日のAI相談", usage.chatToday, usage.chatDailyLimit],
          ["今月のAI相談", usage.chatMonth, usage.chatMonthlyLimit],
          ["今日の社内会議", usage.meetingToday, usage.meetingDailyLimit],
        ].map(([label, used, limit]) => (
          <div key={label as string} className="mb-3">
            <div className="mb-1 flex justify-between text-xs">
              <span>{label}</span>
              <span className="text-muted">
                {used} / {limit} 回
              </span>
            </div>
            <ProgressBar value={Number(limit) ? Number(used) / Number(limit) : 1} tone="sky" />
          </div>
        ))}
        <p className="text-[11px] text-muted">上限は毎日0時（日本時間）にリセットされます。AI相談には業務依頼も含まれます。</p>
      </Card>

      <SectionTitle>料金プラン</SectionTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="font-display text-sm font-bold tracking-widest text-muted">FREE</div>
          <div className="mt-1 text-2xl font-black">無料</div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>・会社設立・AI秘書との面談</li>
            <li>・社長室・AI社員{free.maxEmployees}名</li>
            <li>・会社レベル・基本ミッション</li>
            <li>・AI相談 {free.chatDaily}回/日（{free.chatMonthly}回/月）</li>
            <li>・社内会議お試し {free.meetingDaily}回/日</li>
          </ul>
        </Card>
        <Card gold>
          <div className="font-display text-sm font-bold tracking-widest text-gold">PRO</div>
          <div className="mt-1 text-2xl font-black">
            月額 {settings.proPriceJpy.toLocaleString()}円<span className="ml-1 text-xs font-normal text-muted">（税込・予定）</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>・AI社員の追加採用（順次公開）</li>
            <li>・AI相談 {pro.chatDaily}回/日（{pro.chatMonthly}回/月）</li>
            <li>・社内会議 {pro.meetingDaily}回/日</li>
            <li>・複数プロジェクト・詳細分析（準備中）</li>
            <li>・新機能の優先利用</li>
          </ul>
          <UpgradeButton enabled={stripeReady && usage.plan !== "pro"} isPro={usage.plan === "pro"} />
        </Card>
      </div>

      <Card className="mb-5">
        <SectionTitle>アカウント</SectionTitle>
        <div className="mb-3 text-sm text-muted">{user.email}</div>
        <div className="flex flex-wrap gap-2">
          <SignOutButton />
          {user.isAdmin && (
            <Link href="/admin" className="rounded-xl border border-gold/40 px-4 py-2 text-sm font-semibold text-gold-soft">
              管理者ダッシュボード
            </Link>
          )}
        </div>
      </Card>

      <Card className="mb-5">
        <SectionTitle>データの管理</SectionTitle>
        <DangerZone />
      </Card>

      <div className="flex justify-center gap-5 text-xs text-muted">
        <Link href="/terms">利用規約</Link>
        <Link href="/privacy">プライバシーポリシー</Link>
      </div>
    </AppShell>
  );
}
