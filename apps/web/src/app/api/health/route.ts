import { NextResponse } from "next/server";
import {
  hasDatabaseConfigured,
  hasOpenAiConfigured,
  hasRedisConfigured,
  hasStorageConfigured,
} from "@/lib/env";
import { DEFAULT_OPENAI_MODEL } from "@reels-factory/ai-script";

import { pingRedis } from "@/lib/redis";

export async function GET() {
  const redisConfigured = hasRedisConfigured();
  let redisOk = false;
  if (redisConfigured) {
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
    dbConfigured: hasDatabaseConfigured(),
    redisConfigured,
    redisOk,
    openaiConfigured: hasOpenAiConfigured(),
    openaiModel: hasOpenAiConfigured()
      ? process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
      : null,
    storageConfigured: hasStorageConfigured(),
  });
}
