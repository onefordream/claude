import "server-only";
import { z } from "zod";
import type { CompanyPlan, InterviewTopic, OnboardingState } from "@/lib/types";
import { INTERVIEW_TOPICS } from "@/lib/types";
import { CompanyPlanSchema, IdeasSchema, InterviewTurnSchema } from "@/lib/ai/schemas";
import { FALLBACK_QUESTIONS, ideasSystem, interviewSystem, nextOpenTopic, planSystem } from "@/lib/ai/prompts";
import { generateLogo } from "@/lib/game/logo";
import { STARTER_ROLES, templateFor } from "@/lib/game/employees";
import { MISSION_XP } from "@/lib/game/levels";
import { dateInTz } from "@/lib/game/dates";
import { serverConfig } from "@/lib/config";
import type { UserStore } from "./store/types";
import { AIServiceError, runStructured } from "./ai";

export const MAX_INTERVIEW_TURNS = 16;
const MIN_ANSWERS_TO_FINISH = 3;

export function newOnboarding(presidentName: string): OnboardingState {
  return {
    id: "",
    status: "interview",
    presidentName,
    answers: {},
    skipped: [],
    currentTopic: "dream",
    transcript: [],
    ideas: [],
    chosenIdea: null,
    plan: null,
    turns: 0,
  };
}

export function interviewProgress(s: OnboardingState) {
  const done = INTERVIEW_TOPICS.filter((t) => s.answers[t] || s.skipped.includes(t)).length;
  return { done, total: INTERVIEW_TOPICS.length };
}

export function canFinishInterview(s: OnboardingState) {
  return Object.keys(s.answers).length >= MIN_ANSWERS_TO_FINISH;
}

/** 事業が未定かどうか（アイデア提案を勧めるかの初期値） */
export function businessUndecided(s: OnboardingState) {
  const status = s.answers.business_status ?? "";
  if (/経営|運営|しています|やってい|あります/.test(status) && !/まだ|ない|ありません/.test(status)) return false;
  const idea = s.answers.business_idea ?? "";
  return !idea || /未定|決まって|ない|わから|考え中|まだ|特に/.test(idea);
}

function pushTranscript(s: OnboardingState, role: "user" | "assistant", content: string) {
  s.transcript.push({ role, content: content.slice(0, 1000) });
  if (s.transcript.length > 40) s.transcript = s.transcript.slice(-40);
}

export function openingQuestion(s: OnboardingState) {
  const name = s.presidentName ? `${s.presidentName}社長` : "社長";
  return `${name}、よろしくお願いします。まずは一番大切なことから。${FALLBACK_QUESTIONS.dream.q}`;
}

/** 社長の回答 → AI秘書の応答 */
export async function answerTurn(store: UserStore, s: OnboardingState, text: string) {
  const current = s.currentTopic ?? nextOpenTopic(s);
  pushTranscript(s, "user", text);
  s.turns += 1;

  // 次の推奨項目（現在の項目が埋まる前提で）
  const provisional = { ...s, answers: { ...s.answers, ...(current ? { [current]: text } : {}) } };
  const plannedNext = nextOpenTopic(provisional);

  const turn = await runStructured(
    store,
    "onboarding",
    {
      task: "interview",
      system: interviewSystem(s, current),
      messages: s.transcript.slice(-10),
      maxTokens: 600,
      meta: { currentTopic: current, nextTopic: plannedNext, nextQuestion: plannedNext ? FALLBACK_QUESTIONS[plannedNext].q : "" },
    },
    InterviewTurnSchema,
  );

  for (const [k, v] of Object.entries(turn.captured)) s.answers[k as InterviewTopic] = v;
  // AIが何も拾わなかった場合でも、現在の項目には社長の発言を記録する
  if (current && !s.answers[current]) s.answers[current] = text.slice(0, 300);
  s.skipped = s.skipped.filter((t) => !s.answers[t]);

  let next: InterviewTopic | null =
    turn.nextTopic && !s.answers[turn.nextTopic] && !s.skipped.includes(turn.nextTopic) ? turn.nextTopic : nextOpenTopic(s);
  // AIが早めに終了判断した場合は、最低限の回答があるときだけ尊重する
  const done = next === null || s.turns >= MAX_INTERVIEW_TURNS || (turn.done && canFinishInterview(s));
  let reply = turn.reply;
  if (!done && turn.done && next) reply = `ありがとうございます。もう少しだけ教えてください。${FALLBACK_QUESTIONS[next].q}`;
  if (done) {
    next = null;
    if (!turn.done) reply = `${reply}\n\nたくさん教えていただき、ありがとうございました。ここまでの内容で会社を設計していきますね。`;
  }
  s.currentTopic = next;
  pushTranscript(s, "assistant", reply);
  return {
    reply,
    suggestions: done ? [] : turn.suggestions.length ? turn.suggestions : next ? FALLBACK_QUESTIONS[next].suggestions : [],
    done,
  };
}

/** スキップ（AIを呼ばずに次の質問へ） */
export function skipTurn(s: OnboardingState) {
  const current = s.currentTopic ?? nextOpenTopic(s);
  if (current && !s.skipped.includes(current)) s.skipped.push(current);
  pushTranscript(s, "user", "（スキップ）");
  const next = nextOpenTopic(s);
  s.currentTopic = next;
  if (!next) {
    const reply = "承知しました。ここまでの内容で会社を設計していきますね。";
    pushTranscript(s, "assistant", reply);
    return { reply, suggestions: [], done: true };
  }
  const reply = `大丈夫です、あとからでも決められます。では次の質問です。${FALLBACK_QUESTIONS[next].q}`;
  pushTranscript(s, "assistant", reply);
  return { reply, suggestions: FALLBACK_QUESTIONS[next].suggestions, done: false };
}

export async function generateIdeas(store: UserStore, s: OnboardingState) {
  const out = await runStructured(
    store,
    "onboarding",
    { task: "ideas", system: ideasSystem(s), messages: [{ role: "user", content: "事業アイデアを3つ提案してください。" }], maxTokens: 1200 },
    IdeasSchema,
  );
  s.ideas = out.ideas;
  s.status = "ideas";
  return out.ideas;
}

export async function generatePlan(store: UserStore, s: OnboardingState): Promise<CompanyPlan> {
  const plan = await runStructured(
    store,
    "onboarding",
    {
      task: "plan",
      system: planSystem(s),
      messages: [{ role: "user", content: "面談内容をもとに会社を設計してください。" }],
      maxTokens: 2000,
      meta: { idea: s.chosenIdea?.title ?? s.answers.business_idea ?? "" },
    },
    CompanyPlanSchema,
  );
  // 初日ミッションは担当を重複させず最大3件
  const seen = new Set<string>();
  plan.firstDayMissions = plan.firstDayMissions.filter((m) => (seen.has(m.employeeRole) ? false : (seen.add(m.employeeRole), true)));
  if (!plan.companyNameCandidates.includes(plan.companyName)) plan.companyNameCandidates.unshift(plan.companyName);
  plan.companyNameCandidates = plan.companyNameCandidates.slice(0, 3);
  s.plan = plan;
  s.status = "plan";
  return plan;
}

/** 社長が確認・編集した設計内容（クライアントから受け取る）の検証スキーマ */
export const EditedPlanSchema = CompanyPlanSchema.extend({
  companyName: z.string().trim().min(1).max(40),
  presidentName: z.string().trim().max(20).default(""),
});

export async function foundCompany(store: UserStore, s: OnboardingState, edited: z.output<typeof EditedPlanSchema>) {
  if (await store.getCompany()) throw new AIServiceError("invalid_output", 409, "すでに会社が設立されています。");
  const today = dateInTz(serverConfig.timezone);
  const company = await store.createCompany({
    name: edited.companyName,
    presidentName: edited.presidentName || s.presidentName,
    tagline: edited.tagline,
    concept: edited.concept,
    philosophy: edited.philosophy,
    vision: edited.vision,
    mainBusiness: edited.mainBusiness,
    businessMode: edited.businessMode,
    actionPlan: edited.actionPlan,
    logo: generateLogo(edited.companyName),
    goals: edited.goals,
    employees: STARTER_ROLES.map((r) => ({ templateId: r, name: templateFor(r).defaultName })),
    missions: edited.firstDayMissions.map((m) => ({
      missionDate: today,
      kind: "first_day" as const,
      title: m.title,
      description: m.description,
      employeeRole: m.employeeRole,
      xpReward: MISSION_XP.first_day,
      deliverableHint: m.deliverableHint,
    })),
  });
  s.status = "completed";
  s.plan = { ...edited };
  await store.saveOnboarding(s);
  return company;
}
