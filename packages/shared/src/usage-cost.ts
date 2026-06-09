import type {
  OpenAiChatUsageEntry,
  OpenAiImageUsageEntry,
  PipelineUsage,
} from "./pipeline-progress";

/** USD per 1M tokens (approximate; update when OpenAI changes pricing). */
const CHAT_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

/** USD per image request (approximate). */
const IMAGE_USD: Record<string, number> = {
  "gpt-image-1": 0.08,
  "dall-e-3": 0.12,
  "dall-e-2": 0.02,
};

const TAVILY_USD_PER_SEARCH = 0.008;

function matchChatPricing(model: string) {
  const key = Object.keys(CHAT_USD_PER_1M).find((k) =>
    model.toLowerCase().startsWith(k)
  );
  return CHAT_USD_PER_1M[key ?? "gpt-4o"];
}

function matchImagePricing(model: string): number {
  const key = Object.keys(IMAGE_USD).find((k) =>
    model.toLowerCase().startsWith(k)
  );
  return IMAGE_USD[key ?? "gpt-image-1"];
}

export function estimateChatCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const p = matchChatPricing(model);
  return (
    (promptTokens * p.input + completionTokens * p.output) / 1_000_000
  );
}

export function estimateImageCostUsd(
  model: string,
  mode?: OpenAiImageUsageEntry["mode"]
): number {
  if (mode === "fallback") return 0;
  return matchImagePricing(model);
}

export function formatUsd(amount: number): string {
  if (amount <= 0) return "$0";
  if (amount < 0.01) return `≈ $${amount.toFixed(4)}`;
  if (amount < 1) return `≈ $${amount.toFixed(2)}`;
  return `≈ $${amount.toFixed(2)}`;
}

export type PipelineCostSummary = {
  chatPrompt: number;
  chatCompletion: number;
  chatTotal: number;
  chatUsd: number;
  imageCount: number;
  imageAiCount: number;
  imageUsd: number;
  tavilySearches: number;
  tavilyUsd: number;
  totalUsd: number;
};

export function estimatePipelineCost(
  usage: PipelineUsage | undefined
): PipelineCostSummary {
  const u = usage ?? {
    openaiChat: [],
    openaiImages: [],
    tavily: { searchCount: 0 },
  };

  let chatPrompt = 0;
  let chatCompletion = 0;
  let chatTotal = 0;
  let chatUsd = 0;

  for (const e of u.openaiChat) {
    chatPrompt += e.promptTokens;
    chatCompletion += e.completionTokens;
    chatTotal += e.totalTokens;
    chatUsd += estimateChatCostUsd(
      e.model,
      e.promptTokens,
      e.completionTokens
    );
  }

  let imageAiCount = 0;
  let imageUsd = 0;
  for (const e of u.openaiImages) {
    if (e.mode === "fallback" || e.model === "mock" || e.model === "fallback") {
      continue;
    }
    imageAiCount += 1;
    imageUsd += estimateImageCostUsd(e.model, e.mode);
  }

  const tavilySearches = u.tavily.searchCount;
  const tavilyUsd = tavilySearches * TAVILY_USD_PER_SEARCH;

  return {
    chatPrompt,
    chatCompletion,
    chatTotal,
    chatUsd,
    imageCount: u.openaiImages.length,
    imageAiCount,
    imageUsd,
    tavilySearches,
    tavilyUsd,
    totalUsd: chatUsd + imageUsd + tavilyUsd,
  };
}

export function formatPipelineCostFooter(summary: PipelineCostSummary): string {
  const lines: string[] = [];
  if (summary.chatTotal > 0) {
    lines.push(
      `OpenAI chat: ${summary.chatPrompt.toLocaleString("ru-RU")} + ${summary.chatCompletion.toLocaleString("ru-RU")} токенов · ${formatUsd(summary.chatUsd)}`
    );
  }
  if (summary.imageAiCount > 0) {
    lines.push(
      `OpenAI images: ${summary.imageAiCount} запросов · ${formatUsd(summary.imageUsd)}`
    );
  }
  if (summary.imageCount > summary.imageAiCount) {
    lines.push(
      `картинки fallback: ${summary.imageCount - summary.imageAiCount} (бесплатно)`
    );
  }
  if (summary.tavilySearches > 0) {
    lines.push(
      `Tavily: ${summary.tavilySearches} поисков · ${formatUsd(summary.tavilyUsd)}`
    );
  }
  if (summary.totalUsd > 0) {
    lines.push(`итого ≈ ${formatUsd(summary.totalUsd)}`);
  }
  return lines.join(" · ");
}
