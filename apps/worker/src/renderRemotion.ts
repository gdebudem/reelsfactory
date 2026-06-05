import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import fs from "fs";
import { prefetchProductImages } from "./prefetchImages.js";
import {
  CHROMIUM_OPTIONS,
  ensureRemotionBrowser,
} from "./remotionBrowser.js";
import { uploadToStorage } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RENDER_TIMEOUT_MS = Number(
  process.env.REMOTION_TIMEOUT_MS ?? 300_000
);

export async function renderReelWithRemotion(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  outputPath: string
): Promise<string> {
  const entry = path.resolve(
    __dirname,
    "../../../packages/video-templates/src/Root.tsx"
  );
  console.log("[render] Engine: remotion");
  console.log("[render] Bundling Remotion project…");
  const bundleLocation = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const productForRender = await prefetchProductImages(product);
  const inputProps = { product: productForRender, script };

  const browserExecutable = await ensureRemotionBrowser();

  console.log("[render] Launching headless browser…");
  const browser = await openBrowser("chrome", {
    browserExecutable,
    chromiumOptions: CHROMIUM_OPTIONS,
    logLevel: "info",
  });

  try {
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: VIDEO_CONFIG.compositionId,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable,
      chromiumOptions: CHROMIUM_OPTIONS,
      timeoutInMilliseconds: RENDER_TIMEOUT_MS,
      logLevel: "info",
    });

    console.log(
      `[render] Rendering ${composition.durationInFrames} frames (concurrency 1)…`
    );

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable,
      chromiumOptions: CHROMIUM_OPTIONS,
      concurrency: 1,
      timeoutInMilliseconds: RENDER_TIMEOUT_MS,
      logLevel: "info",
    });
  } finally {
    await browser.close({ silent: true }).catch(() => undefined);
  }

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
