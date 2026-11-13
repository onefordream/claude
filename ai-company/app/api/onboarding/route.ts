import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, withUser } from "@/lib/server/http";
import {
  EditedPlanSchema,
  answerTurn,
  businessUndecided,
  canFinishInterview,
  foundCompany,
  generateIdeas,
  generatePlan,
  interviewProgress,
  newOnboarding,
  openingQuestion,
  skipTurn,
} from "@/lib/server/onboarding";
import type { OnboardingState } from "@/lib/types";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), presidentName: z.string().trim().max(20).default("") }),
  z.object({ action: z.literal("answer"), text: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal("skip") }),
  z.object({ action: z.literal("finish_interview") }),
  z.object({ action: z.literal("ideas") }),
  z.object({ action: z.literal("choose_idea"), index: z.number().int().min(0).max(2) }),
  z.object({ action: z.literal("plan") }),
  z.object({ action: z.literal("found"), plan: EditedPlanSchema }),
  z.object({ action: z.literal("reset") }),
]);

/** クライアントに返す面談状態（内部の transcript は返すが、秘密情報は含まれない） */
function view(s: OnboardingState) {
  return {
    status: s.status,
    presidentName: s.presidentName,
    transcript: s.transcript,
    ideas: s.ideas,
    chosenIdea: s.chosenIdea,
    plan: s.plan,
    progress: interviewProgress(s),
    canFinish: canFinishInterview(s),
    interviewDone: s.currentTopic === null,
    suggestIdeas: businessUndecided(s),
  };
}

export const GET = withUser(null, async ({ store }) => {
  const s = await store.getOnboarding();
  const company = await store.getCompany();
  return NextResponse.json({ state: s ? view(s) : null, hasCompany: Boolean(company) });
});

export const POST = withUser(Body, async ({ store, body }) => {
  if (await store.getCompany()) return jsonError(409, "すでに会社が設立されています", "company_exists");

  let s = await store.getOnboarding();
  if (body.action === "start" || body.action === "reset" || !s || s.status === "completed") {
    if (body.action !== "start" && body.action !== "reset") return jsonError(400, "面談が開始されていません", "not_started");
    const name = body.action === "start" ? body.presidentName : s?.presidentName ?? "";
    s = newOnboarding(name);
    const q = openingQuestion(s);
    s.transcript.push({ role: "assistant", content: q });
    s = await store.saveOnboarding(s);
    return NextResponse.json({ state: view(s), reply: q, suggestions: ["自由な働き方をしたい", "好きなことで生きたい", "誰かの役に立ちたい"] });
  }

  switch (body.action) {
    case "answer":
    case "skip": {
      if (s.status !== "interview" || s.currentTopic === null) return jsonError(400, "面談はすでに終了しています", "interview_done");
      const r = body.action === "answer" ? await answerTurn(store, s, body.text) : skipTurn(s);
      if (r.done) s.currentTopic = null;
      s = await store.saveOnboarding(s);
      return NextResponse.json({ state: view(s), reply: r.reply, suggestions: r.suggestions, done: r.done });
    }
    case "finish_interview": {
      if (!canFinishInterview(s)) return jsonError(400, "もう少しだけ教えてください（3つ以上の回答が必要です）", "too_few");
      s.currentTopic = null;
      const reply = "承知しました。ここまでの内容で会社を設計していきますね。";
      s.transcript.push({ role: "assistant", content: reply });
      s = await store.saveOnboarding(s);
      return NextResponse.json({ state: view(s), reply, done: true });
    }
    case "ideas": {
      if (s.currentTopic !== null) return jsonError(400, "面談が終わっていません", "interview_not_done");
      await generateIdeas(store, s);
      s = await store.saveOnboarding(s);
      return NextResponse.json({ state: view(s) });
    }
    case "choose_idea": {
      const idea = s.ideas[body.index];
      if (!idea) return jsonError(400, "アイデアが見つかりません", "no_idea");
      s.chosenIdea = idea;
      s.answers.business_idea = `${idea.title}：${idea.summary}`;
      s = await store.saveOnboarding(s);
      return NextResponse.json({ state: view(s) });
    }
    case "plan": {
      if (s.currentTopic !== null) return jsonError(400, "面談が終わっていません", "interview_not_done");
      await generatePlan(store, s);
      s = await store.saveOnboarding(s);
      return NextResponse.json({ state: view(s) });
    }
    case "found": {
      if (!s.plan) return jsonError(400, "会社の設計がまだありません", "no_plan");
      const company = await foundCompany(store, s, body.plan);
      return NextResponse.json({ company });
    }
  }
});
