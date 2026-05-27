import { NextResponse } from "next/server";
import { hasDatabaseConfigured, hasRedisConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "reels-factory",
    version: "1.0.0",
    dbConfigured: hasDatabaseConfigured(),
    redisConfigured: hasRedisConfigured(),
  });
}
