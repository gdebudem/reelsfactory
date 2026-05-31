import type { PrismaClient } from "@prisma/client";

const POLL_MS = Number(process.env.QUEUE_POLL_MS ?? 4000);

export async function startPostgresQueueWorker(
  prisma: PrismaClient,
  processJob: (jobId: string) => Promise<void>
): Promise<never> {
  console.log(`[worker] Postgres queue — poll every ${POLL_MS}ms`);

  while (true) {
    try {
      const jobId = await claimNextQueuedJob(prisma);
      if (!jobId) {
        await sleep(POLL_MS);
        continue;
      }

      console.log(`[worker] Processing reel job ${jobId}`);
      try {
        await processJob(jobId);
        console.log(`[worker] Done ${jobId}`);
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

async function claimNextQueuedJob(prisma: PrismaClient): Promise<string | null> {
  const candidate = await prisma.reelJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.reelJob.updateMany({
    where: { id: candidate.id, status: "queued" },
    data: { status: "rendering" },
  });

  return claimed.count === 1 ? candidate.id : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
