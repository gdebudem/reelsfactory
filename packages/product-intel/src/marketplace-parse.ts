import { buildHttpGetRequestLog, type ProductCard } from "@reels-factory/shared";
import {
  isMarketplaceHost,
  parseProductUrl,
  ProductParseError,
} from "@reels-factory/product-parser";
import { isTavilyAvailable, tavilyExtract } from "./tavily";
import { productCardFromExtractedContent } from "./review-extract";
import type { ResearchProgressReporter } from "./progress";
import { createTavilyExtractRequestHandler } from "./request-log";

export function needsTavilyExtractFallback(card: ProductCard): boolean {
  if (!isMarketplaceHost(card.sourceUrl)) return false;
  const reviews = card.reviews?.length ?? 0;
  const specs = card.specs?.length ?? 0;
  return reviews === 0 || specs < 2;
}

export async function parseListingUrl(
  url: string,
  productTitle: string,
  reporter?: ResearchProgressReporter,
  extractQuery?: string
): Promise<ProductCard> {
  let card: ProductCard | null = null;
  let parseError: string | undefined;

  try {
    card = await parseProductUrl(url);
    await reporter?.logRequest?.(
      buildHttpGetRequestLog({
        url,
        service: "product-parser",
        target: "HTML страницы маркетплейса",
        body: "GET · User-Agent Chrome · парсинг карточки товара",
        status: 200,
        result: `${card.title.slice(0, 40)} · ${card.reviews?.length ?? 0} отзывов · ${card.images.length} фото`,
        runtime: "Vercel",
      })
    );
  } catch (e) {
    parseError = e instanceof ProductParseError ? e.message : String(e);
    await reporter?.logRequest?.(
      buildHttpGetRequestLog({
        url,
        service: "product-parser",
        target: "HTML страницы маркетплейса",
        body: "GET · User-Agent Chrome · парсинг карточки товара",
        status: 0,
        result: `ошибка: ${parseError.slice(0, 80)}`,
        runtime: "Vercel",
      })
    );
  }

  const shouldExtract =
    isMarketplaceHost(url) &&
    isTavilyAvailable() &&
    (!card || needsTavilyExtractFallback(card) || parseError);

  if (shouldExtract) {
    const query = extractQuery ?? `${productTitle} отзывы характеристики`;
    const onExtract = reporter
      ? createTavilyExtractRequestHandler(
          reporter,
          `fallback · ${new URL(url).hostname}`
        )
      : undefined;
    const extracted = await tavilyExtract([url], query, onExtract);
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
