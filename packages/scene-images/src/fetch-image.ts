const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 25_000;

export const PLACEHOLDER_IMAGE_URL =
  "https://placehold.co/720x1280/312e81/ffffff/png?text=Scene";

function safeOrigin(url: string): string | undefined {
  try {
    return `${new URL(url).origin}/`;
  } catch {
    return undefined;
  }
}

/** Download product/marketplace image server-side (browser often blocks hotlink). */
export async function fetchImageBuffer(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL");
    return {
      buffer: Buffer.from(match[2]!, "base64"),
      contentType: match[1]!,
    };
  }

  const referer = safeOrigin(url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      ...(referer ? { Referer: referer } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Image HTTP ${res.status}`);
  }

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content-type ${contentType}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Image too large (${buffer.length} bytes)`);
  }

  return { buffer, contentType };
}
