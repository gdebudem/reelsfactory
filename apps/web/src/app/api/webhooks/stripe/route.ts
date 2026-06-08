import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  appendPipelineLog,
  createInitialProgress,
  pipelineProgressSchema,
} from "@reels-factory/shared";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const reelJobId = session.metadata?.reelJobId;
    const tier = session.metadata?.tier;

    if (reelJobId) {
      const existing = await prisma.reelJob.findUnique({
        where: { id: reelJobId },
        select: { progressJson: true },
      });
      const progress = pipelineProgressSchema.parse(
        existing?.progressJson ?? createInitialProgress()
      );
      const paidProgress = appendPipelineLog(progress, "оплата принята · Stripe");

      await prisma.reelJob.update({
        where: { id: reelJobId },
        data: {
          status: "paid",
          progressJson: paidProgress,
          ...(tier ? { tier } : {}),
        },
      });
      if (session.id) {
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: "completed" },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
