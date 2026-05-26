import { NextResponse } from "next/server";
import { generateScriptRequestSchema } from "@reels-factory/shared";
import { generateReelScript } from "@reels-factory/ai-script";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = generateScriptRequestSchema.parse(body);
    const script = await generateReelScript(input);

    if (input.jobId) {
      await prisma.reelJob.update({
        where: { id: input.jobId },
        data: { scriptJson: script, templateId: script.templateId },
      });
    }

    return NextResponse.json({ script });
  } catch (e) {
    console.error("[generate-script]", e);
    return NextResponse.json(
      { error: "Не удалось сгенерировать сценарий" },
      { status: 500 }
    );
  }
}
