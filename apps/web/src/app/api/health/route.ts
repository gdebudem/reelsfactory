import { NextResponse } from "next/server";
import { hasDatabaseConfigured, hasOpenAiConfigured, hasRedisConfigured } from "@/lib/env";
import { DEFAULT_OPENAI_MODEL } from "@reels-factory/ai-script";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "reels-factory",
    version: "1.0.0",
    dbConfigured: hasDatabaseConfigured(),
    redisConfigured: hasRedisConfigured(),
    openaiConfigured: hasOpenAiConfigured(),
    openaiModel: hasOpenAiConfigured()
      ? process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
      : null,
  });
}
