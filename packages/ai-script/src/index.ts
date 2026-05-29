import OpenAI from "openai";
import {
  reelScriptSchema,
  type ProductCard,
  type ReelScript,
  reelTypeSchema,
  ctaTypeSchema,
  tierSchema,
} from "@reels-factory/shared";
import type { z } from "zod";

type ReelType = z.infer<typeof reelTypeSchema>;
type CtaType = z.infer<typeof ctaTypeSchema>;
type Tier = z.infer<typeof tierSchema>;

/** Default model for stage 3 (plan: gpt-4o). Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

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

export function buildMockScript(input: GenerateScriptInput): ReelScript {
  const priceLabel = formatPrice(input.product);
  const highlightText = [
    ...input.highlights,
    input.customHighlight,
  ]
    .filter(Boolean)
    .join(", ");

  const ctaMap: Record<CtaType, string> = {
    website: "На сайт",
    whatsapp: "Написать в WhatsApp",
    store: "В магазин",
  };

  const templateId =
    input.reelType === "features" ? "features" : "promo";

  return reelScriptSchema.parse({
    headline:
      input.reelType === "promo"
        ? "СУПЕРЦЕНА НА МОЩЬ"
        : input.product.title.slice(0, 40).toUpperCase(),
    subheadline: highlightText || "Качество, которому доверяют",
    priceLabel: priceLabel || undefined,
    ctaText: ctaMap[input.ctaType],
    bullets:
      templateId === "features"
        ? input.highlights.slice(0, 3).map((h) => h.charAt(0).toUpperCase() + h.slice(1))
        : undefined,
    templateId,
    scenes: [
      { startSec: 0, endSec: 3, text: input.product.title, style: "headline" },
      {
        startSec: 3,
        endSec: 8,
        text: highlightText || "Надёжность и качество",
        style: "subheadline",
      },
      {
        startSec: 8,
        endSec: 12,
        text: priceLabel || "Выгодное предложение",
        style: "headline",
      },
      {
        startSec: 12,
        endSec: 15,
        text: ctaMap[input.ctaType],
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

  const system = `Ты копирайтер для коротких рекламных Reels (15 сек, вертикальное видео).
Пиши на русском. Тон: ${TONE_BY_TYPE[input.reelType]}.
Верни ТОЛЬКО валидный JSON без markdown.`;

  const user = JSON.stringify({
    productTitle: input.product.title,
    price: priceStr,
    reelType: input.reelType,
    highlights: input.highlights,
    customHighlight: input.customHighlight,
    ctaType: input.ctaType,
    ctaValue: input.ctaValue,
    tier: input.tier ?? "basic",
    schema: {
      headline: "string, max 40 chars, CAPS ok",
      subheadline: "string",
      priceLabel: "string optional",
      ctaText: "string",
      bullets: "string[] optional, 3 items for features template",
      templateId: "promo | features",
      scenes: [{ startSec: 0, endSec: 3, text: "", style: "headline|subheadline|bullet|cta" }],
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
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return buildMockScript(input);

    const parsed = JSON.parse(content);
    return reelScriptSchema.parse(parsed);
  } catch {
    return buildMockScript(input);
  }
}
