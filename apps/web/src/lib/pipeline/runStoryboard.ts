import type {
  ProductCard,
  ProductIntel,
  ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
} from "@reels-factory/shared";
import { shouldRegenerateScript } from "@reels-factory/shared";
import type { z } from "zod";
import { generateReelScript } from "@reels-factory/ai-script";
import { buildProductIntel } from "@reels-factory/product-intel";
import { prisma } from "@/lib/prisma";

export async function runStoryboard(jobId: string): Promise<"storyboard_ready"> {
  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job ${jobId} not found`);

  const product = job.productJson as ProductCard;

  let intel = job.productIntelJson as ProductIntel | null;
  const needsIntel =
    !intel || (intel.rankedSellingPoints?.length ?? 0) === 0;

  if (needsIntel) {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "researching" },
    });
    intel = await buildProductIntel(product);
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { productIntelJson: intel },
    });
  }

  let script = job.scriptJson as ReelScript | null;
  if (shouldRegenerateScript(script)) {
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { status: "scripting" },
    });
    script = await generateReelScript({
      product,
      productIntel: intel ?? undefined,
      reelType: job.reelType as z.infer<typeof reelTypeSchema>,
      highlights: job.highlights,
      customHighlight: job.customHighlight ?? undefined,
      ctaType: job.ctaType as z.infer<typeof ctaTypeSchema>,
      ctaValue: job.ctaValue ?? undefined,
      tier: job.tier as "basic" | "premium",
    });
    await prisma.reelJob.update({
      where: { id: jobId },
      data: { scriptJson: script, templateId: script.templateId },
    });
  }

  if (!script) {
    throw new Error("Script generation failed");
  }

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "storyboard_ready" },
  });

  return "storyboard_ready";
}
