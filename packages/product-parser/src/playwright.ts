import type { ProductCard } from "@reels-factory/shared";
import {
  extractDeepFromHtml,
  extractDeepFromJsonLd,
} from "./extract-deep";
import { extractImagesFromHtml } from "./extract-images";

function cleanProductTitle(raw: string): string {
  let title = raw.trim();
  title = title.replace(/\s*-\s*\d{4,}\s*(?:-\s*.+)?$/i, "");
  title = title.replace(/\s*\|\s*.+$/, "");
  title = title.replace(/\s+-\s+ТД\s+Рубин.*/i, "");
  return title.trim() || raw.trim();
}

function parsePrice(text: string): { price: number | null; currency: string } {
  const normalized = text.replace(/\s/g, " ").trim();
  const rubMatch = normalized.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*₽|руб/i);
  if (rubMatch) {
    const num = parseFloat(rubMatch[1].replace(/\s/g, "").replace(",", "."));
    return { price: Number.isNaN(num) ? null : num, currency: "RUB" };
  }
  const numMatch = normalized.match(/([\d\s]+(?:[.,]\d{1,2})?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(/\s/g, "").replace(",", "."));
    return { price: Number.isNaN(num) ? null : num, currency: "RUB" };
  }
  return { price: null, currency: "RUB" };
}

/**
 * Fallback for SPA / Bitrix pages without specs in initial HTML.
 * Requires: npx playwright install chromium
 */
export async function parseWithPlaywright(url: string): Promise<ProductCard> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    const html = await page.content();
    const meta = await page.evaluate(() => {
      const og = (name: string) =>
        document
          .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
          ?.getAttribute("content");
      const title =
        og("og:title") ||
        document.querySelector("h1")?.textContent ||
        document.title;
      const priceText =
        og("product:price:amount") ||
        document.querySelector('[itemprop="price"]')?.textContent ||
        document.querySelector(".product-item-detail-price, .price")?.textContent;
      return { title, priceText };
    });

    if (!meta.title?.trim()) throw new Error("No title");

    const jsonLdDeep = extractDeepFromJsonLd(html);
    const htmlDeep = extractDeepFromHtml(html);
    const images = extractImagesFromHtml(html, url);
    const { price } = meta.priceText
      ? parsePrice(meta.priceText)
      : { price: null as number | null };

    const specs = [
      ...(jsonLdDeep.specs ?? []),
      ...(htmlDeep.specs ?? []),
    ];
    const reviews = [
      ...(jsonLdDeep.reviews ?? []),
      ...(htmlDeep.reviews ?? []),
    ];

    if (images.length === 0) throw new Error("No image");

    return {
      title: cleanProductTitle(meta.title),
      price,
      currency: "RUB",
      images: images.slice(0, 5),
      description: jsonLdDeep.description,
      sourceUrl: url,
      brand: jsonLdDeep.brand ?? htmlDeep.brand,
      category: jsonLdDeep.category ?? htmlDeep.category,
      specs: specs.length ? dedupeSpecs(specs).slice(0, 40) : undefined,
      reviews: reviews.length ? dedupeReviews(reviews).slice(0, 8) : undefined,
      prosFromPage: htmlDeep.prosFromPage,
      aggregateRating: jsonLdDeep.aggregateRating ?? htmlDeep.aggregateRating,
    };
  } finally {
    await browser.close();
  }
}

function dedupeSpecs(items: { name: string; value: string }[]) {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = `${s.name}|${s.value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeReviews(items: { text: string; rating?: number; author?: string }[]) {
  const seen = new Set<string>();
  return items.filter((r) => {
    const key = r.text.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
