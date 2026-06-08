import type { PrismaClient } from "@prisma/client";
import {
  createInitialProgress,
  markPipelineStep,
  pipelineProgressSchema,
  setPipelineActiveStep,
  type PipelineStepId,
} from "@reels-factory/shared";

export async function touchJobProgress(
  prisma: PrismaClient,
  jobId: string,
  mode: "start" | "complete",
  stepId: PipelineStepId
): Promise<void> {
  const job = await prisma.reelJob.findUnique({
    where: { id: jobId },
    select: { progressJson: true },
  });
  const progress = pipelineProgressSchema.parse(
    job?.progressJson ?? createInitialProgress()
  );
  const next =
    mode === "start"
      ? setPipelineActiveStep(progress, stepId)
      : markPipelineStep(progress, stepId);
  await prisma.reelJob.update({
    where: { id: jobId },
    data: { progressJson: next },
  });
}
