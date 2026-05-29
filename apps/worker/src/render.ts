import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import fs from "fs";
import { prefetchProductImages } from "./prefetchImages.js";
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
  script: ReelScript
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

  const entry = path.resolve(
    __dirname,
    "../../../packages/video-templates/src/Root.tsx"
  );
  const outDir = path.resolve(__dirname, "../../.render-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${jobId}.mp4`);

  const bundleLocation = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const productForRender = await prefetchProductImages(product);
  const inputProps = { product: productForRender, script };
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: VIDEO_CONFIG.compositionId,
    inputProps,
  });

  const browserExecutable =
    process.env.REMOTION_CHROME_EXECUTABLE ||
    process.env.CHROME_EXECUTABLE ||
    undefined;

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    browserExecutable,
    timeoutInMilliseconds: 120_000,
  });

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
