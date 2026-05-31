import { Queue } from "bullmq";
import Redis, { type RedisOptions } from "ioredis";

const QUEUE_NAME = "render-reel";

export type QueueMode = "postgres" | "redis";

export function getQueueMode(): QueueMode {
  const mode = process.env.QUEUE_MODE?.trim().toLowerCase();
  if (mode === "redis") return "redis";
  // Default: Postgres (Neon) — no Upstash command quota burn
  return "postgres";
}

export function isRedisQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /max requests limit exceeded|quota|rate limit/i.test(msg);
}

function getRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  const parsed = new URL(url);
  const isTls =
    parsed.protocol === "rediss:" || parsed.hostname.includes("upstash.io");

  return {
    host: parsed.hostname || "localhost",
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    retryStrategy: (times) => (times > 4 ? null : Math.min(times * 250, 2000)),
    ...(isTls ? { tls: {}, family: 0 } : {}),
  };
}

async function enqueueRedis(jobId: string): Promise<void> {
  const queue = new Queue(QUEUE_NAME, { connection: getRedisOptions() });
  try {
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "failed" || state === "completed") {
        await existing.remove();
      }
    }
    await queue.add(
      "render",
      { jobId },
      {
        jobId,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: "fixed", delay: 5000 },
      }
    );
  } finally {
    await queue.close();
  }
}

/**
 * Queue a render job. Postgres mode: no-op (caller sets status=queued in DB).
 * Redis mode: BullMQ add (optional, for high-throughput setups).
 */
export async function enqueueRenderJob(jobId: string): Promise<void> {
  if (getQueueMode() !== "redis" || !process.env.REDIS_URL) {
    return;
  }
  try {
    await enqueueRedis(jobId);
  } catch (err) {
    if (isRedisQuotaError(err)) {
      console.warn(
        `[queue] Redis quota exceeded for job ${jobId}, using Postgres queue`
      );
      return;
    }
    throw err;
  }
}

export async function pingRedis(): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const redis = new Redis(getRedisOptions());
  try {
    return (await redis.ping()) === "PONG";
  } finally {
    redis.disconnect();
  }
}
