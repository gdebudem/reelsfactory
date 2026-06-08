import type {

  ProductCard,

  ProductIntel,

  ReelScript,

  reelTypeSchema,

  ctaTypeSchema,

} from "@reels-factory/shared";

import {

  createInitialProgress,

  shouldRegenerateScript,

} from "@reels-factory/shared";

import type { z } from "zod";

import { generateReelScript } from "@reels-factory/ai-script";

import { buildProductIntel } from "@reels-factory/product-intel";

import { prisma } from "@/lib/prisma";

import { createJobProgressReporter } from "./progress";



export async function runStoryboard(
  jobId: string
): Promise<"generating_images" | "images_ready" | "storyboard_ready"> {

  const job = await prisma.reelJob.findUnique({ where: { id: jobId } });

  if (!job) throw new Error(`Job ${jobId} not found`);



  let product = job.productJson as ProductCard;

  const reporter = createJobProgressReporter(jobId);



  let intel = job.productIntelJson as ProductIntel | null;

  const needsIntel =

    !intel || (intel.rankedSellingPoints?.length ?? 0) === 0;



  if (needsIntel) {

    await prisma.reelJob.update({

      where: { id: jobId },

      data: {

        status: "researching",

        progressJson: createInitialProgress(),

      },

    });

    const research = await buildProductIntel(product, reporter);

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

  await reporter.log("ищу картинки");

  await prisma.reelJob.update({
    where: { id: jobId },
    data: { status: "generating_images" },
  });

  return "generating_images";
}


