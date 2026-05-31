import { getServerSession } from "next-auth";
import type Stripe from "stripe";
import { createReelJobSchema } from "@reels-factory/shared";
import { authOptions } from "@/lib/auth";
import {
  envProblemResponse,
  hasDatabaseConfigured,
  hasRedisConfigured,
} from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { enqueueRenderJob, getQueueMode } from "@/lib/queue";
import { getStripePriceId, getTierAmount, stripe } from "@/lib/stripe";

export type PipelineResult =
  | {
      ok: true;
      jobId: string;
      skipPayment: true;
      status: "queued";
    }
  | {
      ok: true;
      jobId: string;
      skipPayment: false;
      url: string;
    };

export type PipelineError = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

export async function runReelPipeline(
  body: unknown
): Promise<PipelineResult | PipelineError> {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return { ok: false, status: p.status, body: p.body };
  }

  let data;
  try {
    data = createReelJobSchema.parse(body);
  } catch {
    return {
      ok: false,
      status: 400,
      body: { error: "Некорректные данные визарда" },
    };
  }

  const session = await getServerSession(authOptions);

  const job = await prisma.reelJob.create({
    data: {
      userId: session?.user?.id,
      productUrl: data.productUrl,
      productJson: data.product,
      reelType: data.reelType,
      highlights: data.highlights,
      customHighlight: data.customHighlight,
      ctaType: data.ctaType,
      ctaValue: data.ctaValue,
      tier: data.tier,
      status: "draft",
    },
  });

  // Script + research run on worker (researching → scripting → rendering)

  if (process.env.SKIP_PAYMENT !== "true") {
    if (!stripe) {
      return {
        ok: false,
        status: 503,
        body: {
          error:
            "Stripe не настроен. Установите SKIP_PAYMENT=true для разработки.",
        },
      };
    }

    const priceId = getStripePriceId(data.tier);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            unit_amount: getTierAmount(data.tier),
            product_data: {
              name: `Reels Factory — ${data.tier === "premium" ? "Premium" : "Basic"}`,
            },
          },
          quantity: 1,
        },
      ];
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${appUrl}/create/result/${job.id}?paid=1`,
      cancel_url: `${appUrl}/create?job=${job.id}`,
      metadata: { reelJobId: job.id, tier: data.tier },
      customer_email: session?.user?.email ?? undefined,
    });

    await prisma.payment.create({
      data: {
        reelJobId: job.id,
        stripeSessionId: checkoutSession.id,
        amount: getTierAmount(data.tier),
        status: "pending",
      },
    });

    await prisma.reelJob.update({
      where: { id: job.id },
      data: { tier: data.tier },
    });

    if (!checkoutSession.url) {
      return {
        ok: false,
        status: 500,
        body: { error: "Не удалось создать сессию оплаты" },
      };
    }

    return {
      ok: true,
      jobId: job.id,
      skipPayment: false,
      url: checkoutSession.url,
    };
  }

  await prisma.reelJob.update({
    where: { id: job.id },
    data: { status: "paid", tier: data.tier },
  });

  if (!hasRedisConfigured() && getQueueMode() === "redis") {
    const p = envProblemResponse("redis");
    return { ok: false, status: p.status, body: p.body };
  }

  try {
    await enqueueRenderJob(job.id);
    await prisma.reelJob.update({
      where: { id: job.id },
      data: { status: "queued" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка очереди";
    await prisma.reelJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: message },
    });
    return {
      ok: false,
      status: 500,
      body: {
        error: "Не удалось поставить задачу в очередь",
        details: message,
        jobId: job.id,
      },
    };
  }

  return {
    ok: true,
    jobId: job.id,
    skipPayment: true,
    status: "queued",
  };
}
