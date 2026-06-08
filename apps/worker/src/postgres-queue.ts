import type { PrismaClient } from "@prisma/client";

const POLL_MS = Number(process.env.QUEUE_POLL_MS ?? 4000);

type JobHandlers = {
  onGenerateImages: (jobId: string) => Promise<void>;
  onRender: (jobId: string) => Promise<void>;
};

export async function startPostgresQueueWorker(
  prisma: PrismaClient,
  handlers: JobHandlers
): Promise<never> {
  console.log(
    `[worker] Postgres queue — poll every ${POLL_MS}ms (generating_images + render_queued)`
  );

  while (true) {
    try {
      const imageJobId = await claimJob(
        prisma,
        "generating_images",
        "image_generating"
      );
      if (imageJobId) {
        console.log(`[worker] Generating scene images for ${imageJobId}`);
        try {
          await handlers.onGenerateImages(imageJobId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[worker] Image gen failed ${imageJobId}:`, message);
          await prisma.reelJob.update({
            where: { id: imageJobId },
            data: { status: "failed", errorMessage: message },
          });
        }
        continue;
      }

      const renderJobId = await claimJob(
        prisma,
        "render_queued",
        "rendering"
      );
      if (renderJobId) {
        console.log(`[worker] Rendering approved job ${renderJobId}`);
        try {
          await handlers.onRender(renderJobId);
          console.log(`[worker] Done render ${renderJobId}`);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[worker] Failed ${renderJobId}:`, message);
          await prisma.reelJob.update({
            where: { id: renderJobId },
            data: { status: "failed", errorMessage: message },
          });
        }
        continue;
      }

      await sleep(POLL_MS);
    } catch (err) {
      console.error("[worker] Queue poll error:", err);
      await sleep(POLL_MS);
    }
  }
}

async function claimJob(
  prisma: PrismaClient,
  fromStatus: string,
  busyStatus: string
): Promise<string | null> {
  const candidate = await prisma.reelJob.findFirst({
    where: { status: fromStatus },
    orderBy: { updatedAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.reelJob.updateMany({
    where: { id: candidate.id, status: fromStatus },
    data: { status: busyStatus },
  });

  return claimed.count === 1 ? candidate.id : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
