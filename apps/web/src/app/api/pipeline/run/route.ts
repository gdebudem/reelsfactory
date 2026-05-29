import { NextResponse } from "next/server";
import { runReelPipeline } from "@/lib/pipeline/runReelPipeline";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await runReelPipeline(body);

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[pipeline/run]", e);
    return NextResponse.json(
      { error: "Не удалось запустить пайплайн" },
      { status: 500 }
    );
  }
}
