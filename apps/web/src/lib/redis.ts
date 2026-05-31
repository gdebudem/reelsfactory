import { Queue } from "bullmq";
import Redis, { type RedisOptions } from "ioredis";

const QUEUE_NAME = "render-reel";

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

/** Serverless-safe: enqueue and close (Vercel + Upstash). */
export async function enqueueRenderJob(jobId: string): Promise<void> {
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

export async function pingRedis(): Promise<boolean> {
  const redis = new Redis(getRedisOptions());
  try {
    return (await redis.ping()) === "PONG";
  } finally {
    redis.disconnect();
  }
}
