import { beforeAll, describe, expect, it } from "vitest";

// サーバー側の利用上限（メモリ実装 + モックAI）。DB 実装は scripts/test-rls.sh で検証。
process.env.AI_PROVIDER = "mock";
process.env.OPENAI_API_KEY = "";

type Mods = {
  ai: typeof import("@/lib/server/ai");
  mem: typeof import("@/lib/server/store/memory");
  auth: typeof import("@/lib/server/auth");
};
let m: Mods;

beforeAll(async () => {
  m = {
    ai: await import("@/lib/server/ai"),
    mem: await import("@/lib/server/store/memory"),
    auth: await import("@/lib/server/auth"),
  };
});

async function makeUser(id: string) {
  m.mem.memEnsureUser(id, `${id}@example.com`, "");
  const store = new m.mem.MemoryUserStore(id);
  return store;
}

const req = { task: "chat" as const, system: "s", messages: [{ role: "user" as const, content: "hi" }], maxTokens: 50 };

describe("AI quota", () => {
  it("blocks after the daily limit without calling the provider", async () => {
    const admin = m.auth.getAdminStore();
    const s = await admin.getSettings();
    await admin.updateSettings({ ...s, plans: { ...s.plans, free: { ...s.plans.free, chatDaily: 2, perMinute: 100 } } });
    const store = await makeUser("00000000-0000-4000-8000-000000000001");
    await m.ai.runAI(store, "chat", req);
    await m.ai.runAI(store, "task", { ...req, task: "task" }); // chat と task は同じ枠
    await expect(m.ai.runAI(store, "chat", req)).rejects.toMatchObject({ code: "daily_limit", status: 429 });
    // 会議は別枠
    await expect(m.ai.runAI(store, "meeting", { ...req, task: "meeting" })).resolves.toBeTruthy();
    // 別ユーザーには影響しない
    const other = await makeUser("00000000-0000-4000-8000-000000000002");
    await expect(m.ai.runAI(other, "chat", req)).resolves.toBeTruthy();
  });

  it("enforces the per-minute rate limit", async () => {
    const admin = m.auth.getAdminStore();
    const s = await admin.getSettings();
    await admin.updateSettings({ ...s, plans: { ...s.plans, free: { ...s.plans.free, chatDaily: 100, perMinute: 2 } } });
    const store = await makeUser("00000000-0000-4000-8000-000000000003");
    await m.ai.runAI(store, "chat", req);
    await m.ai.runAI(store, "chat", req);
    await expect(m.ai.runAI(store, "chat", req)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("records token usage and estimated cost", async () => {
    const admin = m.auth.getAdminStore();
    const s = await admin.getSettings();
    await admin.updateSettings({ ...s, plans: { ...s.plans, free: { ...s.plans.free, chatDaily: 100, perMinute: 100 } } });
    const store = await makeUser("00000000-0000-4000-8000-000000000004");
    await m.ai.runAI(store, "chat", req);
    const stats = await admin.stats({ dayStart: new Date(Date.now() - 3600_000).toISOString(), monthStart: new Date(0).toISOString() }, 1000);
    expect(stats.today.calls).toBeGreaterThan(0);
    expect(stats.today.inputTokens).toBeGreaterThan(0);
    expect(stats.today.costUsd).toBeGreaterThan(0);
    expect(stats.today.denied).toBeGreaterThan(0); // 先のテストの拒否が記録されている
  });

  it("estimates cost from token prices", () => {
    expect(m.ai.estimateCostUsd(1_000_000, 0)).toBeCloseTo(0.4);
    expect(m.ai.estimateCostUsd(0, 1_000_000)).toBeCloseTo(1.6);
  });
});

describe("mission completion rules (memory store)", () => {
  it("awards XP once and only to the owner", async () => {
    const a = await makeUser("00000000-0000-4000-8000-0000000000a1");
    const b = await makeUser("00000000-0000-4000-8000-0000000000b1");
    const base = {
      name: "A社",
      presidentName: "",
      tagline: "",
      concept: "",
      philosophy: "",
      vision: "",
      mainBusiness: "",
      businessMode: "new" as const,
      actionPlan: [],
      logo: { initials: "A", primary: "#ffffff", secondary: "#000000", shape: "hex" as const, icon: "star" as const },
      goals: [],
      employees: [],
      missions: [{ missionDate: "2026-11-13", kind: "daily" as const, title: "m", description: "", employeeRole: "planner" as const, xpReward: 50, deliverableHint: "" }],
    };
    await a.createCompany(base);
    await b.createCompany({ ...base, name: "B社" });
    const [mission] = await a.listMissions({});
    expect((await b.completeMission(mission.id, "横取り", null)).ok).toBe(false);
    const r = await a.completeMission(mission.id, "競合3社を調べた", null);
    expect(r).toMatchObject({ ok: true, xp: 50, level: 1 });
    expect((await a.completeMission(mission.id, "again", null)).error).toBe("already_completed");
    expect((await a.getCompany())!.xp).toBe(50);
    expect((await b.getCompany())!.xp).toBe(0);
  });
});
