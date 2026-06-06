import "dotenv/config";
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type {
  ProductCard,
  ProductIntel,
  ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
} from "@reels-factory/shared";
import { shouldRegenerateScript } from "@reels-factory/shared";
import type { z } from "zod";
import { generateReelScript } from "@reels-factory/ai-script";
import { buildProductIntel } from "@reels-factory/product-intel";
import {
  isProductParsePoor,
  parseProductUrl,
} from "@reels-factory/product-parser";
import { ensureMusicAssets } from "./ensureMusic.js";
import { getRenderMode, renderReelToS3 } from "./render.js";
import { hasStorageConfigured } from "./storage.js";
import {
  startPostgresQueueWorker,
  type JobPhase,
} from "./postgres-queue.js";

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

async function setJobStatus(jobId: string, status: string) {
  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status },
  });
}

async function refreshProduct(jobId: string, job: { productUrl: string; productJson: unknown }) {
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

async function processStoryboard(jobId: string) {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const product = await refreshProduct(jobId, job);

  let intel = job.productIntelJson as ProductIntel | null;
  const needsIntel =
    !intel || (intel.rankedSellingPoints?.length ?? 0) === 0;

  if (needsIntel) {
    await setJobStatus(jobId, "researching");
    const hasTavily = Boolean(process.env.TAVILY_API_KEY?.trim());
    console.log(
      `[worker] Researching product for ${jobId} (tavily=${hasTavily ? "on" : "off"})`
    );
    intel = await buildProductIntel(product);
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { productIntelJson: intel },
    });
    console.log(
      `[worker] Intel: ${intel.rankedSellingPoints?.length ?? 0} selling points, ${intel.externalSnippets?.length ?? 0} web snippets`
    );
  }

  let script = job.scriptJson as ReelScript | null;
  if (shouldRegenerateScript(script)) {
    await setJobStatus(jobId, "scripting");
    console.log(
      `[worker] Generating viral script for ${jobId} (old template=${script?.templateId ?? "none"})`
    );
    script = await generateReelScript({
      product,
      productIntel: intel ?? undefined,
      reelType: job.reelType as z.infer<typeof reelTypeSchema>,
      highlights: job.highlights,
      customHighlight: job.customHighlight ?? undefined,
      ctaType: job.ctaType as z.infer<typeof ctaTypeSchema>,
      ctaValue: job.ctaValue ?? undefined,
      tier: job.tier as "basic" | "premium",
    });
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { scriptJson: script, templateId: script.templateId },
    });
    console.log(
      `[worker] Script: viral_v1, ${script.scenes.length} scenes, mood=${script.musicMood}`
    );
  }

  if (!script) {
    throw new Error("Script generation failed");
  }

  await setJobStatus(jobId, "storyboard_ready");
  console.log(`[worker] Storyboard ready for ${jobId} — awaiting user approval`);
}

async function processRender(jobId: string) {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const product = await refreshProduct(jobId, job);
  const script = job.scriptJson as ReelScript | null;

  if (!script) {
    throw new Error("Cannot render without approved storyboard script");
  }

  await setJobStatus(jobId, "rendering");
  const videoUrl = await renderReelToS3(jobId, product, script);

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "ready", videoUrl },
  });
}

async function processJob(jobId: string, phase: JobPhase) {
  if (phase === "storyboard") {
    await processStoryboard(jobId);
  } else {
    await processRender(jobId);
  }
}

async function logWorkerReady() {
  await ensureMusicAssets().catch((err) => {
    console.error("[worker] Music assets failed:", err);
  });

  const queueMode = getQueueMode();
  console.log(`[worker] Queue mode: ${queueMode}`);
  console.log(
    `[worker] Storage (S3/R2): ${hasStorageConfigured() ? "configured" : "MISSING"}`
  );
  console.log(
    `[worker] Tavily: ${process.env.TAVILY_API_KEY?.trim() ? "configured" : "MISSING (page data only)"}`
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
      const phase = (job.data.phase as JobPhase) ?? "storyboard";
      console.log(`[worker] Processing ${phase} for reel job ${jobId}`);
      try {
        await processJob(jobId, phase);
        console.log(`[worker] Done ${phase} ${jobId}`);
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
    console.log(`[worker] Listening on Redis queue "${QUEUE_NAME}"`);
  });

  process.on("SIGINT", async () => {
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
} else {
  void logWorkerReady().then(() => startPostgresQueueWorker(prisma, processJob));
}
