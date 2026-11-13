import { requireCompanyPage } from "@/lib/server/page";
import { serverConfig } from "@/lib/config";
import { dateInTz } from "@/lib/game/dates";
import { AppShell } from "@/components/game/AppShell";
import { MissionRow, TodayMissions } from "@/components/game/Missions";
import { Card, SectionTitle } from "@/components/ui/misc";
import type { Mission } from "@/lib/types";

export const metadata = { title: "ミッション" };
export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const { store, company } = await requireCompanyPage();
  const today = dateInTz(serverConfig.timezone);
  const [employees, todays, history, artifacts] = await Promise.all([
    store.listEmployees(),
    store.listMissions({ date: today }),
    store.listMissions({ limit: 60 }),
    store.listArtifacts(20),
  ]);
  const mini = employees.map((e) => ({ id: e.id, role: e.templateId, name: e.name }));
  const past = history.filter((m) => m.missionDate !== today);
  const byDate = past.reduce<Record<string, Mission[]>>((acc, m) => ((acc[m.missionDate] ??= []).push(m), acc), {});

  return (
    <AppShell company={company}>
      <h1 className="mb-1 text-2xl font-black">ミッション</h1>
      <p className="mb-5 text-sm text-muted">毎日3つのミッションに取り組み、成果物を残して経験値を獲得しましょう。</p>
      <Card gold className="mb-6">
        <SectionTitle>今日のミッション（{today}）</SectionTitle>
        <TodayMissions employees={mini} artifacts={artifacts.map((a) => ({ id: a.id, title: a.title }))} initial={todays} />
      </Card>
      <SectionTitle>これまでのミッション</SectionTitle>
      {Object.keys(byDate).length === 0 ? (
        <p className="text-sm text-muted">まだ履歴はありません。明日も出社して続けましょう。</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, ms]) => (
            <div key={date}>
              <div className="mb-2 text-xs font-bold text-muted">
                {date}（{ms.filter((m) => m.status === "completed").length}/{ms.length} 完了）
              </div>
              <ul className="space-y-2">
                {ms.map((m) => (
                  <MissionRow key={m.id} m={m} employee={mini.find((e) => e.role === m.employeeRole)} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 text-[11px] text-muted">※ 過去のミッションは記録として残り、あとから完了扱いにはできません。会社レベルはゲーム内の進捗であり、現実の売上・成果とは区別されます。</p>
    </AppShell>
  );
}
