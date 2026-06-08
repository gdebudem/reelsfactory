import { NextResponse } from "next/server";
import { generateScriptRequestSchema } from "@reels-factory/shared";
import { generateReelScript } from "@reels-factory/ai-script";
import { prisma } from "@/lib/prisma";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = generateScriptRequestSchema.parse(body);
    const result = await generateReelScript(input);

    if (input.jobId) {
      if (!hasDatabaseConfigured()) {
        const p = envProblemResponse("db");
        return NextResponse.json(p.body, { status: p.status });
      }
      await prisma.reelJob.update({
        where: { id: input.jobId },
        data: {
          scriptJson: result.script,
          templateId: result.script.templateId,
        },
      });
    }

    return NextResponse.json({ script: result.script, usage: result.usage });
  } catch (e) {
    console.error("[generate-script]", e);
    return NextResponse.json(
      { error: "Не удалось сгенерировать сценарий" },
      { status: 500 }
    );
  }
}
