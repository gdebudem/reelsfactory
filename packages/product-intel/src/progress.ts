import type {
  PipelineLogKind,
  PipelineStepId,
  RequestLogPayload,
} from "@reels-factory/shared";

export type OpenAiUsagePayload = {
  label: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ResearchProgressReporter = {
  start: (stepId: PipelineStepId) => void | Promise<void>;
  complete: (stepId: PipelineStepId) => void | Promise<void>;
  log: (text: string, kind?: PipelineLogKind) => void | Promise<void>;
  logTavilySearch?: (query?: string) => void | Promise<void>;
  logRequest?: (payload: RequestLogPayload) => void | Promise<void>;
  logUsage: (entry: OpenAiUsagePayload) => void | Promise<void>;
};

export const noopReporter: ResearchProgressReporter = {
  start: () => undefined,
  complete: () => undefined,
  log: () => undefined,
  logUsage: () => undefined,
};
