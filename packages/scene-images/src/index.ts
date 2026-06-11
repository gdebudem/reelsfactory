import type {
  ProductCard,
  PromptOverrides,
  ReelScript,
  RequestLogPayload,
  SceneImage,
} from "@reels-factory/shared";
import { sceneImagesSchema } from "@reels-factory/shared";
import { generateSceneImageBuffer } from "./generate.js";
import {
  describeOpenAiCapacityError,
  isOpenAiCapacityError,
  OPENAI_BILLING_LOG_HINT,
} from "@reels-factory/shared";
import { buildSceneImagePrompt } from "./prompts.js";
import {
  fetchImageBuffer,
  PLACEHOLDER_IMAGE_URL,
} from "./fetch-image.js";

export type SceneImageUploader = (
  key: string,
  body: Buffer,
  contentType: string
) => Promise<string>;

export type SceneImageProgress = (
  sceneIndex: number,
  phase: "start" | "complete",
  meta?: import("./generate.js").SceneImageGenerationMeta
) => void | Promise<void>;

export type GenerateSceneImagesResult = {
  scenes: SceneImage[];
  usedProductPhotoFallback?: boolean;
  fallbackReason?: string;
};

async function storeSceneImage(
  jobId: string,
  sceneIndex: number,
  buffer: Buffer,
  contentType: string,
  upload: SceneImageUploader
): Promise<string> {
  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `scene-images/${jobId}/scene-${sceneIndex}.${ext}`;
  try {
    return await upload(key, buffer, contentType);
  } catch (uploadErr) {
    console.warn(
      `[scene-images] Upload failed scene ${sceneIndex + 1}, data URL:`,
      uploadErr
    );
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }
}

async function buildProductPhotoFallback(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  upload: SceneImageUploader,
  onProgress?: SceneImageProgress,
  reason?: string
): Promise<GenerateSceneImagesResult> {
  const results: SceneImage[] = [];

  for (let i = 0; i < 4; i++) {
    const scene = script.scenes[i]!;
    await onProgress?.(i, "start");

    const idx = scene.imageIndex ?? i;
    const sourceUrl =
      product.images[idx % Math.max(product.images.length, 1)] ??
      product.images[0] ??
      PLACEHOLDER_IMAGE_URL;

    let imageUrl = PLACEHOLDER_IMAGE_URL;
    try {
      const { buffer, contentType } = await fetchImageBuffer(sourceUrl);
      imageUrl = await storeSceneImage(jobId, i, buffer, contentType, upload);
    } catch (err) {
      console.warn(
        `[scene-images] Fallback fetch failed scene ${i + 1}:`,
        err instanceof Error ? err.message : err
      );
      try {
        const placeholder = await fetchImageBuffer(PLACEHOLDER_IMAGE_URL);
        imageUrl = await storeSceneImage(
          jobId,
          i,
          placeholder.buffer,
          placeholder.contentType,
          upload
        );
      } catch {
        /* keep public placeholder URL */
      }
    }

    results.push({
      sceneIndex: i,
      style: scene.style,
      text: scene.text,
      imageUrl,
      prompt: "fallback:product-photo",
    });

    await onProgress?.(i, "complete", {
      model: "fallback",
      quality: "product-photo",
      size: "site",
      mode: "fallback",
    });
  }

  return {
    scenes: sceneImagesSchema.parse(results),
    usedProductPhotoFallback: true,
    fallbackReason: reason,
  };
}

export async function generateSceneImages(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  upload: SceneImageUploader,
  onProgress?: SceneImageProgress,
  promptOverrides?: PromptOverrides,
  onRequest?: (payload: RequestLogPayload) => void | Promise<void>
): Promise<GenerateSceneImagesResult> {
  const scenes = script.scenes.slice(0, 4);
  if (scenes.length < 4) {
    throw new Error(`Need 4 scenes, got ${scenes.length}`);
  }

  const useMock =
    process.env.MOCK_SCENE_IMAGES === "true" ||
    !process.env.OPENAI_API_KEY?.trim();

  if (useMock) {
    console.warn(
      `[scene-images] MOCK/fallback — using product photos for job ${jobId}`
    );
    return buildProductPhotoFallback(
      jobId,
      product,
      script,
      upload,
      onProgress,
      "картинки · фото с сайта (MOCK_SCENE_IMAGES или нет OPENAI_API_KEY)"
    );
  }

  const results: SceneImage[] = [];

  for (let i = 0; i < 4; i++) {
    const scene = scenes[i]!;
    await onProgress?.(i, "start");

    const imageIdx = scene.imageIndex ?? i;
    const referenceImageUrl =
      product.images[imageIdx % Math.max(product.images.length, 1)] ??
      product.images[0];

    console.log(
      `[scene-images] Generating ${i + 1}/4 for job ${jobId} (${scene.style})`
    );

    let buffer: Buffer;
    let meta: import("./generate.js").SceneImageGenerationMeta;

    try {
      ({ buffer, meta } = await generateSceneImageBuffer({
        product,
        script,
        scene,
        sceneIndex: i,
        referenceImageUrl,
        promptOverrides,
        onRequest,
      }));
    } catch (err) {
      if (isOpenAiCapacityError(err)) {
        const detail =
          err instanceof Error ? err.message : String(err);
        console.warn(
          `[scene-images] OpenAI capacity error on scene ${i + 1}, using product photos:`,
          detail
        );
        return buildProductPhotoFallback(
          jobId,
          product,
          script,
          upload,
          onProgress,
          `⚠ OpenAI биллинг: ${describeOpenAiCapacityError(err)}. Картинки — фото с сайта. ${OPENAI_BILLING_LOG_HINT}`
        );
      }
      throw err;
    }

    const key = `scene-images/${jobId}/scene-${i}.png`;

    let imageUrl = await storeSceneImage(jobId, i, buffer, "image/png", upload);

    const promptPreview = buildSceneImagePrompt(
      product,
      script,
      scene,
      i,
      promptOverrides
    );

    results.push({
      sceneIndex: i,
      style: scene.style,
      text: scene.text,
      imageUrl,
      prompt: promptPreview.slice(0, 500),
    });

    await onProgress?.(i, "complete", meta);
  }

  return { scenes: sceneImagesSchema.parse(results) };
}

export {
  buildSceneImagePrompt,
  buildReferenceEditPrompt,
  buildVisualSeriesBrief,
} from "./prompts.js";
export { generateSceneImageBuffer, getImageModel } from "./generate.js";
export { fetchImageBuffer, PLACEHOLDER_IMAGE_URL } from "./fetch-image.js";
