import {
  appendBillingAlert,
  appendRequestLog,
  estimatePipelineCost,
  formatPipelineCostFooter,
  markPipelineStep,
  recordOpenAiChatUsage,
  recordOpenAiImageUsage,
  recordTavilySearch,
  setPipelineActiveStep,
  type OpenAiChatUsageEntry,
  type OpenAiImageUsageEntry,
  type PipelineLogKind,
  type PipelineProgress,
  type PipelineStepId,
  type RequestLogPayload,
} from "@reels-factory/shared";
import {
  hydrateProgressLogs,
  mutateJobProgress,
  persistJobLog,
  saveProgressMeta,
  stripLogs,
} from "@reels-factory/pipeline-store";
import type { ResearchProgressReporter } from "@reels-factory/product-intel";
import { prisma } from "@/lib/prisma";

async function loadProgress(jobId: string): Promise<PipelineProgress> {
  const job = await prisma.reelJob.findUnique({
    where: { id: jobId },
    select: { progressJson: true },
  });
  return hydrateProgressLogs(prisma, jobId, job?.progressJson);
}

export interface JobProgressReporter extends ResearchProgressReporter {
  logImageUsage: (
    entry: Omit<OpenAiImageUsageEntry, "at">
  ) => Promise<void>;
  logBilling: (text: string, meta?: Record<string, unknown>) => Promise<void>;
  logCostSummary: () => Promise<void>;
  save: (progress: PipelineProgress) => Promise<void>;
  load: () => Promise<PipelineProgress>;
}

export function createJobProgressReporter(
  jobId: string
): JobProgressReporter {
  return {
    async start(stepId: PipelineStepId) {
      await mutateJobProgress(prisma, jobId, (p) =>
        setPipelineActiveStep(p, stepId)
      );
    },
    async complete(stepId: PipelineStepId) {
      await mutateJobProgress(prisma, jobId, (p) =>
        markPipelineStep(p, stepId)
      );
    },
    async log(text: string, kind?: PipelineLogKind) {
      await persistJobLog(prisma, jobId, text, kind);
    },
    async logUsage(entry: Omit<OpenAiChatUsageEntry, "at">) {
      await mutateJobProgress(prisma, jobId, (p) =>
        recordOpenAiChatUsage(p, entry)
      );
    },
    async logImageUsage(entry: Omit<OpenAiImageUsageEntry, "at">) {
      await mutateJobProgress(prisma, jobId, (p) =>
        recordOpenAiImageUsage(p, entry)
      );
    },
    async logBilling(text, meta) {
      await mutateJobProgress(prisma, jobId, (p) =>
        appendBillingAlert(p, text, meta)
      );
    },
    async logCostSummary() {
      const progress = await loadProgress(jobId);
      const summary = estimatePipelineCost(progress.usage);
      const footer = formatPipelineCostFooter(summary);
      if (!footer) return;
      await persistJobLog(
        prisma,
        jobId,
        `итого за job · ${footer}`,
        "usage"
      );
    },
    async logTavilySearch(query?: string) {
      await mutateJobProgress(prisma, jobId, (p) =>
        recordTavilySearch(p, query)
      );
    },
    async logRequest(payload: RequestLogPayload) {
      await mutateJobProgress(prisma, jobId, (p) =>
        appendRequestLog(p, payload)
      );
    },
    async save(progress: PipelineProgress) {
      await saveProgressMeta(prisma, jobId, stripLogs(progress));
    },
    async load() {
      return loadProgress(jobId);
    },
  };
}

export async function hydrateJobProgress(
  jobId: string,
  rawProgress?: unknown
): Promise<PipelineProgress> {
  return hydrateProgressLogs(prisma, jobId, rawProgress);
}
