import type { ProductCard, ProductIntel } from "@reels-factory/shared";
import { searchProductWeb } from "./tavily";
import { synthesizeProductIntel } from "./synthesize";

export { searchProductWeb, tavilySearch } from "./tavily";
export { synthesizeProductIntel } from "./synthesize";

export async function buildProductIntel(
  product: ProductCard
): Promise<ProductIntel> {
  const searchResults = await searchProductWeb(
    product.title,
    product.brand
  );
  return synthesizeProductIntel(product, searchResults);
}
