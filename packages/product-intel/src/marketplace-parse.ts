import type { ProductCard } from "@reels-factory/shared";
import {
  isMarketplaceHost,
  parseProductUrl,
  ProductParseError,
} from "@reels-factory/product-parser";
import { isTavilyAvailable, tavilyExtract } from "./tavily";
import { productCardFromExtractedContent } from "./review-extract";

export function needsTavilyExtractFallback(card: ProductCard): boolean {
  if (!isMarketplaceHost(card.sourceUrl)) return false;
  const reviews = card.reviews?.length ?? 0;
  const specs = card.specs?.length ?? 0;
  return reviews === 0 || specs < 2;
}

export async function parseListingUrl(
  url: string,
  productTitle: string,
  extractQuery?: string
): Promise<ProductCard> {
  let card: ProductCard | null = null;
  let parseError: string | undefined;

  try {
    card = await parseProductUrl(url);
  } catch (e) {
    parseError = e instanceof ProductParseError ? e.message : String(e);
  }

  const shouldExtract =
    isMarketplaceHost(url) &&
    isTavilyAvailable() &&
    (!card || needsTavilyExtractFallback(card) || parseError);

  if (shouldExtract) {
    const extracted = await tavilyExtract(
      [url],
      extractQuery ?? `${productTitle} отзывы характеристики`
    );
    const hit = extracted[0];
    if (hit?.content && hit.content.length > 80) {
      const fromExtract = productCardFromExtractedContent(
        url,
        hit.content,
        card?.title ?? productTitle
      );
      if (card) {
        return mergeParseWithExtract(card, fromExtract);
      }
      return fromExtract;
    }
  }

  if (card) return card;
  throw new ProductParseError(parseError ?? "Не удалось прочитать страницу");
}

function mergeParseWithExtract(
  base: ProductCard,
  extracted: ProductCard
): ProductCard {
  const images = [...base.images, ...extracted.images].filter(
    (img, i, arr) => img && arr.indexOf(img) === i
  );

  return {
    ...base,
    title: base.title || extracted.title,
    description: base.description || extracted.description,
    images: images.length ? images.slice(0, 5) : base.images,
    specs:
      (extracted.specs?.length ?? 0) > (base.specs?.length ?? 0)
        ? extracted.specs
        : base.specs ?? extracted.specs,
    reviews:
      (extracted.reviews?.length ?? 0) > (base.reviews?.length ?? 0)
        ? extracted.reviews
        : base.reviews ?? extracted.reviews,
    aggregateRating: base.aggregateRating ?? extracted.aggregateRating,
    prosFromPage: base.prosFromPage ?? extracted.prosFromPage,
  };
}
