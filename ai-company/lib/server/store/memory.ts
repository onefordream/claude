import "server-only";
import { randomUUID } from "node:crypto";
import type {
  ActivityLog,
  AppSettings,
  Artifact,
  Company,
  CompanyEmployee,
  Conversation,
  Goal,
  Message,
  Mission,
  OnboardingState,
  Plan,
} from "@/lib/types";
import { levelForXp } from "@/lib/game/levels";
import { nextStreak } from "@/lib/game/dates";
import { computeStats, mergeSettings, type UsageRow } from "./supabase";
import type { AdminStore, CompanyPatch, NewCompanyInput, UserStore, UsageFeature } from "./types";

/**
 * ローカル開発専用のメモリ実装（DEV_LOCAL_MODE=1）。サーバー再起動でデータは消える。
 * Supabase 実装と同じ「ユーザー単位の分離」「XPはサーバーのみ更新」を守る。
 */

interface DB {
  users: Map<string, { id: string; email: string; displayName: string; plan: Plan }>;
  onboarding: Map<string, OnboardingState>; // userId -> state
  companies: Map<string, Company & { memorySummary: string }>; // companyId
  employees: CompanyEmployee[];
  goals: Goal[];
  conversations: (Conversation & { summarizedCount: number })[];
  messages: Message[];
  missions: Mission[];
  completions: { missionId: string; companyId: string; deliverable: string; artifactId: string | null; xp: number }[];
  artifacts: Artifact[];
  activity: ActivityLog[];
  usage: (UsageRow & { id: string })[];
  settings: AppSettings | null;
}

const g = globalThis as unknown as { __aiCompanyMemDb?: DB };
function db(): DB {
  if (!g.__aiCompanyMemDb) {
    g.__aiCompanyMemDb = {
      users: new Map(),
      onboarding: new Map(),
      companies: new Map(),
      employees: [],
      goals: [],
      conversations: [],
      messages: [],
      missions: [],
      completions: [],
      artifacts: [],
      activity: [],
      usage: [],
      settings: null,
    };
  }
  return g.__aiCompanyMemDb;
}

const now = () => new Date().toISOString();
const clone = <T,>(v: T): T => structuredClone(v);

export function memEnsureUser(id: string, email: string, displayName: string) {
  const d = db();
  if (!d.users.has(id)) d.users.set(id, { id, email, displayName, plan: "free" });
}

export class MemoryUserStore implements UserStore {
  constructor(readonly userId: string) {}

  private company() {
    for (const c of db().companies.values()) if (c.ownerId === this.userId) return c;
    return null;
  }
  private cid() {
    const c = this.company();
    if (!c) throw new Error("company_not_found");
    return c.id;
  }

  async getPlan() {
    return db().users.get(this.userId)?.plan ?? "free";
  }
  async getDisplayName() {
    return db().users.get(this.userId)?.displayName ?? "";
  }

  async getOnboarding() {
    const s = db().onboarding.get(this.userId);
    return s ? clone(s) : null;
  }
  async saveOnboarding(state: OnboardingState) {
    const s = { ...clone(state), id: state.id || randomUUID() };
    db().onboarding.set(this.userId, s);
    return clone(s);
  }

  async getCompany() {
    const c = this.company();
    if (!c) return null;
    const { memorySummary: _m, ...rest } = c;
    void _m;
    return clone(rest);
  }
  async getMemorySummary() {
    return this.company()?.memorySummary ?? "";
  }
  async setMemorySummary(s: string) {
    const c = this.company();
    if (c) c.memorySummary = s.slice(0, 4000);
  }

  async createCompany(input: NewCompanyInput) {
    if (this.company()) throw new Error("company_exists");
    const id = randomUUID();
    const t = now();
    const c: Company & { memorySummary: string } = {
      id,
      ownerId: this.userId,
      name: input.name,
      presidentName: input.presidentName,
      tagline: input.tagline,
      concept: input.concept,
      philosophy: input.philosophy,
      vision: input.vision,
      mainBusiness: input.mainBusiness,
      businessMode: input.businessMode,
      actionPlan: input.actionPlan,
      logo: input.logo,
      level: 1,
      xp: 0,
      streakDays: 0,
      lastCheckinDate: null,
      createdAt: t,
      updatedAt: t,
      memorySummary: "",
    };
    const d = db();
    d.companies.set(id, c);
    for (const e of input.employees)
      d.employees.push({ id: randomUUID(), companyId: id, templateId: e.templateId as CompanyEmployee["templateId"], name: e.name, status: "active", hiredAt: t });
    for (const goal of input.goals) d.goals.push({ id: randomUUID(), companyId: id, ...goal, status: "active", createdAt: t });
    await this.insertMissions(input.missions);
    await this.logActivity("founded", `${input.name} 設立`);
    const u = d.users.get(this.userId);
    if (u && input.presidentName) u.displayName = input.presidentName;
    return (await this.getCompany())!;
  }

  async updateCompany(patch: CompanyPatch) {
    const c = this.company();
    if (!c) throw new Error("company_not_found");
    Object.assign(c, patch, { updatedAt: now() });
    return (await this.getCompany())!;
  }

  async checkIn(today: string) {
    const c = this.company();
    if (!c) return { streak: 0, newDay: false };
    const r = nextStreak(c.lastCheckinDate, today, c.streakDays);
    if (r.isNewDay) {
      c.streakDays = r.streak;
      c.lastCheckinDate = today;
    }
    return { streak: c.streakDays, newDay: r.isNewDay };
  }

  async listEmployees() {
    const cid = this.cid();
    return clone(db().employees.filter((e) => e.companyId === cid));
  }
  async listGoals() {
    const cid = this.cid();
    return clone(db().goals.filter((x) => x.companyId === cid));
  }

  async getOrCreateConversation(employeeId: string | null, kind: "chat" | "meeting", title: string) {
    const cid = this.cid();
    const found = db()
      .conversations.filter((c) => c.companyId === cid && c.kind === kind && c.employeeId === employeeId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (found) return clone(found);
    return this.createConversation(employeeId, kind, title);
  }
  async createConversation(employeeId: string | null, kind: "chat" | "meeting", title: string) {
    const cid = this.cid();
    if (employeeId && !db().employees.some((e) => e.id === employeeId && e.companyId === cid)) throw new Error("employee_not_found");
    const c = { id: randomUUID(), companyId: cid, employeeId, kind, title, summary: "", summarizedCount: 0, createdAt: now(), updatedAt: now() };
    db().conversations.push(c);
    return clone(c);
  }
  private conv(id: string) {
    const c = this.company();
    return c ? db().conversations.find((x) => x.id === id && x.companyId === c.id) ?? null : null;
  }
  async getConversation(id: string) {
    const c = this.conv(id);
    return c ? clone(c) : null;
  }
  async listConversations(kind: "chat" | "meeting", limit: number) {
    const cid = this.cid();
    return clone(
      db()
        .conversations.filter((c) => c.companyId === cid && c.kind === kind)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, limit),
    );
  }
  async listMessages(conversationId: string, limit: number) {
    if (!this.conv(conversationId)) return [];
    const ms = db().messages.filter((m) => m.conversationId === conversationId);
    return clone(ms.slice(-limit));
  }
  async countMessages(conversationId: string) {
    if (!this.conv(conversationId)) return 0;
    return db().messages.filter((m) => m.conversationId === conversationId).length;
  }
  async addMessage(m: Omit<Message, "id" | "createdAt">) {
    const c = this.conv(m.conversationId);
    if (!c) throw new Error("conversation_not_found");
    const msg = { ...m, id: randomUUID(), createdAt: now() };
    db().messages.push(msg);
    c.updatedAt = now();
    return clone(msg);
  }
  async updateConversationSummary(id: string, summary: string, n: number) {
    const c = this.conv(id);
    if (c) {
      c.summary = summary;
      c.summarizedCount = n;
    }
  }
  async getConversationSummarizedCount(id: string) {
    return this.conv(id)?.summarizedCount ?? 0;
  }
  async deleteAllConversations() {
    const cid = this.cid();
    const d = db();
    const ids = new Set(d.conversations.filter((c) => c.companyId === cid).map((c) => c.id));
    d.conversations = d.conversations.filter((c) => !ids.has(c.id));
    d.messages = d.messages.filter((m) => !ids.has(m.conversationId));
  }

  async listMissions(opts: { date?: string; limit?: number }) {
    const cid = this.cid();
    return clone(
      db()
        .missions.filter((m) => m.companyId === cid && (!opts.date || m.missionDate === opts.date))
        .sort((a, b) => b.missionDate.localeCompare(a.missionDate) || a.createdAt.localeCompare(b.createdAt))
        .slice(0, opts.limit ?? 50),
    );
  }
  async insertMissions(ms: Parameters<UserStore["insertMissions"]>[0]) {
    const cid = this.cid();
    const created = ms.map((m) => ({ ...m, id: randomUUID(), companyId: cid, status: "open" as const, completedAt: null, createdAt: now() }));
    db().missions.push(...created);
    return clone(created);
  }
  async completeMission(missionId: string, deliverable: string, artifactId: string | null) {
    const c = this.company();
    const m = db().missions.find((x) => x.id === missionId);
    if (!c || !m || m.companyId !== c.id) return { ok: false, error: "not_found" as const };
    if (m.status === "completed") return { ok: false, error: "already_completed" as const };
    if (artifactId && !db().artifacts.some((a) => a.id === artifactId && a.companyId === c.id))
      return { ok: false, error: "invalid_artifact" as const };
    m.status = "completed";
    m.completedAt = now();
    db().completions.push({ missionId, companyId: c.id, deliverable, artifactId, xp: m.xpReward });
    const prev = c.level;
    c.xp += m.xpReward;
    c.level = levelForXp(c.xp);
    await this.logActivity("mission_completed", m.title, { xp: m.xpReward, mission_id: m.id });
    if (c.level > prev) await this.logActivity("level_up", `Lv.${c.level} に到達`, { level: c.level });
    return { ok: true, xp: c.xp, level: c.level, leveledUp: c.level > prev, xpAwarded: m.xpReward };
  }
  async countCompletedMissions() {
    const cid = this.cid();
    return db().completions.filter((x) => x.companyId === cid).length;
  }

  async listArtifacts(limit: number) {
    const cid = this.cid();
    return clone(db().artifacts.filter((a) => a.companyId === cid).reverse().slice(0, limit));
  }
  async getArtifact(id: string) {
    const c = this.company();
    const a = c ? db().artifacts.find((x) => x.id === id && x.companyId === c.id) : null;
    return a ? clone(a) : null;
  }
  async createArtifact(a: Parameters<UserStore["createArtifact"]>[0]) {
    const cid = this.cid();
    const art: Artifact = {
      id: randomUUID(),
      companyId: cid,
      employeeId: a.employeeId,
      type: a.type,
      title: a.title.slice(0, 200),
      content: a.content.slice(0, 30000),
      createdAt: now(),
    };
    db().artifacts.push(art);
    return clone(art);
  }

  async listActivity(limit: number, types?: ActivityLog["type"][]) {
    const cid = this.cid();
    return clone(
      db()
        .activity.filter((a) => a.companyId === cid && (!types?.length || types.includes(a.type)))
        .reverse()
        .slice(0, limit),
    );
  }
  async logActivity(type: ActivityLog["type"], title: string, detail: Record<string, unknown> = {}) {
    const cid = this.cid();
    db().activity.push({ id: randomUUID(), companyId: cid, type, title, detail, createdAt: now() });
  }

  async reserveUsage(
    feature: UsageFeature,
    countFeatures: UsageFeature[],
    limits: { daily: number; monthly: number; perMinute: number },
    period: { dayStart: string; monthStart: string },
    budget: number,
  ) {
    const d = db();
    const live = (r: UsageRow) => r.status === "ok" || r.status === "reserved";
    const spent = d.usage.filter((r) => r.createdAt >= period.dayStart && r.status === "ok").reduce((a, r) => a + r.costUsd, 0);
    if (spent >= budget) return { ok: false, reason: "global_budget" as const };
    const mine = d.usage.filter((r) => r.userId === this.userId && live(r));
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    if (mine.filter((r) => r.createdAt >= minuteAgo).length >= limits.perMinute) return { ok: false, reason: "rate_limited" as const };
    const f = mine.filter((r) => countFeatures.includes(r.feature as UsageFeature));
    const deny = (reason: "daily_limit" | "monthly_limit") => {
      d.usage.push(row(this.userId, feature, "denied"));
      return { ok: false, reason };
    };
    if (f.filter((r) => r.createdAt >= period.dayStart).length >= limits.daily) return deny("daily_limit");
    if (f.filter((r) => r.createdAt >= period.monthStart).length >= limits.monthly) return deny("monthly_limit");
    const r = row(this.userId, feature, "reserved");
    d.usage.push(r);
    return { ok: true, id: r.id };
  }
  async finalizeUsage(id: string, data: Parameters<UserStore["finalizeUsage"]>[1]) {
    const r = db().usage.find((u) => u.id === id && u.userId === this.userId);
    if (r)
      Object.assign(r, {
        status: data.status,
        costUsd: data.costUsd,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        error: data.error ?? null,
      });
  }
  async countUsage(features: UsageFeature[], since: string) {
    return db().usage.filter(
      (r) => r.userId === this.userId && features.includes(r.feature as UsageFeature) && (r.status === "ok" || r.status === "reserved") && r.createdAt >= since,
    ).length;
  }

  async deleteAccount() {
    const d = db();
    const c = this.company();
    if (c) {
      const cid = c.id;
      d.companies.delete(cid);
      const convIds = new Set(d.conversations.filter((x) => x.companyId === cid).map((x) => x.id));
      d.employees = d.employees.filter((x) => x.companyId !== cid);
      d.goals = d.goals.filter((x) => x.companyId !== cid);
      d.conversations = d.conversations.filter((x) => x.companyId !== cid);
      d.messages = d.messages.filter((x) => !convIds.has(x.conversationId));
      d.missions = d.missions.filter((x) => x.companyId !== cid);
      d.completions = d.completions.filter((x) => x.companyId !== cid);
      d.artifacts = d.artifacts.filter((x) => x.companyId !== cid);
      d.activity = d.activity.filter((x) => x.companyId !== cid);
    }
    d.onboarding.delete(this.userId);
    d.usage.forEach((u) => {
      if (u.userId === this.userId) u.userId = null;
    });
    d.users.delete(this.userId);
  }
}

function row(userId: string, feature: string, status: string): UsageRow & { id: string } {
  return { id: randomUUID(), userId, feature, status, costUsd: 0, inputTokens: 0, outputTokens: 0, createdAt: now(), error: null };
}

export class MemoryAdminStore implements AdminStore {
  async getSettings() {
    return mergeSettings(db().settings);
  }
  async updateSettings(s: AppSettings) {
    db().settings = s;
  }
  async stats(period: { dayStart: string; monthStart: string }, threshold: number) {
    const d = db();
    return computeStats(
      d.usage.filter((r) => r.createdAt >= period.monthStart),
      { users: d.users.size, companies: d.companies.size },
      period,
      threshold,
      (id) => d.users.get(id)?.email ?? null,
    );
  }
}
