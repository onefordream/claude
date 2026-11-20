// AIコーチ：計測データから、その人に合わせた解説と練習計画を Claude に書いてもらう。
// 入力はアプリが計算した数値だけ。文字列は受け取らず、ここで数値と決まった値に組み直す
// （利用者が送る自由な文章をモデルに渡さないため）。
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

const CLUBS: Record<string, string> = {
  dr: "ドライバー",
  fw: "フェアウェイウッド",
  ut: "ユーティリティ",
  i7: "7番アイアン",
  pw: "ピッチングウェッジ",
};
const SHAPES = ["hook", "draw", "straight", "fade", "slice"] as const;
const ISSUE_IDS = ["launch_low", "launch_high", "meet", "launch_sd", "slice", "hook", "speed"] as const;

export interface CoachInput {
  club: keyof typeof CLUBS;
  shots: number;
  avgSpeed: number;
  maxSpeed: number;
  avgLaunch: number;
  launchSd: number;
  speedCvPct: number;
  headSpeed: number;
  avgCarry: number;
  maxCarry: number;
  targetLaunch: [number, number];
  shapes: Partial<Record<(typeof SHAPES)[number], number>>;
  scores: { total: number; power: number; launch: number; consistency: number; direction: number | null };
  issues: Array<(typeof ISSUE_IDS)[number]>;
  potential: { now: number; best: number; launch: number; meet: number; speed: number };
  history: Array<{ daysAgo: number; shots: number; avgCarry: number; avgSpeed: number; avgLaunch: number; consistency: number }>;
}

export class InputError extends Error {}

const num = (v: unknown, lo: number, hi: number, name: string): number => {
  const n = typeof v === "number" ? v : Number.NaN;
  if (!Number.isFinite(n) || n < lo || n > hi) throw new InputError(`${name} が範囲外です`);
  return Math.round(n * 10) / 10;
};

/** 受け取った JSON を検証し、数値と決まった値だけの入力に組み直す */
export function parseInput(raw: unknown): CoachInput {
  if (!raw || typeof raw !== "object") throw new InputError("入力がありません");
  const r = raw as Record<string, any>;
  const club = String(r.club);
  if (!(club in CLUBS)) throw new InputError("club が不正です");
  const shapes: CoachInput["shapes"] = {};
  for (const s of SHAPES) if (r.shapes && r.shapes[s] != null) shapes[s] = num(r.shapes[s], 0, 50, `shapes.${s}`);
  const issues = Array.isArray(r.issues) ? r.issues.filter((x: unknown): x is CoachInput["issues"][number] => ISSUE_IDS.includes(x as any)) : [];
  const sc = r.scores ?? {};
  const pot = r.potential ?? {};
  const history = Array.isArray(r.history) ? r.history.slice(0, 8) : [];
  return {
    club: club as CoachInput["club"],
    shots: num(r.shots, 1, 50, "shots"),
    avgSpeed: num(r.avgSpeed, 5, 100, "avgSpeed"),
    maxSpeed: num(r.maxSpeed, 5, 100, "maxSpeed"),
    avgLaunch: num(r.avgLaunch, -20, 70, "avgLaunch"),
    launchSd: num(r.launchSd, 0, 40, "launchSd"),
    speedCvPct: num(r.speedCvPct, 0, 100, "speedCvPct"),
    headSpeed: num(r.headSpeed, 5, 80, "headSpeed"),
    avgCarry: num(r.avgCarry, 0, 450, "avgCarry"),
    maxCarry: num(r.maxCarry, 0, 450, "maxCarry"),
    targetLaunch: [num(r.targetLaunch?.[0], 0, 45, "targetLaunch"), num(r.targetLaunch?.[1], 0, 50, "targetLaunch")],
    shapes,
    scores: {
      total: num(sc.total, 0, 100, "scores.total"),
      power: num(sc.power, 0, 100, "scores.power"),
      launch: num(sc.launch, 0, 100, "scores.launch"),
      consistency: num(sc.consistency, 0, 100, "scores.consistency"),
      direction: sc.direction == null ? null : num(sc.direction, 0, 100, "scores.direction"),
    },
    issues,
    potential: {
      now: num(pot.now, 0, 450, "potential.now"),
      best: num(pot.best, 0, 450, "potential.best"),
      launch: num(pot.launch, 0, 200, "potential.launch"),
      meet: num(pot.meet, 0, 200, "potential.meet"),
      speed: num(pot.speed, 0, 200, "potential.speed"),
    },
    history: history.map((h: any, i: number) => ({
      daysAgo: num(h?.daysAgo, 0, 3650, `history[${i}].daysAgo`),
      shots: num(h?.shots, 1, 50, `history[${i}].shots`),
      avgCarry: num(h?.avgCarry, 0, 450, `history[${i}].avgCarry`),
      avgSpeed: num(h?.avgSpeed, 5, 100, `history[${i}].avgSpeed`),
      avgLaunch: num(h?.avgLaunch, -20, 70, `history[${i}].avgLaunch`),
      consistency: num(h?.consistency, 0, 100, `history[${i}].consistency`),
    })),
  };
}

export const SYSTEM_PROMPT = `あなたは、一般のアマチュアゴルファーを教えるゴルフコーチです。スマートフォンのカメラで測った練習データを読み、今日の練習で何をすればよいかを伝えます。

データについて知っておくこと
- カメラ1台で真横から測っているので、測れているのはボール初速と打ち出し角（上下）だけです。スピン量・左右の打ち出し方向・クラブ軌道は測れていません。
- キャリーは、初速と打ち出し角とクラブごとの標準スピンから計算した推定値です。
- 球筋（フック〜スライス）は、本人が目で見て選んだものです。
- 推定ヘッドスピードは、標準的なミート率から逆算した値です。
- issues は、アプリが数値の基準で見つけた課題の候補です。参考にしつつ、データ全体から優先順位を判断してください。
- potential は、課題を直したときに伸びる推定キャリー（ヤード）です。

書き方
- 渡された数値だけを根拠にしてください。測っていないもの（スピン量、クラブ軌道、フェースの向きなど）を測ったかのように断定しないでください。原因を推測するときは「〜の可能性があります」と書きます。
- 練習場ですぐできる内容にし、回数や目安を具体的に書きます。
- 優先順位は多くても3つまで。いちばん効果が大きいものを最初に置きます。
- 過去の記録があれば、前回からの変化に触れます。良くなった点は具体的にほめます。
- 痛みやけがに関わる助言、医療的な判断はしません。
- 丁寧語で、短く平易に書きます。専門用語を使うときは一言で説明します。`;

/** 返してほしい形（構造化出力） */
export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "priorities", "potential_comment", "next_check"],
  properties: {
    headline: { type: "string", description: "今日のテーマを20文字前後で" },
    summary: { type: "string", description: "今日のデータから分かることを2〜3文で" },
    priorities: {
      type: "array",
      description: "直す順番に、1〜3個",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "why", "drill", "how", "reps", "check"],
        properties: {
          title: { type: "string", description: "課題の名前" },
          why: { type: "string", description: "データのどこからそう言えるか、1〜2文" },
          drill: { type: "string", description: "練習ドリルの名前" },
          how: { type: "string", description: "やり方、2〜3文" },
          reps: { type: "string", description: "回数やセット数" },
          check: { type: "string", description: "うまくいっているかを次の計測のどの数値で確かめるか" },
        },
      },
    },
    potential_comment: { type: "string", description: "伸び代の数字を踏まえた励ましと目標、1〜2文" },
    next_check: { type: "string", description: "次回の計測で見るポイント、1文" },
  },
} as const;

export interface CoachOutput {
  headline: string;
  summary: string;
  priorities: Array<{ title: string; why: string; drill: string; how: string; reps: string; check: string }>;
  potential_comment: string;
  next_check: string;
}

export function buildUserMessage(input: CoachInput): string {
  const data = { ...input, clubName: CLUBS[input.club] };
  return `今日の計測データです（JSON）。これをもとに、今日の練習の指導を書いてください。\n\n${JSON.stringify(data, null, 2)}`;
}

export class CoachRefusal extends Error {}

/** Claude に指導を書いてもらう */
export async function runCoach(client: Anthropic, input: CoachInput): Promise<{ output: CoachOutput; model: string; usage: unknown }> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // 安全分類で断られた場合は、サーバー側で自動的に別モデルに切り替える
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  if (response.stop_reason === "refusal") throw new CoachRefusal("回答できませんでした");
  if (response.stop_reason === "max_tokens") throw new Error("出力が長すぎて途中で切れました");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const output = JSON.parse(text) as CoachOutput;
  return { output, model: response.model, usage: response.usage };
}
