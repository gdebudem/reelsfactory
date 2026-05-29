import type { ProductCard } from "@reels-factory/shared";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/600x800/312e81/ffffff/png?text=Reels+Factory";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

/** Inline images so Remotion does not wait on slow third-party hosts during render. */
export async function prefetchProductImages(
  product: ProductCard
): Promise<ProductCard> {
  const urls = product.images?.length ? product.images : [PLACEHOLDER_IMAGE];
  const images = await Promise.all(urls.slice(0, 3).map(prefetchImageUrl));
  return { ...product, images };
}

async function prefetchImageUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  try {
    const referer = safeOrigin(url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        ...(referer ? { Referer: referer } : {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn(`[render] Image HTTP ${res.status}: ${url}`);
      return PLACEHOLDER_IMAGE;
    }

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      console.warn(`[render] Unexpected content-type ${contentType}: ${url}`);
      return PLACEHOLDER_IMAGE;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) {
      console.warn(
        `[render] Image too large (${buf.length} bytes), using placeholder: ${url}`
      );
      return PLACEHOLDER_IMAGE;
    }

    console.log(`[render] Prefetched image (${buf.length} bytes): ${url}`);
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[render] Image prefetch failed (${msg}): ${url}`);
    return PLACEHOLDER_IMAGE;
  }
}

function safeOrigin(url: string): string | undefined {
  try {
    return new URL(url).origin + "/";
  } catch {
    return undefined;
  }
}
