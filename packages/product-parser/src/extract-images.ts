import * as cheerio from "cheerio";

const LAZY_ATTRS = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-lazyload",
  "data-zoom-image",
];

const BAD_IMAGE_RE =
  /logo|sprite|icon|placeholder|1\.gif|pixel|spacer|avatar|banner(?!.*catalog)/i;

const PRODUCT_IMAGE_RE =
  /images_catalog|product|catalog|goods|товар|upload\/iblock|resize_cache/i;

export function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const scored: { url: string; score: number }[] = [];

  const add = (raw: string | undefined, bonus = 0) => {
    if (!raw?.trim() || raw.startsWith("data:")) return;
    try {
      const url = new URL(raw.trim(), baseUrl).href;
      if (!/^https?:\/\//i.test(url)) return;
      if (BAD_IMAGE_RE.test(url)) return;
      const score = scoreImageUrl(url) + bonus;
      if (score < 0) return;
      scored.push({ url, score });
    } catch {
      /* invalid url */
    }
  };

  $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
    add($(el).attr("content"), 30);
  });
  $('meta[name="twitter:image"]').each((_, el) => {
    add($(el).attr("content"), 25);
  });

  $('[itemprop="image"]').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "img") {
      for (const attr of LAZY_ATTRS) add($(el).attr(attr), 35);
    } else {
      add($(el).attr("content") || $(el).attr("href"), 35);
    }
  });

  $("img").each((_, el) => {
    for (const attr of LAZY_ATTRS) {
      add($(el).attr(attr), $(el).closest(".product, .detail, .catalog").length ? 10 : 0);
    }
  });

  $('a[href*="/upload/"], a[href*="images_catalog"]').each((_, el) => {
    add($(el).attr("href"), 15);
  });

  // Bitrix / 1C-Bitrix gallery
  $(
    ".product-item-detail-slider-image img, .product-detail-gallery img, .detail_picture img, .product-img img"
  ).each((_, el) => {
    for (const attr of LAZY_ATTRS) add($(el).attr(attr), 25);
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const { url } of scored) {
    const key = url.split("?")[0]!;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= 8) break;
  }
  return out;
}

function scoreImageUrl(url: string): number {
  let score = 0;
  if (PRODUCT_IMAGE_RE.test(url)) score += 25;
  if (/340_340|500_500|800_800|1000_|1200_|1920/i.test(url)) score += 20;
  if (/1197x136|resize_cache.*catalog/i.test(url)) score += 5;
  if (/56_56|30x30|38x30|50x50|100x100/i.test(url)) score -= 15;
  if (/\.webp|\.jpe?g|\.png/i.test(url)) score += 3;
  if (url.length < 20) score -= 10;
  return score;
}
