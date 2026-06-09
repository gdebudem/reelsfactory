import { NextResponse } from "next/server";
import {
  getDefaultPromptContent,
  listPipelinePrompts,
  normalizePromptOverrides,
  PIPELINE_PROMPT_IDS,
  type PipelinePromptId,
  type PromptOverrides,
} from "@reels-factory/shared";
import { hasDatabaseConfigured } from "@/lib/env";
import {
  loadPromptOverrides,
  savePromptOverrides,
} from "@/lib/prompt-overrides";

export async function GET() {
  if (!hasDatabaseConfigured()) {
    return NextResponse.json({
      prompts: listPipelinePrompts({}),
      overrides: {},
      persisted: false,
    });
  }

  const overrides = await loadPromptOverrides();
  return NextResponse.json({
    prompts: listPipelinePrompts(overrides),
    overrides,
    persisted: true,
  });
}

export async function PUT(req: Request) {
  if (!hasDatabaseConfigured()) {
    return NextResponse.json(
      { error: "База данных не настроена" },
      { status: 503 }
    );
  }

  const body = (await req.json()) as {
    overrides?: PromptOverrides;
    reset?: PipelinePromptId[];
  };

  const current = await loadPromptOverrides();
  const next: PromptOverrides = { ...current };

  if (body.reset?.length) {
    for (const id of body.reset) {
      delete next[id];
    }
  }

  if (body.overrides) {
    const normalized = normalizePromptOverrides(body.overrides);
    for (const id of PIPELINE_PROMPT_IDS) {
      const value = normalized[id];
      if (value === undefined) continue;
      if (value.trim() === getDefaultPromptContent(id)) {
        delete next[id];
      } else {
        next[id] = value.trim();
      }
    }
  }

  const saved = await savePromptOverrides(next);
  return NextResponse.json({
    ok: true,
    prompts: listPipelinePrompts(saved),
    overrides: saved,
  });
}
