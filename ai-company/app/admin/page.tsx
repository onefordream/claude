import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserPage } from "@/lib/server/page";
import { getAdminStore } from "@/lib/server/auth";
import { serverConfig } from "@/lib/config";
import { periodStartsUtc } from "@/lib/game/dates";
import { Card, Notice, SectionTitle } from "@/components/ui/misc";
import { SettingsEditor } from "./SettingsEditor";

export const metadata = { title: "管理者ダッシュボード", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await requireUserPage();
  if (!user.isAdmin) notFound();
  const admin = getAdminStore();
  const settings = await admin.getSettings();
  const s = await admin.stats(periodStartsUtc(serverConfig.timezone), settings.abuseHourlyThreshold);
  const usd = (n: number) => `$${n.toFixed(4)}`;
  const budget = serverConfig.ai.globalDailyBudgetUsd;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">管理者ダッシュボード</h1>
        <Link href="/office" className="text-sm text-muted">
          ← アプリへ
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["ユーザー数", s.users.toLocaleString()],
          ["設立済み会社", s.companies.toLocaleString()],
          ["本日のAI呼び出し", s.today.calls.toLocaleString()],
          ["本日の推定原価", usd(s.today.costUsd)],
          ["今月のAI呼び出し", s.month.calls.toLocaleString()],
          ["今月の推定原価", usd(s.month.costUsd)],
          ["本日の上限拒否", s.today.denied.toLocaleString()],
          ["本日のエラー", s.today.errors.toLocaleString()],
        ].map(([k, v]) => (
          <Card key={k} className="p-4">
            <div className="text-[11px] text-muted">{k}</div>
            <div className="mt-1 font-display text-xl font-bold">{v}</div>
          </Card>
        ))}
      </div>
      <div className="mb-5">
        <Notice tone={s.today.costUsd >= budget * 0.8 ? "warn" : "info"}>
          全体の1日予算 {usd(budget)}（AI_GLOBAL_DAILY_BUDGET_USD）に対して本日 {((s.today.costUsd / budget) * 100).toFixed(1)}% 使用。予算到達時はAI機能が自動停止します。
          モデル: {serverConfig.ai.model}（{serverConfig.ai.provider}）／トークン 入力 {s.today.inputTokens.toLocaleString()}・出力 {s.today.outputTokens.toLocaleString()}
        </Notice>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>機能別（本日）</SectionTitle>
          <table className="w-full text-sm">
            <tbody>
              {s.byFeatureToday.map((f) => (
                <tr key={f.feature} className="border-b border-line">
                  <td className="py-1.5">{f.feature}</td>
                  <td className="text-right">{f.calls}回</td>
                  <td className="text-right text-muted">{usd(f.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <SectionTitle>利用上位ユーザー（本日）</SectionTitle>
          <table className="w-full text-sm">
            <tbody>
              {s.topUsersToday.map((u) => (
                <tr key={u.userId} className="border-b border-line">
                  <td className="max-w-[12rem] truncate py-1.5">{u.email ?? u.userId.slice(0, 8)}</td>
                  <td className="text-right">{u.calls}回</td>
                  <td className="text-right text-muted">{usd(u.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <SectionTitle>異常利用の検知（直近1時間 {settings.abuseHourlyThreshold}回以上）</SectionTitle>
          {s.flagged.length === 0 ? (
            <p className="text-sm text-muted">該当なし</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {s.flagged.map((f) => (
                <li key={f.userId} className="text-danger">
                  {f.email ?? f.userId} — {f.callsLastHour}回/時
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle>最近のエラー</SectionTitle>
          {s.recentErrors.length === 0 ? (
            <p className="text-sm text-muted">なし</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {s.recentErrors.map((e, i) => (
                <li key={i} className="break-all">
                  <span className="text-muted">{new Date(e.createdAt).toLocaleString("ja-JP")}</span> [{e.feature}] {e.error}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <SectionTitle>料金・利用上限の設定</SectionTitle>
        <SettingsEditor initial={settings} />
      </Card>
    </main>
  );
}
