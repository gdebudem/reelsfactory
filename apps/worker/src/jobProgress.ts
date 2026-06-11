import type { PrismaClient } from "@prisma/client";
import {
  appendBillingAlert,
  appendRequestLog,
  createInitialProgress,
  estimatePipelineCost,
  formatPipelineCostFooter,
  markPipelineStep,
  parsePipelineProgress,
  recordOpenAiImageUsage,
  setPipelineActiveStep,
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
} from "@reels-factory/pipeline-store";
import { applyWorkerServiceDiagnostics } from "./service-diagnostics.js";

async function safePersist(
  label: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn(`[worker] ${label}:`, err instanceof Error ? err.message : err);
  }
}

async function loadProgress(
  prisma: PrismaClient,
  jobId: string
): Promise<PipelineProgress> {
  const job = await prisma.reelJob.findUnique({
    where: { id: jobId },
    select: { progressJson: true },
  });
  const raw = job?.progressJson ?? createInitialProgress();
  try {
    return await hydrateProgressLogs(prisma, jobId, raw);
  } catch (err) {
    console.warn(
      "[worker] JobPipelineLog unavailable, using progressJson:",
      err instanceof Error ? err.message : err
    );
    return parsePipelineProgress(raw);
  }
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
  const logCountBefore = progress.logs.length;
  const next = applyWorkerServiceDiagnostics(progress);
  for (const entry of next.logs.slice(logCountBefore)) {
    await safePersist("service diagnostics log", () =>
      persistJobLog(prisma, jobId, entry.text, entry.kind, entry.meta)
    );
  }
}

export async function appendJobLog(
  prisma: PrismaClient,
  jobId: string,
  text: string,
  kind: PipelineLogKind = "info",
  meta?: Record<string, unknown>
): Promise<void> {
  await safePersist("append job log", () =>
    persistJobLog(prisma, jobId, text, kind, meta)
  );
}

export async function appendJobRequestLog(
  prisma: PrismaClient,
  jobId: string,
  payload: RequestLogPayload
): Promise<void> {
  await safePersist("request log", () =>
    mutateJobProgress(prisma, jobId, (p) => appendRequestLog(p, payload))
  );
}

export async function appendJobBillingLog(
  prisma: PrismaClient,
  jobId: string,
  text: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await safePersist("billing log", () =>
    mutateJobProgress(prisma, jobId, (p) =>
      appendBillingAlert(p, text, meta)
    )
  );
}

export async function appendJobCostSummary(
  prisma: PrismaClient,
  jobId: string
): Promise<void> {
  const progress = await loadProgress(prisma, jobId);
  const summary = estimatePipelineCost(progress.usage);
  if (summary.totalUsd <= 0 && summary.chatTotal === 0) return;
  const footer = formatPipelineCostFooter(summary);
  if (!footer) return;
  await safePersist("cost summary", () =>
    persistJobLog(prisma, jobId, `итого за job · ${footer}`, "usage")
  );
}

export async function appendJobImageUsage(
  prisma: PrismaClient,
  jobId: string,
  entry: Omit<OpenAiImageUsageEntry, "at">
): Promise<void> {
  await safePersist("image usage", () =>
    mutateJobProgress(prisma, jobId, (p) =>
      recordOpenAiImageUsage(p, entry)
    )
  );
}

export async function appendJobFailureLog(
  prisma: PrismaClient,
  jobId: string,
  message: string
): Promise<void> {
  await safePersist("failure log", () =>
    persistJobLog(prisma, jobId, `ошибка · ${message}`, "error")
  );
}

export async function appendJobCompleteLog(
  prisma: PrismaClient,
  jobId: string
): Promise<void> {
  try {
    const has = await prisma.jobPipelineLog.findFirst({
      where: { reelJobId: jobId, text: { contains: "pipeline завершён" } },
      select: { id: true },
    });
    if (has) return;
  } catch {
    /* table may be missing during migration */
  }
  await safePersist("complete log", () =>
    persistJobLog(prisma, jobId, "pipeline завершён · видео готово", "info")
  );
}

export async function touchJobProgress(
  prisma: PrismaClient,
  jobId: string,
  mode: "start" | "complete",
  stepId: PipelineStepId
): Promise<void> {
  await safePersist("progress step", () =>
    mutateJobProgress(prisma, jobId, (p) =>
      mode === "start"
        ? setPipelineActiveStep(p, stepId)
        : markPipelineStep(p, stepId)
    )
  );
}
