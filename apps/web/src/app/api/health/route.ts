import { NextResponse } from "next/server";
import {
  hasDatabaseConfigured,
  hasOpenAiConfigured,
  hasRedisConfigured,
  hasStorageConfigured,
} from "@/lib/env";
import { DEFAULT_OPENAI_MODEL } from "@reels-factory/ai-script";

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
    tavilyConfigured: Boolean(process.env.TAVILY_API_KEY?.trim()),
  });
}
