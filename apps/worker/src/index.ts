import "dotenv/config";
import { Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type {
  ProductCard,
  ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
} from "@reels-factory/shared";
import type { z } from "zod";
import { generateReelScript } from "@reels-factory/ai-script";
import { getRenderMode, renderReelToS3 } from "./render.js";
import { hasStorageConfigured } from "./storage.js";

const prisma = new PrismaClient();

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error(
      "[worker] REDIS_URL is not set. Add your Upstash URL in Railway Variables and redeploy."
    );
    process.exit(1);
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
    "[worker] DATABASE_URL is not set. Add your Neon URL in Railway Variables and redeploy."
  );
  process.exit(1);
}

const connection = getRedisConnection();

const QUEUE_NAME = "render-reel";

async function processJob(jobId: string) {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "rendering" },
  });

  const product = job.productJson as ProductCard;
  let script = job.scriptJson as ReelScript | null;

  if (!script) {
    script = await generateReelScript({
      product,
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
  }

  const videoUrl = await renderReelToS3(jobId, product, script);

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "ready", videoUrl },
  });
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const jobId = job.data.jobId as string;
    console.log(`[worker] Processing reel job ${jobId}`);
    try {
      await processJob(jobId);
      console.log(`[worker] Done ${jobId}`);
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
  console.log(`[worker] Listening on queue "${QUEUE_NAME}"`);
  console.log(
    `[worker] Storage (S3/R2): ${hasStorageConfigured() ? "configured" : "MISSING"}`
  );
  console.log(`[worker] Render mode: ${getRenderMode()}`);
  if (getRenderMode() === "demo") {
    console.log("[worker] Add S3_* vars — see R2_SETUP.md in repo");
  }
});

process.on("SIGINT", async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
