import {
  buildOpenAiChatRequestLog,
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

  const openai = new OpenAI({
    apiKey,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS ?? 55_000),
    maxRetries: 1,
  });
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

  const requestBodySummary = [
    "response_format=json_object",
    "temperature=0.3",
    `snippets=${searchResults.length}`,
    `marketplace=${marketplaceListings.length}`,
    `reviews=${product.reviews?.length ?? 0}`,
    `товар="${product.title.slice(0, 56)}"`,
  ].join(" · ");

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

    const usage = completion.usage;
    await reporter.logRequest?.(
      buildOpenAiChatRequestLog({
        target: "синтез intel · chat completions",
        model,
        body: requestBodySummary,
        status: 200,
        result: usage
          ? `${usage.total_tokens ?? 0} токенов (${usage.prompt_tokens ?? 0} prompt + ${usage.completion_tokens ?? 0} completion)`
          : "ok",
        runtime: "Vercel",
      })
    );

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
    const message = err instanceof Error ? err.message : String(err);
    await reporter.logRequest?.(
      buildOpenAiChatRequestLog({
        target: "синтез intel · chat completions",
        model,
        body: requestBodySummary,
        status: isOpenAiCapacityError(err) ? 429 : 500,
        result: message.slice(0, 120),
        runtime: "Vercel",
      })
    );
    const isTimeout =
      err instanceof Error &&
      (/timeout|timed out|abort/i.test(err.message) ||
        err.name === "APIConnectionTimeoutError");
    if (isTimeout) {
      await reporter.log(
        "синтез intel · таймаут OpenAI — продолжаем с данными страницы",
        "error"
      );
    }
    if (isOpenAiCapacityError(err)) {
      await reporter.log(
        `⚠ OpenAI биллинг (синтез intel): ${describeOpenAiCapacityError(err)}. ${OPENAI_BILLING_LOG_HINT}`,
        "billing"
      );
    }
    return buildIntelFromProductOnly(product, marketplaceListings);
  }
}
