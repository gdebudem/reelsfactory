import type { PrismaClient } from "@prisma/client";

const POLL_MS = Number(process.env.QUEUE_POLL_MS ?? 4000);

export type JobPhase = "storyboard" | "render";

export async function startPostgresQueueWorker(
  prisma: PrismaClient,
  processJob: (jobId: string, phase: JobPhase) => Promise<void>
): Promise<never> {
  console.log(`[worker] Postgres queue — poll every ${POLL_MS}ms`);

  while (true) {
    try {
      const claim = await claimNextQueuedJob(prisma);
      if (!claim) {
        await sleep(POLL_MS);
        continue;
      }

      const { jobId, phase } = claim;
      console.log(`[worker] Processing ${phase} for job ${jobId}`);
      try {
        await processJob(jobId, phase);
        console.log(`[worker] Done ${phase} ${jobId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] Failed ${jobId}:`, message);
        await prisma.reelJob.update({
          where: { id: jobId },
          data: { status: "failed", errorMessage: message },
        });
      }
    } catch (err) {
      console.error("[worker] Queue poll error:", err);
      await sleep(POLL_MS);
    }
  }
}

async function claimNextQueuedJob(
  prisma: PrismaClient
): Promise<{ jobId: string; phase: JobPhase } | null> {
  const candidate = await prisma.reelJob.findFirst({
    where: { status: { in: ["queued", "render_queued"] } },
    orderBy: { updatedAt: "asc" },
    select: { id: true, status: true },
  });
  if (!candidate) return null;

  if (candidate.status === "queued") {
    const claimed = await prisma.reelJob.updateMany({
      where: { id: candidate.id, status: "queued" },
      data: { status: "researching" },
    });
    return claimed.count === 1
      ? { jobId: candidate.id, phase: "storyboard" }
      : null;
  }

  const claimed = await prisma.reelJob.updateMany({
    where: { id: candidate.id, status: "render_queued" },
    data: { status: "rendering" },
  });
  return claimed.count === 1
    ? { jobId: candidate.id, phase: "render" }
    : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
