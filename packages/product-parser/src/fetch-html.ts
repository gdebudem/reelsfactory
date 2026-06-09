export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const FETCH_TIMEOUT_MS = 20_000;

export async function fetchHtml(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ html: string; finalUrl: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Referer: new URL(url).origin + "/",
      },
      redirect: "follow",
    });

    const html = await res.text();
    return { html, finalUrl: res.url, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}
