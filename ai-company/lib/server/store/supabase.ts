import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import { DEFAULT_SETTINGS } from "@/lib/types";
import { generateLogo, isValidLogo } from "@/lib/game/logo";
import type { AdminStats, AdminStore, CompanyPatch, NewCompanyInput, UserStore } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
// 生成型を使わないため any で受ける（各 map 関数で形を確定させる）
type Client = SupabaseClient<any, any, any>;

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`DB error: ${res.error.message}`);
  return res.data;
}

export const mapCompany = (r: Row): Company => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  presidentName: r.president_name,
  tagline: r.tagline,
  concept: r.concept,
  philosophy: r.philosophy,
  vision: r.vision,
  mainBusiness: r.main_business,
  businessMode: r.business_mode,
  actionPlan: Array.isArray(r.action_plan) ? r.action_plan : [],
  logo: isValidLogo(r.logo) ? r.logo : generateLogo(r.name),
  level: r.level,
  xp: r.xp,
  streakDays: r.streak_days,
  lastCheckinDate: r.last_checkin_date,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const mapEmployee = (r: Row): CompanyEmployee => ({
  id: r.id,
  companyId: r.company_id,
  templateId: r.template_id,
  name: r.name,
  status: r.status,
  hiredAt: r.hired_at,
});
const mapGoal = (r: Row): Goal => ({
  id: r.id,
  companyId: r.company_id,
  title: r.title,
  description: r.description,
  horizon: r.horizon,
  status: r.status,
  createdAt: r.created_at,
});
const mapConversation = (r: Row): Conversation => ({
  id: r.id,
  companyId: r.company_id,
  employeeId: r.employee_id,
  kind: r.kind,
  title: r.title,
  summary: r.summary,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const mapMessage = (r: Row): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role,
  employeeId: r.employee_id,
  content: r.content,
  metadata: r.metadata ?? {},
  createdAt: r.created_at,
});
const mapMission = (r: Row): Mission => ({
  id: r.id,
  companyId: r.company_id,
  missionDate: r.mission_date,
  kind: r.kind,
  title: r.title,
  description: r.description,
  employeeRole: r.employee_role,
  xpReward: r.xp_reward,
  deliverableHint: r.deliverable_hint,
  status: r.status,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});
const mapArtifact = (r: Row): Artifact => ({
  id: r.id,
  companyId: r.company_id,
  employeeId: r.employee_id,
  type: r.type,
  title: r.title,
  content: r.content,
  createdAt: r.created_at,
});
const mapActivity = (r: Row): ActivityLog => ({
  id: r.id,
  companyId: r.company_id,
  type: r.type,
  title: r.title,
  detail: r.detail ?? {},
  createdAt: r.created_at,
});

export class SupabaseUserStore implements UserStore {
  private companyCache: Company | null | undefined;

  constructor(
    readonly userId: string,
    private db: Client, // RLS 適用
    private admin: Client, // service_role（認可済みIDでのみ使用）
  ) {}

  private async companyId(): Promise<string> {
    const c = await this.getCompany();
    if (!c) throw new Error("company_not_found");
    return c.id;
  }

  async getPlan(): Promise<Plan> {
    // 有料判定は Webhook が書き込む subscriptions を正とする
    const sub = must(
      await this.db.from("subscriptions").select("plan,status,current_period_end").eq("user_id", this.userId).maybeSingle(),
    ) as Row | null;
    if (
      sub &&
      sub.plan === "pro" &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
    )
      return "pro";
    return "free";
  }

  async getDisplayName() {
    const p = must(await this.db.from("profiles").select("display_name").eq("id", this.userId).maybeSingle()) as Row | null;
    return p?.display_name ?? "";
  }

  async getOnboarding(): Promise<OnboardingState | null> {
    const r = must(
      await this.db
        .from("onboarding_sessions")
        .select("id,state,status")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as Row | null;
    if (!r) return null;
    return { ...(r.state as OnboardingState), id: r.id, status: r.status };
  }

  async saveOnboarding(state: OnboardingState): Promise<OnboardingState> {
    const { id, ...rest } = state;
    if (id) {
      const existing = await this.getOnboarding();
      if (existing && existing.id === id) {
        must(await this.admin.from("onboarding_sessions").update({ state: rest, status: state.status }).eq("id", id).eq("user_id", this.userId));
        return state;
      }
    }
    const r = must(
      await this.admin.from("onboarding_sessions").insert({ user_id: this.userId, state: rest, status: state.status }).select("id").single(),
    ) as Row;
    return { ...state, id: r.id };
  }

  async getCompany(): Promise<Company | null> {
    if (this.companyCache !== undefined) return this.companyCache;
    const r = must(await this.db.from("companies").select("*").eq("owner_id", this.userId).maybeSingle()) as Row | null;
    this.companyCache = r ? mapCompany(r) : null;
    return this.companyCache;
  }

  async getMemorySummary() {
    const r = must(await this.db.from("companies").select("memory_summary").eq("owner_id", this.userId).maybeSingle()) as Row | null;
    return r?.memory_summary ?? "";
  }

  async setMemorySummary(summary: string) {
    must(await this.admin.from("companies").update({ memory_summary: summary.slice(0, 4000) }).eq("owner_id", this.userId));
  }

  async createCompany(input: NewCompanyInput): Promise<Company> {
    if (await this.getCompany()) throw new Error("company_exists");
    const c = must(
      await this.admin
        .from("companies")
        .insert({
          owner_id: this.userId,
          name: input.name,
          president_name: input.presidentName,
          tagline: input.tagline,
          concept: input.concept,
          philosophy: input.philosophy,
          vision: input.vision,
          main_business: input.mainBusiness,
          business_mode: input.businessMode,
          action_plan: input.actionPlan,
          logo: input.logo,
        })
        .select("*")
        .single(),
    ) as Row;
    const companyId = c.id as string;
    try {
      if (input.employees.length)
        must(await this.admin.from("company_employees").insert(input.employees.map((e) => ({ company_id: companyId, template_id: e.templateId, name: e.name }))));
      if (input.goals.length)
        must(await this.admin.from("company_goals").insert(input.goals.map((g) => ({ company_id: companyId, ...g }))));
      if (input.missions.length) must(await this.admin.from("missions").insert(input.missions.map((m) => missionRow(companyId, m))));
      must(await this.admin.from("company_activity_logs").insert({ company_id: companyId, type: "founded", title: `${input.name} 設立`, detail: {} }));
      if (input.presidentName) await this.admin.from("profiles").update({ display_name: input.presidentName }).eq("id", this.userId);
    } catch (e) {
      // 途中失敗時は作成した会社ごと削除（カスケード）して再試行可能にする
      await this.admin.from("companies").delete().eq("id", companyId);
      throw e;
    }
    this.companyCache = mapCompany(c);
    return this.companyCache;
  }

  async updateCompany(patch: CompanyPatch): Promise<Company> {
    const row: Row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.presidentName !== undefined) row.president_name = patch.presidentName;
    if (patch.tagline !== undefined) row.tagline = patch.tagline;
    if (patch.concept !== undefined) row.concept = patch.concept;
    if (patch.philosophy !== undefined) row.philosophy = patch.philosophy;
    if (patch.vision !== undefined) row.vision = patch.vision;
    if (patch.mainBusiness !== undefined) row.main_business = patch.mainBusiness;
    if (patch.actionPlan !== undefined) row.action_plan = patch.actionPlan;
    if (patch.logo !== undefined) row.logo = patch.logo;
    // 列権限で許可された項目のみ、ユーザー権限で更新（RLS）
    const r = must(await this.db.from("companies").update(row).eq("owner_id", this.userId).select("*").single()) as Row;
    this.companyCache = mapCompany(r);
    return this.companyCache;
  }

  async checkIn(today: string) {
    const r = must(await this.admin.rpc("company_checkin", { p_user_id: this.userId, p_today: today })) as Row;
    if (r?.ok && r.new_day) this.companyCache = undefined;
    return { streak: r?.streak ?? 0, newDay: Boolean(r?.new_day) };
  }

  async listEmployees(): Promise<CompanyEmployee[]> {
    const cid = await this.companyId();
    return (must(await this.db.from("company_employees").select("*").eq("company_id", cid).order("hired_at")) as Row[]).map(mapEmployee);
  }

  async listGoals(): Promise<Goal[]> {
    const cid = await this.companyId();
    return (must(await this.db.from("company_goals").select("*").eq("company_id", cid).order("created_at")) as Row[]).map(mapGoal);
  }

  async getOrCreateConversation(employeeId: string | null, kind: "chat" | "meeting", title: string) {
    const cid = await this.companyId();
    let q = this.db.from("conversations").select("*").eq("company_id", cid).eq("kind", kind);
    q = employeeId ? q.eq("employee_id", employeeId) : q.is("employee_id", null);
    const r = must(await q.order("updated_at", { ascending: false }).limit(1).maybeSingle()) as Row | null;
    if (r) return mapConversation(r);
    return this.createConversation(employeeId, kind, title);
  }

  async createConversation(employeeId: string | null, kind: "chat" | "meeting", title: string) {
    const cid = await this.companyId();
    if (employeeId) {
      const emp = must(await this.db.from("company_employees").select("id").eq("id", employeeId).eq("company_id", cid).maybeSingle());
      if (!emp) throw new Error("employee_not_found");
    }
    const r = must(
      await this.admin.from("conversations").insert({ company_id: cid, employee_id: employeeId, kind, title }).select("*").single(),
    ) as Row;
    return mapConversation(r);
  }

  async getConversation(id: string) {
    const r = must(await this.db.from("conversations").select("*").eq("id", id).maybeSingle()) as Row | null;
    return r ? mapConversation(r) : null;
  }

  async listConversations(kind: "chat" | "meeting", limit: number) {
    const cid = await this.companyId();
    return (
      must(await this.db.from("conversations").select("*").eq("company_id", cid).eq("kind", kind).order("updated_at", { ascending: false }).limit(limit)) as Row[]
    ).map(mapConversation);
  }

  async listMessages(conversationId: string, limit: number) {
    const rows = must(
      await this.db.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(limit),
    ) as Row[];
    return rows.map(mapMessage).reverse();
  }

  async countMessages(conversationId: string) {
    const r = await this.db.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversationId);
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  }

  async addMessage(m: Omit<Message, "id" | "createdAt">) {
    const conv = await this.getConversation(m.conversationId); // RLS で所有確認
    if (!conv) throw new Error("conversation_not_found");
    const r = must(
      await this.admin
        .from("messages")
        .insert({
          conversation_id: conv.id,
          company_id: conv.companyId,
          role: m.role,
          employee_id: m.employeeId,
          content: m.content,
          metadata: m.metadata,
        })
        .select("*")
        .single(),
    ) as Row;
    await this.admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
    return mapMessage(r);
  }

  async updateConversationSummary(id: string, summary: string, summarizedCount: number) {
    const conv = await this.getConversation(id);
    if (!conv) return;
    must(await this.admin.from("conversations").update({ summary: summary.slice(0, 4000), summarized_count: summarizedCount }).eq("id", conv.id));
  }

  async getConversationSummarizedCount(id: string) {
    const r = must(await this.db.from("conversations").select("summarized_count").eq("id", id).maybeSingle()) as Row | null;
    return r?.summarized_count ?? 0;
  }

  async deleteAllConversations() {
    const cid = await this.companyId();
    must(await this.db.from("conversations").delete().eq("company_id", cid));
  }

  async listMissions(opts: { date?: string; limit?: number }) {
    const cid = await this.companyId();
    let q = this.db.from("missions").select("*").eq("company_id", cid);
    if (opts.date) q = q.eq("mission_date", opts.date);
    const rows = must(await q.order("mission_date", { ascending: false }).order("created_at").limit(opts.limit ?? 50)) as Row[];
    return rows.map(mapMission);
  }

  async insertMissions(ms: Parameters<UserStore["insertMissions"]>[0]) {
    const cid = await this.companyId();
    if (!ms.length) return [];
    return (must(await this.admin.from("missions").insert(ms.map((m) => missionRow(cid, m))).select("*")) as Row[]).map(mapMission);
  }

  async completeMission(missionId: string, deliverable: string, artifactId: string | null) {
    const r = must(
      await this.admin.rpc("complete_mission", {
        p_user_id: this.userId,
        p_mission_id: missionId,
        p_deliverable: deliverable,
        p_artifact_id: artifactId,
      }),
    ) as Row;
    this.companyCache = undefined;
    return { ok: r.ok, error: r.error, xp: r.xp, level: r.level, leveledUp: r.leveled_up, xpAwarded: r.xp_awarded };
  }

  async countCompletedMissions() {
    const cid = await this.companyId();
    const r = await this.db.from("mission_completions").select("id", { count: "exact", head: true }).eq("company_id", cid);
    return r.count ?? 0;
  }

  async listArtifacts(limit: number) {
    const cid = await this.companyId();
    return (
      must(await this.db.from("generated_artifacts").select("*").eq("company_id", cid).order("created_at", { ascending: false }).limit(limit)) as Row[]
    ).map(mapArtifact);
  }

  async getArtifact(id: string) {
    const r = must(await this.db.from("generated_artifacts").select("*").eq("id", id).maybeSingle()) as Row | null;
    return r ? mapArtifact(r) : null;
  }

  async createArtifact(a: Parameters<UserStore["createArtifact"]>[0]) {
    const cid = await this.companyId();
    const r = must(
      await this.admin
        .from("generated_artifacts")
        .insert({
          company_id: cid,
          employee_id: a.employeeId,
          conversation_id: a.conversationId ?? null,
          type: a.type,
          title: a.title.slice(0, 200),
          content: a.content.slice(0, 30000),
        })
        .select("*")
        .single(),
    ) as Row;
    return mapArtifact(r);
  }

  async listActivity(limit: number, types?: ActivityLog["type"][]) {
    const cid = await this.companyId();
    let q = this.db.from("company_activity_logs").select("*").eq("company_id", cid);
    if (types?.length) q = q.in("type", types);
    return (must(await q.order("created_at", { ascending: false }).limit(limit)) as Row[]).map(mapActivity);
  }

  async logActivity(type: ActivityLog["type"], title: string, detail: Record<string, unknown> = {}) {
    const cid = await this.companyId();
    must(await this.admin.from("company_activity_logs").insert({ company_id: cid, type, title: title.slice(0, 200), detail }));
  }

  async reserveUsage(
    feature: string,
    countFeatures: string[],
    limits: { daily: number; monthly: number; perMinute: number },
    period: { dayStart: string; monthStart: string },
    globalDailyBudgetUsd: number,
  ) {
    const r = must(
      await this.admin.rpc("reserve_ai_usage", {
        p_user_id: this.userId,
        p_feature: feature,
        p_count_features: countFeatures,
        p_day_start: period.dayStart,
        p_month_start: period.monthStart,
        p_daily_limit: limits.daily,
        p_monthly_limit: limits.monthly,
        p_per_minute: limits.perMinute,
        p_global_daily_budget: globalDailyBudgetUsd,
      }),
    ) as Row;
    return { ok: Boolean(r.ok), id: r.id, reason: r.reason };
  }

  async finalizeUsage(id: string, d: Parameters<UserStore["finalizeUsage"]>[1]) {
    must(
      await this.admin
        .from("ai_usage_logs")
        .update({
          status: d.status,
          model: d.model,
          input_tokens: d.inputTokens,
          output_tokens: d.outputTokens,
          est_cost_usd: d.costUsd,
          error: d.error?.slice(0, 500) ?? null,
        })
        .eq("id", id)
        .eq("user_id", this.userId),
    );
  }

  async countUsage(features: string[], sinceIso: string) {
    const r = await this.db
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", this.userId)
      .in("feature", features)
      .in("status", ["reserved", "ok"])
      .gte("created_at", sinceIso);
    return r.count ?? 0;
  }

  async deleteAccount() {
    // auth.users 削除 → profiles 以下がカスケード削除される
    const { error } = await this.admin.auth.admin.deleteUser(this.userId);
    if (error) throw new Error(error.message);
  }
}

function missionRow(companyId: string, m: Parameters<UserStore["insertMissions"]>[0][number]) {
  return {
    company_id: companyId,
    mission_date: m.missionDate,
    kind: m.kind,
    title: m.title.slice(0, 200),
    description: m.description.slice(0, 1000),
    employee_role: m.employeeRole,
    xp_reward: m.xpReward,
    deliverable_hint: m.deliverableHint.slice(0, 300),
  };
}

export class SupabaseAdminStore implements AdminStore {
  constructor(private admin: Client) {}

  async getSettings(): Promise<AppSettings> {
    const r = (await this.admin.from("app_settings").select("value").eq("key", "settings").maybeSingle()).data as Row | null;
    return mergeSettings(r?.value);
  }

  async updateSettings(s: AppSettings) {
    must(await this.admin.from("app_settings").upsert({ key: "settings", value: s }));
  }

  async stats(period: { dayStart: string; monthStart: string }, abuseHourlyThreshold: number): Promise<AdminStats> {
    const users = (await this.admin.from("profiles").select("id", { count: "exact", head: true })).count ?? 0;
    const companies = (await this.admin.from("companies").select("id", { count: "exact", head: true })).count ?? 0;
    const month = must(
      await this.admin.from("ai_usage_logs").select("user_id,feature,status,est_cost_usd,input_tokens,output_tokens,created_at,error").gte("created_at", period.monthStart).limit(50000),
    ) as Row[];
    const emails = new Map<string, string | null>();
    const ids = [...new Set(month.map((r) => r.user_id).filter(Boolean))].slice(0, 500);
    if (ids.length) {
      const ps = must(await this.admin.from("profiles").select("id,email").in("id", ids)) as Row[];
      ps.forEach((p) => emails.set(p.id, p.email));
    }
    return computeStats(
      month.map((r) => ({
        userId: r.user_id,
        feature: r.feature,
        status: r.status,
        costUsd: Number(r.est_cost_usd),
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        createdAt: r.created_at,
        error: r.error,
      })),
      { users, companies },
      period,
      abuseHourlyThreshold,
      (id) => emails.get(id) ?? null,
    );
  }
}

export function mergeSettings(v: unknown): AppSettings {
  const s = (v && typeof v === "object" ? v : {}) as Partial<AppSettings>;
  return {
    plans: {
      free: { ...DEFAULT_SETTINGS.plans.free, ...(s.plans?.free ?? {}) },
      pro: { ...DEFAULT_SETTINGS.plans.pro, ...(s.plans?.pro ?? {}) },
    },
    proPriceJpy: s.proPriceJpy ?? DEFAULT_SETTINGS.proPriceJpy,
    abuseHourlyThreshold: s.abuseHourlyThreshold ?? DEFAULT_SETTINGS.abuseHourlyThreshold,
  };
}

export interface UsageRow {
  userId: string | null;
  feature: string;
  status: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  error: string | null;
}

export function computeStats(
  rows: UsageRow[],
  counts: { users: number; companies: number },
  period: { dayStart: string; monthStart: string },
  abuseHourlyThreshold: number,
  emailOf: (id: string) => string | null,
): AdminStats {
  const today = rows.filter((r) => r.createdAt >= period.dayStart);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const counted = (r: UsageRow) => r.status === "ok" || r.status === "reserved";
  const sum = (rs: UsageRow[], f: (r: UsageRow) => number) => rs.reduce((a, r) => a + f(r), 0);

  const byFeature = new Map<string, { calls: number; costUsd: number }>();
  const byUser = new Map<string, { calls: number; costUsd: number }>();
  for (const r of today.filter(counted)) {
    const f = byFeature.get(r.feature) ?? { calls: 0, costUsd: 0 };
    f.calls++;
    f.costUsd += r.costUsd;
    byFeature.set(r.feature, f);
    if (r.userId) {
      const u = byUser.get(r.userId) ?? { calls: 0, costUsd: 0 };
      u.calls++;
      u.costUsd += r.costUsd;
      byUser.set(r.userId, u);
    }
  }
  const hourly = new Map<string, number>();
  for (const r of rows) if (r.userId && r.createdAt >= hourAgo) hourly.set(r.userId, (hourly.get(r.userId) ?? 0) + 1);

  return {
    ...counts,
    today: {
      calls: today.filter(counted).length,
      denied: today.filter((r) => r.status === "denied").length,
      errors: today.filter((r) => r.status === "error").length,
      costUsd: sum(today, (r) => r.costUsd),
      inputTokens: sum(today, (r) => r.inputTokens),
      outputTokens: sum(today, (r) => r.outputTokens),
    },
    month: { calls: rows.filter(counted).length, costUsd: sum(rows, (r) => r.costUsd) },
    byFeatureToday: [...byFeature.entries()].map(([feature, v]) => ({ feature, ...v })).sort((a, b) => b.calls - a.calls),
    topUsersToday: [...byUser.entries()]
      .map(([userId, v]) => ({ userId, email: emailOf(userId), ...v }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10),
    flagged: [...hourly.entries()]
      .filter(([, n]) => n >= abuseHourlyThreshold)
      .map(([userId, n]) => ({ userId, email: emailOf(userId), callsLastHour: n })),
    recentErrors: rows
      .filter((r) => r.status === "error")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((r) => ({ createdAt: r.createdAt, feature: r.feature, error: r.error ?? "" })),
  };
}
