import type { EmployeeRole, EmployeeTemplate } from "@/lib/types";

// AI社員テンプレート（表示用・共通）。DBの ai_employee_templates と同じIDを使う。

export const EMPLOYEE_TEMPLATES: EmployeeTemplate[] = [
  {
    id: "secretary",
    role: "secretary",
    defaultName: "ミオ",
    title: "社長秘書",
    personality: "明るく知的。社長の一番の味方で、話をまとめるのが得意。",
    profile: "会社設立から社長を支える秘書。目標と進捗を管理し、社員に仕事を振り分けます。",
    strengths: ["目標管理", "タスク整理", "進捗報告"],
    skills: ["今週の行動計画", "タスク分解", "進捗レポート"],
    capabilities: ["weekly_plan", "task_breakdown", "progress_report"],
    isPro: false,
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: "planner",
    role: "planner",
    defaultName: "カイト",
    title: "企画担当",
    personality: "好奇心旺盛で論理的。アイデアを数字と構造で考えるタイプ。",
    profile: "新規事業や商品の企画、市場・競合の整理、事業計画づくりを担当します。",
    strengths: ["新規事業企画", "商品アイデア", "競合分析"],
    skills: ["商品アイデア出し", "競合分析フレーム", "事業計画書ドラフト"],
    capabilities: ["product_ideas", "competitor_analysis", "business_plan"],
    isPro: false,
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: "marketer",
    role: "marketer",
    defaultName: "リナ",
    title: "マーケティング担当",
    personality: "トレンドに敏感でポジティブ。言葉選びにこだわる表現者。",
    profile: "ターゲット設計、集客戦略、SNS投稿案、販売文章を担当します。",
    strengths: ["SNS投稿案", "集客戦略", "販売文章"],
    skills: ["SNS投稿案の作成", "ペルソナ設計", "セールスコピー"],
    capabilities: ["sns_posts", "target_persona", "sales_copy"],
    isPro: false,
    isAvailable: true,
    sortOrder: 3,
  },
  ...(
    [
      ["sales", "ソウタ", "営業担当", "粘り強く誠実。相手の課題を聞き出すのが得意。", ["営業トーク", "提案書構成"]],
      ["designer", "ユイ", "デザイナー", "感性豊かで丁寧。ブランドの世界観を形にする。", ["ブランドコンセプト", "デザイン指示書"]],
      ["developer", "レン", "Web開発者", "冷静で実装志向。小さく作って早く試す派。", ["LP構成", "技術選定"]],
      ["accountant", "マコト", "経理担当", "几帳面で慎重。数字の裏付けを大切にする。", ["収支シミュレーション", "経費整理"]],
      ["hr", "サクラ", "人事担当", "温かく公平。チームの力を引き出す。", ["採用要件", "組織づくり"]],
      ["support", "ハル", "カスタマーサポート", "穏やかで共感力が高い。", ["FAQ作成", "問い合わせ対応文"]],
      ["legal", "シオン", "法務支援", "誠実で正確。リスクを先回りして指摘する。", ["規約の論点整理", "注意点チェック"]],
      ["video", "ジン", "動画クリエイター", "エネルギッシュで遊び心がある。", ["動画企画", "台本"]],
    ] as [EmployeeRole, string, string, string, string[]][]
  ).map(([role, name, title, personality, strengths], i) => ({
    id: role,
    role,
    defaultName: name,
    title,
    personality,
    profile: `${title}として会社を支えます。（近日採用可能）`,
    strengths,
    skills: strengths,
    capabilities: [],
    isPro: true,
    isAvailable: false,
    sortOrder: 10 + i,
  })),
];

export const STARTER_ROLES: EmployeeRole[] = ["secretary", "planner", "marketer"];

export function templateFor(role: EmployeeRole): EmployeeTemplate {
  return EMPLOYEE_TEMPLATES.find((t) => t.id === role) ?? EMPLOYEE_TEMPLATES[0];
}

/** 業務依頼（AI社員の実機能）。instruction はサーバー側 lib/ai/roles.ts に定義 */
export const CAPABILITIES: Record<
  string,
  { label: string; description: string; role: EmployeeRole; artifactType: string; placeholder: string }
> = {
  weekly_plan: {
    label: "今週の行動計画",
    description: "目標から逆算して今週やることを曜日ごとに整理します",
    role: "secretary",
    artifactType: "action_plan",
    placeholder: "例：今週は平日夜に1時間ずつ使えます",
  },
  task_breakdown: {
    label: "タスク分解",
    description: "大きな目標を、今日できる小さなタスクに分けます",
    role: "secretary",
    artifactType: "task_list",
    placeholder: "例：オンライン講座を開きたい",
  },
  progress_report: {
    label: "進捗レポート",
    description: "これまでの活動とミッションから会社の状況をまとめます",
    role: "secretary",
    artifactType: "report",
    placeholder: "気になっている点があれば書いてください（任意）",
  },
  product_ideas: {
    label: "商品アイデア出し",
    description: "事業に合う商品・サービス案を5つ、特徴と価格帯つきで提案",
    role: "planner",
    artifactType: "product_ideas",
    placeholder: "例：初心者向け、低価格から始めたい",
  },
  competitor_analysis: {
    label: "競合分析フレーム",
    description: "競合の種類と調べるべき観点を整理し、調査シートを作ります",
    role: "planner",
    artifactType: "competitor_analysis",
    placeholder: "知っている競合や参考サービスがあれば書いてください",
  },
  business_plan: {
    label: "事業計画書ドラフト",
    description: "1枚で分かる事業計画（顧客・価値・収益・行動）を作成",
    role: "planner",
    artifactType: "business_plan",
    placeholder: "重視したいこと（例：副業で月5万円）",
  },
  sns_posts: {
    label: "SNS投稿案",
    description: "ターゲットに響く投稿案を3本、ハッシュタグ案つきで作成",
    role: "marketer",
    artifactType: "sns_posts",
    placeholder: "例：Instagram向け、開業前の告知",
  },
  target_persona: {
    label: "ターゲット設計",
    description: "理想のお客様像（ペルソナ）と、届け方を設計します",
    role: "marketer",
    artifactType: "persona",
    placeholder: "想定しているお客様がいれば書いてください",
  },
  sales_copy: {
    label: "販売文章",
    description: "商品ページや告知に使えるセールス文章を作成します",
    role: "marketer",
    artifactType: "sales_copy",
    placeholder: "売りたい商品・サービスを書いてください",
  },
};
