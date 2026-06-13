import {
  buildOpenAiChatRequestLog,
  createOpenAiChatCompletion,
  describeOpenAiCapacityError,
  getOpenAiModel,
  isDevMockAllowed,
  isOpenAiCapacityError,
  normalizeReelScript,
  reelScriptSchema,
  resolvePromptText,
  sanitizeCtaText,
  scoreCreativeQuality,
  type ProductCard,
  type ProductIntel,
  type PromptOverrides,
  type ReelScript,
  type RequestLogPayload,
  reelTypeSchema,
  ctaTypeSchema,
  tierSchema,
} from "@reels-factory/shared";
import type { z } from "zod";
import {
  buildProductContext,
  buildReviewContextForScript,
  enrichScriptWithReviews,
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

export { DEFAULT_OPENAI_MODEL, getOpenAiModel } from "@reels-factory/shared";

export { buildProductContext, rankConsumerHooks, pickReviewQuote, collectReviewsForScript, buildReviewContextForScript, enrichScriptWithReviews } from "./product-hooks";
export { buildViralMockScript } from "./viral-script";
export type {
  GenerateScriptInput,
  GenerateScriptResult,
  GenerateScriptUsage,
} from "./types";

const TONE_BY_TYPE: Record<ReelType, string> = {
  promo: "дерзкий FOMO-мем, таргет на охотников за выгодой, хук про цену/скидку",
  new: "интрига early adopter, хук «только что вышло / вы ещё не видели»",
  features: "экспертный но смешной, хук «а вы знали что…» для рациональных покупателей",
  problem_solution: "таргет на боль ЦА, хук «если у вас [проблема] — стоп»",
  seasonal: "сезонный таргет, хук под событие/праздник, игриво и по делу",
};

const TARGET_AUDIENCE_BY_TYPE: Record<ReelType, string> = {
  promo: "покупатели, которые сравнивают цены и любят выгоду; триггер — цена, скидка, «наконец норм»",
  new: "любители новинок и трендов; триггер — быть первым, открыть для себя",
  features: "рациональные покупатели; триггер — цифры, факты, «умный выбор»",
  problem_solution: "люди с конкретной болью в категории; триггер — облегчение, «нашёл решение»",
  seasonal: "покупатели под сезон/праздник/подарок; триггер — срочность события, тематика",
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
  website: "Смотреть на сайте",
  whatsapp: "Написать в WhatsApp",
  store: "Выбрать в магазине",
};

export function buildMockScript(input: GenerateScriptInput): ReelScript {
  const priceLabel = formatPrice(input.product);
  const hooks = rankConsumerHooks(input.product, [
    ...input.highlights,
    ...(input.customHighlight ? [input.customHighlight] : []),
  ], input.productIntel);
  const bullets = hooks.slice(0, 3);
  const reviewQuote = pickReviewQuote(input.product, input.productIntel);
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

export type ScriptRequestLogger = {
  logRequest?: (payload: RequestLogPayload) => void | Promise<void>;
  log?: (text: string) => void | Promise<void>;
};

const V2_SCHEMA_HINT = {
  templateId: "minimal_product_reel_v2",
  audience: "string",
  pain: "string",
  desire: "string",
  angle: "string",
  creativeMechanic: "string",
  musicMood: "energetic|trust|premium",
  musicTrackId: "upbeat_drive|steady_groove|smooth_pulse",
  voiceoverStyle: "calm_confident|energetic|expert",
  scenes: [
    {
      style: "hook",
      duration: 3.5,
      headline: "max 8 words",
      subheadline: "optional",
      visualBrief: "background description, NO text",
      motion: "slow_zoom",
      imageIndex: 0,
    },
  ],
};

async function callScriptModel(
  apiKey: string,
  system: string,
  user: string,
  requestLogger?: ScriptRequestLogger,
  regenNote?: string
): Promise<{
  content: string | null;
  model: string;
  usage?: GenerateScriptUsage;
}> {
  const model = getOpenAiModel();
  const bodySummary = [
    "response_format=json_object",
    "no_temperature (gpt-5.x)",
    regenNote ?? "",
    `товар context in user payload`,
  ]
    .filter(Boolean)
    .join(" · ");

  const result = await createOpenAiChatCompletion({
    apiKey,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    jsonMode: true,
  });

  const usage: GenerateScriptUsage | undefined = result.usage
    ? {
        label: "сценарий",
        model: result.model,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      }
    : undefined;

  await requestLogger?.logRequest?.(
    buildOpenAiChatRequestLog({
      target: "сценарий · chat completions",
      model: result.model,
      body: bodySummary,
      status: 200,
      result: usage
        ? `${usage.totalTokens} токенов`
        : result.content
          ? "ok"
          : "пустой content",
      runtime: "Vercel",
    })
  );

  return { content: result.content, model: result.model, usage };
}

function finalizeScript(
  raw: ReelScript,
  input: GenerateScriptInput
): ReelScript {
  let script = normalizeReelScript(raw);
  const confidence = input.productConfidence ?? input.productIntel?.productConfidence;
  if (confidence?.canUseReviews) {
    script = enrichScriptWithReviews(script, input.product, input.productIntel);
  }
  if (!confidence?.canUsePrice) {
    script = { ...script, priceLabel: undefined };
  }
  if (script.scenes[3]) {
    const cta = script.scenes[3];
    script.scenes[3] = {
      ...cta,
      buttonText: sanitizeCtaText(cta.buttonText ?? script.ctaText ?? ""),
    };
  }
  script.ctaText = sanitizeCtaText(
    script.scenes[3]?.buttonText ?? script.ctaText ?? "Смотреть характеристики"
  );
  return script;
}

export async function generateReelScript(
  input: GenerateScriptInput,
  promptOverrides?: PromptOverrides,
  requestLogger?: ScriptRequestLogger
): Promise<GenerateScriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (isDevMockAllowed()) {
      return {
        script: buildViralMockScript(input, input.productIntel),
        mock: true,
        mockReason: "нет OPENAI_API_KEY (dev)",
      };
    }
    return {
      failed: true,
      errorMessage: "Не удалось сгенерировать сценарий. Попробуйте снова.",
    };
  }

  const confidence = input.productConfidence ?? input.productIntel?.productConfidence;
  const intel = input.productIntel;
  const priceStr =
    confidence?.canUsePrice !== false ? formatPrice(input.product) : "";
  const productData = buildProductContext(input.product, intel);
  const reviewContext = buildReviewContextForScript(
    input.product,
    intel,
    confidence
  );
  const suggestedHooks = intel?.rankedSellingPoints?.length
    ? intel.rankedSellingPoints
    : rankConsumerHooks(
        input.product,
        [...input.highlights, ...(input.customHighlight ? [input.customHighlight] : [])],
        intel
      );

  const system = resolvePromptText("script_system", promptOverrides, {
    tone: TONE_BY_TYPE[input.reelType],
  });

  const buildUserPayload = (regenFlags?: string[]) =>
    JSON.stringify({
      productData,
      productIntel: intel,
      productConfidence: confidence,
      reviewContext,
      suggestedHooks,
      price: priceStr || undefined,
      reelType: input.reelType,
      userHighlights: input.highlights,
      customHighlight: input.customHighlight,
      targetAudience: TARGET_AUDIENCE_BY_TYPE[input.reelType],
      ctaType: input.ctaType,
      ctaSuggestions: CTA_MAP,
      regenFlags,
      schema: V2_SCHEMA_HINT,
    });

  try {
    let { content, usage } = await callScriptModel(
      apiKey,
      system,
      buildUserPayload(),
      requestLogger
    );

    if (!content) {
      return {
        failed: true,
        errorMessage: "Не удалось сгенерировать сценарий. Попробуйте снова.",
      };
    }

    let parsed = reelScriptSchema.parse(JSON.parse(content));
    let script = finalizeScript(parsed, input);
    let qualityScore = scoreCreativeQuality(script, confidence);

    if (qualityScore.needsRegeneration) {
      await requestLogger?.log?.(
        `QA сценария · перегенерация · flags: ${qualityScore.riskFlags.join(", ")}`
      );
      const regen = await callScriptModel(
        apiKey,
        system,
        buildUserPayload(qualityScore.riskFlags),
        requestLogger,
        `regen flags: ${qualityScore.riskFlags.join(",")}`
      );
      if (regen.content) {
        parsed = reelScriptSchema.parse(JSON.parse(regen.content));
        script = finalizeScript(parsed, input);
        qualityScore = scoreCreativeQuality(script, confidence);
        usage = regen.usage ?? usage;
      }
    }

    script = { ...script, qualityScore };

    return { script, usage, qualityScore };
  } catch (err) {
    const billing = isOpenAiCapacityError(err);
    const message = err instanceof Error ? err.message : String(err);
    await requestLogger?.logRequest?.(
      buildOpenAiChatRequestLog({
        target: "сценарий · chat completions",
        model: getOpenAiModel(),
        body: "script generation failed",
        status: billing ? 429 : 500,
        result: billing ? describeOpenAiCapacityError(err) : message.slice(0, 120),
        runtime: "Vercel",
      })
    );

    if (isDevMockAllowed()) {
      return {
        script: buildViralMockScript(input, intel),
        mock: true,
        mockReason: message,
        billingExceeded: billing,
      };
    }

    return {
      failed: true,
      billingExceeded: billing,
      errorMessage: billing
        ? `Лимит OpenAI: ${describeOpenAiCapacityError(err)}`
        : "Не удалось сгенерировать сценарий. Попробуйте снова.",
    };
  }
}
