import type {
  ProductCard,
  ProductIntel,
  PromptOverrides,
} from "@reels-factory/shared";
import { discoverMarketplaceUrls } from "./discover";
import { fetchMarketplaceProducts } from "./merge-product";
import type { ResearchProgressReporter } from "./progress";
import { noopReporter } from "./progress";
import {
  getTavilyMode,
  isTavilyAvailable,
  searchProductWeb,
} from "./tavily";
import { synthesizeProductIntel } from "./synthesize";
import { createTavilyRequestHandler } from "./request-log";
import {
  mergeReviewsIntoProduct,
  reviewsFromTavilyResults,
} from "./review-extract";

export {
  searchProductWeb,
  tavilySearch,
  tavilyExtract,
  getTavilyMode,
  isTavilyAvailable,
} from "./tavily";
export { synthesizeProductIntel } from "./synthesize";
export { discoverMarketplaceUrls } from "./discover";
export type { ResearchProgressReporter } from "./progress";

export type ProductResearchResult = {
  intel: ProductIntel;
  product: ProductCard;
};

export function assertTavilyForResearch(): void {
  if (isTavilyAvailable()) return;
  throw new Error(
    "Tavily обязателен для поиска на маркетплейсах и отзывов. " +
      "Добавьте TAVILY_API_KEY на Vercel (scripts/sync-vercel-tavily.ps1) " +
      "или уберите TAVILY_KEYLESS=false."
  );
}

export async function buildProductIntel(
  product: ProductCard,
  reporter: ResearchProgressReporter = noopReporter,
  promptOverrides?: PromptOverrides
): Promise<ProductResearchResult> {
  assertTavilyForResearch();

  const tavilyMode = getTavilyMode();
  console.log(
    `[product-intel] Research start: "${product.title.slice(0, 50)}", tavily=${tavilyMode}`
  );

  await reporter.log(
    tavilyMode === "api_key"
      ? "исследование · Tavily api.tavily.com/search (api_key) → маркетплейсы + отзывы"
      : "исследование · Tavily api.tavily.com/search (keyless) → маркетплейсы + отзывы"
  );

  const discovered = await discoverMarketplaceUrls(product, reporter);
  const { product: enriched, marketplaceListings } =
    await fetchMarketplaceProducts(product, discovered, reporter);

  const onTavily = createTavilyRequestHandler(reporter, "веб-исследование");

  const searchResults = await searchProductWeb(
    enriched.title,
    enriched.brand,
    onTavily
  );

  const snippetReviews = reviewsFromTavilyResults(searchResults);
  const productWithReviews = mergeReviewsIntoProduct(enriched, snippetReviews);
  if (snippetReviews.length > 0) {
    await reporter.log(
      `веб-поиск · ${snippetReviews.length} фрагментов отзывов из сниппетов`
    );
  }

  await reporter.start("extract_benefits");
  const intel = await synthesizeProductIntel(
    productWithReviews,
    searchResults,
    marketplaceListings,
    reporter,
    promptOverrides
  );
  await reporter.complete("extract_benefits");

  return { intel, product: productWithReviews };
}
