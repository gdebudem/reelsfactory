import type { ProductCard, ReelScript, SceneImage } from "@reels-factory/shared";
import { renderViralReelWithFfmpeg } from "./renderFfmpegViral.js";

export function shouldUseFfmpegRender(): boolean {
  const engine = process.env.RENDER_ENGINE?.trim().toLowerCase();
  if (engine === "remotion") return false;
  if (engine === "ffmpeg") return true;
  return Boolean(process.env.RAILWAY_ENVIRONMENT);
}

export async function renderReelWithFfmpeg(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  outputPath: string,
  sceneImages?: SceneImage[] | null
): Promise<void> {
  if (script.templateId !== "viral_v1") {
    console.log(
      `[render:ffmpeg] template=${script.templateId ?? "none"} → viral_v1, job ${jobId}`
    );
  }
  return renderViralReelWithFfmpeg(jobId, product, script, outputPath, sceneImages);
}
