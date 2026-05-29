import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import { prefetchProductImages } from "./prefetchImages.js";

const FONT_BOLD = pickFontFile(
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  "C:/Windows/Fonts/arialbd.ttf"
);
const FONT_REGULAR = pickFontFile(
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "C:/Windows/Fonts/arial.ttf"
);

function pickFontFile(...candidates: string[]): string {
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error(
    `No font file found. Tried: ${candidates.join(", ")}. Install fonts-noto-core (Linux) or use Windows.`
  );
}

const OUT_W = 720;
const OUT_H = 1280;
const FPS = VIDEO_CONFIG.fps;
const DURATION_SEC = VIDEO_CONFIG.durationInFrames / FPS;

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
  outputPath: string
): Promise<void> {
  const productForRender = await prefetchProductImages(product);
  const imageSrc = productForRender.images[0] ?? "";

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `reel-${jobId}-`));
  const imagePath = path.join(tmpDir, "product.jpg");

  try {
    await writeImageFile(imageSrc, imagePath);
    const fonts = await copyFontsToDir(tmpDir);
    const filter = buildSceneFilter(script, fonts);
    console.log(
      `[render:ffmpeg] ${OUT_W}x${OUT_H}, ${DURATION_SEC}s, ${script.scenes.length} scenes, job ${jobId}`
    );

    await runFfmpeg(
      [
        "-y",
        "-loop",
        "1",
        "-i",
        "product.jpg",
        "-filter_complex",
        filter,
        "-map",
        "[v]",
        "-t",
        String(DURATION_SEC),
        "-r",
        String(FPS),
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
        "out.mp4",
      ],
      tmpDir
    );

    await copyFile(path.join(tmpDir, "out.mp4"), outputPath);
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

async function copyFontsToDir(tmpDir: string): Promise<{
  bold: string;
  regular: string;
}> {
  const boldRel = "fonts/bold.ttf";
  const regularRel = "fonts/regular.ttf";
  await mkdir(path.join(tmpDir, "fonts"), { recursive: true });
  await copyFile(FONT_BOLD, path.join(tmpDir, boldRel));
  await copyFile(FONT_REGULAR, path.join(tmpDir, regularRel));
  return { bold: boldRel, regular: regularRel };
}

function buildSceneFilter(
  script: ReelScript,
  fonts: { bold: string; regular: string }
): string {
  const frames = VIDEO_CONFIG.durationInFrames;
  const scenes =
    script.scenes.length >= 3
      ? script.scenes
      : fallbackScenes(script);

  const lines = [
    `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease[scaled]`,
    `[scaled]pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a[padded]`,
    `[padded]zoompan=z='min(zoom+0.0012,1.06)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}[base]`,
  ];

  let last = "base";
  scenes.forEach((scene, index) => {
    const start = Math.max(0, Math.round(scene.startSec * FPS));
    const end = Math.min(
      frames - 1,
      Math.max(start + 1, Math.round(scene.endSec * FPS) - 1)
    );
    const enable = `between(n\\,${start}\\,${end})`;
    const style = scene.style ?? "subheadline";
    const text = escapeDrawtext(scene.text);
    const label = index === scenes.length - 1 ? "v" : `s${index}`;

    const cfg = sceneStyle(style, fonts, text, enable);
    lines.push(`[${last}]drawtext=${cfg}[${label}]`);
    last = label;
  });

  if (last !== "v") {
    lines.push(`[${last}]null[v]`);
  }

  return lines.join(";");
}

function sceneStyle(
  style: string,
  fonts: { bold: string; regular: string },
  text: string,
  enable: string
): string {
  const bold = fonts.bold;
  const regular = fonts.regular;

  switch (style) {
    case "headline":
      return `fontfile=${bold}:text='${text}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=80:shadowcolor=black@0.7:shadowx=2:shadowy=2:enable='${enable}'`;
    case "bullet":
      return `fontfile=${bold}:text='• ${text}':fontsize=28:fontcolor=white:box=1:boxcolor=0x312E81@0.85:boxborderw=14:x=(w-text_w)/2:y=h/2-40:enable='${enable}'`;
    case "review":
      return `fontfile=${regular}:text='${text}':fontsize=24:fontcolor=0xFDE68A:x=(w-text_w)/2:y=h-280:shadowcolor=black@0.5:shadowx=1:shadowy=1:enable='${enable}'`;
    case "cta":
      return `fontfile=${bold}:text='${text}':fontsize=26:fontcolor=0x312E81:box=1:boxcolor=white@0.95:boxborderw=16:x=(w-text_w)/2:y=h-110:enable='${enable}'`;
    case "subheadline":
    default:
      return `fontfile=${regular}:text='${text}':fontsize=24:fontcolor=0xC4B5FD:x=(w-text_w)/2:y=140:enable='${enable}'`;
  }
}

function fallbackScenes(script: ReelScript) {
  return [
    { startSec: 0, endSec: 3, text: script.headline, style: "headline" as const },
    {
      startSec: 3,
      endSec: 8,
      text: script.subheadline,
      style: "subheadline" as const,
    },
    ...(script.bullets?.[0]
      ? [
          {
            startSec: 8,
            endSec: 11,
            text: script.bullets[0],
            style: "bullet" as const,
          },
        ]
      : []),
    {
      startSec: 11,
      endSec: 15,
      text: script.priceLabel
        ? `${script.priceLabel} · ${script.ctaText}`
        : script.ctaText,
      style: "cta" as const,
    },
  ];
}

function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''")
    .replace(/%/g, "\\%")
    .slice(0, 90);
}

function runFfmpeg(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        const tail = stderr.split("\n").slice(-10).join("\n");
        reject(new Error(`ffmpeg exited ${code}: ${tail}`));
      }
    });
  });
}
