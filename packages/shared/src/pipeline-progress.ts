import { z } from "zod";
import {
  estimateChatCostUsd,
  estimateImageCostUsd,
  estimatePipelineCost,
  formatUsd,
} from "./usage-cost";

const sceneStyleSchema = z.enum([
  "headline",
  "subheadline",
  "bullet",
  "review",
  "cta",
  "hook",
  "pain",
  "proof",
]);

export const PIPELINE_STEP_IDS = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
  "write_script",
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
  "assemble_video",
] as const;

export type PipelineStepId = (typeof PIPELINE_STEP_IDS)[number];

const PRE_RENDER_STEPS: PipelineStepId[] = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
  "write_script",
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
];

export const PIPELINE_STEP_LABELS: Record<PipelineStepId, string> = {
  search_marketplaces: "Ищем страницы товара на маркетплейсах",
  search_ozon: "Ищем на Ozon",
  search_wildberries: "Ищем на Wildberries",
  search_mvideo: "Ищем в М.Видео",
  read_descriptions: "Читаем описание",
  read_reviews: "Читаем отзывы",
  extract_benefits: "Выделяем преимущества",
  write_script: "Пишем сценарий",
  generate_image_1: "Генерируем картинку 1/4",
  generate_image_2: "Генерируем картинку 2/4",
  generate_image_3: "Генерируем картинку 3/4",
  generate_image_4: "Генерируем картинку 4/4",
  assemble_video: "Собираем видео",
};

/** Casual log lines shown in the wizard log panel (mockup style). */
export const PIPELINE_LOG_ON_START: Partial<Record<PipelineStepId, string>> = {
  search_marketplaces: "ищу страницы товара на маркетплейсах",
  generate_image_1: "генерирую картинки",
  assemble_video: "собираю видео",
};

export const PIPELINE_LOG_ON_DONE: Partial<Record<PipelineStepId, string>> = {
  search_marketplaces: "нашёл страницы на маркетплейсах",
  search_ozon: "нашёл на Ozon",
  search_wildberries: "нашёл на Wildberries",
  search_mvideo: "нашёл в М.Видео",
  read_descriptions: "читаю описания",
  read_reviews: "читаю отзывы",
  extract_benefits: "выделяю преимущества",
  write_script: "пишу сценарий",
  generate_image_1: "картинка 1/4 готова",
  generate_image_2: "картинка 2/4 готова",
  generate_image_3: "картинка 3/4 готова",
  generate_image_4: "картинка 4/4 готова",
  assemble_video: "видео готово",
};

export const pipelineLogKindSchema = z.enum([
  "info",
  "service",
  "request",
  "usage",
  "billing",
  "error",
]);

export type PipelineLogKind = z.infer<typeof pipelineLogKindSchema>;

export const pipelineLogEntrySchema = z.object({
  at: z.string(),
  text: z.string(),
  kind: pipelineLogKindSchema.optional(),
  meta: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export type PipelineLogEntry = z.infer<typeof pipelineLogEntrySchema>;

export const openAiChatUsageEntrySchema = z.object({
  label: z.string(),
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  at: z.string(),
});

export type OpenAiChatUsageEntry = z.infer<typeof openAiChatUsageEntrySchema>;

export const openAiImageUsageEntrySchema = z.object({
  sceneIndex: z.number().int().min(0).max(3),
  model: z.string(),
  quality: z.string(),
  size: z.string(),
  mode: z.enum(["generate", "edit", "fallback"]).optional(),
  at: z.string(),
});

export type OpenAiImageUsageEntry = z.infer<typeof openAiImageUsageEntrySchema>;

export const pipelineUsageSchema = z.object({
  openaiChat: z.array(openAiChatUsageEntrySchema).default([]),
  openaiImages: z.array(openAiImageUsageEntrySchema).default([]),
  tavily: z
    .object({
      searchCount: z.number().int().nonnegative().default(0),
    })
    .default({ searchCount: 0 }),
  updatedAt: z.string().optional(),
});

export type PipelineUsage = z.infer<typeof pipelineUsageSchema>;

export const pipelineProgressSchema = z.object({
  currentStep: z.enum(PIPELINE_STEP_IDS).optional(),
  completedSteps: z.array(z.enum(PIPELINE_STEP_IDS)).default([]),
  imageProgress: z.number().int().min(0).max(4).default(0),
  logs: z.array(pipelineLogEntrySchema).default([]),
  usage: pipelineUsageSchema.optional(),
  updatedAt: z.string().optional(),
});

export type PipelineProgress = z.infer<typeof pipelineProgressSchema>;

function sanitizeLogMeta(
  meta?: Record<string, unknown>
): Record<string, string | number | boolean | null> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    } else {
      out[key] = String(value);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function preprocessProgressJson(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.logs)) return raw;

  return {
    ...obj,
    logs: obj.logs.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return entry;
      }
      const log = entry as Record<string, unknown>;
      if (!log.meta || typeof log.meta !== "object" || Array.isArray(log.meta)) {
        return entry;
      }
      const meta = sanitizeLogMeta(log.meta as Record<string, unknown>);
      if (meta) return { ...log, meta };
      const { meta: _removed, ...rest } = log;
      return rest;
    }),
  };
}

/** Safe parse for progressJson from DB (strips invalid meta fields). */
export function parsePipelineProgress(raw: unknown): PipelineProgress {
  return pipelineProgressSchema.parse(preprocessProgressJson(raw));
}

export function maskSecret(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "не задан";
  if (trimmed.length <= 6) return "…" + trimmed.slice(-2);
  const prefix = trimmed.startsWith("sk-")
    ? "sk-"
    : trimmed.startsWith("tvly-")
      ? "tvly-"
      : "";
  return `${prefix}…${trimmed.slice(-4)}`;
}

function formatTokenCount(n: number): string {
  return n.toLocaleString("ru-RU");
}

function ensureUsage(progress: PipelineProgress): PipelineUsage {
  return (
    progress.usage ?? {
      openaiChat: [],
      openaiImages: [],
      tavily: { searchCount: 0 },
    }
  );
}

export function appendPipelineLog(
  progress: PipelineProgress,
  text: string,
  kind: PipelineLogKind = "info",
  meta?: Record<string, unknown>
): PipelineProgress {
  const logs = progress.logs ?? [];
  const last = logs[logs.length - 1];
  if (last?.text === text && last?.kind === kind) {
    return pipelineProgressSchema.parse({
      ...progress,
      updatedAt: new Date().toISOString(),
    });
  }
  const cleanMeta = sanitizeLogMeta(meta);
  return pipelineProgressSchema.parse({
    ...progress,
    logs: [
      ...logs,
      {
        at: new Date().toISOString(),
        text,
        kind,
        ...(cleanMeta ? { meta: cleanMeta } : {}),
      },
    ],
    updatedAt: new Date().toISOString(),
  });
}

export function appendServiceLog(
  progress: PipelineProgress,
  params: {
    service: string;
    account?: string;
    runtime?: string;
    detail?: string;
  }
): PipelineProgress {
  const parts = [params.service];
  if (params.account) parts.push(`аккаунт ${params.account}`);
  if (params.runtime) parts.push(params.runtime);
  if (params.detail) parts.push(params.detail);
  const text = parts.join(" · ");
  const meta: Record<string, string> = { service: params.service };
  if (params.account !== undefined) meta.account = params.account;
  if (params.runtime !== undefined) meta.runtime = params.runtime;
  if (params.detail !== undefined) meta.detail = params.detail;
  return appendPipelineLog(progress, text, "service", meta);
}

export function appendUsageLog(
  progress: PipelineProgress,
  text: string,
  meta?: Record<string, unknown>
): PipelineProgress {
  return appendPipelineLog(progress, text, "usage", meta);
}

export function appendBillingAlert(
  progress: PipelineProgress,
  text: string,
  meta?: Record<string, unknown>
): PipelineProgress {
  return appendPipelineLog(progress, text, "billing", meta);
}

export type RequestLogPayload = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  service: string;
  target?: string;
  body?: string;
  status?: number;
  result?: string;
  runtime?: string;
};

function shortenRequestUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "") || "/";
    return `${u.hostname}${path}`;
  } catch {
    return url;
  }
}

export function formatRequestLogText(payload: RequestLogPayload): string {
  const parts = [
    `${payload.method} ${shortenRequestUrl(payload.url)}`,
    payload.service,
  ];
  if (payload.target) parts.push(payload.target);
  if (payload.body) parts.push(payload.body);
  if (payload.runtime) parts.push(payload.runtime);
  let text = parts.join(" · ");
  if (payload.status !== undefined) text += ` → ${payload.status}`;
  if (payload.result) text += ` · ${payload.result}`;
  return text;
}

export function appendRequestLog(
  progress: PipelineProgress,
  payload: RequestLogPayload
): PipelineProgress {
  const text = formatRequestLogText(payload);
  const meta: Record<string, string | number> = {
    method: payload.method,
    url: payload.url,
    service: payload.service,
  };
  if (payload.target !== undefined) meta.target = payload.target;
  if (payload.status !== undefined) meta.status = payload.status;
  if (payload.runtime !== undefined) meta.runtime = payload.runtime;
  return appendPipelineLog(progress, text, "request", meta);
}

export function recordOpenAiChatUsage(
  progress: PipelineProgress,
  entry: Omit<OpenAiChatUsageEntry, "at"> & { at?: string }
): PipelineProgress {
  const at = entry.at ?? new Date().toISOString();
  const usage = ensureUsage(progress);
  const full: OpenAiChatUsageEntry = {
    label: entry.label,
    model: entry.model,
    promptTokens: entry.promptTokens,
    completionTokens: entry.completionTokens,
    totalTokens: entry.totalTokens,
    at,
  };
  const costUsd = estimateChatCostUsd(
    entry.model,
    entry.promptTokens,
    entry.completionTokens
  );
  const text = `${entry.label} · ${formatTokenCount(entry.promptTokens)} prompt + ${formatTokenCount(entry.completionTokens)} completion = ${formatTokenCount(entry.totalTokens)} · ${entry.model} · ${formatUsd(costUsd)}`;
  return appendUsageLog(
    {
      ...progress,
      usage: {
        ...usage,
        openaiChat: [...usage.openaiChat, full],
        updatedAt: at,
      },
    },
    text,
    {
      label: entry.label,
      model: entry.model,
      totalTokens: entry.totalTokens,
      costUsd: Math.round(costUsd * 10000) / 10000,
    }
  );
}

export function recordOpenAiImageUsage(
  progress: PipelineProgress,
  entry: Omit<OpenAiImageUsageEntry, "at"> & { at?: string }
): PipelineProgress {
  const at = entry.at ?? new Date().toISOString();
  const usage = ensureUsage(progress);
  const full: OpenAiImageUsageEntry = {
    sceneIndex: entry.sceneIndex,
    model: entry.model,
    quality: entry.quality,
    size: entry.size,
    mode: entry.mode,
    at,
  };
  const modeLabel =
    entry.mode === "edit"
      ? "reference edit"
      : entry.mode === "fallback"
        ? "fallback"
        : "generate";
  const costUsd =
    entry.mode === "fallback" || entry.model === "mock" || entry.model === "fallback"
      ? 0
      : estimateImageCostUsd(entry.model, entry.mode);
  const costPart =
    costUsd > 0 ? ` · ${formatUsd(costUsd)}` : entry.mode === "fallback" ? " · $0" : "";
  const text = `картинка ${entry.sceneIndex + 1}/4 · ${entry.model} · ${entry.quality} · ${entry.size} · ${modeLabel}${costPart}`;
  return appendUsageLog(
    {
      ...progress,
      usage: {
        ...usage,
        openaiImages: [...usage.openaiImages, full],
        updatedAt: at,
      },
    },
    text,
    {
      sceneIndex: entry.sceneIndex,
      model: entry.model,
      costUsd: Math.round(costUsd * 10000) / 10000,
    }
  );
}

export function recordTavilySearch(
  progress: PipelineProgress,
  query?: string
): PipelineProgress {
  const usage = ensureUsage(progress);
  const count = usage.tavily.searchCount + 1;
  const shortQuery = query
    ? query.length > 48
      ? `${query.slice(0, 45)}…`
      : query
    : undefined;
  const costUsd = count * 0.008;
  const text = shortQuery
    ? `Tavily поиск #${count}: ${shortQuery} · ${formatUsd(costUsd)}`
    : `Tavily · ${count} поисков · ${formatUsd(costUsd)}`;
  return appendUsageLog(
    {
      ...progress,
      usage: {
        ...usage,
        tavily: { searchCount: count },
        updatedAt: new Date().toISOString(),
      },
    },
    text,
    { searchCount: count, costUsd: Math.round(costUsd * 10000) / 10000 }
  );
}

export function resetPipelineSteps(
  progress: PipelineProgress
): PipelineProgress {
  return pipelineProgressSchema.parse({
    ...progress,
    currentStep: undefined,
    completedSteps: [],
    imageProgress: 0,
    updatedAt: new Date().toISOString(),
  });
}

export function mergeWizardLogs(
  progress: PipelineProgress,
  wizardLogs: PipelineLogEntry[]
): PipelineProgress {
  const merged = [...(progress.logs ?? [])];
  for (const entry of wizardLogs) {
    const last = merged[merged.length - 1];
    if (last?.text === entry.text && last?.kind === (entry.kind ?? "info")) {
      continue;
    }
    merged.push({
      at: entry.at,
      text: entry.text,
      kind: entry.kind ?? "info",
      ...(entry.meta ? { meta: entry.meta } : {}),
    });
  }
  return pipelineProgressSchema.parse({
    ...progress,
    logs: merged,
    updatedAt: new Date().toISOString(),
  });
}

export function summarizePipelineUsage(usage: PipelineUsage | undefined) {
  const c = estimatePipelineCost(usage);
  return {
    chatPrompt: c.chatPrompt,
    chatCompletion: c.chatCompletion,
    chatTotal: c.chatTotal,
    chatUsd: c.chatUsd,
    imageCount: c.imageCount,
    imageAiCount: c.imageAiCount,
    imageUsd: c.imageUsd,
    tavilySearches: c.tavilySearches,
    tavilyUsd: c.tavilyUsd,
    totalUsd: c.totalUsd,
  };
}

function logOnStart(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  const text = PIPELINE_LOG_ON_START[stepId];
  return text ? appendPipelineLog(progress, text) : progress;
}

function logOnDone(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  const text = PIPELINE_LOG_ON_DONE[stepId];
  return text ? appendPipelineLog(progress, text) : progress;
}

export const sceneImageSchema = z.object({
  sceneIndex: z.number().int().min(0).max(3),
  style: sceneStyleSchema.optional(),
  text: z.string(),
  imageUrl: z.string().url(),
  prompt: z.string().optional(),
});

export type SceneImage = z.infer<typeof sceneImageSchema>;

export const sceneImagesSchema = z.array(sceneImageSchema).max(4);

export function createInitialProgress(): PipelineProgress {
  return pipelineProgressSchema.parse({
    completedSteps: [],
    imageProgress: 0,
    logs: [],
    usage: {
      openaiChat: [],
      openaiImages: [],
      tavily: { searchCount: 0 },
    },
    updatedAt: new Date().toISOString(),
  });
}

export function setPipelineActiveStep(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  const withLog = logOnStart(progress, stepId);
  return pipelineProgressSchema.parse({
    ...withLog,
    currentStep: stepId,
    updatedAt: new Date().toISOString(),
  });
}

export function markPipelineStep(
  progress: PipelineProgress,
  stepId: PipelineStepId
): PipelineProgress {
  const completed = progress.completedSteps.includes(stepId)
    ? progress.completedSteps
    : [...progress.completedSteps, stepId];

  const imageProgress =
    stepId === "generate_image_1"
      ? 1
      : stepId === "generate_image_2"
        ? 2
        : stepId === "generate_image_3"
          ? 3
          : stepId === "generate_image_4"
            ? 4
            : progress.imageProgress;

  const withLog = logOnDone(progress, stepId);

  return pipelineProgressSchema.parse({
    ...withLog,
    currentStep: undefined,
    completedSteps: completed,
    imageProgress,
    updatedAt: new Date().toISOString(),
  });
}

/** User can approve video render after storyboard or AI images are ready. */
export function isApprovalReadyStatus(status: string): boolean {
  return status === "images_ready" || status === "storyboard_ready";
}

/** Pipeline finished research/script/images prep (waiting for user or render). */
export function isPreviewReadyStatus(status: string): boolean {
  return isApprovalReadyStatus(status);
}

export type PipelineStepState = "pending" | "active" | "done";

const RESEARCH_STEPS: PipelineStepId[] = [
  "search_marketplaces",
  "search_ozon",
  "search_wildberries",
  "search_mvideo",
  "read_descriptions",
  "read_reviews",
  "extract_benefits",
];
const IMAGE_STEPS: PipelineStepId[] = [
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
];

function statusDefaultActiveStep(status: string): PipelineStepId | null {
  if (status === "paid" || status === "queued") return "search_marketplaces";
  if (status === "researching") return "search_marketplaces";
  if (status === "scripting") return "write_script";
  if (status === "generating_images" || status === "image_generating") {
    return "generate_image_1";
  }
  if (status === "render_queued" || status === "rendering") {
    return "assemble_video";
  }
  return null;
}

function statusDefaultCompleted(status: string): PipelineStepId[] {
  if (status === "scripting") return [...RESEARCH_STEPS];
  if (status === "generating_images" || status === "image_generating") {
    return [...RESEARCH_STEPS, "write_script"];
  }
  if (isPreviewReadyStatus(status)) return [...PRE_RENDER_STEPS];
  if (status === "render_queued" || status === "rendering") {
    return [...PRE_RENDER_STEPS];
  }
  if (status === "ready") return [...PIPELINE_STEP_IDS];
  return [];
}

export function resolvePipelineStepState(
  stepId: PipelineStepId,
  progress: PipelineProgress | null | undefined,
  jobStatus: string
): PipelineStepState {
  const completed = new Set([
    ...statusDefaultCompleted(jobStatus),
    ...(progress?.completedSteps ?? []),
  ]);

  if (completed.has(stepId)) return "done";

  const active =
    progress?.currentStep ??
    statusDefaultActiveStep(jobStatus);

  if (active === stepId) return "active";

  if (
    (jobStatus === "generating_images" || jobStatus === "image_generating") &&
    IMAGE_STEPS.includes(stepId) &&
    (progress?.imageProgress ?? 0) > 0
  ) {
    const idx = IMAGE_STEPS.indexOf(stepId);
    const doneCount = progress?.imageProgress ?? 0;
    if (idx < doneCount) return "done";
    if (idx === doneCount) return "active";
  }

  if (
    jobStatus === "researching" &&
    RESEARCH_STEPS.includes(stepId) &&
    !progress?.currentStep
  ) {
    const firstPending = RESEARCH_STEPS.find((s) => !completed.has(s));
    if (stepId === firstPending) return "active";
  }

  return "pending";
}

export function getActivePipelineLogMessage(
  progress: PipelineProgress | null | undefined,
  jobStatus: string
): string | null {
  const stepId =
    progress?.currentStep ?? statusDefaultActiveStep(jobStatus);
  if (!stepId) return null;
  return (
    PIPELINE_LOG_ON_START[stepId] ??
    PIPELINE_STEP_LABELS[stepId] ??
    null
  );
}
