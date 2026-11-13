import "server-only";

export type AITask = "interview" | "ideas" | "plan" | "chat" | "task" | "meeting" | "missions" | "summary";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequest {
  task: AITask;
  system: string;
  messages: ChatMsg[];
  maxTokens: number;
  json?: boolean;
  /** プロバイダーに送られないローカル情報（モックの応答生成にのみ使用） */
  meta?: Record<string, unknown>;
}

export interface AIResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  readonly name: string;
  generate(req: AIRequest): Promise<AIResult>;
}

export class AIConfigError extends Error {}
