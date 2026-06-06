import type { PrismaClient } from "@prisma/client";

const POLL_MS = Number(process.env.QUEUE_POLL_MS ?? 4000);

/** Worker only renders video after user approves storyboard on web. */
export async function startPostgresQueueWorker(
  prisma: PrismaClient,
  processRender: (jobId: string) => Promise<void>
): Promise<never> {
  console.log(
    `[worker] Postgres render queue — poll every ${POLL_MS}ms (render_queued only)`
  );

  while (true) {
    try {
      const jobId = await claimNextRenderJob(prisma);
      if (!jobId) {
        await sleep(POLL_MS);
        continue;
      }

      console.log(`[worker] Rendering approved job ${jobId}`);
      try {
        await processRender(jobId);
        console.log(`[worker] Done render ${jobId}`);
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

async function claimNextRenderJob(prisma: PrismaClient): Promise<string | null> {
  const candidate = await prisma.reelJob.findFirst({
    where: { status: "render_queued" },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.reelJob.updateMany({
    where: { id: candidate.id, status: "render_queued" },
    data: { status: "rendering" },
  });

  return claimed.count === 1 ? candidate.id : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
