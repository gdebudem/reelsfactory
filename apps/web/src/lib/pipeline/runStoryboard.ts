import type {
  ProductCard,
  ProductIntel,
  ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
} from "@reels-factory/shared";
import {
  OPENAI_BILLING_LOG_HINT,
  resetPipelineSteps,
  shouldRegenerateScript,
} from "@reels-factory/shared";
import {
  appendManyJobLogEntries,
  saveProgressMeta,
  stripLogs,
} from "@reels-factory/pipeline-store";
import type { z } from "zod";
import { getOpenAiModel } from "@reels-factory/ai-script";
import { generateReelScript } from "@reels-factory/ai-script";
import { buildProductIntel } from "@reels-factory/product-intel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadPromptOverrides } from "@/lib/prompt-overrides";
import { createJobProgressReporter, hydrateJobProgress } from "./progress";
import { applyWebServiceDiagnostics } from "./service-diagnostics";

export async function runStoryboard(
  jobId: string
): Promise<"generating_images" | "images_ready" | "storyboard_ready"> {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  let product = job.productJson as ProductCard;
  const reporter = createJobProgressReporter(jobId);
  const promptOverrides = await loadPromptOverrides();

  let intel = job.productIntelJson as ProductIntel | null;
  const needsIntel =
    !intel || (intel.rankedSellingPoints?.length ?? 0) === 0;

  if (needsIntel) {
    const session = await getServerSession(authOptions);
    let progress = await hydrateJobProgress(jobId, job.progressJson);
    const logCountBefore = progress.logs.length;
    progress = resetPipelineSteps(progress);
    progress = applyWebServiceDiagnostics(progress, session?.user?.email);
    const newLogs = progress.logs.slice(logCountBefore);
    await saveProgressMeta(prisma, jobId, stripLogs(progress));
    await appendManyJobLogEntries(prisma, jobId, newLogs);
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "researching" },
    });

  const research = await buildProductIntel(
    product,
    reporter,
    promptOverrides
  );
  intel = research.intel;
  product = research.product;
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { productIntelJson: intel, productJson: product },
    });
  }

  let script = job.scriptJson as ReelScript | null;
  if (shouldRegenerateScript(script)) {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "scripting" },
    });
    await reporter.start("write_script");
    await reporter.log(
      `сценарий · отправлю запрос в OpenAI chat completions (модель ${getOpenAiModel()})`
    );

    const result = await generateReelScript(
      {
        product,
        productIntel: intel ?? undefined,
        productConfidence: intel?.productConfidence,
        reelType: job.reelType as z.infer<typeof reelTypeSchema>,
        highlights: job.highlights,
        customHighlight: job.customHighlight ?? undefined,
        ctaType: job.ctaType as z.infer<typeof ctaTypeSchema>,
        ctaValue: job.ctaValue ?? undefined,
        tier: job.tier as "basic" | "premium",
      },
      promptOverrides,
      reporter
    );

    if (result.failed || !result.script) {
      const msg =
        result.errorMessage ??
        "Не удалось сгенерировать сценарий. Попробуйте снова.";
      await reporter.log(`ошибка · ${msg}`, "error");
      await prisma.reelJob.update({
        where: { id: jobId },
        data: { status: "script_failed", errorMessage: msg },
      });
      throw new Error(msg);
    }

    if (result.usage) {
      await reporter.logUsage(result.usage);
    } else if (result.mock) {
      if (result.billingExceeded) {
        await reporter.logBilling(
          `⚠ OpenAI биллинг (сценарий): ${result.mockReason}. ${OPENAI_BILLING_LOG_HINT}`
        );
      } else {
        await reporter.log(
          `сценарий · mock (${result.mockReason ?? "без OpenAI"})`
        );
      }
    }

    if (result.qualityScore) {
      await reporter.log(
        `QA сценария · hook ${(result.qualityScore.hookScore * 100).toFixed(0)}% · CTA ${(result.qualityScore.ctaClarity * 100).toFixed(0)}% · flags: ${result.qualityScore.riskFlags.join(", ") || "нет"}`
      );
    }

    script = result.script;
    await reporter.complete("write_script");
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { scriptJson: script, templateId: script.templateId },
    });
  }

  if (!script) {
    throw new Error("Script generation failed");
  }

  const existingImages = job.sceneImagesJson as unknown[] | null;
  if (existingImages && existingImages.length >= 4) {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "images_ready" },
    });
    return "images_ready";
  }

  if (process.env.GENERATE_SCENE_IMAGES === "false") {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "storyboard_ready" },
    });
    return "storyboard_ready";
  }

  await reporter.logCostSummary();
  await reporter.log("ищу картинки · очередь worker");

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "generating_images" },
  });

  return "generating_images";
}
