import {
  reelScriptSchema,
  type ProductCard,
  type ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
  tierSchema,
} from "@reels-factory/shared";
import type { z } from "zod";
import OpenAI from "openai";
import {
  buildProductContext,
  pickReviewQuote,
  rankConsumerHooks,
} from "./product-hooks";

type ReelType = z.infer<typeof reelTypeSchema>;
type CtaType = z.infer<typeof ctaTypeSchema>;
type Tier = z.infer<typeof tierSchema>;

/** Default model for stage 3 (plan: gpt-4o). Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export { buildProductContext, rankConsumerHooks, pickReviewQuote } from "./product-hooks";

const TONE_BY_TYPE: Record<ReelType, string> = {
  promo: "яркий, срочный, акцент на выгоде и цене",
  new: "свежий, интригующий, ощущение новинки",
  features: "экспертный, уверенный, перечисление преимуществ",
  problem_solution: "эмпатия к проблеме, чёткое решение",
  seasonal: "сезонный, тематический, праздничный тон",
};

export interface GenerateScriptInput {
  product: ProductCard;
  reelType: ReelType;
  highlights: string[];
  customHighlight?: string;
  ctaType: CtaType;
  ctaValue?: string;
  tier?: Tier;
}

function formatPrice(product: ProductCard): string {
  if (product.price == null) return "";
  const sym = product.currency === "USD" ? "$" : "₽";
  const formatted =
    product.currency === "USD"
      ? product.price.toFixed(2)
      : Math.round(product.price).toLocaleString("ru-RU");
  return `${formatted} ${sym}`;
}

const CTA_MAP: Record<CtaType, string> = {
  website: "На сайт",
  whatsapp: "Написать в WhatsApp",
  store: "В магазин",
};

export function buildMockScript(input: GenerateScriptInput): ReelScript {
  const priceLabel = formatPrice(input.product);
  const hooks = rankConsumerHooks(input.product, [
    ...input.highlights,
    ...(input.customHighlight ? [input.customHighlight] : []),
  ]);
  const bullets = hooks.slice(0, 3);
  const reviewQuote = pickReviewQuote(input.product);
  const hook1 = bullets[0] ?? "Качество, которому доверяют";
  const hook2 = bullets[1] ?? input.product.title.slice(0, 50);
  const templateId =
    input.reelType === "features" || bullets.length >= 2
      ? "features"
      : "promo";

  const headline =
    input.reelType === "promo" && priceLabel
      ? "ВЫГОДНОЕ ПРЕДЛОЖЕНИЕ"
      : input.product.title.slice(0, 38).toUpperCase();

  return reelScriptSchema.parse({
    headline,
    subheadline: hook1,
    priceLabel: priceLabel || undefined,
    ctaText: CTA_MAP[input.ctaType],
    bullets: bullets.length ? bullets : undefined,
    reviewQuote,
    templateId,
    scenes: [
      {
        startSec: 0,
        endSec: 2,
        text: headline,
        style: "headline",
      },
      {
        startSec: 2,
        endSec: 5,
        text: hook1,
        style: "bullet",
      },
      {
        startSec: 5,
        endSec: 8,
        text: hook2,
        style: "bullet",
      },
      {
        startSec: 8,
        endSec: 12,
        text: reviewQuote ?? hook2,
        style: reviewQuote ? "review" : "subheadline",
      },
      {
        startSec: 12,
        endSec: 15,
        text: priceLabel
          ? `${priceLabel} · ${CTA_MAP[input.ctaType]}`
          : CTA_MAP[input.ctaType],
        style: "cta",
      },
    ],
  });
}

export async function generateReelScript(
  input: GenerateScriptInput
): Promise<ReelScript> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockScript(input);
  }

  const openai = new OpenAI({ apiKey });
  const priceStr = formatPrice(input.product);
  const productData = buildProductContext(input.product);
  const suggestedHooks = rankConsumerHooks(input.product, [
    ...input.highlights,
    ...(input.customHighlight ? [input.customHighlight] : []),
  ]);

  const system = `Ты копирайтер для коротких рекламных Reels (15 сек, вертикальное видео 9:16).
Пиши на русском. Тон: ${TONE_BY_TYPE[input.reelType]}.

Правила:
- Используй ТОЛЬКО факты из productData (характеристики, отзывы, pros). НЕ выдумывай свойства.
- Переводи характеристики в выгоду для покупателя (не «Li-ion 4000 mAh», а «до 2 дней без зарядки» — если это следует из данных).
- Выбери 2–3 самых «продающих» пункта из specs/reviews/pros.
- suggestedHooks — подсказка приоритетов, можешь переформулировать.
- scenes: ровно 5 сцен на 15 сек: hook (0–2), bullet1 (2–5), bullet2 (5–8), review или факт (8–12), price+cta (12–15).
- reviewQuote: короткая цитата из отзыва (до 70 символов), если есть отзывы; иначе omit.
- headline: до 40 символов, CAPS допустимы.
- bullets: 2–3 коротких выгоды.

Верни ТОЛЬКО валидный JSON без markdown.`;

  const user = JSON.stringify({
    productData,
    suggestedHooks,
    price: priceStr,
    reelType: input.reelType,
    userHighlights: input.highlights,
    customHighlight: input.customHighlight,
    ctaType: input.ctaType,
    ctaValue: input.ctaValue,
    tier: input.tier ?? "basic",
    schema: {
      headline: "string",
      subheadline: "string",
      priceLabel: "string optional",
      ctaText: "string",
      bullets: "string[] optional",
      reviewQuote: "string optional",
      templateId: "promo | features",
      scenes: [
        {
          startSec: 0,
          endSec: 2,
          text: "",
          style: "headline|subheadline|bullet|review|cta",
        },
      ],
    },
  });

  try {
    const completion = await openai.chat.completions.create({
      model: getOpenAiModel(),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.65,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildMockScript(input);

    const parsed = JSON.parse(content);
    return reelScriptSchema.parse(parsed);
  } catch {
    return buildMockScript(input);
  }
}
