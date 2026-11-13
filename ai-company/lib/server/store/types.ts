import type {
  ActivityLog,
  AppSettings,
  Artifact,
  Company,
  CompanyEmployee,
  CompanyLogo,
  Conversation,
  Goal,
  Message,
  Mission,
  OnboardingState,
  Plan,
} from "@/lib/types";

export type UsageFeature = "chat" | "task" | "meeting" | "onboarding" | "missions" | "summary";

export interface ReserveResult {
  ok: boolean;
  id?: string;
  reason?: "daily_limit" | "monthly_limit" | "rate_limited" | "global_budget";
}

export interface NewCompanyInput {
  name: string;
  presidentName: string;
  tagline: string;
  concept: string;
  philosophy: string;
  vision: string;
  mainBusiness: string;
  businessMode: "new" | "existing";
  actionPlan: { step: string; detail: string }[];
  logo: CompanyLogo;
  goals: { title: string; description: string; horizon: string }[];
  employees: { templateId: string; name: string }[];
  missions: Omit<Mission, "id" | "companyId" | "status" | "completedAt" | "createdAt">[];
}

export type CompanyPatch = Partial<
  Pick<
    Company,
    | "name"
    | "presidentName"
    | "tagline"
    | "concept"
    | "philosophy"
    | "vision"
    | "mainBusiness"
    | "actionPlan"
    | "logo"
  >
>;

export interface CompleteMissionResult {
  ok: boolean;
  error?: "not_found" | "already_completed" | "invalid_artifact";
  xp?: number;
  level?: number;
  leveledUp?: boolean;
  xpAwarded?: number;
}

/**
 * ログインユーザーに紐づくデータ操作。実装は必ず「このユーザーの」データだけを扱う。
 */
export interface UserStore {
  readonly userId: string;
  getPlan(): Promise<Plan>;
  getDisplayName(): Promise<string>;

  // onboarding
  getOnboarding(): Promise<OnboardingState | null>;
  saveOnboarding(state: OnboardingState): Promise<OnboardingState>;

  // company
  getCompany(): Promise<Company | null>;
  createCompany(input: NewCompanyInput): Promise<Company>;
  updateCompany(patch: CompanyPatch): Promise<Company>;
  getMemorySummary(): Promise<string>;
  setMemorySummary(summary: string): Promise<void>;
  checkIn(today: string): Promise<{ streak: number; newDay: boolean }>;

  // employees
  listEmployees(): Promise<CompanyEmployee[]>;

  // goals
  listGoals(): Promise<Goal[]>;

  // conversations
  getOrCreateConversation(employeeId: string | null, kind: "chat" | "meeting", title: string): Promise<Conversation>;
  createConversation(employeeId: string | null, kind: "chat" | "meeting", title: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(kind: "chat" | "meeting", limit: number): Promise<Conversation[]>;
  listMessages(conversationId: string, limit: number): Promise<Message[]>;
  countMessages(conversationId: string): Promise<number>;
  addMessage(m: Omit<Message, "id" | "createdAt">): Promise<Message>;
  updateConversationSummary(id: string, summary: string, summarizedCount: number): Promise<void>;
  getConversationSummarizedCount(id: string): Promise<number>;
  deleteAllConversations(): Promise<void>;

  // missions
  listMissions(opts: { date?: string; limit?: number }): Promise<Mission[]>;
  insertMissions(ms: Omit<Mission, "id" | "companyId" | "status" | "completedAt" | "createdAt">[]): Promise<Mission[]>;
  completeMission(missionId: string, deliverable: string, artifactId: string | null): Promise<CompleteMissionResult>;
  countCompletedMissions(): Promise<number>;

  // artifacts
  listArtifacts(limit: number): Promise<Artifact[]>;
  getArtifact(id: string): Promise<Artifact | null>;
  createArtifact(a: Omit<Artifact, "id" | "companyId" | "createdAt"> & { conversationId?: string | null }): Promise<Artifact>;

  // activity
  listActivity(limit: number, types?: ActivityLog["type"][]): Promise<ActivityLog[]>;
  logActivity(type: ActivityLog["type"], title: string, detail?: Record<string, unknown>): Promise<void>;

  // usage
  reserveUsage(
    feature: UsageFeature,
    countFeatures: UsageFeature[],
    limits: { daily: number; monthly: number; perMinute: number },
    period: { dayStart: string; monthStart: string },
    globalDailyBudgetUsd: number,
  ): Promise<ReserveResult>;
  finalizeUsage(
    id: string,
    data: { status: "ok" | "error"; model: string; inputTokens: number; outputTokens: number; costUsd: number; error?: string },
  ): Promise<void>;
  countUsage(features: UsageFeature[], sinceIso: string): Promise<number>;

  // account
  deleteAccount(): Promise<void>;
}

export interface AdminStats {
  users: number;
  companies: number;
  today: { calls: number; denied: number; errors: number; costUsd: number; inputTokens: number; outputTokens: number };
  month: { calls: number; costUsd: number };
  byFeatureToday: { feature: string; calls: number; costUsd: number }[];
  topUsersToday: { userId: string; email: string | null; calls: number; costUsd: number }[];
  flagged: { userId: string; email: string | null; callsLastHour: number }[];
  recentErrors: { createdAt: string; feature: string; error: string }[];
}

/** 運営者向け（service_role 相当）。管理者判定後にのみ使用する。 */
export interface AdminStore {
  getSettings(): Promise<AppSettings>;
  updateSettings(s: AppSettings): Promise<void>;
  stats(period: { dayStart: string; monthStart: string }, abuseHourlyThreshold: number): Promise<AdminStats>;
}
