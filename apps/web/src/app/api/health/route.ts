import { NextResponse } from "next/server";
import {
  getTavilyStatus,
  hasDatabaseConfigured,
  hasOpenAiConfigured,
  hasRedisConfigured,
  hasStorageConfigured,
  hasTavilyAvailable,
  hasTavilyConfigured,
  isTavilyProductionReady,
  tavilyProductionHint,
} from "@/lib/env";
import { DEFAULT_OPENAI_MODEL } from "@reels-factory/ai-script";
import { syncWorkerSecretsFromEnv } from "@reels-factory/shared";
import { prisma } from "@/lib/prisma";

import { getQueueMode, pingRedis } from "@/lib/queue";

export async function GET() {
  const redisConfigured = hasRedisConfigured();
  let redisOk = false;
  if (redisConfigured && getQueueMode() === "redis") {
    try {
      redisOk = await pingRedis();
    } catch {
      redisOk = false;
    }
  }

  let workerSecretsSynced: string[] = [];
  if (hasDatabaseConfigured() && hasOpenAiConfigured()) {
    try {
      workerSecretsSynced = await syncWorkerSecretsFromEnv(prisma);
    } catch (err) {
      console.warn("[health] worker secret sync failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    service: "reels-factory",
    version: "1.0.0",
    queueMode: getQueueMode(),
    dbConfigured: hasDatabaseConfigured(),
    redisConfigured,
    redisOk: getQueueMode() === "redis" ? redisOk : null,
    openaiConfigured: hasOpenAiConfigured(),
    openaiModel: hasOpenAiConfigured()
      ? process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
      : null,
    storageConfigured: hasStorageConfigured(),
    tavilyConfigured: hasTavilyConfigured(),
    tavilyAvailable: hasTavilyAvailable(),
    tavilyMode: getTavilyStatus(),
    tavilyProductionReady: isTavilyProductionReady(),
    tavilyProductionHint: tavilyProductionHint(),
    workerSecretsSynced,
  });
}
