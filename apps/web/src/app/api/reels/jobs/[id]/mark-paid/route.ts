import { NextResponse } from "next/server";
import { jobHasLogText, persistJobLog } from "@reels-factory/pipeline-store";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await prisma.reelJob.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const alreadyLogged = await jobHasLogText(prisma, id, "оплата принята");

  if (!alreadyLogged) {
    await persistJobLog(prisma, id, "оплата принята · Stripe");
    if (job.status === "draft") {
      await prisma.reelJob.update({
        where: { id },
        data: { status: "paid" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
