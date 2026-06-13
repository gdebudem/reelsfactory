import { Prisma } from "@prisma/client";
import { persistJobLog } from "@reels-factory/pipeline-store";
import { sceneImagesNeedRegeneration } from "@reels-factory/scene-images";
import type { SceneImage } from "@reels-factory/shared";
import { prisma } from "@/lib/prisma";
import { enqueueSceneImagesJob } from "@/lib/queue";
import { runStoryboard } from "./runStoryboard";

/** Job looks stuck (Vercel timeout, OpenAI hang) — safe to resume. */
const STALE_STORYBOARD_MS = Number(
  process.env.STALE_STORYBOARD_MS ?? 45_000
);

const STORYBOARD_DONE = new Set([
  "images_ready",
  "storyboard_ready",
  "render_queued",
  "rendering",
  "ready",
]);

const RESUMABLE = new Set(["researching", "scripting"]);

function isStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_STORYBOARD_MS;
}

async function finishStoryboard(jobId: string) {
  const status = await runStoryboard(jobId);
  if (status === "generating_images") {
    await enqueueSceneImagesJob(jobId);
  }
  return status;
}

export type StoryboardPostResult =
  | { ok: true; status: string; resumed?: boolean; busy?: boolean }
  | { ok: false; status: number; error: string };

export async function handleStoryboardPost(
  jobId: string,
  options: { allowUnpaidDraft?: boolean } = {}
): Promise<StoryboardPostResult> {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return { ok: false, status: 404, error: "Не найдено" };
  }

  if (job.status === "script_failed") {
    await persistJobLog(prisma, jobId, "сценарий · повторная генерация", "info");
    await prisma.reelJob.update({
      where: { id: jobId },
      data: {
        status: "scripting",
        errorMessage: null,
        scriptJson: Prisma.JsonNull,
      },
    });
    try {
      const status = await finishStoryboard(jobId);
      return { ok: true, status, resumed: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка раскадровки";
      return { ok: false, status: 500, error: message };
    }
  }

  if (job.status === "design_qa_failed") {
    await persistJobLog(prisma, jobId, "картинки · повтор после design QA", "info");
    await prisma.reelJob.update({
      where: { id: jobId },
      data: {
        status: "generating_images",
        errorMessage: null,
        sceneImagesJson: Prisma.JsonNull,
      },
    });
    await enqueueSceneImagesJob(jobId);
    return { ok: true, status: "generating_images", resumed: true };
  }

  if (job.status === "generating_images" || job.status === "image_generating") {
    await enqueueSceneImagesJob(jobId);
    return { ok: true, status: job.status };
  }

  if (
    job.status === "images_ready" &&
    sceneImagesNeedRegeneration(job.sceneImagesJson as SceneImage[] | null)
  ) {
    await persistJobLog(
      prisma,
      jobId,
      "картинки · перегенерация · worker queue (Railway) · OpenAI images + R2 upload",
      "info"
    );
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "generating_images" },
    });
    await enqueueSceneImagesJob(jobId);
    return { ok: true, status: "generating_images", resumed: true };
  }

  if (STORYBOARD_DONE.has(job.status)) {
    return { ok: true, status: job.status };
  }

  if (RESUMABLE.has(job.status)) {
    if (!isStale(job.updatedAt)) {
      return { ok: true, status: job.status, busy: true };
    }

    await persistJobLog(
      prisma,
      jobId,
      "раскадровка · возобновление после паузы",
      "info"
    );

    try {
      const status = await finishStoryboard(jobId);
      return { ok: true, status, resumed: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка раскадровки";
      await persistJobLog(prisma, jobId, `ошибка · ${message}`, "error");
      await prisma.reelJob.update({
        where: { id: jobId },
        data: { status: "failed", errorMessage: message },
      });
      return { ok: false, status: 500, error: message };
    }
  }

  const skipPayment = process.env.SKIP_PAYMENT === "true";

  if (
    !skipPayment &&
    job.status !== "paid" &&
    job.status !== "failed" &&
    !(options.allowUnpaidDraft && job.status === "draft")
  ) {
    return {
      ok: false,
      status: job.status === "draft" ? 402 : 400,
      error:
        job.status === "draft"
          ? "Сначала оплатите ролик"
          : "Раскадровку можно запустить только после оплаты",
    };
  }

  if (skipPayment && job.status === "draft") {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "paid" },
    });
  }

  const claimed = await prisma.reelJob.updateMany({
    where: { id: jobId, status: { in: ["paid", "failed", "draft"] } },
    data: { status: "researching", errorMessage: null },
  });

  if (claimed.count === 0) {
    const current = await prisma.reelJob.findUnique({ where: { id: jobId } });
    return { ok: true, status: current?.status ?? job.status, busy: true };
  }

  try {
    const status = await finishStoryboard(jobId);
    return { ok: true, status };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка раскадровки";
    await persistJobLog(prisma, jobId, `ошибка · ${message}`, "error");
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: message },
    });
    return { ok: false, status: 500, error: message };
  }
}
