/** OpenAI billing, quota, or rate-limit errors. */
export function isOpenAiCapacityError(err: unknown): boolean {
  const parts: string[] = [];

  if (err && typeof err === "object") {
    if ("message" in err && typeof err.message === "string") {
      parts.push(err.message);
    }
    if ("status" in err && err.status != null) {
      parts.push(String(err.status));
    }
    const nested = (err as { error?: { message?: string; code?: string } }).error;
    if (nested?.message) parts.push(nested.message);
    if (nested?.code) parts.push(nested.code);
  } else {
    parts.push(String(err));
  }

  const msg = parts.join(" ").toLowerCase();
  return (
    /billing hard limit|insufficient_quota|quota exceeded|rate limit|exceeded your current|spending limit|payment required|credit balance|insufficient funds/.test(
      msg
    ) || /\b(402|429)\b/.test(msg)
  );
}

export function describeOpenAiCapacityError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/billing hard limit/i.test(raw)) {
    return "лимит расходов OpenAI исчерпан (billing hard limit)";
  }
  if (/insufficient_quota|quota/i.test(raw)) {
    return "квота OpenAI исчерпана";
  }
  if (/rate limit|429/i.test(raw)) {
    return "превышен rate limit OpenAI";
  }
  return raw.slice(0, 120);
}

export const OPENAI_BILLING_LOG_HINT =
  "Пополните баланс: platform.openai.com → Settings → Billing";
