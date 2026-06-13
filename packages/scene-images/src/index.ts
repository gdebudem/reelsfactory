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
  buildHttpGetRequestLog,
  describeOpenAiCapacityError,
  isDevMockAllowed,
  isOpenAiCapacityError,
  OPENAI_BILLING_LOG_HINT,
} from "@reels-factory/shared";
import { buildSceneImagePrompt } from "./prompts";
import { lintAllScenes, sceneHeadline } from "@reels-factory/shared";
import { compositeSceneWithDesign } from "@reels-factory/design-renderer";
import {
  fetchImageBuffer,
  PLACEHOLDER_IMAGE_URL,
} from "./fetch-image";

export class DesignQaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesignQaError";
  }
}

export class SceneImageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneImageGenerationError";
  }
}

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
};

function isDevSceneImageMockAllowed(): boolean {
  return (
    process.env.MOCK_SCENE_IMAGES === "true" && isDevMockAllowed()
  );
}

function assertCanGenerateSceneImages(): void {
  if (process.env.OPENAI_API_KEY?.trim()) return;
  if (isDevSceneImageMockAllowed()) return;
  throw new SceneImageGenerationError(
    "Не удалось сгенерировать кадры. Попробуйте снова."
  );
}

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

/** Dev-only mock: product photos with text overlay. Never used in production. */
async function buildDevMockSceneImages(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  upload: SceneImageUploader,
  onProgress?: SceneImageProgress,
  onRequest?: (payload: RequestLogPayload) => void | Promise<void>
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

    let buffer: Buffer;
    let contentType = "image/jpeg";
    try {
      const fetched = await fetchImageBuffer(sourceUrl);
      buffer = fetched.buffer;
      contentType = fetched.contentType;
      await onRequest?.(
        buildHttpGetRequestLog({
          url: sourceUrl,
          service: "HTTP",
          target: `dev mock · сцена ${i + 1}/4`,
          body: "локальный mock кадра",
          status: 200,
          result: `${Math.max(1, Math.round(buffer.length / 1024))} KB`,
          runtime: "local",
        })
      );
      buffer = await compositeSceneWithDesign(buffer, script, i);
      contentType = "image/png";
    } catch {
      const placeholder = await fetchImageBuffer(PLACEHOLDER_IMAGE_URL);
      buffer = placeholder.buffer;
      contentType = placeholder.contentType;
    }

    const imageUrl = await storeSceneImage(jobId, i, buffer, contentType, upload);
    await onProgress?.(i, "complete", {
      model: "mock",
      quality: "dev",
      size: "site",
      mode: "fallback",
    });

    results.push({
      sceneIndex: i,
      style: scene.style,
      text: sceneHeadline(scene),
      imageUrl,
      prompt: "dev-mock:product-photo",
    });
  }

  return { scenes: sceneImagesSchema.parse(results) };
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
    throw new SceneImageGenerationError(
      `Need 4 scenes, got ${scenes.length}`
    );
  }

  assertCanGenerateSceneImages();

  if (isDevSceneImageMockAllowed()) {
    console.warn(`[scene-images] Dev mock scene images for job ${jobId}`);
    return buildDevMockSceneImages(
      jobId,
      product,
      script,
      upload,
      onProgress,
      onRequest
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
        throw new SceneImageGenerationError(
          `Не удалось сгенерировать кадры: ${describeOpenAiCapacityError(err)}. ${OPENAI_BILLING_LOG_HINT}`
        );
      }
      const detail = err instanceof Error ? err.message : String(err);
      throw new SceneImageGenerationError(
        `Не удалось сгенерировать кадр ${i + 1}/4. Попробуйте снова. (${detail.slice(0, 120)})`
      );
    }

    const designLint = lintAllScenes(script, { backgroundOnly: true });
    if (!designLint.passed) {
      throw new DesignQaError(
        `Design QA failed: ${designLint.issues.join(", ")}`
      );
    }

    try {
      buffer = await compositeSceneWithDesign(buffer, script, i);
    } catch (compositeErr) {
      console.warn(
        `[scene-images] Design composite failed scene ${i + 1}:`,
        compositeErr instanceof Error ? compositeErr.message : compositeErr
      );
    }

    const imageUrl = await storeSceneImage(jobId, i, buffer, "image/png", upload);

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
      text: sceneHeadline(scene),
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
  isFallbackSceneImage,
  sceneImagesNeedRegeneration,
} from "./scene-url";
