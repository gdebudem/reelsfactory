import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MUSIC_TRACKS } from "./music.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS_DIR = path.resolve(__dirname, "../assets/music");

export async function ensureMusicAssets(): Promise<void> {
  const missing = MUSIC_TRACKS.filter(
    (t) => !existsSync(path.join(ASSETS_DIR, t.file))
  );
  if (missing.length === 0) {
    console.log(`[music] ${MUSIC_TRACKS.length} tracks ready`);
    return;
  }

  console.warn(
    `[music] Missing ${missing.length} tracks — generating placeholders…`
  );
  await generatePlaceholderTracks(missing.map((t) => t.id));
}

function generatePlaceholderTracks(trackIds: string[]): Promise<void> {
  const freqMap: Record<string, number> = {
    upbeat_drive: 440,
    steady_groove: 330,
    smooth_pulse: 220,
    bright_hook: 523,
    warm_trust: 294,
    luxury_flow: 196,
  };

  return new Promise((resolve, reject) => {
    let pending = trackIds.length;
    if (pending === 0) {
      resolve();
      return;
    }

    for (const id of trackIds) {
      const freq = freqMap[id] ?? 330;
      const out = path.join(ASSETS_DIR, `${id}.mp3`);
      const proc = spawn(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `sine=frequency=${freq}:duration=20`,
          "-f",
          "lavfi",
          "-i",
          `sine=frequency=${Math.round(freq * 1.5)}:duration=20`,
          "-filter_complex",
          "[0:a]volume=0.35[a0];[1:a]volume=0.2[a1];[a0][a1]amix=inputs=2,volume=1.2,afade=t=in:st=0:d=0.2,afade=t=out:st=18.5:d=1.5",
          "-c:a",
          "libmp3lame",
          "-b:a",
          "192k",
          out,
        ],
        { stdio: "ignore" }
      );
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg music gen failed for ${id}`));
          return;
        }
        pending -= 1;
        if (pending === 0) resolve();
      });
    }
  });
}

export function resolveMusicPath(trackFile: string): string {
  return path.join(ASSETS_DIR, trackFile);
}

export function musicFileExists(trackFile: string): boolean {
  return existsSync(resolveMusicPath(trackFile));
}
