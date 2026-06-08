import path from "path";
import { fileURLToPath } from "url";
import type { ProductCard, ReelScript, SceneImage } from "@reels-factory/shared";
import fs from "fs";
import { renderReelWithFfmpeg, shouldUseFfmpegRender } from "./renderFfmpeg.js";
import { hasStorageConfigured, uploadToStorage } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEMO_VIDEO_URL =
  process.env.DEMO_VIDEO_URL ??
  "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

export function getRenderMode(): "full" | "demo" | "mock" {
  if (process.env.MOCK_RENDER === "true") return "mock";
  if (!hasStorageConfigured()) return "demo";
  return "full";
}

async function renderMockPlaceholder(jobId: string): Promise<string> {
  const key = `videos/${jobId}.txt`;
  const body = Buffer.from(
    "Reels Factory — MOCK_RENDER placeholder. Set MOCK_RENDER=false for real MP4."
  );
  return uploadToStorage(key, body, "text/plain");
}

export async function renderReelToS3(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  sceneImages?: SceneImage[] | null
): Promise<string> {
  const mode = getRenderMode();

  if (mode === "demo") {
    console.warn(
      "[render] S3/R2 not configured — using DEMO_VIDEO_URL. See R2_SETUP.md"
    );
    return DEMO_VIDEO_URL;
  }

  if (mode === "mock") {
    if (!hasStorageConfigured()) return DEMO_VIDEO_URL;
    return renderMockPlaceholder(jobId);
  }

  const outDir = path.resolve(__dirname, "../../.render-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${jobId}.mp4`);

  if (shouldUseFfmpegRender()) {
    console.log("[render] Engine: ffmpeg (Railway / LOW_MEMORY)");
    await renderReelWithFfmpeg(jobId, product, script, outputPath, sceneImages);
    const key = `videos/${jobId}.mp4`;
    const body = fs.readFileSync(outputPath);
    try {
      fs.unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
    const url = await uploadToStorage(key, body, "video/mp4");
    console.log(`[render] Uploaded ${key} → ${url}`);
    return url;
  }

  const { renderReelWithRemotion } = await import("./renderRemotion.js");
  return renderReelWithRemotion(jobId, product, script, outputPath);
}
