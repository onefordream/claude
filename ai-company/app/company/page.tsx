import { requireCompanyPage } from "@/lib/server/page";
import { serverConfig } from "@/lib/config";
import { computeBadges } from "@/lib/game/badges";
import { levelTitle } from "@/lib/game/levels";
import { AppShell } from "@/components/game/AppShell";
import { CompanyLogo } from "@/components/game/CompanyLogo";
import { Card, Pill, SectionTitle } from "@/components/ui/misc";
import { ProfileEditor, ArtifactList, ShareButton } from "./CompanyClient";

export const metadata = { title: "会社プロフィール" };
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const { store, company } = await requireCompanyPage();
  const [goals, artifacts, activity, completed, meetings, decisions] = await Promise.all([
    store.listGoals(),
    store.listArtifacts(50),
    store.listActivity(40),
    store.countCompletedMissions(),
    store.listConversations("meeting", 50),
    store.listActivity(10, ["decision"]),
  ]);
  const badges = computeBadges({ level: company.level, streak: company.streakDays, completedMissions: completed, artifacts: artifacts.length, meetings: meetings.length });
  const earned = badges.filter((b) => b.earned);
  const fmt = (d: string) => new Date(d).toLocaleDateString("ja-JP", { timeZone: serverConfig.timezone });

  return (
    <AppShell company={company} wide>
      <Card gold className="mb-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <CompanyLogo logo={company.logo} size={96} />
        <div className="flex-1">
          <div className="text-2xl font-black">{company.name}</div>
          <div className="text-sm text-gold-soft">{company.tagline}</div>
          <div className="mt-1 text-xs text-muted">
            代表 {company.presidentName || "社長"} ・ 設立 {fmt(company.createdAt)} ・ Lv.{company.level}「{levelTitle(company.level)}」
          </div>
        </div>
        <ShareButton text={`私の会社「${company.name}」はLv.${company.level}「${levelTitle(company.level)}」に成長しました！実績バッジ${earned.length}個獲得 #AICOMPANY`} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <SectionTitle>会社プロフィール</SectionTitle>
            <ProfileEditor company={company} />
          </Card>
          <Card>
            <SectionTitle>目標</SectionTitle>
            <ul className="space-y-2">
              {goals.map((g) => (
                <li key={g.id} className="rounded-xl border border-line bg-navy-950/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 font-bold">
                    {g.title}
                    {g.horizon && <Pill tone="sky">{g.horizon}</Pill>}
                  </div>
                  {g.description && <div className="mt-1 text-xs text-muted">{g.description}</div>}
                </li>
              ))}
            </ul>
            {decisions.length > 0 && (
              <>
                <div className="mb-2 mt-5 text-xs font-bold text-muted">重要な決定事項</div>
                <ul className="space-y-1.5 text-sm">
                  {decisions.map((d) => (
                    <li key={d.id} className="flex gap-2">
                      <span>📌</span>
                      <span className="flex-1">{d.title}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle>実績バッジ（{earned.length}/{badges.length}）</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {badges.map((b) => (
                <div key={b.id} className={`rounded-xl border p-2.5 text-center ${b.earned ? "border-gold/40 bg-gold/[0.07]" : "border-line opacity-40"}`}>
                  <div className="text-2xl">{b.earned ? "🏅" : "🔒"}</div>
                  <div className="mt-1 text-[11px] font-bold leading-tight">{b.title}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-muted">{b.description}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>成果物（{artifacts.length}）</SectionTitle>
            <ArtifactList artifacts={artifacts.map((a) => ({ id: a.id, title: a.title, content: a.content, type: a.type, createdAt: a.createdAt }))} />
          </Card>
          <Card id="history">
            <SectionTitle>成長記録</SectionTitle>
            <ol className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-20 shrink-0 text-[11px] text-muted">{fmt(a.createdAt)}</span>
                  <span className="flex-1">{a.title}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
