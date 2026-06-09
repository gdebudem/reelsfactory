import { NextResponse } from "next/server";
import {
  fetchJobLogEntries,
  hydrateProgressLogs,
} from "@reels-factory/pipeline-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.reelJob.findUnique({
    where: { id },
    select: { id: true, progressJson: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await hydrateProgressLogs(prisma, id, job.progressJson);
  const logs = await fetchJobLogEntries(prisma, id);
  const progress = await hydrateProgressLogs(prisma, id, job.progressJson);

  return NextResponse.json({
    jobId: id,
    count: logs.length,
    logs,
    usage: progress.usage ?? null,
  });
}
