import { NextResponse } from "next/server";
import { persistJobLog } from "@reels-factory/pipeline-store";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";
import { enqueueSceneImagesJob } from "@/lib/queue";
import { runStoryboard } from "@/lib/pipeline/runStoryboard";

export const maxDuration = 60;

const STORYBOARD_DONE = new Set([
  "images_ready",
  "storyboard_ready",
  "generating_images",
  "render_queued",
  "rendering",
  "ready",
]);
const STORYBOARD_BUSY = new Set([
  "researching",
  "scripting",
  "generating_images",
]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }

  const { id } = await params;
  const job = await prisma.reelJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  if (STORYBOARD_DONE.has(job.status)) {
    return NextResponse.json({ ok: true, status: job.status });
  }

  if (STORYBOARD_BUSY.has(job.status)) {
    return NextResponse.json({ ok: true, status: job.status });
  }

  if (job.status !== "paid" && job.status !== "failed") {
    return NextResponse.json(
      { error: "Раскадровку можно запустить только после оплаты", status: job.status },
      { status: 400 }
    );
  }

  const claimed = await prisma.reelJob.updateMany({
    where: { id, status: { in: ["paid", "failed"] } },
    data: { status: "researching", errorMessage: null },
  });

  if (claimed.count === 0) {
    const current = await prisma.reelJob.findUnique({ where: { id } });
    return NextResponse.json({
      ok: true,
      status: current?.status ?? job.status,
    });
  }

  try {
    const status = await runStoryboard(id);
    if (status === "generating_images") {
      await enqueueSceneImagesJob(id);
    }
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка раскадровки";
    await persistJobLog(prisma, id, `ошибка · ${message}`, "error");
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
