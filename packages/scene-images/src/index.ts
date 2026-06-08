import type { ProductCard, ReelScript, SceneImage } from "@reels-factory/shared";
import { sceneImagesSchema } from "@reels-factory/shared";
import { generateSceneImageBuffer } from "./generate.js";
import { buildSceneImagePrompt } from "./prompts.js";

export type SceneImageUploader = (
  key: string,
  body: Buffer,
  contentType: string
) => Promise<string>;

export type SceneImageProgress = (
  sceneIndex: number,
  phase: "start" | "complete"
) => void | Promise<void>;

function fallbackFromProduct(
  product: ProductCard,
  script: ReelScript
): SceneImage[] {
  return script.scenes.slice(0, 4).map((scene, i) => {
    const idx = scene.imageIndex ?? i;
    const imageUrl =
      product.images[idx % Math.max(product.images.length, 1)] ??
      product.images[0] ??
      "https://placehold.co/720x1280/312e81/ffffff/png?text=Scene";

    return {
      sceneIndex: i,
      style: scene.style,
      text: scene.text,
      imageUrl,
      prompt: "fallback:product-photo",
    };
  });
}

export async function generateSceneImages(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  upload: SceneImageUploader,
  onProgress?: SceneImageProgress
): Promise<SceneImage[]> {
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
    return sceneImagesSchema.parse(fallbackFromProduct(product, script));
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

    const buffer = await generateSceneImageBuffer({
      product,
      script,
      scene,
      sceneIndex: i,
      referenceImageUrl,
    });
    const key = `scene-images/${jobId}/scene-${i}.png`;

    let imageUrl: string;
    try {
      imageUrl = await upload(key, buffer, "image/png");
    } catch (uploadErr) {
      console.warn(
        `[scene-images] Upload failed, using data URL for scene ${i}:`,
        uploadErr
      );
      imageUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    }

    const promptPreview = buildSceneImagePrompt(product, script, scene, i);

    results.push({
      sceneIndex: i,
      style: scene.style,
      text: scene.text,
      imageUrl,
      prompt: promptPreview.slice(0, 500),
    });

    await onProgress?.(i, "complete");
  }

  return sceneImagesSchema.parse(results);
}

export {
  buildSceneImagePrompt,
  buildReferenceEditPrompt,
  buildVisualSeriesBrief,
} from "./prompts.js";
export { generateSceneImageBuffer, getImageModel } from "./generate.js";
