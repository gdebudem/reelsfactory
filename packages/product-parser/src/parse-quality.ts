import type { ProductCard } from "@reels-factory/shared";

function isMarketplaceSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return /^(ozon\.ru|wildberries\.ru|mvideo\.ru|market\.yandex\.ru)$/.test(
      host
    );
  } catch {
    return false;
  }
}

/** True when HTML parse likely missed JS-rendered content. */
export function isProductParsePoor(product: ProductCard): boolean {
  const specCount = product.specs?.length ?? 0;
  const reviewCount = product.reviews?.length ?? 0;
  const descLen = product.description?.trim().length ?? 0;
  const imageCount = product.images.length;
  const marketplace = isMarketplaceSource(product.sourceUrl);

  if (imageCount === 0) return true;
  if (marketplace && reviewCount === 0) return true;
  if (marketplace && specCount < 2) return true;
  if (specCount < 3 && descLen < 80 && reviewCount === 0) return true;
  if (specCount === 0 && descLen < 40) return true;
  return false;
}

export function isPlaywrightEnabled(): boolean {
  const flag = process.env.PLAYWRIGHT_PARSER?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  // Auto-enable on Railway worker when not explicitly disabled
  if (process.env.RAILWAY_ENVIRONMENT) return true;
  return flag === "true" || flag === "1";
}
