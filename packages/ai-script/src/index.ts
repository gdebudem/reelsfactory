import {
  describeOpenAiCapacityError,
  isOpenAiCapacityError,
  reelScriptSchema,
  type ProductCard,
  type ProductIntel,
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
import { buildViralMockScript } from "./viral-script";
import type {
  GenerateScriptInput,
  GenerateScriptResult,
  GenerateScriptUsage,
} from "./types";

type ReelType = z.infer<typeof reelTypeSchema>;
type CtaType = z.infer<typeof ctaTypeSchema>;
type Tier = z.infer<typeof tierSchema>;

/** Default model for stage 3 (plan: gpt-4o). Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export { buildProductContext, rankConsumerHooks, pickReviewQuote } from "./product-hooks";
export { buildViralMockScript } from "./viral-script";
export type {
  GenerateScriptInput,
  GenerateScriptResult,
  GenerateScriptUsage,
} from "./types";

const TONE_BY_TYPE: Record<ReelType, string> = {
  promo: "яркий, срочный, акцент на выгоде и цене",
  new: "свежий, интригующий, ощущение новинки",
  features: "экспертный, уверенный, перечисление преимуществ",
  problem_solution: "эмпатия к проблеме, чёткое решение",
  seasonal: "сезонный, тематический, праздничный тон",
};

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
): Promise<GenerateScriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      script: buildViralMockScript(input, input.productIntel),
      mock: true,
    };
  }

  const openai = new OpenAI({ apiKey });
  const priceStr = formatPrice(input.product);
  const productData = buildProductContext(input.product);
  const intel = input.productIntel;
  const suggestedHooks = intel?.rankedSellingPoints?.length
    ? intel.rankedSellingPoints
    : rankConsumerHooks(input.product, [
        ...input.highlights,
        ...(input.customHighlight ? [input.customHighlight] : []),
      ]);

  const system = `Ты копирайтер вирусных product Reels (15 сек, 9:16). Язык: русский. Тон: ${TONE_BY_TYPE[input.reelType]}.

Формула Hook → Pain → Proof → Offer+CTA (ровно 4 сцены):
1. hook (0–3.75с): остановить скролл, вопрос или интрига, макс 8 слов
2. pain (3.75–7.5с): боль покупателя, эмпатия, макс 8 слов
3. proof (7.5–11.25с): факт/цифра + social proof или цитата отзыва, макс 10 слов
4. cta (11.25–15с): цена + призыв, макс 8 слов

Правила:
- ТОЛЬКО факты из productIntel и productData. Не выдумывай.
- templateId: "viral_v1"
- musicMood: energetic | trust | premium (по типу ролика)
- musicTrackId: upbeat_drive | steady_groove | smooth_pulse
- scenes: ровно 4, imageIndex 0–3 (разные фото товара)
- style: hook | pain | proof | cta
- headline/subheadline/bullets/reviewQuote — для UI, согласуй с сценами

Верни ТОЛЬКО валидный JSON.`;

  const user = JSON.stringify({
    productData,
    productIntel: intel,
    suggestedHooks,
    price: priceStr,
    reelType: input.reelType,
    userHighlights: input.highlights,
    ctaType: input.ctaType,
    ctaText: CTA_MAP[input.ctaType],
    schema: {
      headline: "string",
      subheadline: "string",
      priceLabel: "string optional",
      ctaText: "string",
      bullets: "string[]",
      reviewQuote: "string optional",
      templateId: "viral_v1",
      musicMood: "energetic|trust|premium",
      musicTrackId: "string",
      scenes: [
        {
          startSec: 0,
          endSec: 3.75,
          text: "",
          style: "hook",
          imageIndex: 0,
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
    const model = getOpenAiModel();
    const usage: GenerateScriptUsage | undefined = completion.usage
      ? {
          label: "сценарий",
          model,
          promptTokens: completion.usage.prompt_tokens ?? 0,
          completionTokens: completion.usage.completion_tokens ?? 0,
          totalTokens: completion.usage.total_tokens ?? 0,
        }
      : undefined;

    if (!content) {
      return {
        script: buildViralMockScript(input, intel),
        mock: true,
      };
    }

    const parsed = JSON.parse(content);
    const script = reelScriptSchema.parse({
      ...parsed,
      templateId: "viral_v1",
    });
    return {
      script: normalizeViralScenes(script),
      usage,
    };
  } catch (err) {
    const billing = isOpenAiCapacityError(err);
    return {
      script: buildViralMockScript(input, intel),
      mock: true,
      mockReason: billing
        ? `лимит OpenAI — ${describeOpenAiCapacityError(err)}`
        : "ошибка OpenAI — сценарий-заглушка",
      billingExceeded: billing,
    };
  }
}

function normalizeViralScenes(script: ReelScript): ReelScript {
  const defaults = [
    { startSec: 0, endSec: 3.75, style: "hook" as const, imageIndex: 0 },
    { startSec: 3.75, endSec: 7.5, style: "pain" as const, imageIndex: 1 },
    { startSec: 7.5, endSec: 11.25, style: "proof" as const, imageIndex: 2 },
    { startSec: 11.25, endSec: 15, style: "cta" as const, imageIndex: 3 },
  ];

  const scenes = defaults.map((d, i) => {
    const s = script.scenes[i];
    return {
      startSec: d.startSec,
      endSec: d.endSec,
      text: s?.text ?? script.headline,
      style: s?.style ?? d.style,
      imageIndex: s?.imageIndex ?? d.imageIndex,
    };
  });

  return { ...script, templateId: "viral_v1", scenes };
}
