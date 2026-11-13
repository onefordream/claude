import { requireCompanyPage } from "@/lib/server/page";
import { getUsageSummary } from "@/lib/server/usage";
import { AppShell } from "@/components/game/AppShell";
import { MeetingRoom, type PastMeeting } from "./MeetingRoom";

export const metadata = { title: "AI社内会議" };
export const dynamic = "force-dynamic";

export default async function MeetingPage() {
  const { store, company } = await requireCompanyPage();
  const [employees, usage, convs] = await Promise.all([store.listEmployees(), getUsageSummary(store), store.listConversations("meeting", 5)]);
  const past: PastMeeting[] = await Promise.all(
    convs.map(async (c) => {
      const msgs = await store.listMessages(c.id, 10);
      const summary = msgs.find((m) => m.metadata?.type === "summary");
      return { id: c.id, topic: c.title, createdAt: c.createdAt, summary: summary?.content ?? "" };
    }),
  );
  return (
    <AppShell company={company}>
      <MeetingRoom
        employees={employees.map((e) => ({ id: e.id, role: e.templateId, name: e.name }))}
        remaining={Math.max(0, usage.meetingDailyLimit - usage.meetingToday)}
        dailyLimit={usage.meetingDailyLimit}
        plan={usage.plan}
        past={past}
      />
    </AppShell>
  );
}
