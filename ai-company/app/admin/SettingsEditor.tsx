"use client";
import { useState } from "react";
import type { AppSettings, PlanLimits } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { api } from "@/lib/client";

const FIELDS: [keyof PlanLimits, string][] = [
  ["chatDaily", "AI相談/日"],
  ["chatMonthly", "AI相談/月"],
  ["meetingDaily", "社内会議/日"],
  ["onboardingDaily", "面談AI呼出/日"],
  ["maxEmployees", "最大社員数"],
  ["perMinute", "AI呼出/分"],
];

export function SettingsEditor({ initial }: { initial: AppSettings }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const setLimit = (plan: "free" | "pro", k: keyof PlanLimits, v: string) =>
    setS((x) => ({ ...x, plans: { ...x.plans, [plan]: { ...x.plans[plan], [k]: Number(v) || 0 } } }));

  async function save() {
    try {
      await api("/api/admin/settings", { method: "PUT", body: s });
      setMsg({ tone: "info", text: "保存しました" });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        {(["free", "pro"] as const).map((plan) => (
          <div key={plan}>
            <div className="mb-2 font-bold uppercase">{plan}</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map(([k, label]) => (
                <div key={k}>
                  <Label>{label}</Label>
                  <Input type="number" min={0} aria-label={`${plan} ${label}`} value={s.plans[plan][k]} onChange={(e) => setLimit(plan, k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
        <div>
          <Label>PRO価格（円/月）</Label>
          <Input type="number" min={0} value={s.proPriceJpy} onChange={(e) => setS({ ...s, proPriceJpy: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>異常検知（回/時）</Label>
          <Input type="number" min={1} value={s.abuseHourlyThreshold} onChange={(e) => setS({ ...s, abuseHourlyThreshold: Number(e.target.value) || 1 })} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">※ ここでの価格は表示用です。実際の請求額は Stripe の Price 設定に従います。</p>
      {msg && (
        <div className="mt-3">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
      <Button className="mt-4" variant="gold" onClick={save}>
        保存
      </Button>
    </div>
  );
}
