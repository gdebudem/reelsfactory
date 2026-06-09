import {
  describeOpenAiCapacityError,
  isOpenAiCapacityError,
  OPENAI_BILLING_LOG_HINT,
  productIntelSchema,
  resolvePromptText,
  type MarketplaceListing,
  type ProductCard,
  type ProductIntel,
  type PromptOverrides,
} from "@reels-factory/shared";
import OpenAI from "openai";
import type { TavilyResult } from "./tavily";
import type { ResearchProgressReporter } from "./progress";
import { noopReporter } from "./progress";

function buildIntelFromProductOnly(
  product: ProductCard,
  marketplaceListings: MarketplaceListing[] = []
): ProductIntel {
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
    marketplaceListings: marketplaceListings.length
      ? marketplaceListings
      : undefined,
    researchSources: [
      product.sourceUrl,
      ...marketplaceListings.map((l) => l.url),
    ].filter((u, i, a) => a.indexOf(u) === i),
  });
}

export async function synthesizeProductIntel(
  product: ProductCard,
  searchResults: TavilyResult[],
  marketplaceListings: MarketplaceListing[] = [],
  reporter: ResearchProgressReporter = noopReporter,
  promptOverrides?: PromptOverrides
): Promise<ProductIntel> {
  if (!searchResults.length) {
    return buildIntelFromProductOnly(product, marketplaceListings);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return buildIntelFromProductOnly(product, marketplaceListings);
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";

  const system = resolvePromptText("intel_system", promptOverrides);

  const user = JSON.stringify({
    viralGoal:
      "Материал для таргетированного вирусного Reels: scroll-stop хук, боли ЦА, hook-ready выгоды",
    productData: {
      title: product.title,
      brand: product.brand,
      category: product.category,
      price: product.price,
      currency: product.currency,
      specs: product.specs?.slice(0, 15),
      reviews: product.reviews?.slice(0, 5),
      pros: product.prosFromPage,
      aggregateRating: product.aggregateRating,
      sourceUrl: product.sourceUrl,
    },
    marketplaceListings,
    snippets: searchResults.map((r) => ({
      source: new URL(r.url).hostname,
      url: r.url,
      text: r.content.slice(0, 400),
    })),
  });

  try {
    await reporter.logRequest?.({
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      service: "OpenAI",
      target: "синтез intel",
      body: `model=${model} · json · temperature=0.3 · snippets=${searchResults.length}`,
      runtime: "Vercel",
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const usage = completion.usage;
    if (usage) {
      await reporter.logUsage({
        label: "синтез intel",
        model,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      });
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildIntelFromProductOnly(product, marketplaceListings);

    const parsed = JSON.parse(content) as Record<string, unknown>;
    return productIntelSchema.parse({
      productTitle: product.title,
      brand: product.brand ?? parsed.brand,
      category: product.category ?? parsed.category,
      specsFromPage: product.specs,
      reviewsFromPage: product.reviews,
      externalSnippets: parsed.externalSnippets,
      marketplaceReviews: parsed.marketplaceReviews,
      marketplaceListings: marketplaceListings.length
        ? marketplaceListings
        : undefined,
      consumerPainPoints: parsed.consumerPainPoints,
      rankedSellingPoints: parsed.rankedSellingPoints,
      socialProof: parsed.socialProof,
      researchSources: [
        product.sourceUrl,
        ...marketplaceListings.map((l) => l.url),
        ...((parsed.researchSources as string[] | undefined) ?? []),
      ].filter((u, i, a) => a.indexOf(u) === i),
    });
  } catch (err) {
    console.warn("[product-intel] synthesize failed:", err);
    if (isOpenAiCapacityError(err)) {
      await reporter.log(
        `⚠ OpenAI биллинг (синтез intel): ${describeOpenAiCapacityError(err)}. ${OPENAI_BILLING_LOG_HINT}`,
        "billing"
      );
    }
    return buildIntelFromProductOnly(product, marketplaceListings);
  }
}
