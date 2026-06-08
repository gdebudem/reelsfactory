import type { MarketplaceListing, ProductCard } from "@reels-factory/shared";
import { parseProductUrl } from "@reels-factory/product-parser";
import type { DiscoveredListing } from "./discover";
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
      if (reviews.length >= 6) break;
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
    urls.map((url) => parseProductUrl(url))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const url = urls[i]!;
    if (result.status !== "fulfilled") {
      console.warn(`[product-intel] Failed to parse ${url}`);
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

  await reporter.log(
    `спарсено ${parsedCards.length}/${urls.length} страниц · ${merged.images.length} фото · ${merged.reviews?.length ?? 0} отзывов`
  );

  console.log(
    `[product-intel] Merged product: images=${merged.images.length}, specs=${merged.specs?.length ?? 0}, reviews=${merged.reviews?.length ?? 0}, parsed=${parsedCards.length}/${urls.length}`
  );

  return { product: merged, marketplaceListings: listingMeta };
}
