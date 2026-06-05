import { NextResponse } from "next/server";
import { runReelPipeline } from "@/lib/pipeline/runReelPipeline";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await runReelPipeline(body);

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[pipeline/run]", e);
    const message = e instanceof Error ? e.message : String(e);
    const needsDbMigration =
      /productIntelJson|column.*does not exist|P2022/i.test(message);
    return NextResponse.json(
      {
        error: needsDbMigration
          ? "База данных устарела — нужна миграция"
          : "Не удалось запустить пайплайн",
        details: needsDbMigration
          ? "В Neon выполните: ALTER TABLE \"ReelJob\" ADD COLUMN IF NOT EXISTS \"productIntelJson\" JSONB; (или npm run db:push с DATABASE_URL из Neon)"
          : message,
        code: needsDbMigration ? "DB_MIGRATION_REQUIRED" : "PIPELINE_ERROR",
      },
      { status: 500 }
    );
  }
}
