// クライアント・サーバー共通のドメイン型（秘密情報は含めない）

export type Plan = "free" | "pro";

export type EmployeeRole =
  | "secretary"
  | "planner"
  | "marketer"
  | "sales"
  | "designer"
  | "developer"
  | "accountant"
  | "hr"
  | "support"
  | "legal"
  | "video";

export interface Profile {
  id: string;
  email: string | null;
  displayName: string;
  plan: Plan;
  isAdmin: boolean;
  createdAt: string;
}

export interface CompanyLogo {
  initials: string;
  primary: string;
  secondary: string;
  shape: "shield" | "hex" | "circle" | "diamond";
  icon: "star" | "spark" | "crown" | "wave" | "leaf" | "rocket";
}

export interface Company {
  id: string;
  ownerId: string;
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
  level: number;
  xp: number;
  streakDays: number;
  lastCheckinDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTemplate {
  id: EmployeeRole;
  role: EmployeeRole;
  defaultName: string;
  title: string;
  personality: string;
  profile: string;
  strengths: string[];
  skills: string[];
  /** 実際に利用できる機能（業務依頼）のID */
  capabilities: string[];
  isPro: boolean;
  isAvailable: boolean; // false = 近日公開
  sortOrder: number;
}

export interface CompanyEmployee {
  id: string;
  companyId: string;
  templateId: EmployeeRole;
  name: string;
  status: "active" | "inactive";
  hiredAt: string;
}

export interface Goal {
  id: string;
  companyId: string;
  title: string;
  description: string;
  horizon: string;
  status: "active" | "achieved" | "archived";
  createdAt: string;
}

export interface Mission {
  id: string;
  companyId: string;
  missionDate: string; // YYYY-MM-DD（会社のタイムゾーン）
  kind: "first_day" | "daily";
  title: string;
  description: string;
  employeeRole: EmployeeRole;
  xpReward: number;
  deliverableHint: string;
  status: "open" | "completed";
  completedAt: string | null;
  createdAt: string;
}

export interface MissionCompletion {
  id: string;
  missionId: string;
  companyId: string;
  deliverable: string;
  artifactId: string | null;
  xpAwarded: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  companyId: string;
  employeeId: string | null;
  kind: "chat" | "meeting";
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  employeeId: string | null;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Artifact {
  id: string;
  companyId: string;
  employeeId: string | null;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  type:
    | "founded"
    | "mission_completed"
    | "level_up"
    | "artifact_created"
    | "meeting_held"
    | "decision"
    | "profile_updated"
    | "checkin";
  title: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface OnboardingState {
  id: string;
  status: "interview" | "ideas" | "plan" | "completed";
  presidentName: string;
  answers: Partial<Record<InterviewTopic, string>>;
  skipped: InterviewTopic[];
  currentTopic: InterviewTopic | null;
  transcript: { role: "user" | "assistant"; content: string }[];
  ideas: BusinessIdea[];
  chosenIdea: BusinessIdea | null;
  plan: CompanyPlan | null;
  turns: number;
}

export const INTERVIEW_TOPICS = [
  "dream",
  "company_vision",
  "current_work",
  "strengths",
  "business_status",
  "business_idea",
  "scale_goal",
  "resources",
  "ai_help",
] as const;
export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

export interface BusinessIdea {
  title: string;
  summary: string;
  target: string;
  whyYou: string;
  firstStep: string;
}

export interface CompanyPlan {
  companyNameCandidates: string[];
  companyName: string;
  tagline: string;
  concept: string;
  philosophy: string;
  vision: string;
  mainBusiness: string;
  businessMode: "new" | "existing";
  goals: { title: string; description: string; horizon: string }[];
  actionPlan: { step: string; detail: string }[];
  recommendedEmployees: { role: EmployeeRole; reason: string }[];
  firstDayMissions: {
    title: string;
    description: string;
    employeeRole: EmployeeRole;
    deliverableHint: string;
  }[];
}

export interface UsageSummary {
  plan: Plan;
  chatToday: number;
  chatDailyLimit: number;
  chatMonth: number;
  chatMonthlyLimit: number;
  meetingToday: number;
  meetingDailyLimit: number;
}

export interface PlanLimits {
  chatDaily: number;
  chatMonthly: number;
  meetingDaily: number;
  onboardingDaily: number;
  maxEmployees: number;
  perMinute: number;
}

export interface AppSettings {
  plans: Record<Plan, PlanLimits>;
  proPriceJpy: number;
  /** 1時間あたりこの回数を超えるユーザーを異常利用として検知 */
  abuseHourlyThreshold: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  plans: {
    free: {
      chatDaily: 20,
      chatMonthly: 300,
      meetingDaily: 1,
      onboardingDaily: 40,
      maxEmployees: 3,
      perMinute: 12,
    },
    pro: {
      chatDaily: 150,
      chatMonthly: 3000,
      meetingDaily: 10,
      onboardingDaily: 80,
      maxEmployees: 11,
      perMinute: 20,
    },
  },
  proPriceJpy: 980,
  abuseHourlyThreshold: 60,
};
