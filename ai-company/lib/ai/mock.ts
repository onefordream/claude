import "server-only";
import type { AIProvider, AIRequest, AIResult } from "./provider";
import type { InterviewTopic } from "@/lib/types";

/**
 * 開発・自動テスト専用のモックAI。実際のAIではないことを応答内で明示する。
 * 本番（Vercel production）では使用できない（lib/server/ai.ts で拒否）。
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";

  async generate(req: AIRequest): Promise<AIResult> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const text = this.respond(req, lastUser);
    return {
      text,
      model: "mock-dev",
      inputTokens: Math.ceil((req.system.length + req.messages.reduce((a, m) => a + m.content.length, 0)) / 2),
      outputTokens: Math.ceil(text.length / 2),
    };
  }

  private respond(req: AIRequest, lastUser: string): string {
    const meta = req.meta ?? {};
    switch (req.task) {
      case "interview": {
        const current = meta.currentTopic as InterviewTopic | null;
        const next = meta.nextTopic as InterviewTopic | null;
        const nextQ = (meta.nextQuestion as string) ?? "";
        const captured: Record<string, string> = {};
        if (current && lastUser) captured[current] = lastUser.slice(0, 150);
        return JSON.stringify({
          reply: next ? `（開発用モック）なるほど、ありがとうございます。${nextQ}` : "（開発用モック）たくさん教えていただきありがとうございます。会社の設計に入りますね。",
          captured,
          nextTopic: next,
          done: !next,
          suggestions: [],
        });
      }
      case "ideas":
        return JSON.stringify({
          ideas: [
            { title: "オンライン相談サービス", summary: "得意分野の相談に1回30分で乗るサービス", target: "同じ悩みを持つ初心者", whyYou: "経験をそのまま活かせる", firstStep: "相談メニューを1つ作る" },
            { title: "テンプレート販売", summary: "仕事で使える資料テンプレートを販売", target: "忙しい個人事業主", whyYou: "整理が得意", firstStep: "テンプレートを1つ作る" },
            { title: "学びのコミュニティ", summary: "同じ目標を持つ仲間が集まる月額コミュニティ", target: "一人で続けられない人", whyYou: "人を応援するのが好き", firstStep: "SNSで仲間を募集する投稿案を作る" },
          ],
        });
      case "plan": {
        const idea = (meta.idea as string) || "夢を形にする事業";
        return JSON.stringify({
          companyNameCandidates: ["ドリームスタート", "ミライクラフト", "ネクストワン"],
          companyName: "ドリームスタート",
          tagline: "小さな一歩を、大きな夢へ。",
          concept: `（開発用モック）${idea}を通じて、挑戦したい人の最初の一歩を支える会社です。`,
          philosophy: "誰もが夢に挑戦できる世界をつくる。",
          vision: "1年後、100人の挑戦を支える存在になる。",
          mainBusiness: idea,
          businessMode: "new",
          goals: [
            { title: "最初の商品を完成させる", description: "販売できる形にする", horizon: "1ヶ月" },
            { title: "最初のお客様に届ける", description: "反応を確かめる", horizon: "3ヶ月" },
          ],
          actionPlan: [
            { step: "ターゲットを決める", detail: "誰に届けるかを1人に絞る" },
            { step: "商品を企画する", detail: "最初の商品案を作る" },
            { step: "発信を始める", detail: "SNSで準備の様子を発信" },
          ],
          recommendedEmployees: [
            { role: "secretary", reason: "全体の進行管理" },
            { role: "planner", reason: "商品企画" },
            { role: "marketer", reason: "集客の準備" },
          ],
          firstDayMissions: [
            { title: "今週の目標を1つ決める", description: "ミオと一緒に今週のゴールを決めましょう", employeeRole: "secretary", deliverableHint: "今週の目標1文" },
            { title: "競合を3つ調べる", description: "似たサービスを3つ探して特徴をメモ", employeeRole: "planner", deliverableHint: "競合3つの名前と特徴" },
            { title: "自己紹介投稿案を作る", description: "会社設立を伝える投稿案を作成", employeeRole: "marketer", deliverableHint: "投稿文の下書き" },
          ],
        });
      }
      case "meeting":
        return JSON.stringify({
          opinions: [
            { role: "planner", content: `（開発用モック）「${lastUser.slice(0, 40)}」について、まず販売する商品を1つに絞りましょう。` },
            { role: "marketer", content: "（開発用モック）ターゲットを明確にし、SNSで発信を始めましょう。" },
            { role: "secretary", content: "（開発用モック）では今週の行動計画にまとめます。" },
          ],
          summary: "（開発用モック）商品を1つに絞り、ターゲットを決めて発信を始める方針です。",
          tasks: [
            { title: "商品案を1つに絞る", owner: "planner" },
            { title: "ターゲット像を書き出す", owner: "marketer" },
            { title: "今週の予定を立てる", owner: "secretary" },
          ],
        });
      case "missions":
        return JSON.stringify({
          greeting: "（開発用モック）社長、おはようございます！今日も一歩前進しましょう。",
          missions: [
            { title: "今日の優先タスクを決める", description: "ミオと一緒に今日やることを1つに絞る", employeeRole: "secretary", deliverableHint: "優先タスク1つ" },
            { title: "お客様の悩みを3つ書き出す", description: "ターゲットの悩みを想像して書き出す", employeeRole: "planner", deliverableHint: "悩み3つのメモ" },
            { title: "SNS投稿案を1本作る", description: "リナと一緒に投稿案を作る", employeeRole: "marketer", deliverableHint: "投稿文の下書き" },
          ],
        });
      case "summary":
        return "- （開発用モック）これまでの会話の要約";
      case "task":
        return `## （開発用モックAI）成果物ドラフト\n\nこれは開発モードのサンプル出力です。本番ではAIが会社情報に合わせて作成します。\n\n- 依頼内容: ${lastUser.slice(0, 80)}\n- ステップ1: 目的を決める\n- ステップ2: 小さく試す\n- ステップ3: 振り返る`;
      case "chat":
      default:
        return `（開発用モックAI）「${lastUser.slice(0, 60)}」について承知しました。本番環境では実際のAIが、会社の状況と私の役割に合わせてお答えします。`;
    }
  }
}
