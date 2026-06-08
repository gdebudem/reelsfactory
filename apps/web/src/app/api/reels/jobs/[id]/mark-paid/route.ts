import { NextResponse } from "next/server";
import {
  appendPipelineLog,
  createInitialProgress,
  parsePipelineProgress,
} from "@reels-factory/shared";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.reelJob.findUnique({
    where: { id },
    select: { progressJson: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const progress = parsePipelineProgress(
    job.progressJson ?? createInitialProgress()
  );
  const alreadyLogged = progress.logs.some((l) =>
    l.text.includes("оплата принята")
  );

  if (!alreadyLogged) {
    const next = appendPipelineLog(progress, "оплата принята · Stripe");
    await prisma.reelJob.update({
      where: { id },
      data: {
        status: job.status === "draft" ? "paid" : job.status,
        progressJson: next,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
