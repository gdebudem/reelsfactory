import type { ProductCard } from "@reels-factory/shared";

function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*\d{4,}\s*(?:-\s*.+)?$/i, "")
    .replace(/\s*\|\s*.+$/, "")
    .replace(/\s+купить.*$/i, "")
    .trim();
}

export function buildProductSearchQuery(product: ProductCard): string {
  let query = cleanTitle(product.title);

  const modelSpec = product.specs?.find((s) =>
    /артикул|модель|sku|код|vendor|vendorcode/i.test(s.name)
  );
  if (modelSpec?.value) {
    query = `${query} ${modelSpec.value}`.trim();
  }

  if (
    product.brand &&
    !query.toLowerCase().includes(product.brand.toLowerCase())
  ) {
    query = `${product.brand} ${query}`;
  }

  return query.slice(0, 120);
}
