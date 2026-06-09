import type { ProductCard, ProductIntel } from "@reels-factory/shared";
import { discoverMarketplaceUrls } from "./discover";
import { fetchMarketplaceProducts } from "./merge-product";
import type { ResearchProgressReporter } from "./progress";
import { noopReporter } from "./progress";
import { getTavilyMode, searchProductWeb } from "./tavily";
import { synthesizeProductIntel } from "./synthesize";

export { searchProductWeb, tavilySearch, getTavilyMode, isTavilyAvailable } from "./tavily";
export { synthesizeProductIntel } from "./synthesize";
export { discoverMarketplaceUrls } from "./discover";
export type { ResearchProgressReporter } from "./progress";

export type ProductResearchResult = {
  intel: ProductIntel;
  product: ProductCard;
};

export async function buildProductIntel(
  product: ProductCard,
  reporter: ResearchProgressReporter = noopReporter
): Promise<ProductResearchResult> {
  const tavilyMode = getTavilyMode();
  console.log(
    `[product-intel] Research start: "${product.title.slice(0, 50)}", tavily=${tavilyMode}`
  );

  const discovered = await discoverMarketplaceUrls(product, reporter);
  const { product: enriched, marketplaceListings } =
    await fetchMarketplaceProducts(product, discovered, reporter);

  const onTavily = reporter.logTavilySearch
    ? (q: string) => reporter.logTavilySearch!(q)
    : undefined;

  const searchResults = await searchProductWeb(
    enriched.title,
    enriched.brand,
    onTavily
  );

  await reporter.start("extract_benefits");
  const intel = await synthesizeProductIntel(
    enriched,
    searchResults,
    marketplaceListings,
    reporter
  );
  await reporter.complete("extract_benefits");

  return { intel, product: enriched };
}
