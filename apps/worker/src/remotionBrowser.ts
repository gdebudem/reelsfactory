import { existsSync, readdirSync } from "fs";
import path from "path";
import {
  ensureBrowser,
  type ChromiumOptions,
} from "@remotion/renderer";

const CHROME_SHELL_NAME =
  process.platform === "win32"
    ? "chrome-headless-shell.exe"
    : "chrome-headless-shell";

/** Tuned for Railway (~1 GB RAM): single-process Chrome, software GL. */
export const CHROMIUM_OPTIONS: ChromiumOptions = {
  enableMultiProcessOnLinux: process.env.REMOTION_MULTI_PROCESS === "true",
  gl: "swangle",
};

export async function ensureRemotionBrowser(): Promise<string | null> {
  const status = await ensureBrowser({
    logLevel: "info",
    chromiumOptions: CHROMIUM_OPTIONS,
  });

  console.log("[render] ensureBrowser:", status.type);

  if (
    status.type === "user-defined-path" ||
    status.type === "local-puppeteer-browser"
  ) {
    return status.path;
  }

  return resolveBrowserExecutable();
}

export function resolveBrowserExecutable(): string | null {
  for (const candidate of getBrowserExecutableCandidates()) {
    if (existsSync(candidate)) {
      console.log(`[render] Using browser: ${candidate}`);
      return candidate;
    }
  }

  console.warn("[render] Chrome Headless Shell not found on disk");
  return null;
}

function getBrowserExecutableCandidates(): string[] {
  const cwd = process.cwd();
  const fromRemotion = findChromeHeadlessShell(
    path.join(cwd, "node_modules", ".remotion")
  );

  return [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    process.env.REMOTION_CHROME_EXECUTABLE,
    process.env.CHROME_EXECUTABLE,
    fromRemotion,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter((p): p is string => Boolean(p));
}

function findChromeHeadlessShell(root: string): string | null {
  function walk(dir: string, depth: number): string | null {
    if (depth > 6 || !existsSync(dir)) return null;

    try {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isFile() && ent.name === CHROME_SHELL_NAME) return full;
        if (ent.isDirectory()) {
          const nested = walk(full, depth + 1);
          if (nested) return nested;
        }
      }
    } catch {
      /* ignore unreadable dirs */
    }

    return null;
  }

  return walk(root, 0);
}
