import OpenAI from "openai";
import { toFile } from "openai/uploads";
import type {
  ImageEditParams,
  ImageGenerateParams,
  ImagesResponse,
} from "openai/resources/images.js";
import {
  buildReferenceEditPrompt,
  buildSceneImagePrompt,
} from "./prompts.js";
import type {
  ProductCard,
  PromptOverrides,
  ReelScript,
  RequestLogPayload,
} from "@reels-factory/shared";

const GPT_IMAGE_RE = /^(gpt-image|chatgpt-image)/i;

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
}

function isGptImageModel(model: string): boolean {
  return GPT_IMAGE_RE.test(model);
}

function isDalle3(model: string): boolean {
  return model === "dall-e-3";
}

function getQuality(
  model: string
): ImageGenerateParams["quality"] | ImageEditParams["quality"] {
  const env = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase();
  if (env === "hd" || env === "high" || env === "medium" || env === "low") {
    return env === "hd" ? "hd" : (env as "high" | "medium" | "low");
  }
  if (isDalle3(model)) return "hd";
  if (isGptImageModel(model)) return "high";
  return "standard";
}

function getGenerateSize(model: string): ImageGenerateParams["size"] {
  const env = process.env.OPENAI_IMAGE_SIZE?.trim();
  if (env) return env as ImageGenerateParams["size"];

  if (isDalle3(model)) return "1024x1792";
  if (isGptImageModel(model)) return "1024x1536";
  return "1024x1024";
}

function getEditSize(model: string): ImageEditParams["size"] {
  const env = process.env.OPENAI_IMAGE_SIZE?.trim();
  if (env && env !== "1024x1792" && env !== "1792x1024") {
    return env as ImageEditParams["size"];
  }
  return "1024x1536";
}

function getGptQuality(): ImageEditParams["quality"] {
  const env = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase();
  if (env === "high" || env === "medium" || env === "low") return env;
  return "high";
}

function useReferenceImages(): boolean {
  return process.env.SCENE_IMAGE_USE_REFERENCE !== "false";
}

async function fetchReferenceBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) {
      const base64 = url.split(",")[1];
      return base64 ? Buffer.from(base64, "base64") : null;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function extractB64(response: ImagesResponse): string {
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned empty image data");
  }
  return b64;
}

async function generateFromPrompt(
  openai: OpenAI,
  model: string,
  prompt: string
): Promise<Buffer> {
  const maxLen = isDalle3(model) ? 4000 : 32_000;
  const response = await openai.images.generate({
    model,
    prompt: prompt.slice(0, maxLen),
    size: getGenerateSize(model),
    quality: getQuality(model),
    ...(isDalle3(model)
      ? { style: "vivid" as const, response_format: "b64_json" as const }
      : {}),
  });

  return Buffer.from(extractB64(response), "base64");
}

async function generateFromReference(
  openai: OpenAI,
  model: string,
  prompt: string,
  referenceBuffer: Buffer
): Promise<Buffer> {
  const file = await toFile(referenceBuffer, "product.jpg", {
    type: "image/jpeg",
  });

  const response = await openai.images.edit({
    model,
    image: file,
    prompt: prompt.slice(0, 32_000),
    size: getEditSize(model),
    quality: getGptQuality(),
  });

  return Buffer.from(extractB64(response), "base64");
}

export type SceneGenerationInput = {
  product: ProductCard;
  script: ReelScript;
  scene: ReelScript["scenes"][number];
  sceneIndex: number;
  referenceImageUrl?: string;
  promptOverrides?: PromptOverrides;
  onRequest?: (payload: RequestLogPayload) => void | Promise<void>;
};

export type SceneImageGenerationMeta = {
  model: string;
  quality: string;
  size: string;
  mode: "generate" | "edit" | "fallback";
};

export async function generateSceneImageBuffer(
  input: SceneGenerationInput
): Promise<{ buffer: Buffer; meta: SceneImageGenerationMeta }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const model = getImageModel();
  const {
    product,
    script,
    scene,
    sceneIndex,
    referenceImageUrl,
    promptOverrides,
    onRequest,
  } = input;

  const referenceBuf =
    useReferenceImages() &&
    referenceImageUrl &&
    isGptImageModel(model)
      ? await fetchReferenceBuffer(referenceImageUrl)
      : null;

  if (referenceBuf) {
    const editPrompt = buildReferenceEditPrompt(
      product,
      script,
      scene,
      sceneIndex,
      promptOverrides
    );
    try {
      const editSize = String(getEditSize(model));
      const editQuality = String(getGptQuality() ?? "high");
      await onRequest?.({
        method: "POST",
        url: "https://api.openai.com/v1/images/edits",
        service: "OpenAI",
        target: `картинка ${sceneIndex + 1}/4`,
        body: `model=${model} · edit · ${editSize} · ${editQuality}`,
        runtime: "Railway",
      });
      console.log(
        `[scene-images] Reference edit scene ${sceneIndex + 1} model=${model} quality=${getGptQuality()}`
      );
      const buffer = await generateFromReference(
        openai,
        model,
        editPrompt,
        referenceBuf
      );
      return {
        buffer,
        meta: {
          model,
          quality: String(getGptQuality() ?? "high"),
          size: String(getEditSize(model)),
          mode: "edit" as const,
        },
      };
    } catch (editErr) {
      console.warn(
        "[scene-images] Reference edit failed, falling back to generate:",
        editErr instanceof Error ? editErr.message : editErr
      );
    }
  }

  const prompt = buildSceneImagePrompt(
    product,
    script,
    scene,
    sceneIndex,
    promptOverrides
  );
  const quality = String(getQuality(model) ?? "standard");
  const size = String(getGenerateSize(model));
  await onRequest?.({
    method: "POST",
    url: "https://api.openai.com/v1/images/generations",
    service: "OpenAI",
    target: `картинка ${sceneIndex + 1}/4`,
    body: `model=${model} · generate · ${size} · ${quality}`,
    runtime: "Railway",
  });
  console.log(
    `[scene-images] Generate scene ${sceneIndex + 1} model=${model} quality=${quality} size=${size}`
  );
  const buffer = await generateFromPrompt(openai, model, prompt);
  return {
    buffer,
    meta: {
      model,
      quality,
      size,
      mode: "generate" as const,
    },
  };
}

