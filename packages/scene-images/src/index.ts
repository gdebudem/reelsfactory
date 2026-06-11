import type {
  ProductCard,
  PromptOverrides,
  ReelScript,
  RequestLogPayload,
  SceneImage,
} from "@reels-factory/shared";
import { sceneImagesSchema } from "@reels-factory/shared";
import { generateSceneImageBuffer } from "./generate";
import {
  describeOpenAiCapacityError,
  isOpenAiCapacityError,
  OPENAI_BILLING_LOG_HINT,
} from "@reels-factory/shared";
import { buildSceneImagePrompt } from "./prompts";
import {
  fetchImageBuffer,
  PLACEHOLDER_IMAGE_URL,
} from "./fetch-image";

export type SceneImageUploader = (
  key: string,
  body: Buffer,
  contentType: string
) => Promise<string>;

export type SceneImageProgress = (
  sceneIndex: number,
  phase: "start" | "complete",
  meta?: import("./generate").SceneImageGenerationMeta
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

async function buildSingleSceneFallback(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  sceneIndex: number,
  upload: SceneImageUploader,
  onProgress?: SceneImageProgress
): Promise<SceneImage> {
  const scene = script.scenes[sceneIndex]!;
  await onProgress?.(sceneIndex, "start");

  const idx = scene.imageIndex ?? sceneIndex;
  const sourceUrl =
    product.images[idx % Math.max(product.images.length, 1)] ??
    product.images[0] ??
    PLACEHOLDER_IMAGE_URL;

  let imageUrl = PLACEHOLDER_IMAGE_URL;
  try {
    const { buffer, contentType } = await fetchImageBuffer(sourceUrl);
    imageUrl = await storeSceneImage(jobId, sceneIndex, buffer, contentType, upload);
  } catch {
    try {
      const placeholder = await fetchImageBuffer(PLACEHOLDER_IMAGE_URL);
      imageUrl = await storeSceneImage(
        jobId,
        sceneIndex,
        placeholder.buffer,
        placeholder.contentType,
        upload
      );
    } catch {
      /* keep placeholder URL */
    }
  }

  await onProgress?.(sceneIndex, "complete", {
    model: "fallback",
    quality: "product-photo",
    size: "site",
    mode: "fallback",
  });

  return {
    sceneIndex,
    style: scene.style,
    text: scene.text,
    imageUrl,
    prompt: "fallback:product-photo",
  };
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
    results.push(
      await buildSingleSceneFallback(jobId, product, script, i, upload, onProgress)
    );
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
    let meta: import("./generate").SceneImageGenerationMeta;

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
      console.warn(
        `[scene-images] OpenAI error scene ${i + 1}, single-scene fallback:`,
        err instanceof Error ? err.message : err
      );
      results.push(
        await buildSingleSceneFallback(
          jobId,
          product,
          script,
          i,
          upload,
          onProgress
        )
      );
      continue;
    }

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
} from "./prompts";
export { generateSceneImageBuffer, getImageModel } from "./generate";
export { fetchImageBuffer, PLACEHOLDER_IMAGE_URL } from "./fetch-image";
export {
  extractSceneStorageKey,
  isBrokenSceneImageUrl,
  isDirectBrowserSceneUrl,
  sceneImagesNeedRegeneration,
} from "./scene-url";
