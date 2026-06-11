import { NextResponse } from "next/server";
import { envProblemResponse, hasDatabaseConfigured } from "@/lib/env";
import { handleStoryboardPost } from "@/lib/pipeline/handleStoryboardPost";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabaseConfigured()) {
    const p = envProblemResponse("db");
    return NextResponse.json(p.body, { status: p.status });
  }

  const { id } = await params;
  const result = await handleStoryboardPost(id, { allowUnpaidDraft: true });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, details: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    resumed: result.resumed,
    busy: result.busy,
  });
}
