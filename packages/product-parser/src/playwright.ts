import type { ProductCard } from "@reels-factory/shared";

/**
 * Fallback для SPA-страниц без OG/meta в исходном HTML.
 * Требует: npx playwright install chromium
 */
export async function parseWithPlaywright(url: string): Promise<ProductCard> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    const data = await page.evaluate(() => {
      const og = (name: string) =>
        document
          .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
          ?.getAttribute("content");
      const title =
        og("og:title") || document.querySelector("h1")?.textContent || document.title;
      const image = og("og:image");
      const priceText =
        og("product:price:amount") ||
        document.querySelector('[itemprop="price"]')?.textContent;
      return { title, image, priceText };
    });
    if (!data.title) throw new Error("No title");
    const images = data.image ? [data.image] : [];
    if (!images.length) throw new Error("No image");
    let price: number | null = null;
    if (data.priceText) {
      const n = parseFloat(data.priceText.replace(/[^\d.,]/g, "").replace(",", "."));
      price = Number.isNaN(n) ? null : n;
    }
    return {
      title: data.title.trim(),
      price,
      currency: "RUB",
      images,
      sourceUrl: url,
    };
  } finally {
    await browser.close();
  }
}
