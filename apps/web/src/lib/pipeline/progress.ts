import {
  createInitialProgress,
  markPipelineStep,
  pipelineProgressSchema,
  setPipelineActiveStep,
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
  return pipelineProgressSchema.parse(job.progressJson);
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

export function createJobProgressReporter(
  jobId: string
): ResearchProgressReporter {
  return {
    async start(stepId: PipelineStepId) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, setPipelineActiveStep(progress, stepId));
    },
    async complete(stepId: PipelineStepId) {
      const progress = await loadProgress(jobId);
      await saveProgress(jobId, markPipelineStep(progress, stepId));
    },
  };
}
