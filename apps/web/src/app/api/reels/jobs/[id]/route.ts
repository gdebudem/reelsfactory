import { NextResponse } from "next/server";
import { hydrateProgressLogs } from "@reels-factory/pipeline-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.reelJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const progressJson = await hydrateProgressLogs(prisma, id, job.progressJson);

  return NextResponse.json({
    job: {
      ...job,
      progressJson,
    },
  });
}
