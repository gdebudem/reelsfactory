import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductCard, ReelScript, SceneImage } from "@reels-factory/shared";
import { sceneDuration } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import { pickMusicTrack } from "./music.js";
import { musicFileExists, resolveMusicPath } from "./ensureMusic.js";
import { prefetchProductImages } from "./prefetchImages.js";
import { normalizeScriptForViralRender } from "./normalizeScript.js";
import { resolveRenderFont } from "./resolveRenderFont.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT_W = 720;
const OUT_H = 1280;
const FPS = VIDEO_CONFIG.fps;
const DURATION_SEC = VIDEO_CONFIG.durationInFrames / FPS;
const XFADE_SEC = 0.12;

const TEXT_STYLE: Record<
  string,
  { fontSize: number; fontColor: string; y: string }
> = {
  hook: { fontSize: 44, fontColor: "white", y: "200" },
  pain: { fontSize: 36, fontColor: "0xDDD6FE", y: "220" },
  proof: { fontSize: 34, fontColor: "0xBAE6FD", y: "220" },
  cta: { fontSize: 40, fontColor: "white", y: "h-th-140" },
  headline: { fontSize: 44, fontColor: "white", y: "200" },
  bullet: { fontSize: 32, fontColor: "white", y: "240" },
  review: { fontSize: 28, fontColor: "0xBAE6FD", y: "h-th-160" },
  subheadline: { fontSize: 30, fontColor: "0xDDD6FE", y: "220" },
};

export async function renderViralReelWithFfmpeg(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  outputPath: string,
  sceneImages?: SceneImage[] | null
): Promise<void> {
  const viralScript = normalizeScriptForViralRender(script, product);
  const productForRender = await prefetchProductImages(product);
  const scenes = viralScript.scenes.slice(0, 4);
  const useAiImages = (sceneImages?.length ?? 0) >= 4;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `reel-viral-${jobId}-`));

  try {
    const imagePaths: string[] = [];
    for (let i = 0; i < 4; i++) {
      const scene = scenes[i];
      const src = useAiImages
        ? sceneImages![i]!.imageUrl
        : (productForRender.images[
            (scene?.imageIndex ?? i) %
              Math.max(productForRender.images.length, 1)
          ] ??
          productForRender.images[0] ??
          "");
      const imgPath = path.join(tmpDir, `scene-${i}.jpg`);
      await writeImageFile(src, imgPath);
      imagePaths.push(imgPath);
    }

    let fontPath = "";
    if (!useAiImages) {
      const font = resolveRenderFont();
      fontPath = path.join(tmpDir, font.fileName);
      await copyFile(font.sourcePath, fontPath);
      const textScenes = scenes.filter((s) => s.text?.trim()).length;
      console.log(
        `[render:viral] Text overlay: font=${font.family}, scenes=${textScenes}`
      );
    } else {
      console.log(`[render:viral] Using ${sceneImages!.length} AI scene images (no drawtext)`);
    }

    const track = pickMusicTrack(viralScript.musicTrackId, viralScript.musicMood);
    const musicPath = resolveMusicPath(track.file);
    const hasMusic = musicFileExists(track.file);

    if (!hasMusic) {
      console.error(
        `[render:viral] MUSIC MISSING: ${musicPath} — video will have no audio!`
      );
    }

    const clipDurations = scenes.map((scene, i) => sceneDuration(scene, i));
    const totalSec = clipDurations.reduce((a, b) => a + b, 0);
    const filter = buildViralFilter(scenes, clipDurations, fontPath, !useAiImages);
    // No -loop: zoompan d=frames generates clip length from a single image frame
    const args = ["-y", ...imagePaths.flatMap((p) => ["-i", p])];

    if (hasMusic) {
      args.push("-i", musicPath);
    }

    args.push(
      "-filter_complex",
      filter,
      "-map",
      "[vout]",
      ...(hasMusic ? ["-map", `${imagePaths.length}:a`] : []),
      "-t",
      String(totalSec > 0 ? totalSec : DURATION_SEC),
      "-r",
      String(FPS),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      ...(hasMusic
        ? [
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-af",
            `afade=t=in:st=0:d=0.5,afade=t=out:st=${(totalSec > 0 ? totalSec : DURATION_SEC) - 1}:d=1,volume=0.9,alimiter=limit=0.95`,
          ]
        : []),
      "-movflags",
      "+faststart",
      "-shortest",
      "out.mp4"
    );

    console.log(
      `[render:viral] ${OUT_W}x${OUT_H}, ${DURATION_SEC}s, music=${hasMusic ? track.id : "NONE"}, scenes=${scenes.length}, job ${jobId}`
    );
    await runFfmpeg(args, tmpDir);
    await copyFile(path.join(tmpDir, "out.mp4"), outputPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function motionZoompan(
  motion: string | undefined,
  frames: number
): string {
  switch (motion) {
    case "punch_in":
    case "slow_zoom":
      return `zoompan=z='min(zoom+0.0022,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`;
    case "push_in":
      return `zoompan=z='1.04':x='if(lte(on,1),0,x+1.2)':y='ih/8-(ih/zoom/8)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`;
    case "product_reveal":
      return `zoompan=z='min(zoom+0.0028,1.12)':x='iw/2-(iw/zoom/2)':y='ih*0.55-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`;
    case "button_pop":
      return `zoompan=z='if(lte(zoom,1.0),1.07,max(1.0,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih*0.58-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`;
    default:
      return `zoompan=z='min(zoom+0.0018,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`;
  }
}

function buildViralFilter(
  scenes: ReelScript["scenes"],
  clipDurations: number[],
  fontPath: string,
  overlayText = true
): string {
  const lines: string[] = [];
  let offset = 0;

  for (let i = 0; i < 4; i++) {
    const clipSec = clipDurations[i] ?? 3.75;
    const frames = Math.max(8, Math.round(clipSec * FPS));
    const scene = scenes[i];
    const pan = motionZoompan(scene?.motion, frames);
    const drawtext = overlayText ? buildDrawtextFilter(fontPath, scene) : null;
    const filters = [
      `scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease`,
      `pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a`,
      "format=yuv420p",
      pan,
      ...(drawtext ? [drawtext] : []),
      "format=yuv420p",
    ];
    lines.push(`[${i}:v]${filters.join(",")}[v${i}]`);
    if (i > 0) {
      offset += (clipDurations[i - 1] ?? 3.75) - XFADE_SEC;
      const prev = i === 1 ? "v0" : `vx${i - 1}`;
      const out = i === 3 ? "vout" : `vx${i}`;
      lines.push(
        `[${prev}][v${i}]xfade=transition=fade:duration=${XFADE_SEC}:offset=${Math.max(0, offset).toFixed(3)}[${out}]`
      );
    }
  }

  if (lines.length === 1) {
    return lines[0]!.replace("[v0]", "[vout]");
  }

  return lines.join(";");
}

function buildDrawtextFilter(
  fontPath: string,
  scene: ReelScript["scenes"][number] | undefined
): string | null {
  const text = scene?.text?.trim();
  if (!text) return null;

  const style = scene?.style ?? "hook";
  const cfg = TEXT_STYLE[style] ?? TEXT_STYLE.hook!;
  const fontEsc = escapeFfmpegPath(fontPath);
  const textEsc = escapeDrawtext(text.slice(0, 52));

  return [
    `drawtext=fontfile='${fontEsc}'`,
    `text='${textEsc}'`,
    `fontsize=${cfg.fontSize}`,
    `fontcolor=${cfg.fontColor}`,
    "borderw=4",
    "bordercolor=black@0.85",
    "shadowx=2",
    "shadowy=2",
    "box=1",
    "boxcolor=black@0.35",
    "boxborderw=18",
    "x=(w-text_w)/2",
    `y=${cfg.y}`,
    "line_spacing=8",
    "fix_bounds=1",
  ].join(":");
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''")
    .replace(/:/g, "\\:")
    .replace(/%/g, "%%");
}

async function writeImageFile(src: string, dest: string): Promise<void> {
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1];
    if (!base64) throw new Error("Invalid data URL for product image");
    await writeFile(dest, Buffer.from(base64, "base64"));
    await convertImageToJpeg(dest);
    return;
  }

  const res = await fetch(src, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  await convertImageToJpeg(dest);
}

/** Normalize PNG/WebP to JPEG — avoids png_pipe + rgba64be issues in ffmpeg. */
async function convertImageToJpeg(imagePath: string): Promise<void> {
  const jpegPath = `${imagePath}.tmp.jpg`;
  try {
    await runFfmpeg(
      [
        "-y",
        "-i",
        imagePath,
        "-vf",
        "scale=720:1280:force_original_aspect_ratio=decrease",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        jpegPath,
      ],
      path.dirname(imagePath)
    );
    await copyFile(jpegPath, imagePath);
  } catch {
    /* keep original if conversion fails */
  } finally {
    await rm(jpegPath, { force: true }).catch(() => undefined);
  }
}

function escapeFfmpegPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "'\\''");
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
        const tail = stderr.split("\n").slice(-12).join("\n");
        reject(new Error(`ffmpeg exited ${code}: ${tail}`));
      }
    });
  });
}
