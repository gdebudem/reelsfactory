import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createReelJobSchema } from "@reels-factory/shared";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";

export async function POST(req: Request) {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }

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
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }

  const session = await getServerSession(authOptions);
  const rows = await prisma.reelJob.findMany({
    where: session?.user?.id ? { userId: session.user.id } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      reelType: true,
      createdAt: true,
      productJson: true,
      _count: { select: { pipelineLogs: true } },
    },
  });

  const jobs = rows.map((row) => ({
    id: row.id,
    status: row.status,
    reelType: row.reelType,
    createdAt: row.createdAt.toISOString(),
    productJson: row.productJson,
    logCount: row._count.pipelineLogs,
  }));

  return NextResponse.json({ jobs });
}
