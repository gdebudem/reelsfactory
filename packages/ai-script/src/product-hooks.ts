import type { ProductCard, ProductIntel } from "@reels-factory/shared";

const SPEC_NOISE =
  /артикул|sku|ean|штрих|упаков|брутто|нетто|код товара|внутрен/i;

const HIGH_VALUE_SPEC =
  /мощност|объ[её]м|емкост|гарант|скорост|расход|память|диагонал|размер|вес|материал|тип|класс|напряжен|ток|давлен|ресурс|срок/i;

export type ReviewForScript = {
  text: string;
  rating?: number;
  source: string;
};

export function collectReviewsForScript(
  product: ProductCard,
  intel?: ProductIntel
): ReviewForScript[] {
  const scored: { review: ReviewForScript; score: number }[] = [];

  const add = (text: string, source: string, rating?: number) => {
    const t = text.trim();
    if (t.length < 12) return;
    let score = 5 + (rating ?? 0);
    if (/\d/.test(t)) score += 1;
    if (t.length >= 25 && t.length <= 140) score += 2;
    if (/!|\?|…/.test(t)) score += 1;
    scored.push({
      review: {
        text: t.slice(0, 140),
        rating,
        source,
      },
      score,
    });
  };

  for (const r of product.reviews ?? []) {
    add(r.text, "страница товара", r.rating);
  }
  for (const r of intel?.reviewsFromPage ?? []) {
    add(r.text, "страница товара", r.rating);
  }
  for (const r of intel?.marketplaceReviews ?? []) {
    add(r.quote, r.platform, r.rating);
  }
  for (const s of intel?.externalSnippets ?? []) {
    if (s.sentiment === "negative") continue;
    add(s.quote, s.source);
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: ReviewForScript[] = [];
  for (const item of scored) {
    const key = item.review.text.toLowerCase().slice(0, 36);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.review);
    if (out.length >= 10) break;
  }
  return out;
}

export function formatReviewQuote(text: string, maxLen = 70): string {
  const trimmed = text.trim().slice(0, maxLen);
  return `«${trimmed}${text.length > maxLen ? "…" : ""}»`;
}

export function pickReviewQuote(
  product: ProductCard,
  intel?: ProductIntel
): string | undefined {
  const reviews = collectReviewsForScript(product, intel);
  if (!reviews.length) return undefined;
  const best = [...reviews].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
  )[0]!;
  return formatReviewQuote(best.text);
}

export function buildReviewContextForScript(
  product: ProductCard,
  intel?: ProductIntel
) {
  const topReviews = collectReviewsForScript(product, intel);
  const aggregate = product.aggregateRating;
  const socialProof =
    intel?.socialProof ??
    (aggregate
      ? `${aggregate.value.toFixed(1)} из 5${
          aggregate.count ? ` (${aggregate.count} отзывов)` : ""
        }`
      : undefined);

  return {
    topReviews,
    bestReviewQuote: pickReviewQuote(product, intel),
    socialProof,
    reviewCount:
      topReviews.length ||
      aggregate?.count ||
      product.reviews?.length ||
      intel?.marketplaceReviews?.length ||
      0,
    hasReviews: topReviews.length > 0,
  };
}

export function buildProductContext(
  product: ProductCard,
  intel?: ProductIntel
) {
  const mergedReviews = collectReviewsForScript(product, intel).slice(0, 8);

  return {
    title: product.title,
    brand: product.brand,
    category: product.category,
    description: product.description?.slice(0, 600),
    specs: product.specs?.slice(0, 25),
    reviews: mergedReviews.map((r) => ({
      text: r.text.slice(0, 200),
      rating: r.rating,
      source: r.source,
    })),
    prosFromPage: product.prosFromPage?.slice(0, 10),
    aggregateRating: product.aggregateRating,
  };
}

/** Heuristic ranking when OpenAI is unavailable or as prompt hint. */
export function rankConsumerHooks(
  product: ProductCard,
  highlights: string[],
  intel?: ProductIntel
): string[] {
  const scored: { text: string; score: number }[] = [];

  for (const spec of product.specs ?? []) {
    const line = `${spec.name}: ${spec.value}`;
    if (SPEC_NOISE.test(line)) continue;
    let score = 5;
    if (/\d/.test(spec.value)) score += 2;
    if (HIGH_VALUE_SPEC.test(spec.name)) score += 3;
    scored.push({
      text: specToBenefit(spec.name, spec.value),
      score,
    });
  }

  for (const pro of product.prosFromPage ?? []) {
    scored.push({ text: pro.slice(0, 70), score: 7 });
  }

  for (const review of collectReviewsForScript(product, intel)) {
    const snippet = review.text.slice(0, 55).trim();
    scored.push({
      text: formatReviewQuote(snippet, 55),
      score: 8 + (review.rating ?? 0),
    });
  }

  for (const h of highlights) {
    scored.push({ text: h, score: 4 });
  }

  if (product.aggregateRating && product.aggregateRating.value >= 4) {
    scored.push({
      text: `★ ${product.aggregateRating.value.toFixed(1)}${
        product.aggregateRating.count
          ? ` (${product.aggregateRating.count} отзывов)`
          : ""
      }`,
      score: 9,
    });
  }

  if (intel?.socialProof) {
    scored.push({ text: intel.socialProof, score: 9 });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of scored) {
    const key = item.text.toLowerCase().slice(0, 28);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.text);
    if (out.length >= 6) break;
  }
  return out;
}

function specToBenefit(name: string, value: string): string {
  const n = name.trim();
  const v = value.trim();
  if (/^до\s/i.test(v) || /^от\s/i.test(v)) return `${n} ${v}`.slice(0, 65);
  return `${n}: ${v}`.slice(0, 65);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Ensure proof scene and reviewQuote use real buyer voice when GPT skipped reviews. */
export function enrichScriptWithReviews(
  script: import("@reels-factory/shared").ReelScript,
  product: ProductCard,
  intel?: ProductIntel
): import("@reels-factory/shared").ReelScript {
  const quote = pickReviewQuote(product, intel);
  if (!quote) {
    return script;
  }

  const plainQuote = quote.replace(/^«|»$/g, "").trim();
  const proofIdx = script.scenes.findIndex((s) => s.style === "proof");
  let scenes = script.scenes;

  if (proofIdx >= 0) {
    const proofText = script.scenes[proofIdx]?.text ?? "";
    const mentionsReview =
      proofText.includes("«") ||
      proofText.includes("»") ||
      plainQuote
        .slice(0, 24)
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length > 4 && proofText.toLowerCase().includes(w));

    if (!mentionsReview) {
      const proofLine =
        wordCount(plainQuote) <= 10
          ? formatReviewQuote(plainQuote, 56)
          : plainQuote.slice(0, 48).trim();
      scenes = script.scenes.map((s, i) =>
        i === proofIdx ? { ...s, text: proofLine.replace(/^«|»$/g, "") } : s
      );
    }
  }

  return {
    ...script,
    reviewQuote: script.reviewQuote?.trim() || quote,
    scenes,
  };
}
