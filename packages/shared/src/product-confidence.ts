import type { MarketplaceListing, ProductCard, ProductIntel } from "./index";

export type ProductConfidence = {
  exactSkuMatch: boolean;
  sku: string;
  matchedProductUrls: string[];
  wrongMatches: string[];
  confidence: number;
  canUseReviews: boolean;
  canUseRating: boolean;
  canUsePrice: boolean;
};

const ACCESSORY_MARKERS = [
  /пульт/i,
  /плата/i,
  /плат[аы]\s+управлен/i,
  /запчаст/i,
  /аксессуар/i,
  /для\s+кондиционер/i,
  /для\s+сплит/i,
  /фильтр/i,
  /кронштейн/i,
  /пульт\s+дистанцион/i,
  /блок\s+управлен/i,
  /модуль/i,
  /комплектующ/i,
];

function extractSkuTokens(title: string): string[] {
  const tokens: string[] = [];
  const modelRe =
    /\b([A-Z]{2,}[-\s]?\d{2,}[A-Z0-9-]*)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = modelRe.exec(title)) !== null) {
    tokens.push(m[1]!.replace(/\s+/g, "").toUpperCase());
  }
  return [...new Set(tokens)];
}

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function isAccessoryTitle(title: string, sourceSkuTokens: string[]): boolean {
  const t = normalizeTitle(title);
  if (ACCESSORY_MARKERS.some((re) => re.test(t))) {
    const hasSku = sourceSkuTokens.some((sku) =>
      t.includes(sku.toLowerCase())
    );
    if (!hasSku) return true;
  }
  return false;
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeTitle(a).split(/[\s,.-]+/).filter((w) => w.length > 2));
  const wb = new Set(normalizeTitle(b).split(/[\s,.-]+/).filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  for (const w of wa) {
    if (wb.has(w)) overlap++;
  }
  return overlap / Math.max(wa.size, wb.size);
}

export function buildProductConfidence(
  product: ProductCard,
  intel?: ProductIntel | null
): ProductConfidence {
  const sourceTitle = product.title;
  const skuTokens = extractSkuTokens(sourceTitle);
  const sku = skuTokens[0] ?? sourceTitle.slice(0, 32);

  const listings: MarketplaceListing[] = intel?.marketplaceListings ?? [];
  const matchedProductUrls: string[] = [];
  const wrongMatches: string[] = [];

  for (const listing of listings) {
    const title = listing.title ?? "";
    if (!title) continue;
    if (isAccessoryTitle(title, skuTokens)) {
      wrongMatches.push(listing.url);
      continue;
    }
    const sim = titleSimilarity(sourceTitle, title);
    const skuHit = skuTokens.some(
      (t) => normalizeTitle(title).includes(t.toLowerCase())
    );
    if (sim >= 0.45 || skuHit) {
      matchedProductUrls.push(listing.url);
    } else if (sim < 0.25) {
      wrongMatches.push(listing.url);
    }
  }

  const sourceIsAccessory = isAccessoryTitle(sourceTitle, skuTokens);
  const exactSkuMatch =
    !sourceIsAccessory &&
    (skuTokens.length > 0
      ? matchedProductUrls.length > 0 || listings.length === 0
      : titleSimilarity(sourceTitle, sourceTitle) === 1);

  let confidence = 0.5;
  if (exactSkuMatch && wrongMatches.length === 0) confidence = 0.9;
  else if (matchedProductUrls.length > 0 && wrongMatches.length === 0)
    confidence = 0.82;
  else if (matchedProductUrls.length > wrongMatches.length) confidence = 0.7;
  else if (wrongMatches.length > 0) confidence = 0.35;
  if (sourceIsAccessory) confidence = Math.min(confidence, 0.3);

  const verified = exactSkuMatch && confidence >= 0.75;

  return {
    exactSkuMatch,
    sku,
    matchedProductUrls,
    wrongMatches,
    confidence,
    canUseReviews: verified,
    canUseRating: verified,
    canUsePrice: verified && product.price != null,
  };
}

export function stripUnverifiedIntel(
  intel: ProductIntel,
  confidence: ProductConfidence
): ProductIntel {
  if (confidence.canUseReviews && confidence.canUseRating) return intel;
  return {
    ...intel,
    marketplaceReviews: confidence.canUseReviews
      ? intel.marketplaceReviews
      : undefined,
    socialProof: confidence.canUseRating ? intel.socialProof : undefined,
    reviewsFromPage: confidence.canUseReviews
      ? intel.reviewsFromPage
      : undefined,
  };
}
