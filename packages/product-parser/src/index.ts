import * as cheerio from "cheerio";
import type { ProductCard } from "@reels-factory/shared";

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ReelsFactory/1.0; +https://reelsfactory.app)";

function parsePrice(text: string): { price: number | null; currency: string } {
  const normalized = text.replace(/\s/g, " ").trim();
  const rubMatch = normalized.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*₽|руб/i);
  if (rubMatch) {
    const num = parseFloat(rubMatch[1].replace(/\s/g, "").replace(",", "."));
    return { price: Number.isNaN(num) ? null : num, currency: "RUB" };
  }
  const usdMatch = normalized.match(/\$\s*([\d.,]+)|([\d.,]+)\s*USD/i);
  if (usdMatch) {
    const raw = usdMatch[1] || usdMatch[2];
    const num = parseFloat(raw.replace(",", ""));
    return { price: Number.isNaN(num) ? null : num, currency: "USD" };
  }
  const numMatch = normalized.match(/([\d\s]+(?:[.,]\d{1,2})?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(/\s/g, "").replace(",", "."));
    return { price: Number.isNaN(num) ? null : num, currency: "RUB" };
  }
  return { price: null, currency: "RUB" };
}

function extractJsonLdProduct(html: string): Partial<ProductCard> | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const product =
          item["@type"] === "Product"
            ? item
            : item["@graph"]?.find(
                (g: { "@type"?: string }) => g["@type"] === "Product"
              );
        if (!product) continue;
        const offers = product.offers;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        const priceRaw = offer?.price ?? product.price;
        const { price, currency } = parsePrice(String(priceRaw ?? ""));
        const images: string[] = [];
        if (product.image) {
          const imgs = Array.isArray(product.image)
            ? product.image
            : [product.image];
          for (const img of imgs) {
            if (typeof img === "string") images.push(img);
            else if (img?.url) images.push(img.url);
          }
        }
        return {
          title: product.name,
          price,
          currency: offer?.priceCurrency ?? currency,
          images,
          description: product.description,
        };
      }
    } catch {
      /* skip invalid JSON-LD */
    }
  }
  return null;
}

function extractOgMeta(html: string, sourceUrl: string): Partial<ProductCard> {
  const $ = cheerio.load(html);
  const getMeta = (prop: string) =>
    $(`meta[property="${prop}"]`).attr("content") ||
    $(`meta[name="${prop}"]`).attr("content");

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    $("title").first().text().trim();
  const image =
    getMeta("og:image") || getMeta("twitter:image");
  const description =
    getMeta("og:description") || getMeta("description");
  const priceText =
    getMeta("product:price:amount") ||
    getMeta("og:price:amount") ||
    $('[itemprop="price"]').attr("content") ||
    $('[itemprop="price"]').text();

  const { price, currency } = priceText
    ? parsePrice(priceText)
    : { price: null, currency: "RUB" };

  const images: string[] = [];
  if (image) images.push(image.startsWith("http") ? image : new URL(image, sourceUrl).href);

  $("meta[property^='og:image']").each((_, el) => {
    const c = $(el).attr("content");
    if (c && !images.includes(c)) images.push(c);
  });

  return { title, price, currency, images, description };
}

export class ProductParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductParseError";
  }
}

export async function parseProductUrl(url: string): Promise<ProductCard> {
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new ProductParseError("Поддерживаются только HTTP(S) ссылки");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new ProductParseError(
        `Не удалось загрузить страницу (HTTP ${res.status})`
      );
    }
    html = await res.text();
  } catch (e) {
    if (e instanceof ProductParseError) throw e;
    if (process.env.PLAYWRIGHT_PARSER === "true") {
      try {
        const { parseWithPlaywright } = await import("./playwright");
        return parseWithPlaywright(url);
      } catch {
        /* fall through */
      }
    }
    throw new ProductParseError(
      "Не удалось прочитать страницу. Проверьте ссылку или попробуйте позже."
    );
  } finally {
    clearTimeout(timeout);
  }

  const jsonLd = extractJsonLdProduct(html);
  const og = extractOgMeta(html, url);

  const title = jsonLd?.title || og.title;
  if (!title) {
    throw new ProductParseError(
      "Не удалось определить название товара на странице"
    );
  }

  const images = [
    ...(jsonLd?.images ?? []),
    ...(og.images ?? []),
  ].filter((img, idx, arr) => img && arr.indexOf(img) === idx);

  if (images.length === 0) {
    if (process.env.PLAYWRIGHT_PARSER === "true") {
      try {
        const { parseWithPlaywright } = await import("./playwright");
        return parseWithPlaywright(url);
      } catch {
        /* fall through */
      }
    }
    throw new ProductParseError("Не удалось найти изображение товара");
  }

  return {
    title: title.trim(),
    price: jsonLd?.price ?? og.price ?? null,
    currency: jsonLd?.currency ?? og.currency ?? "RUB",
    images: images.slice(0, 5),
    description: jsonLd?.description ?? og.description,
    sourceUrl: url,
  };
}
