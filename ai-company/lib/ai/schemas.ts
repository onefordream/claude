import { z } from "zod";
import { INTERVIEW_TOPICS } from "@/lib/types";

// AI の構造化出力スキーマ。保存前に必ずここで検証する。

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).default("");
const role = z.enum(["secretary", "planner", "marketer"]);
const topic = z.enum(INTERVIEW_TOPICS);

export const InterviewTurnSchema = z.object({
  reply: str(800),
  captured: z
    .record(z.string(), z.string().max(600))
    .default({})
    .transform((rec) => {
      const out: Partial<Record<(typeof INTERVIEW_TOPICS)[number], string>> = {};
      for (const [k, v] of Object.entries(rec)) {
        const parsed = topic.safeParse(k);
        if (parsed.success && v.trim()) out[parsed.data] = v.trim();
      }
      return out;
    }),
  nextTopic: topic.nullable().default(null),
  done: z.boolean().default(false),
  suggestions: z.array(z.string().trim().min(1).max(40)).max(4).default([]),
});
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;

export const BusinessIdeaSchema = z.object({
  title: str(60),
  summary: str(300),
  target: str(150),
  whyYou: str(300),
  firstStep: str(200),
});

export const IdeasSchema = z.object({ ideas: z.array(BusinessIdeaSchema).min(3).max(3) });

export const CompanyPlanSchema = z.object({
  companyNameCandidates: z.array(str(40)).min(1).max(5),
  companyName: str(40),
  tagline: str(80),
  concept: str(600),
  philosophy: str(300),
  vision: str(300),
  mainBusiness: str(300),
  businessMode: z.enum(["new", "existing"]).default("new"),
  goals: z
    .array(z.object({ title: str(100), description: optStr(300), horizon: optStr(40) }))
    .min(1)
    .max(4),
  actionPlan: z.array(z.object({ step: str(80), detail: optStr(300) })).min(1).max(6),
  recommendedEmployees: z.array(z.object({ role, reason: optStr(200) })).max(3).default([]),
  firstDayMissions: z
    .array(
      z.object({
        title: str(60),
        description: optStr(300),
        employeeRole: role,
        deliverableHint: optStr(150),
      }),
    )
    .min(1)
    .max(3),
});

export const MeetingSchema = z.object({
  opinions: z
    .array(z.object({ role, content: str(1200) }))
    .min(2)
    .max(3),
  summary: str(800),
  tasks: z.array(z.object({ title: str(100), owner: role })).min(1).max(5),
});
export type MeetingResult = z.infer<typeof MeetingSchema>;

export const DailyMissionsSchema = z.object({
  greeting: optStr(200),
  missions: z
    .array(
      z.object({
        title: str(60),
        description: optStr(300),
        employeeRole: role,
        deliverableHint: optStr(150),
      }),
    )
    .min(3)
    .max(3),
});

/** AIの出力からJSONを取り出す（```json フェンス等にも対応） */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {}
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  return undefined;
}
