import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import { buildAssSubtitles } from "./assSubtitles.js";
import { pickMusicTrack } from "./music.js";
import { ASSETS_DIR, musicFileExists, resolveMusicPath } from "./ensureMusic.js";
import { prefetchProductImages } from "./prefetchImages.js";
import { normalizeScriptForViralRender } from "./normalizeScript.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT_W = 720;
const OUT_H = 1280;
const FPS = VIDEO_CONFIG.fps;
const DURATION_SEC = VIDEO_CONFIG.durationInFrames / FPS;
const XFADE_SEC = 0.25;
const CLIP_SEC = 3.75;

const FONT_BOLD = pickFontFile(
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
  "C:/Windows/Fonts/arialbd.ttf"
);

function pickFontFile(...candidates: string[]): string {
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error(`No font file found. Tried: ${candidates.join(", ")}`);
}

export async function renderViralReelWithFfmpeg(
  jobId: string,
  product: ProductCard,
  script: ReelScript,
  outputPath: string
): Promise<void> {
  const viralScript = normalizeScriptForViralRender(script, product);
  const productForRender = await prefetchProductImages(product);
  const scenes = viralScript.scenes.slice(0, 4);
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `reel-viral-${jobId}-`));

  try {
    const imagePaths: string[] = [];
    for (let i = 0; i < 4; i++) {
      const scene = scenes[i];
      const idx = scene?.imageIndex ?? i;
      const src =
        productForRender.images[idx % Math.max(productForRender.images.length, 1)] ??
        productForRender.images[0] ??
        "";
      const imgPath = path.join(tmpDir, `scene-${i}.jpg`);
      await writeImageFile(src, imgPath);
      imagePaths.push(imgPath);
    }

    await copyFile(FONT_BOLD, path.join(tmpDir, "arialbd.ttf"));
    const assPath = path.join(tmpDir, "subs.ass");
    await writeFile(assPath, buildAssSubtitles(viralScript), "utf8");

    const track = pickMusicTrack(viralScript.musicTrackId, viralScript.musicMood);
    const musicPath = resolveMusicPath(track.file);
    const hasMusic = musicFileExists(track.file);

    if (!hasMusic) {
      console.error(
        `[render:viral] MUSIC MISSING: ${musicPath} — video will have no audio!`
      );
    }

    const filter = buildViralFilter(scenes, assPath);
    const args = [
      "-y",
      ...imagePaths.flatMap((p) => ["-loop", "1", "-t", String(CLIP_SEC), "-i", p]),
    ];

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
      String(DURATION_SEC),
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
            `afade=t=in:st=0:d=0.5,afade=t=out:st=${DURATION_SEC - 1}:d=1,volume=0.9,alimiter=limit=0.95`,
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

function buildViralFilter(
  scenes: ReelScript["scenes"],
  assPath: string
): string {
  const frames = Math.round(CLIP_SEC * FPS);
  const pans = [
    `zoompan=z='min(zoom+0.0015,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`,
    `zoompan=z='1.05':x='if(lte(on,1),0,x+1)':y='0':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`,
    `zoompan=z='min(zoom+0.002,1.12)':x='iw/4-(iw/zoom/4)':y='ih/4-(ih/zoom/4)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`,
    `zoompan=z='if(lte(zoom,1.0),1.06,max(1.0,zoom-0.001))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${OUT_W}x${OUT_H}:fps=${FPS}`,
  ];

  const lines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pan = pans[i] ?? pans[0]!;
    lines.push(
      `[${i}:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=0x0f172a,${pan}[v${i}]`
    );
  }

  lines.push(
    `[v0][v1]xfade=transition=fade:duration=${XFADE_SEC}:offset=${CLIP_SEC - XFADE_SEC}[vx1]`
  );
  lines.push(
    `[vx1][v2]xfade=transition=fade:duration=${XFADE_SEC}:offset=${CLIP_SEC * 2 - XFADE_SEC * 2}[vx2]`
  );
  lines.push(
    `[vx2][v3]xfade=transition=fade:duration=${XFADE_SEC}:offset=${CLIP_SEC * 3 - XFADE_SEC * 3}[vraw]`
  );

  const assEscaped = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const fontsDir = path.dirname(assPath).replace(/\\/g, "/").replace(/:/g, "\\:");
  lines.push(`[vraw]ass='${assEscaped}':fontsdir='${fontsDir}'[vout]`);

  return lines.join(";");
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
