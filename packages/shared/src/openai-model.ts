/** Default chat model (GPT-5 family). Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}
