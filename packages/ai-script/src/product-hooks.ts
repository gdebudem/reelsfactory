import type { ProductCard } from "@reels-factory/shared";

const SPEC_NOISE =
  /артикул|sku|ean|штрих|упаков|брутто|нетто|код товара|внутрен/i;

const HIGH_VALUE_SPEC =
  /мощност|объ[её]м|емкост|гарант|скорост|расход|память|диагонал|размер|вес|материал|тип|класс|напряжен|ток|давлен|ресурс|срок/i;

export function buildProductContext(product: ProductCard) {
  return {
    title: product.title,
    brand: product.brand,
    category: product.category,
    description: product.description?.slice(0, 600),
    specs: product.specs?.slice(0, 25),
    reviews: product.reviews?.slice(0, 5).map((r) => ({
      text: r.text.slice(0, 200),
      rating: r.rating,
      author: r.author,
    })),
    prosFromPage: product.prosFromPage?.slice(0, 10),
    aggregateRating: product.aggregateRating,
  };
}

/** Heuristic ranking when OpenAI is unavailable or as prompt hint. */
export function rankConsumerHooks(
  product: ProductCard,
  highlights: string[]
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

  for (const review of product.reviews ?? []) {
    if (review.text.length < 12) continue;
    const snippet = review.text.slice(0, 55).trim();
    scored.push({
      text: `«${snippet}${review.text.length > 55 ? "…" : ""}»`,
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

export function pickReviewQuote(product: ProductCard): string | undefined {
  const best = [...(product.reviews ?? [])]
    .filter((r) => r.text.length >= 15)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  if (!best) return undefined;
  const text = best.text.slice(0, 70).trim();
  return `«${text}${best.text.length > 70 ? "…" : ""}»`;
}
