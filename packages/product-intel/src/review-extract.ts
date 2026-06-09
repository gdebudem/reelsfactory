import type { ProductCard, ProductReview } from "@reels-factory/shared";
import {
  extractDeepFromHtml,
  extractDeepFromJsonLd,
  isMarketplaceHost,
} from "@reels-factory/product-parser";
import type { TavilyResult } from "./tavily";

export function extractReviewsFromText(text: string): ProductReview[] {
  const deep = extractDeepFromHtml(wrapAsHtml(text));
  const reviews = [...(deep.reviews ?? [])];

  const lines = text
    .split(/\n|(?<=[.!?])\s+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 25 && l.length <= 500);

  for (const line of lines) {
    if (
      /отзыв|покупател|пользуюсь|рекомендую|понравил|не понравил|достоинств|недостат|качеств|доставк/i.test(
        line
      )
    ) {
      reviews.push({ text: line.slice(0, 500) });
    }
  }

  return dedupeReviews(reviews).slice(0, 8);
}

export function reviewsFromTavilyResults(
  results: TavilyResult[]
): ProductReview[] {
  const reviews: ProductReview[] = [];

  for (const r of results) {
    const content = r.content?.trim();
    if (!content || content.length < 20) continue;

    const reviewLike =
      /отзыв|покупател|оценил|звезд|★|рекоменд|понравил|недостат/i.test(
        content
      ) || isMarketplaceHost(r.url);

    if (!reviewLike) continue;
    reviews.push({ text: content.slice(0, 500) });
  }

  return dedupeReviews(reviews).slice(0, 8);
}

export function productCardFromExtractedContent(
  url: string,
  content: string,
  fallbackTitle?: string
): ProductCard {
  const wrapped = wrapAsHtml(content);
  const jsonLd = extractDeepFromJsonLd(wrapped);
  const htmlDeep = extractDeepFromHtml(wrapped);
  const textReviews = extractReviewsFromText(content);

  const reviews = dedupeReviews([
    ...(jsonLd.reviews ?? []),
    ...(htmlDeep.reviews ?? []),
    ...textReviews,
  ]).slice(0, 8);

  const title =
    fallbackTitle ||
    content.split("\n").find((l) => l.trim().length > 5)?.trim().slice(0, 120) ||
    "Товар";

  return {
    title: title.slice(0, 200),
    price: null,
    currency: "RUB",
    images: [],
    description: content.slice(0, 2000),
    sourceUrl: url,
    specs:
      (jsonLd.specs?.length ?? 0) >= (htmlDeep.specs?.length ?? 0)
        ? jsonLd.specs
        : htmlDeep.specs,
    reviews: reviews.length ? reviews : undefined,
    aggregateRating: jsonLd.aggregateRating,
  };
}

export function mergeReviewsIntoProduct(
  product: ProductCard,
  extra: ProductReview[]
): ProductCard {
  if (!extra.length) return product;
  const merged = dedupeReviews([...(product.reviews ?? []), ...extra]).slice(
    0,
    8
  );
  return { ...product, reviews: merged.length ? merged : product.reviews };
}

function wrapAsHtml(text: string): string {
  if (text.includes("<html") || text.includes("<body")) return text;
  return `<html><body><div>${text.replace(/\n/g, "<br/>")}</div></body></html>`;
}

function dedupeReviews(reviews: ProductReview[]): ProductReview[] {
  const seen = new Set<string>();
  const out: ProductReview[] = [];
  for (const r of reviews) {
    const key = r.text.slice(0, 40).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
