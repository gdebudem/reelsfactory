import { NextResponse } from "next/server";
import { persistJobLog } from "@reels-factory/pipeline-store";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";
import { runStoryboard } from "@/lib/pipeline/runStoryboard";

const STORYBOARD_STARTABLE = new Set(["draft", "paid", "failed"]);
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

  if (STORYBOARD_BUSY.has(job.status) || STORYBOARD_DONE.has(job.status)) {
    return NextResponse.json({ ok: true, status: job.status });
  }

  const skipPayment = process.env.SKIP_PAYMENT === "true";

  if (!skipPayment && job.status !== "paid" && job.status !== "failed") {
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

  if (!STORYBOARD_STARTABLE.has(job.status) && job.status !== "draft") {
    return NextResponse.json(
      { error: "Задача не может быть запущена" },
      { status: 400 }
    );
  }

  const claimed = await prisma.reelJob.updateMany({
    where: { id, status: { in: ["paid", "failed", "draft"] } },
    data: { status: "researching", errorMessage: null },
  });

  if (claimed.count === 0) {
    const current = await prisma.reelJob.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, status: current?.status ?? job.status });
  }

  try {
    const status = await runStoryboard(id);
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка раскадровки";
    await persistJobLog(prisma, id, `ошибка · ${message}`, "error");
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json(
      { error: "Не удалось создать раскадровку", details: message },
      { status: 500 }
    );
  }
}
