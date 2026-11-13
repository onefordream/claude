import "server-only";
import type { Company, CompanyEmployee, EmployeeRole, Mission } from "@/lib/types";
import { buildCompanyContext, CAPABILITY_INSTRUCTIONS, dailyMissionsSystem, dataBlock, employeeSystem, meetingSystem, SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import { DailyMissionsSchema, MeetingSchema } from "@/lib/ai/schemas";
import { CAPABILITIES, templateFor } from "@/lib/game/employees";
import { MISSION_XP } from "@/lib/game/levels";
import { dateInTz } from "@/lib/game/dates";
import { serverConfig } from "@/lib/config";
import type { UserStore } from "./store/types";
import { AIServiceError, runAI, runStructured } from "./ai";

const HISTORY_MESSAGES = 10; // AIに送る直近メッセージ数
const SUMMARIZE_EVERY = 16; // 未要約がこの件数を超えたら要約を更新

export async function loadCompanyContext(store: UserStore) {
  const company = await store.getCompany();
  if (!company) throw new Error("company_not_found");
  const today = dateInTz(serverConfig.timezone);
  const [goals, decisions, missions, memory, employees] = await Promise.all([
    store.listGoals(),
    store.listActivity(8, ["decision"]),
    store.listMissions({ date: today, limit: 6 }),
    store.getMemorySummary(),
    store.listEmployees(),
  ]);
  return { company, employees, context: buildCompanyContext({ company, goals, decisions, missions, memory }) };
}

function colleagueNames(employees: CompanyEmployee[]) {
  const out: Partial<Record<EmployeeRole, string>> = {};
  for (const e of employees) out[e.templateId] = e.name;
  return out;
}

async function findEmployee(store: UserStore, employeeId: string, employees?: CompanyEmployee[]) {
  const list = employees ?? (await store.listEmployees());
  const emp = list.find((e) => e.id === employeeId && e.status === "active");
  if (!emp) throw new AIServiceError("invalid_output", 404, "社員が見つかりません");
  return emp;
}

/** 古い会話を要約して記憶に残す（失敗しても会話は続行） */
async function maybeSummarize(store: UserStore, conversationId: string, previousSummary: string) {
  try {
    const total = await store.countMessages(conversationId);
    const done = await store.getConversationSummarizedCount(conversationId);
    if (total - done < SUMMARIZE_EVERY + HISTORY_MESSAGES) return previousSummary;
    const msgs = await store.listMessages(conversationId, total);
    const older = msgs.slice(done, total - HISTORY_MESSAGES);
    const transcript = older.map((m) => `${m.role === "user" ? "社長" : "社員"}: ${m.content.slice(0, 600)}`).join("\n");
    const res = await runAI(store, "summary", {
      task: "summary",
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: `${previousSummary ? `これまでの要約:\n${previousSummary}\n\n` : ""}${dataBlock("conversation", transcript)}` }],
      maxTokens: 500,
    });
    const summary = res.text.trim().slice(0, 3000);
    await store.updateConversationSummary(conversationId, summary, total - HISTORY_MESSAGES);
    return summary;
  } catch (e) {
    console.warn("[chat] summarize skipped:", e instanceof Error ? e.message : e);
    return previousSummary;
  }
}

export async function chatWithEmployee(store: UserStore, employeeId: string, text: string) {
  const { employees, context } = await loadCompanyContext(store);
  const emp = await findEmployee(store, employeeId, employees);
  const conv = await store.getOrCreateConversation(emp.id, "chat", `${emp.name}との会話`);
  const summary = await maybeSummarize(store, conv.id, conv.summary);
  const history = await store.listMessages(conv.id, HISTORY_MESSAGES);

  // AI 呼び出し（上限チェック込み）が成功してから保存する
  const res = await runAI(store, "chat", {
    task: "chat",
    system: employeeSystem({ role: emp.templateId, name: emp.name, colleagueNames: colleagueNames(employees), companyContext: context, conversationSummary: summary }),
    messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: text }],
    maxTokens: 900,
  });
  const userMsg = await store.addMessage({ conversationId: conv.id, role: "user", employeeId: null, content: text, metadata: {} });
  const reply = await store.addMessage({
    conversationId: conv.id,
    role: "assistant",
    employeeId: emp.id,
    content: res.text.trim() || "すみません、うまく考えをまとめられませんでした。もう一度お願いできますか？",
    metadata: {},
  });
  return { conversationId: conv.id, messages: [userMsg, reply] };
}

export async function runCapability(store: UserStore, employeeId: string, capabilityId: string, input: string) {
  const cap = CAPABILITIES[capabilityId];
  const instr = CAPABILITY_INSTRUCTIONS[capabilityId];
  if (!cap || !instr) throw new AIServiceError("invalid_output", 400, "その業務は利用できません");
  const { employees, context } = await loadCompanyContext(store);
  const emp = await findEmployee(store, employeeId, employees);
  if (emp.templateId !== cap.role) throw new AIServiceError("invalid_output", 400, "この社員の担当業務ではありません");

  const conv = await store.getOrCreateConversation(emp.id, "chat", `${emp.name}との会話`);
  const res = await runAI(store, "task", {
    task: "task",
    system: `${employeeSystem({ role: emp.templateId, name: emp.name, colleagueNames: colleagueNames(employees), companyContext: context, conversationSummary: conv.summary })}

# 今回の業務依頼: ${instr.title}
${instr.instruction}
成果物の本文だけを出力してください（前置きや締めの挨拶は不要）。`,
    messages: [{ role: "user", content: input ? `補足情報:\n${dataBlock("request", input)}` : "会社の情報をもとに作成してください。" }],
    maxTokens: instr.maxTokens,
  });
  const content = res.text.trim();
  if (!content) throw new AIServiceError("invalid_output", 502, "成果物を作成できませんでした。もう一度お試しください。");

  const artifact = await store.createArtifact({ employeeId: emp.id, type: cap.artifactType, title: `${instr.title}（${emp.name}）`, content, conversationId: conv.id });
  await store.addMessage({ conversationId: conv.id, role: "user", employeeId: null, content: `【業務依頼】${cap.label}${input ? `\n${input}` : ""}`, metadata: { capability: capabilityId } });
  const reply = await store.addMessage({
    conversationId: conv.id,
    role: "assistant",
    employeeId: emp.id,
    content,
    metadata: { artifactId: artifact.id, artifactTitle: artifact.title },
  });
  await store.logActivity("artifact_created", artifact.title, { artifact_id: artifact.id });
  return { artifact, message: reply, conversationId: conv.id };
}

export async function holdMeeting(store: UserStore, topic: string) {
  const { employees, context } = await loadCompanyContext(store);
  const names = colleagueNames(employees);
  const roles = ["secretary", "planner", "marketer"] as const;
  if (!roles.every((r) => names[r])) throw new AIServiceError("invalid_output", 400, "会議に必要な社員がいません");

  const result = await runStructured(
    store,
    "meeting",
    {
      task: "meeting",
      system: meetingSystem(names as Record<(typeof roles)[number], string>, context),
      messages: [{ role: "user", content: `会議のテーマ:\n${dataBlock("meeting_topic", topic)}` }],
      maxTokens: 2200,
    },
    MeetingSchema,
  );
  // 発言順を 企画 → マーケ → 秘書 に揃える
  const order: Record<string, number> = { planner: 0, marketer: 1, secretary: 2 };
  result.opinions.sort((a, b) => order[a.role] - order[b.role]);

  const empByRole = new Map(employees.map((e) => [e.templateId, e]));
  const conv = await store.createConversation(null, "meeting", topic.slice(0, 80));
  await store.addMessage({ conversationId: conv.id, role: "user", employeeId: null, content: topic, metadata: {} });
  for (const o of result.opinions)
    await store.addMessage({ conversationId: conv.id, role: "assistant", employeeId: empByRole.get(o.role)?.id ?? null, content: o.content, metadata: { role: o.role } });
  await store.addMessage({
    conversationId: conv.id,
    role: "assistant",
    employeeId: empByRole.get("secretary")?.id ?? null,
    content: result.summary,
    metadata: { type: "summary", tasks: result.tasks },
  });
  const minutes = [
    `# 社内会議：${topic}`,
    ...result.opinions.map((o) => `## ${names[o.role]}（${templateFor(o.role).title}）\n${o.content}`),
    `## まとめ\n${result.summary}`,
    `## タスク\n${result.tasks.map((t) => `- [ ] ${t.title}（${names[t.owner]}）`).join("\n")}`,
  ].join("\n\n");
  const artifact = await store.createArtifact({ employeeId: empByRole.get("secretary")?.id ?? null, type: "meeting_minutes", title: `議事録：${topic.slice(0, 60)}`, content: minutes, conversationId: conv.id });
  await store.logActivity("meeting_held", `社内会議「${topic.slice(0, 40)}」`, { conversation_id: conv.id, artifact_id: artifact.id });
  await store.logActivity("decision", result.summary.slice(0, 160), { source: "meeting", conversation_id: conv.id });
  return { conversationId: conv.id, artifactId: artifact.id, names, ...result };
}

// ---------------------------------------------------------------------
// 毎日のミッション
// ---------------------------------------------------------------------
const FALLBACK_MISSIONS: Record<"secretary" | "planner" | "marketer", { title: string; description: string; deliverableHint: string }[]> = {
  secretary: [
    { title: "今日の最優先タスクを1つ決める", description: "ミオに相談して、今日一番大事なことを1つに絞りましょう", deliverableHint: "今日の最優先タスクとその理由" },
    { title: "今週の目標を見直す", description: "会社の目標に対して今週どこまで進めるかを決めましょう", deliverableHint: "今週の目標1〜3行" },
    { title: "やることリストを整理する", description: "頭の中のやることを書き出し、優先順位をつけましょう", deliverableHint: "優先順位つきのリスト" },
  ],
  planner: [
    { title: "競合を3つ調べる", description: "似たサービス・商品を3つ探し、特徴と価格をメモしましょう", deliverableHint: "競合3つの名前・特徴・価格" },
    { title: "商品アイデアを1つ完成させる", description: "カイトと一緒に、商品の内容・対象・価格をまとめましょう", deliverableHint: "商品名・内容・対象・価格" },
    { title: "お客様の悩みを5つ書き出す", description: "ターゲットが抱えていそうな悩みを具体的に書き出しましょう", deliverableHint: "悩み5つのリスト" },
  ],
  marketer: [
    { title: "SNS投稿案を作る", description: "リナと一緒に、会社の取り組みを伝える投稿案を作りましょう", deliverableHint: "投稿文の下書き" },
    { title: "理想のお客様を1人描く", description: "年齢・悩み・情報収集の場所など、具体的な1人を描きましょう", deliverableHint: "ペルソナのメモ" },
    { title: "キャッチコピーを3案考える", description: "商品やサービスの魅力を一言で伝えるコピーを考えましょう", deliverableHint: "キャッチコピー3案" },
  ],
};

export function fallbackMissions(today: string) {
  const seed = Number(today.replace(/-/g, "")) % 3;
  return (["secretary", "planner", "marketer"] as const).map((role, i) => ({ role, ...FALLBACK_MISSIONS[role][(seed + i) % 3] }));
}

/** 今日のミッションを用意（未作成ならAIで生成、失敗時は定型ミッション） */
export async function ensureDailyMissions(store: UserStore): Promise<{ missions: Mission[]; greeting: string; generated: "ai" | "template" | "existing" }> {
  const today = dateInTz(serverConfig.timezone);
  const existing = await store.listMissions({ date: today });
  if (existing.length) return { missions: existing, greeting: "", generated: "existing" };

  let greeting = "";
  let drafts: { title: string; description: string; employeeRole: "secretary" | "planner" | "marketer"; deliverableHint: string }[];
  let generated: "ai" | "template" = "ai";
  try {
    const { context } = await loadCompanyContext(store);
    const recent = (await store.listMissions({ limit: 12 })).map((m) => m.title);
    const out = await runStructured(
      store,
      "missions",
      { task: "missions", system: dailyMissionsSystem(context, recent), messages: [{ role: "user", content: `今日（${today}）のミッションを作成してください。` }], maxTokens: 900 },
      DailyMissionsSchema,
    );
    greeting = out.greeting;
    drafts = out.missions;
  } catch (e) {
    if (e instanceof Error && e.message === "company_not_found") throw e;
    console.warn("[missions] fallback to templates:", e instanceof Error ? e.message : e);
    generated = "template";
    drafts = fallbackMissions(today).map((m) => ({ ...m, employeeRole: m.role }));
  }
  // 同日に並行生成された場合の重複を避ける
  const again = await store.listMissions({ date: today });
  if (again.length) return { missions: again, greeting, generated: "existing" };
  const missions = await store.insertMissions(
    drafts.map((d) => ({ missionDate: today, kind: "daily" as const, title: d.title, description: d.description, employeeRole: d.employeeRole, xpReward: MISSION_XP.daily, deliverableHint: d.deliverableHint })),
  );
  return { missions, greeting, generated };
}

export function companyAgeDays(company: Company, today: string) {
  const created = dateInTz(serverConfig.timezone, new Date(company.createdAt));
  return Math.max(1, Math.round((Date.parse(today) - Date.parse(created)) / 86400000) + 1);
}
