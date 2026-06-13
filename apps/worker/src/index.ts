import "dotenv/config";
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import {
  buildS3PutRequestLog,
  isDevMockAllowed,
  loadWorkerSecret,
  type ProductCard,
  type ReelScript,
  type SceneImage,
} from "@reels-factory/shared";
import {
  isProductParsePoor,
  parseProductUrl,
} from "@reels-factory/product-parser";
import { ensureMusicAssets } from "./ensureMusic.js";
import { getRenderMode, renderReelToS3 } from "./render.js";
import { hasStorageConfigured } from "./storage.js";
import { processGenerateSceneImages } from "./generateSceneImages.js";
import {
  appendJobCompleteLog,
  appendJobFailureLog,
  appendJobLog,
  appendJobRequestLog,
  ensureWorkerServiceDiagnostics,
  touchJobProgress,
} from "./jobProgress.js";
import { startPostgresQueueWorker } from "./postgres-queue.js";

const prisma = new PrismaClient();
const QUEUE_NAME = "render-reel";

function getQueueMode(): "postgres" | "redis" {
  const mode = process.env.QUEUE_MODE?.trim().toLowerCase();
  return mode === "redis" ? "redis" : "postgres";
}

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set");
  }

  const parsed = new URL(redisUrl);
  const isTls =
    parsed.protocol === "rediss:" ||
    parsed.hostname.includes("upstash.io") ||
    process.env.REDIS_TLS === "true";

  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: isTls ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

async function refreshProduct(
  jobId: string,
  job: { productUrl: string; productJson: unknown }
) {
  let product = job.productJson as ProductCard;

  if (isProductParsePoor(product)) {
    console.log(`[worker] Re-parsing poor product data for ${jobId}`);
    try {
      product = await parseProductUrl(job.productUrl);
      await prisma.reelJob.update({
        where: { id: jobId },
        data: { productJson: product },
      });
    } catch (err) {
      console.warn("[worker] Re-parse failed, using stored product:", err);
    }
  }

  return product;
}

async function processRender(jobId: string) {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const product = await refreshProduct(jobId, job);
  const script = job.scriptJson as ReelScript | null;

  if (!script) {
    throw new Error("Cannot render without approved storyboard script");
  }

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "rendering" },
  });

  await ensureWorkerServiceDiagnostics(prisma, jobId);
  await touchJobProgress(prisma, jobId, "start", "assemble_video");

  const musicTrack = script.musicTrackId ?? script.musicMood ?? "steady_groove";
  const sceneImages = job.sceneImagesJson as SceneImage[] | null;
  await appendJobLog(
    prisma,
    jobId,
    `ffmpeg · локальный рендер → PUT R2/S3 videos/${jobId}.mp4 · 4 сцены · музыка ${musicTrack}`
  );
  const videoUrl = await renderReelToS3(jobId, product, script, sceneImages);
  if (videoUrl) {
    await appendJobRequestLog(
      prisma,
      jobId,
      buildS3PutRequestLog({
        endpoint: process.env.S3_ENDPOINT ?? "",
        bucket: process.env.S3_BUCKET ?? "bucket",
        key: `videos/${jobId}.mp4`,
        contentType: "video/mp4",
        publicUrl: videoUrl,
        target: "финальное видео после ffmpeg",
      })
    );
  }
  await touchJobProgress(prisma, jobId, "complete", "assemble_video");
  await appendJobCompleteLog(prisma, jobId);
  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "ready", videoUrl },
  });
}

async function logWorkerReady() {
  await ensureMusicAssets().catch((err) => {
    console.error("[worker] Music assets failed:", err);
  });

  const queueMode = getQueueMode();
  console.log(`[worker] Queue mode: ${queueMode}`);
  console.log("[worker] Storyboard runs on web — worker renders after user approval");
  console.log(
    `[worker] Storage (S3/R2): ${hasStorageConfigured() ? "configured" : "MISSING"}`
  );
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  console.log(
    `[worker] OpenAI images: ${openaiKey ? "configured" : isDevMockAllowed() ? "dev mock" : "MISSING"}`
  );
  const renderMode = getRenderMode();
  console.log(`[worker] Render mode: ${renderMode}`);
  if (renderMode === "demo") {
    console.log("[worker] Add S3_* vars — see R2_SETUP.md in repo");
    return;
  }
  const { shouldUseFfmpegRender } = await import("./renderFfmpeg.js");
  if (shouldUseFfmpegRender()) {
    console.log("[worker] Render engine: ffmpeg viral_v1");
    return;
  }
  try {
    console.log("[worker] Render engine: remotion — ensuring Chrome…");
    const { ensureRemotionBrowser } = await import("./remotionBrowser.js");
    await ensureRemotionBrowser();
    console.log("[worker] Browser ready");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[worker] Browser preflight failed (will retry on job):", msg);
  }
}

async function bootstrapOpenAiFromDatabase(): Promise<void> {
  if (process.env.OPENAI_API_KEY?.trim() || isDevMockAllowed()) return;

  try {
    const fromDb = await loadWorkerSecret(prisma, "OPENAI_API_KEY");
    if (fromDb) {
      process.env.OPENAI_API_KEY = fromDb;
      console.log(
        "[worker] OpenAI: loaded from shared database (synced from Vercel)"
      );
    }
  } catch (err) {
    console.warn("[worker] Could not load OpenAI key from database:", err);
  }
}

async function startWorker(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[worker] FATAL: DATABASE_URL is not set. Add your Neon URL in Railway Variables and redeploy."
    );
    process.exit(1);
  }

  await bootstrapOpenAiFromDatabase();

  if (!process.env.OPENAI_API_KEY?.trim() && !isDevMockAllowed()) {
    console.error(
      "[worker] FATAL: OPENAI_API_KEY is not set. Add it in Railway Variables and redeploy, or open /api/health on Vercel to sync via database."
    );
    process.exit(1);
  }

  const queueMode = getQueueMode();

  if (queueMode === "redis" && process.env.REDIS_URL) {
    const connection = getRedisConnection();
    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const jobId = job.data.jobId as string;
        const phase = job.data.phase as string | undefined;
        try {
          if (phase === "scene_images") {
            console.log(`[worker] Generating scene images for ${jobId}`);
            await processGenerateSceneImages(prisma, jobId);
            return;
          }
          if (phase !== "render") {
            console.log(`[worker] Skip job ${jobId} phase=${phase ?? "none"}`);
            return;
          }
          console.log(`[worker] Rendering reel job ${jobId}`);
          await processRender(jobId);
          console.log(`[worker] Done render ${jobId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[worker] Failed ${jobId}:`, message);
          await appendJobFailureLog(prisma, jobId, message);
          await prisma.reelJob.update({
            where: { id: jobId },
            data: { status: "failed", errorMessage: message },
          });
          throw err;
        }
      },
      { connection, concurrency: 1 }
    );

    worker.on("ready", () => {
      void logWorkerReady();
      console.log(`[worker] Listening on Redis queue "${QUEUE_NAME}" (render only)`);
    });

    process.on("SIGINT", async () => {
      await worker.close();
      await prisma.$disconnect();
      process.exit(0);
    });
    return;
  }

  await logWorkerReady();
  startPostgresQueueWorker(prisma, {
    onGenerateImages: (jobId) => processGenerateSceneImages(prisma, jobId),
    onRender: processRender,
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[worker] uncaughtException:", err);
  process.exit(1);
});

void startWorker().catch((err) => {
  console.error("[worker] startup failed:", err);
  process.exit(1);
});
