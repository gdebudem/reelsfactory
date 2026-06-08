import type { PrismaClient } from "@prisma/client";
import {
  appendPipelineLog,
  createInitialProgress,
  markPipelineStep,
  pipelineProgressSchema,
  recordOpenAiImageUsage,
  setPipelineActiveStep,
  type OpenAiImageUsageEntry,
  type PipelineLogKind,
  type PipelineProgress,
  type PipelineStepId,
} from "@reels-factory/shared";
import { applyWorkerServiceDiagnostics } from "./service-diagnostics.js";

async function loadProgress(
  prisma: PrismaClient,
  jobId: string
): Promise<PipelineProgress> {
  const job = await prisma.reelJob.findUnique({
    where: { id: jobId },
    select: { progressJson: true },
  });
  return pipelineProgressSchema.parse(
    job?.progressJson ?? createInitialProgress()
  );
}

async function saveProgress(
  prisma: PrismaClient,
  jobId: string,
  progress: PipelineProgress
): Promise<void> {
  await prisma.reelJob.update({
    where: { id: jobId },
    data: { progressJson: progress },
  });
}

export async function ensureWorkerServiceDiagnostics(
  prisma: PrismaClient,
  jobId: string
): Promise<void> {
  const progress = await loadProgress(prisma, jobId);
  const hasWorkerLogs = progress.logs.some(
    (l) => l.kind === "service" && l.meta?.runtime === "Railway"
  );
  if (hasWorkerLogs) return;
  await saveProgress(
    prisma,
    jobId,
    applyWorkerServiceDiagnostics(progress)
  );
}

export async function appendJobLog(
  prisma: PrismaClient,
  jobId: string,
  text: string,
  kind: PipelineLogKind = "info",
  meta?: Record<string, unknown>
): Promise<void> {
  const progress = await loadProgress(prisma, jobId);
  await saveProgress(
    prisma,
    jobId,
    appendPipelineLog(progress, text, kind, meta)
  );
}

export async function appendJobImageUsage(
  prisma: PrismaClient,
  jobId: string,
  entry: Omit<OpenAiImageUsageEntry, "at">
): Promise<void> {
  const progress = await loadProgress(prisma, jobId);
  await saveProgress(prisma, jobId, recordOpenAiImageUsage(progress, entry));
}

export async function touchJobProgress(
  prisma: PrismaClient,
  jobId: string,
  mode: "start" | "complete",
  stepId: PipelineStepId
): Promise<void> {
  const progress = await loadProgress(prisma, jobId);
  const next =
    mode === "start"
      ? setPipelineActiveStep(progress, stepId)
      : markPipelineStep(progress, stepId);
  await saveProgress(prisma, jobId, next);
}
