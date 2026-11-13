import "server-only";
import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResult } from "./provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string, private model: string) {
    this.client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
  }

  async generate(req: AIRequest): Promise<AIResult> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      max_completion_tokens: req.maxTokens,
      ...(req.json ? { response_format: { type: "json_object" as const } } : {}),
    });
    return {
      text: res.choices[0]?.message?.content ?? "",
      model: res.model,
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    };
  }
}
