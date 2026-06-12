import type { MarketplaceListing, ProductCard } from "@reels-factory/shared";
import { ProductParseError } from "@reels-factory/product-parser";
import type { DiscoveredListing } from "./discover";
import { parseListingUrl } from "./marketplace-parse";
import { normalizePageUrl } from "./marketplaces";
import type { ResearchProgressReporter } from "./progress";
import { noopReporter } from "./progress";

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const key = normalizePageUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

export function mergeProductCards(
  primary: ProductCard,
  others: ProductCard[]
): ProductCard {
  const images = dedupeUrls([
    ...primary.images,
    ...others.flatMap((p) => p.images),
  ]).slice(0, 8);

  const reviews = [...(primary.reviews ?? [])];
  const reviewTexts = new Set(reviews.map((r) => r.text.slice(0, 40)));
  for (const card of others) {
    for (const review of card.reviews ?? []) {
      const key = review.text.slice(0, 40);
      if (reviewTexts.has(key)) continue;
      reviewTexts.add(key);
      reviews.push(review);
      if (reviews.length >= 8) break;
    }
  }

  const specMap = new Map<string, string>();
  for (const spec of primary.specs ?? []) {
    specMap.set(spec.name.toLowerCase(), spec.value);
  }
  for (const card of others) {
    for (const spec of card.specs ?? []) {
      const key = spec.name.toLowerCase();
      const existing = specMap.get(key);
      if (!existing || spec.value.length > existing.length) {
        specMap.set(key, spec.value);
      }
    }
  }

  const prosSet = new Set<string>();
  const pros: string[] = [];
  for (const pro of [
    ...(primary.prosFromPage ?? []),
    ...others.flatMap((p) => p.prosFromPage ?? []),
  ]) {
    if (prosSet.has(pro)) continue;
    prosSet.add(pro);
    pros.push(pro);
    if (pros.length >= 8) break;
  }

  let price = primary.price;
  let currency = primary.currency;
  if (price == null) {
    for (const card of others) {
      if (card.price != null) {
        price = card.price;
        currency = card.currency;
        break;
      }
    }
  }

  let aggregateRating = primary.aggregateRating;
  if (!aggregateRating) {
    for (const card of others) {
      if (card.aggregateRating) {
        aggregateRating = card.aggregateRating;
        break;
      }
    }
  }

  return {
    ...primary,
    images,
    reviews: reviews.length ? reviews : primary.reviews,
    specs: specMap.size
      ? Array.from(specMap.entries()).map(([name, value]) => ({ name, value }))
      : primary.specs,
    prosFromPage: pros.length ? pros : primary.prosFromPage,
    price,
    currency,
    brand: primary.brand ?? others.find((p) => p.brand)?.brand,
    category: primary.category ?? others.find((p) => p.category)?.category,
    description:
      primary.description ??
      others.find((p) => p.description && p.description.length > 40)?.description,
    aggregateRating,
  };
}

export async function fetchMarketplaceProducts(
  product: ProductCard,
  listings: DiscoveredListing[],
  reporter: ResearchProgressReporter = noopReporter
): Promise<{
  product: ProductCard;
  marketplaceListings: MarketplaceListing[];
}> {
  const sourceKey = normalizePageUrl(product.sourceUrl);
  const urls = listings
    .map((l) => l.url)
    .filter((url) => normalizePageUrl(url) !== sourceKey)
    .slice(0, 5);

  const parsedCards: ProductCard[] = [];
  const listingMeta: MarketplaceListing[] = listings.map((listing) => ({
    platform: listing.platform,
    url: listing.url,
    title: listing.title,
  }));

  await reporter.start("read_descriptions");

  const results = await Promise.allSettled(
    urls.map((url) => parseListingUrl(url, product.title, reporter))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const url = urls[i]!;
    if (result.status !== "fulfilled") {
      const msg =
        result.reason instanceof ProductParseError
          ? result.reason.message
          : result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
      console.warn(`[product-intel] Failed to parse ${url}: ${msg}`);
      continue;
    }
    parsedCards.push(result.value);
    const meta = listingMeta.find(
      (l) => normalizePageUrl(l.url) === normalizePageUrl(url)
    );
    if (meta) {
      meta.title = result.value.title;
      meta.price = result.value.price;
      meta.currency = result.value.currency;
    }
  }

  await reporter.complete("read_descriptions");

  await reporter.start("read_reviews");
  const merged = mergeProductCards(product, parsedCards);
  await reporter.complete("read_reviews");

  const reviewCount = merged.reviews?.length ?? 0;
  await reporter.log(
    `спарсено ${parsedCards.length}/${urls.length} страниц · ${merged.images.length} фото · ${reviewCount} отзывов`
  );

  if (urls.length > 0 && parsedCards.length === 0) {
    await reporter.log(
      "⚠ маркетплейсы недоступны напрямую — отзывы подтянем из веб-поиска",
      "info"
    );
  } else if (reviewCount === 0 && urls.length > 0) {
    await reporter.log(
      "⚠ на страницах маркетплейсов отзывов не найдено — ищем в сниппетах",
      "info"
    );
  }

  console.log(
    `[product-intel] Merged product: images=${merged.images.length}, specs=${merged.specs?.length ?? 0}, reviews=${reviewCount}, parsed=${parsedCards.length}/${urls.length}`
  );

  return { product: merged, marketplaceListings: listingMeta };
}
