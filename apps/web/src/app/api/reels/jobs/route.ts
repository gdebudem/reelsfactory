import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createReelJobSchema } from "@reels-factory/shared";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const data = createReelJobSchema.parse(body);

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

    return NextResponse.json({ job });
  } catch (e) {
    console.error("[jobs POST]", e);
    return NextResponse.json(
      { error: "Не удалось создать задачу" },
      { status: 400 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const jobs = await prisma.reelJob.findMany({
    where: session?.user?.id ? { userId: session.user.id } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ jobs });
}
