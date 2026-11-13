import { redirect } from "next/navigation";
import { requireCompanyPage } from "@/lib/server/page";
import { templateFor } from "@/lib/game/employees";
import { getUsageSummary } from "@/lib/server/usage";
import { AppShell } from "@/components/game/AppShell";
import { ChatRoom } from "./ChatRoom";

export const metadata = { title: "AI社員と話す" };
export const dynamic = "force-dynamic";

export default async function EmployeeChatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ prompt?: string }> }) {
  const { id } = await params;
  const { prompt } = await searchParams;
  const { store, company } = await requireCompanyPage();
  const employees = await store.listEmployees();
  const emp = employees.find((e) => e.id === id);
  if (!emp) redirect("/employees");
  const conv = (await store.listConversations("chat", 50)).find((c) => c.employeeId === emp.id);
  const messages = conv ? await store.listMessages(conv.id, 60) : [];
  const usage = await getUsageSummary(store);
  const t = templateFor(emp.templateId);

  return (
    <AppShell company={company}>
      <ChatRoom
        employee={{ id: emp.id, role: emp.templateId, name: emp.name, title: t.title, personality: t.personality, capabilities: t.capabilities }}
        conversationId={conv?.id ?? null}
        initialMessages={messages}
        initialPrompt={typeof prompt === "string" ? prompt.slice(0, 500) : ""}
        remaining={Math.max(0, usage.chatDailyLimit - usage.chatToday)}
        presidentName={company.presidentName}
      />
    </AppShell>
  );
}
