import {
  productIntelSchema,
  type ProductCard,
  type ProductIntel,
} from "@reels-factory/shared";
import OpenAI from "openai";
import type { TavilyResult } from "./tavily";

function buildIntelFromProductOnly(product: ProductCard): ProductIntel {
  const selling: string[] = [];
  for (const spec of product.specs?.slice(0, 5) ?? []) {
    selling.push(`${spec.name}: ${spec.value}`);
  }
  for (const pro of product.prosFromPage?.slice(0, 3) ?? []) {
    selling.push(pro);
  }

  let socialProof: string | undefined;
  if (product.aggregateRating) {
    const c = product.aggregateRating.count
      ? ` (${product.aggregateRating.count} отзывов)`
      : "";
    socialProof = `${product.aggregateRating.value.toFixed(1)} из 5${c}`;
  }

  return productIntelSchema.parse({
    productTitle: product.title,
    brand: product.brand,
    category: product.category,
    specsFromPage: product.specs,
    reviewsFromPage: product.reviews,
    rankedSellingPoints: selling.slice(0, 5),
    socialProof,
    researchSources: [product.sourceUrl],
  });
}

export async function synthesizeProductIntel(
  product: ProductCard,
  searchResults: TavilyResult[]
): Promise<ProductIntel> {
  if (!searchResults.length) {
    return buildIntelFromProductOnly(product);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return buildIntelFromProductOnly(product);
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";

  const system = `Ты аналитик товаров для рекламных роликов.
Извлекай ТОЛЬКО факты из snippets и productData. Запрещено выдумывать характеристики.
Верни JSON по схеме ProductIntel: externalSnippets (цитаты до 120 символов), marketplaceReviews (ozon/wildberries/yandex если есть), consumerPainPoints, rankedSellingPoints (топ-5 выгод), socialProof, researchSources (URL).`;

  const user = JSON.stringify({
    productData: {
      title: product.title,
      brand: product.brand,
      specs: product.specs?.slice(0, 15),
      reviews: product.reviews?.slice(0, 3),
      pros: product.prosFromPage,
      aggregateRating: product.aggregateRating,
    },
    snippets: searchResults.map((r) => ({
      source: new URL(r.url).hostname,
      url: r.url,
      text: r.content.slice(0, 400),
    })),
  });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildIntelFromProductOnly(product);

    const parsed = JSON.parse(content) as Record<string, unknown>;
    return productIntelSchema.parse({
      productTitle: product.title,
      brand: product.brand ?? parsed.brand,
      category: product.category ?? parsed.category,
      specsFromPage: product.specs,
      reviewsFromPage: product.reviews,
      externalSnippets: parsed.externalSnippets,
      marketplaceReviews: parsed.marketplaceReviews,
      consumerPainPoints: parsed.consumerPainPoints,
      rankedSellingPoints: parsed.rankedSellingPoints,
      socialProof: parsed.socialProof,
      researchSources: [
        product.sourceUrl,
        ...((parsed.researchSources as string[] | undefined) ?? []),
      ].filter((u, i, a) => a.indexOf(u) === i),
    });
  } catch (err) {
    console.warn("[product-intel] synthesize failed:", err);
    return buildIntelFromProductOnly(product);
  }
}
