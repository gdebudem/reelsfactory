import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";
import { runStoryboard } from "@/lib/pipeline/runStoryboard";

export const maxDuration = 60;

const STORYBOARD_DONE = new Set(["storyboard_ready", "render_queued", "rendering", "ready"]);
const STORYBOARD_BUSY = new Set(["researching", "scripting"]);

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
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка раскадровки";
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
