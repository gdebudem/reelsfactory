import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import { prefetchProductImages } from "./prefetchImages.js";

const FONT_BOLD =
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf";
const FONT_REGULAR =
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";

/** 720×1280 — fits Railway 1 GB; still good for mobile Reels. */
const OUT_W = 720;
const OUT_H = 1280;
const DURATION_SEC = VIDEO_CONFIG.durationInFrames / VIDEO_CONFIG.fps;

export function shouldUseFfmpegRender(): boolean {
  const engine = process.env.RENDER_ENGINE?.trim().toLowerCase();
  if (engine === "remotion") return false;
  if (engine === "ffmpeg") return true;
  // On Railway (1 GB plans) Chrome/Remotion often cannot start — use ffmpeg.
  return Boolean(process.env.RAILWAY_ENVIRONMENT);
}

export async function renderReelWithFfmpeg(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  outputPath: string
): Promise<void> {
  const productForRender = await prefetchProductImages(product);
  const imageSrc = productForRender.images[0] ?? "";

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `reel-${jobId}-`));
  const imagePath = path.join(tmpDir, "product.jpg");

  try {
    await writeImageFile(imageSrc, imagePath);
    const filter = buildFilter(script);
    console.log(`[render:ffmpeg] ${OUT_W}x${OUT_H}, ${DURATION_SEC}s, job ${jobId}`);

    await runFfmpeg([
      "-y",
      "-loop",
      "1",
      "-i",
      imagePath,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-t",
      String(DURATION_SEC),
      "-r",
      String(VIDEO_CONFIG.fps),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function writeImageFile(src: string, dest: string): Promise<void> {
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1];
    if (!base64) throw new Error("Invalid data URL for product image");
    await writeFile(dest, Buffer.from(base64, "base64"));
    return;
  }

  const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function buildFilter(script: ReelScript): string {
  const frames = VIDEO_CONFIG.durationInFrames;
  const ctaStart = frames - VIDEO_CONFIG.fps * 3;

  const headline = escapeDrawtext(script.headline);
  const sub = escapeDrawtext(script.subheadline);
  const price = script.priceLabel
    ? escapeDrawtext(script.priceLabel)
    : null;
  const cta = escapeDrawtext(script.ctaText);

  const lines = [
    `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease`,
    `pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a`,
    `zoompan=z='min(zoom+0.0010,1.05)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${VIDEO_CONFIG.fps}[base]`,
    `[base]drawtext=fontfile=${FONT_BOLD}:text='${headline}':fontsize=34:fontcolor=white:x=(w-text_w)/2:y=50:shadowcolor=black@0.6:shadowx=2:shadowy=2[t1]`,
    `[t1]drawtext=fontfile=${FONT_REGULAR}:text='${sub}':fontsize=22:fontcolor=0xC4B5FD:x=(w-text_w)/2:y=100[t2]`,
  ];

  let last = "t2";
  if (price) {
    lines.push(
      `[${last}]drawtext=fontfile=${FONT_BOLD}:text='${price}':fontsize=28:fontcolor=0xF59E0B:x=(w-text_w)/2:y=h-220[t3]`
    );
    last = "t3";
  }

  lines.push(
    `[${last}]drawtext=fontfile=${FONT_BOLD}:text='${cta}':fontsize=26:fontcolor=0x312E81:box=1:boxcolor=white@0.95:boxborderw=16:x=(w-text_w)/2:y=h-120:enable='gte(n,${ctaStart})'[v]`
  );

  return lines.join(";");
}

function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''")
    .replace(/%/g, "\\%")
    .slice(0, 80);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        const tail = stderr.split("\n").slice(-8).join("\n");
        reject(new Error(`ffmpeg exited ${code}: ${tail}`));
      }
    });
  });
}
