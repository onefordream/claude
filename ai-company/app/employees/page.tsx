import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { requireCompanyPage } from "@/lib/server/page";
import { CAPABILITIES, EMPLOYEE_TEMPLATES } from "@/lib/game/employees";
import { AppShell } from "@/components/game/AppShell";
import { Avatar } from "@/components/game/Avatar";
import { Card, Pill, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "AI社員" };
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const { store, company } = await requireCompanyPage();
  const employees = await store.listEmployees();
  const hired = new Map(employees.map((e) => [e.templateId, e]));

  return (
    <AppShell company={company} wide>
      <h1 className="mb-1 text-2xl font-black">AI社員</h1>
      <p className="mb-5 text-sm text-muted">社員をタップすると、役割に合った相談や業務依頼ができます。</p>

      <SectionTitle>在籍中の社員（{employees.length}名）</SectionTitle>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {employees.map((e) => {
          const t = EMPLOYEE_TEMPLATES.find((x) => x.id === e.templateId)!;
          return (
            <Link key={e.id} href={`/employees/${e.id}`} className="panel group block p-4 transition hover:border-gold/40">
              <div className="flex items-center gap-3 sm:flex-col sm:text-center">
                <Avatar role={t.role} size={88} className="shrink-0 transition group-hover:scale-105" />
                <div className="min-w-0">
                  <div className="text-lg font-black">{e.name}</div>
                  <div className="text-xs font-bold text-gold">{t.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t.personality}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 sm:justify-center">
                {t.strengths.map((s) => (
                  <Pill key={s} tone="sky">
                    {s}
                  </Pill>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-sky/10 py-2 text-sm font-bold text-sky-soft">
                <MessageCircle size={16} /> 話しかける
              </div>
            </Link>
          );
        })}
      </div>

      <SectionTitle>人材採用センター</SectionTitle>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        社員カードの一覧です。追加採用はPROプランで順次公開予定です（採用前の無料面接機能も準備中）。
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {EMPLOYEE_TEMPLATES.map((t) => {
          const isHired = hired.has(t.id);
          return (
            <Card key={t.id} className="relative flex flex-col p-3">
              <div className="absolute right-2 top-2">
                {isHired ? <Pill tone="success">雇用中</Pill> : t.isAvailable ? <Pill tone="gold">採用可能</Pill> : <Pill tone="muted">近日公開</Pill>}
              </div>
              <Avatar role={t.role} size={72} locked={!isHired && !t.isAvailable} className="mx-auto mt-3" />
              <div className="mt-2 text-center">
                <div className="font-bold">{t.defaultName}</div>
                <div className="text-[11px] font-bold text-gold">{t.title}</div>
              </div>
              <dl className="mt-2 space-y-1 text-[11px] leading-snug text-muted">
                <div>
                  <dt className="inline text-text">性格：</dt>
                  <dd className="inline">{t.personality}</dd>
                </div>
                <div>
                  <dt className="inline text-text">得意：</dt>
                  <dd className="inline">{t.strengths.join("・")}</dd>
                </div>
                {t.capabilities.length > 0 && (
                  <div>
                    <dt className="inline text-text">機能：</dt>
                    <dd className="inline">{t.capabilities.map((c) => CAPABILITIES[c]?.label).join("・")}</dd>
                  </div>
                )}
              </dl>
              {!isHired && (
                <div className="mt-auto flex items-center justify-center gap-1 pt-3 text-[11px] font-bold text-muted">
                  <Lock size={12} /> {t.isPro ? "PRO・準備中" : "準備中"}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
