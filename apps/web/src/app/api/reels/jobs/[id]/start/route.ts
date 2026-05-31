import { NextResponse } from "next/server";
import { enqueueRenderJob, getQueueMode } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured, hasRedisConfigured } from "@/lib/env";

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

  if (
    job.status === "queued" ||
    job.status === "researching" ||
    job.status === "scripting" ||
    job.status === "rendering" ||
    job.status === "ready"
  ) {
    return NextResponse.json({ ok: true, status: job.status });
  }

  const skipPayment = process.env.SKIP_PAYMENT === "true";

  if (!skipPayment && job.status !== "paid") {
    return NextResponse.json(
      { error: "Сначала оплатите ролик" },
      { status: 402 }
    );
  }

  if (skipPayment && job.status === "draft") {
    await prisma.reelJob.update({
      where: { id },
      data: { status: "paid" },
    });
  }

  try {
    await enqueueRenderJob(id);
    await prisma.reelJob.update({
      where: { id },
      data: { status: "queued" },
    });

    return NextResponse.json({ ok: true, status: "queued" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка очереди";
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json(
      { error: "Не удалось поставить задачу в очередь", details: message },
      { status: 500 }
    );
  }
}
