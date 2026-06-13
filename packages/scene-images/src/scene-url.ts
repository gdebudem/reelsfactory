/** Scene image URL is stored but not reliably viewable in browser / proxy. */
export function isBrokenSceneImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return true;
  if (u.startsWith("data:")) return u.length < 200;
  if (/\.r2\.dev\//i.test(u)) return false;
  if (u.includes("placehold.co")) return false;

  if (/cloudflarestorage\.com/i.test(u)) return true;

  try {
    const host = new URL(u).hostname.toLowerCase();
    if (
      /ozon|wildberries|wb\.|market\.yandex|mvideo|dns-shop|citilink|megamarket|aliexpress/i.test(
        host
      )
    ) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

/** Worker saved marketplace photos instead of OpenAI backgrounds. */
export function isFallbackSceneImage(
  scene: { imageUrl: string; prompt?: string }
): boolean {
  const prompt = scene.prompt?.trim() ?? "";
  return (
    prompt.startsWith("fallback:") ||
    prompt === "fallback:product-photo"
  );
}

export function sceneImagesNeedRegeneration(
  scenes: { imageUrl: string; prompt?: string }[] | null | undefined
): boolean {
  if (!scenes || scenes.length < 4) return true;
  if (scenes.every((s) => isFallbackSceneImage(s))) return true;
  return scenes.some(
    (s) => isBrokenSceneImageUrl(s.imageUrl) || isFallbackSceneImage(s)
  );
}

/** Safe to use as <img src> without proxy (public CDN / inline). */
export function isDirectBrowserSceneUrl(url: string): boolean {
  if (url.startsWith("data:")) return true;
  if (/\.r2\.dev\//i.test(url)) return true;
  if (url.includes("placehold.co")) return true;
  return false;
}

export function extractSceneStorageKey(imageUrl: string): string | null {
  const m = imageUrl.match(/scene-images\/[A-Za-z0-9_-]+\/scene-\d+\.(png|jpe?g|webp)/i);
  return m ? m[0] : null;
}
