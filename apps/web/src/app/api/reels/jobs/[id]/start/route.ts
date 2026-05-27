import { NextResponse } from "next/server";
import { getRenderQueue } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { generateReelScript } from "@reels-factory/ai-script";
import type { ProductCard } from "@reels-factory/shared";
import { envProblemResponse, hasDatabaseConfigured, hasRedisConfigured } from "@/lib/env";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }
  if (!hasRedisConfigured()) {
    const p = envProblemResponse("redis");
    return NextResponse.json(p.body, { status: p.status });
  }

  const { id } = await params;
  const job = await prisma.reelJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const skipPayment = process.env.SKIP_PAYMENT === "true";

  if (!skipPayment && job.status !== "paid") {
    return NextResponse.json(
      { error: "Сначала оплатите ролик" },
      { status: 402 }
    );
  }

  if (skipPayment && job.status === "draft") {
    await prisma.reelJob.update({
      where: { id },
      data: { status: "paid" },
    });
  }

  const product = job.productJson as ProductCard;
  if (!job.scriptJson) {
    const script = await generateReelScript({
      product,
      reelType: job.reelType as "promo",
      highlights: job.highlights,
      customHighlight: job.customHighlight ?? undefined,
      ctaType: job.ctaType as "website",
      ctaValue: job.ctaValue ?? undefined,
      tier: job.tier as "basic" | "premium",
    });
    await prisma.reelJob.update({
      where: { id },
      data: { scriptJson: script, templateId: script.templateId },
    });
  }

  try {
    await getRenderQueue().add("render", { jobId: id }, { jobId: id });
    await prisma.reelJob.update({
      where: { id },
      data: { status: "queued" },
    });

    return NextResponse.json({ ok: true, status: "queued" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка очереди";
    await prisma.reelJob.update({
      where: { id },
      data: { status: "failed", errorMessage: message },
    });
    return NextResponse.json(
      { error: "Не удалось поставить задачу в очередь", details: message },
      { status: 500 }
    );
  }
}
