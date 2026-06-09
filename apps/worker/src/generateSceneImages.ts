import type { PrismaClient } from "@prisma/client";
import { generateSceneImages } from "@reels-factory/scene-images";
import type { ProductCard, ReelScript, SceneImage } from "@reels-factory/shared";
import type { PipelineStepId } from "@reels-factory/shared";
import {
  appendJobBillingLog,
  appendJobCostSummary,
  appendJobImageUsage,
  appendJobLog,
  appendJobRequestLog,
  ensureWorkerServiceDiagnostics,
  touchJobProgress,
} from "./jobProgress.js";
import { loadPromptOverrides } from "./prompt-overrides.js";
import { uploadToStorage } from "./storage.js";

const IMAGE_STEPS: PipelineStepId[] = [
  "generate_image_1",
  "generate_image_2",
  "generate_image_3",
  "generate_image_4",
];

export async function processGenerateSceneImages(
  prisma: PrismaClient,
  jobId: string
): Promise<void> {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const product = job.productJson as ProductCard;
  const script = job.scriptJson as ReelScript | null;
  if (!script) throw new Error("Cannot generate images without script");

  const existing = job.sceneImagesJson as SceneImage[] | null;
  if (existing && existing.length >= 4) {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "images_ready" },
    });
    return;
  }

  console.log(`[worker] Generating 4 scene images for ${jobId}`);
  await ensureWorkerServiceDiagnostics(prisma, jobId);
  await appendJobLog(prisma, jobId, "worker · генерация 4 AI-картинок");

  const promptOverrides = await loadPromptOverrides(prisma);

  const { scenes: sceneImages, usedProductPhotoFallback, fallbackReason } =
    await generateSceneImages(
      jobId,
      product,
      script,
      uploadToStorage,
      async (sceneIndex, phase, meta) => {
        const stepId = IMAGE_STEPS[sceneIndex];
        if (!stepId) return;
        await touchJobProgress(prisma, jobId, phase, stepId);
        if (phase === "complete" && meta) {
          await appendJobImageUsage(prisma, jobId, {
            sceneIndex,
            model: meta.model,
            quality: meta.quality,
            size: meta.size,
            mode: meta.mode,
          });
        }
      },
      promptOverrides,
      (payload) => appendJobRequestLog(prisma, jobId, payload)
    );

  if (usedProductPhotoFallback && fallbackReason) {
    if (fallbackReason.includes("OpenAI биллинг")) {
      await appendJobBillingLog(prisma, jobId, fallbackReason);
    } else {
      await appendJobLog(prisma, jobId, fallbackReason);
    }
  }

  await appendJobCostSummary(prisma, jobId);

  await prisma.reelJob.update({
    where: { id: jobId },
    data: {
      sceneImagesJson: sceneImages,
      status: "images_ready",
    },
  });

  console.log(`[worker] Scene images ready for ${jobId}`);
}
