import Link from "next/link";
import { Bell, Flame, Target, TrendingUp, Users } from "lucide-react";
import { requireCompanyPage } from "@/lib/server/page";
import { serverConfig } from "@/lib/config";
import { dateInTz } from "@/lib/game/dates";
import { levelProgress, levelTitle } from "@/lib/game/levels";
import { templateFor } from "@/lib/game/employees";
import { getUsageSummary } from "@/lib/server/usage";
import { AppShell } from "@/components/game/AppShell";
import { Avatar } from "@/components/game/Avatar";
import { CompanyLogo } from "@/components/game/CompanyLogo";
import { TodayMissions } from "@/components/game/Missions";
import { Card, Pill, ProgressBar, SectionTitle } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import type { ActivityLog } from "@/lib/types";

export const metadata = { title: "社長室" };
export const dynamic = "force-dynamic";

function greetingFor(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (h < 11) return "おはようございます";
  if (h < 18) return "お疲れさまです";
  return "こんばんは";
}

const ACTIVITY_ICON: Record<ActivityLog["type"], string> = {
  founded: "🏢",
  mission_completed: "✅",
  level_up: "⭐",
  artifact_created: "📄",
  meeting_held: "🗣️",
  decision: "📌",
  profile_updated: "✏️",
  checkin: "🚪",
};

export default async function OfficePage() {
  const { store } = await requireCompanyPage();
  const today = dateInTz(serverConfig.timezone);
  const checkin = await store.checkIn(today);
  const company = (await store.getCompany())!;
  const [employees, goals, activity, missions, artifacts, completed, usage] = await Promise.all([
    store.listEmployees(),
    store.listGoals(),
    store.listActivity(8),
    store.listMissions({ date: today }),
    store.listArtifacts(20),
    store.countCompletedMissions(),
    getUsageSummary(store),
  ]);
  const lp = levelProgress(company.xp);
  const mini = employees.map((e) => ({ id: e.id, role: e.templateId, name: e.name }));
  const openRoles = new Set(missions.filter((m) => m.status === "open").map((m) => m.employeeRole));
  const president = company.presidentName ? `${company.presidentName}社長` : "社長";

  const notices: string[] = [];
  if (checkin.newDay && checkin.streak > 1) notices.push(`連続出社 ${checkin.streak}日目です。素晴らしい継続力です！`);
  const open = missions.filter((m) => m.status === "open").length;
  if (missions.length && open) notices.push(`今日のミッションが残り${open}件あります。`);
  if (missions.length && !open) notices.push("今日のミッションはすべて完了しました。お疲れさまでした！");
  notices.push(`本日のAI相談：残り${Math.max(0, usage.chatDailyLimit - usage.chatToday)}回（${usage.plan === "pro" ? "PRO" : "無料"}プラン上限 ${usage.chatDailyLimit}回/日）`);
  if (usage.meetingToday < usage.meetingDailyLimit) notices.push("社内会議を開いて、AI社員の意見を聞いてみませんか？");

  return (
    <AppShell company={company} wide>
      {/* 秘書のあいさつ */}
      <section className="mb-5 flex items-end gap-3">
        <div className="relative shrink-0">
          <div className="absolute inset-2 -z-10 rounded-full bg-sky/25 blur-2xl" />
          <Avatar role="secretary" size={92} happy={checkin.newDay} />
        </div>
        <div className="panel panel-gold relative mb-2 flex-1 px-4 py-3 text-sm leading-relaxed">
          <div className="mb-0.5 text-xs font-bold text-gold">ミオ</div>
          {president}、{greetingFor(serverConfig.timezone)}！
          <br />
          今日の会社の目標はこちらです。
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {/* 会社カード */}
          <Card gold className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
            <div className="flex items-center gap-4">
              <CompanyLogo logo={company.logo} size={76} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xl font-black">{company.name}</div>
                <div className="truncate text-xs text-gold-soft">{company.tagline}</div>
                <div className="mt-1 text-xs text-muted">代表 {company.presidentName || "社長"}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-end justify-between">
                <div>
                  <span className="font-display text-2xl font-extrabold text-gold-gradient">Lv.{lp.level}</span>
                  <span className="ml-2 text-sm font-bold">{levelTitle(lp.level)}</span>
                </div>
                <span className="font-display text-xs text-muted">{company.xp} XP</span>
              </div>
              <ProgressBar value={lp.ratio} />
              <div className="mt-1 text-[11px] text-muted">{lp.nextTitle ? `次の「${lp.nextTitle}」まで あと${lp.toNext}XP` : "最高レベルに到達！"}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Users, label: "AI社員", value: `${employees.length}名` },
                { icon: Flame, label: "連続出社", value: `${checkin.streak}日` },
                { icon: Target, label: "達成ミッション", value: `${completed}件` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-line bg-navy-950/50 py-2.5">
                  <Icon size={16} className="mx-auto text-gold" />
                  <div className="mt-1 font-display text-lg font-bold">{value}</div>
                  <div className="text-[10px] text-muted">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 今日のミッション */}
          <Card>
            <SectionTitle action={<Link href="/missions" className="text-xs text-muted hover:text-text">すべて見る</Link>}>今日のミッション</SectionTitle>
            <TodayMissions employees={mini} artifacts={artifacts.map((a) => ({ id: a.id, title: a.title }))} initial={missions} />
          </Card>

          {/* 事業・目標 */}
          <Card>
            <SectionTitle action={<Link href="/company" className="text-xs text-muted hover:text-text">編集</Link>}>現在の事業と目標</SectionTitle>
            <p className="text-sm leading-relaxed">{company.mainBusiness}</p>
            <ul className="mt-3 space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="flex items-start gap-2 text-sm">
                  <TrendingUp size={16} className="mt-0.5 shrink-0 text-sky-soft" />
                  <span className="flex-1">{g.title}</span>
                  {g.horizon && <Pill tone="sky">{g.horizon}</Pill>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          {/* AI社員の稼働状況 */}
          <Card>
            <SectionTitle action={<Link href="/employees" className="text-xs text-muted hover:text-text">社員一覧</Link>}>AI社員の稼働状況</SectionTitle>
            <ul className="space-y-2">
              {employees.map((e) => {
                const t = templateFor(e.templateId);
                const busy = openRoles.has(e.templateId);
                return (
                  <li key={e.id}>
                    <Link href={`/employees/${e.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-navy-950/40 p-2.5 transition hover:border-sky/40">
                      <Avatar role={e.templateId} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          {e.name} <span className="text-xs font-normal text-muted">{t.title}</span>
                        </div>
                        <div className="truncate text-xs text-muted">{t.strengths.join("・")}</div>
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className={busy ? "h-2 w-2 animate-pulse rounded-full bg-gold" : "h-2 w-2 rounded-full bg-success"} />
                        {busy ? "ミッション担当" : "待機中"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/meeting" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3 w-full" })}>
              社内会議を開く
            </Link>
          </Card>

          {/* お知らせ */}
          <Card>
            <SectionTitle>秘書からのお知らせ</SectionTitle>
            <ul className="space-y-2">
              {notices.map((n) => (
                <li key={n} className="flex gap-2 text-sm leading-relaxed">
                  <Bell size={15} className="mt-1 shrink-0 text-gold" />
                  {n}
                </li>
              ))}
            </ul>
          </Card>

          {/* 成長履歴 */}
          <Card>
            <SectionTitle action={<Link href="/company#history" className="text-xs text-muted hover:text-text">すべて</Link>}>会社の成長履歴</SectionTitle>
            <ol className="relative space-y-3 border-l border-line pl-4">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-navy-800 text-[10px]">{ACTIVITY_ICON[a.type] ?? "•"}</span>
                  <div className="line-clamp-2 leading-snug">{a.title}</div>
                  <div className="text-[11px] text-muted">{new Date(a.createdAt).toLocaleString("ja-JP", { timeZone: serverConfig.timezone, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
