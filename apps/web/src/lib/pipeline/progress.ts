import {
  appendBillingAlert,
  appendPipelineLog,
  createInitialProgress,
  estimatePipelineCost,
  formatPipelineCostFooter,
  markPipelineStep,
  parsePipelineProgress,
  recordOpenAiChatUsage,
  recordOpenAiImageUsage,
  recordTavilySearch,
  setPipelineActiveStep,
  type OpenAiChatUsageEntry,
  type OpenAiImageUsageEntry,
  type PipelineLogKind,
  type PipelineProgress,
  type PipelineStepId,
} from "@reels-factory/shared";
import type { ResearchProgressReporter } from "@reels-factory/product-intel";
import { prisma } from "@/lib/prisma";

async function loadProgress(jobId: string): Promise<PipelineProgress> {
  const job = await prisma.reelJob.findUnique({
    where: { id: jobId },
    select: { progressJson: true },
  });
  if (!job?.progressJson) return createInitialProgress();
  return parsePipelineProgress(job.progressJson);
}

async function saveProgress(
  jobId: string,
  progress: PipelineProgress
): Promise<void> {
  await prisma.reelJob.update({
    where: { id: jobId },
    data: { progressJson: progress },
  });
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
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, setPipelineActiveStep(progress, stepId));
    },
    async complete(stepId: PipelineStepId) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, markPipelineStep(progress, stepId));
    },
    async log(text: string, kind?: PipelineLogKind) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, appendPipelineLog(progress, text, kind));
    },
    async logUsage(entry: Omit<OpenAiChatUsageEntry, "at">) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, recordOpenAiChatUsage(progress, entry));
    },
    async logImageUsage(entry: Omit<OpenAiImageUsageEntry, "at">) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, recordOpenAiImageUsage(progress, entry));
    },
    async logBilling(text, meta) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, appendBillingAlert(progress, text, meta));
    },
    async logCostSummary() {
      const progress = await loadProgress(jobId);
      const summary = estimatePipelineCost(progress.usage);
      const footer = formatPipelineCostFooter(summary);
      if (!footer) return;
      await saveProgress(
        jobId,
        appendPipelineLog(progress, `итого за job · ${footer}`, "usage")
      );
    },
    async logTavilySearch(query?: string) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, recordTavilySearch(progress, query));
    },
    async save(progress: PipelineProgress) {
      await saveProgress(jobId, progress);
    },
    async load() {
      return loadProgress(jobId);
    },
  };
}

