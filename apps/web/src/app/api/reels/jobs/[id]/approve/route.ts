import { NextResponse } from "next/server";
import { enqueueRenderJob, getQueueMode } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import {
  envProblemResponse,
  hasDatabaseConfigured,
  hasRedisConfigured,
} from "@/lib/env";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }
  if (!hasRedisConfigured() && getQueueMode() === "redis") {
    const p = envProblemResponse("redis");
    return NextResponse.json(p.body, { status: p.status });
  }

  const { id } = await params;
  const job = await prisma.reelJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  if (job.status === "render_queued" || job.status === "rendering") {
    return NextResponse.json({ ok: true, status: job.status });
  }

  if (job.status === "ready") {
    return NextResponse.json({ ok: true, status: "ready" });
  }

  if (job.status !== "storyboard_ready") {
    return NextResponse.json(
      {
        error: "Раскадровка ещё не готова",
        status: job.status,
      },
      { status: 400 }
    );
  }

  if (!job.scriptJson) {
    return NextResponse.json(
      { error: "Сценарий отсутствует — перегенерируйте раскадровку" },
      { status: 400 }
    );
  }

  try {
    await enqueueRenderJob(id);
    await prisma.reelJob.update({
      where: { id },
      data: { status: "render_queued" },
    });

    return NextResponse.json({ ok: true, status: "render_queued" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка очереди";
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json(
      { error: "Не удалось запустить рендер", details: message },
      { status: 500 }
    );
  }
}
