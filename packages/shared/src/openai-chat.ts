import OpenAI from "openai";
import { getOpenAiModel } from "./openai-model";

export type OpenAiChatMessage = {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
};

export type OpenAiChatOptions = {
  apiKey: string;
  model?: string;
  messages: OpenAiChatMessage[];
  jsonMode?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
};

export type OpenAiChatResult = {
  content: string | null;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

/** GPT-5.x models reject non-default temperature. */
export function modelSupportsTemperature(model: string): boolean {
  const m = model.toLowerCase();
  if (m.startsWith("gpt-5")) return false;
  if (m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) return false;
  return true;
}

export function isDevMockAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_MOCK_SCRIPT === "true"
  );
}

export async function createOpenAiChatCompletion(
  options: OpenAiChatOptions
): Promise<OpenAiChatResult> {
  const model = options.model?.trim() || getOpenAiModel();
  const openai = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? Number(process.env.OPENAI_TIMEOUT_MS ?? 55_000),
    maxRetries: options.maxRetries ?? 1,
  });

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model,
    messages: options.messages.map((m) => ({
      role: m.role === "developer" ? "developer" : m.role,
      content: m.content,
    })),
    ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  };

  const completion = await openai.chat.completions.create(params);
  const content = completion.choices[0]?.message?.content ?? null;

  return {
    content,
    model,
    usage: completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens ?? 0,
          completion_tokens: completion.usage.completion_tokens ?? 0,
          total_tokens: completion.usage.total_tokens ?? 0,
        }
      : undefined,
  };
}
