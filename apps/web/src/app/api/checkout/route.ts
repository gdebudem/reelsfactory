import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type Stripe from "stripe";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, getStripePriceId, getTierAmount } from "@/lib/stripe";

const checkoutSchema = z.object({
  jobId: z.string(),
  tier: z.enum(["basic", "premium"]).default("basic"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = checkoutSchema.parse(await req.json());
  const job = await prisma.reelJob.findUnique({ where: { id: body.jobId } });

  if (!job) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  if (process.env.SKIP_PAYMENT === "true") {
    await prisma.reelJob.update({
      where: { id: job.id },
      data: { status: "paid", tier: body.tier },
    });
    return NextResponse.json({ skipPayment: true, jobId: job.id });
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe не настроен. Установите SKIP_PAYMENT=true для разработки." },
      { status: 503 }
    );
  }

  const priceId = getStripePriceId(body.tier);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

  if (priceId) {
    lineItems = [{ price: priceId, quantity: 1 }];
  } else {
    lineItems = [
      {
        price_data: {
          currency: "usd",
          unit_amount: getTierAmount(body.tier),
          product_data: {
            name: `Reels Factory — ${body.tier === "premium" ? "Premium" : "Basic"}`,
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
    metadata: { reelJobId: job.id, tier: body.tier },
    customer_email: session?.user?.email ?? undefined,
  });

  await prisma.payment.create({
    data: {
      reelJobId: job.id,
      stripeSessionId: checkoutSession.id,
      amount: getTierAmount(body.tier),
      status: "pending",
    },
  });

  await prisma.reelJob.update({
    where: { id: job.id },
    data: { tier: body.tier },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
