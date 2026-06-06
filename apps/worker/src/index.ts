import "dotenv/config";
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import {
  isProductParsePoor,
  parseProductUrl,
} from "@reels-factory/product-parser";
import { ensureMusicAssets } from "./ensureMusic.js";
import { getRenderMode, renderReelToS3 } from "./render.js";
import { hasStorageConfigured } from "./storage.js";
import { startPostgresQueueWorker } from "./postgres-queue.js";

const prisma = new PrismaClient();

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

if (!process.env.DATABASE_URL) {
  console.error(
    "[worker] FATAL: DATABASE_URL is not set. Add your Neon URL in Railway Variables and redeploy."
  );
  process.exit(1);
}

process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[worker] uncaughtException:", err);
  process.exit(1);
});

const QUEUE_NAME = "render-reel";

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

  const videoUrl = await renderReelToS3(jobId, product, script);

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

const queueMode = getQueueMode();

if (queueMode === "redis" && process.env.REDIS_URL) {
  const connection = getRedisConnection();
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const jobId = job.data.jobId as string;
      const phase = job.data.phase as string | undefined;
      if (phase !== "render") {
        console.log(`[worker] Skip non-render job ${jobId} phase=${phase ?? "none"}`);
        return;
      }
      console.log(`[worker] Rendering reel job ${jobId}`);
      try {
        await processRender(jobId);
        console.log(`[worker] Done render ${jobId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] Failed ${jobId}:`, message);
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
} else {
  void logWorkerReady().then(() =>
    startPostgresQueueWorker(prisma, processRender)
  );
}
