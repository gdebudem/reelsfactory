import {
  normalizeReelScript,
  reelScriptSchema,
  sanitizeCtaText,
  type ProductCard,
  type ProductIntel,
  type ReelScript,
} from "@reels-factory/shared";
import type { GenerateScriptInput } from "./types";
import {
  pickReviewQuote,
  rankConsumerHooks,
} from "./product-hooks";

const CTA_MAP = {
  website: "Смотреть характеристики",
  whatsapp: "Написать в WhatsApp",
  store: "Выбрать в магазине",
} as const;

function formatPrice(product: ProductCard, canUsePrice: boolean): string {
  if (!canUsePrice || product.price == null) return "";
  const sym = product.currency === "USD" ? "$" : "₽";
  const formatted =
    product.currency === "USD"
      ? product.price.toFixed(2)
      : Math.round(product.price).toLocaleString("ru-RU");
  return `${formatted} ${sym}`;
}

function pickMusicMood(
  reelType: GenerateScriptInput["reelType"]
): "energetic" | "trust" | "premium" {
  if (reelType === "promo") return "energetic";
  if (reelType === "features" || reelType === "problem_solution") return "trust";
  return "premium";
}

function pickMusicTrackId(mood: string): string {
  const map: Record<string, string> = {
    energetic: "upbeat_drive",
    trust: "steady_groove",
    premium: "smooth_pulse",
  };
  return map[mood] ?? "steady_groove";
}

function isCommercialHvac(product: ProductCard): boolean {
  const t = `${product.title} ${product.category ?? ""}`.toLowerCase();
  return (
    t.includes("midea") ||
    t.includes("напольно-потолоч") ||
    t.includes("потолочн") ||
    t.includes("коммерч")
  );
}

export function buildViralMockScript(
  input: GenerateScriptInput,
  intel?: ProductIntel
): ReelScript {
  const confidence = intel?.productConfidence;
  const canUseReviews = confidence?.canUseReviews ?? true;
  const canUsePrice = confidence?.canUsePrice ?? true;

  if (isCommercialHvac(input.product)) {
    return normalizeReelScript(
      reelScriptSchema.parse({
        templateId: "minimal_product_reel_v2",
        audience: "владельцы кафе, магазинов и офисов",
        pain: "обычная настенная сплит-система не справляется с большим помещением",
        desire: "равномерно охладить зал без ощущения склада техники",
        angle: "большой зал без духоты",
        creativeMechanic: "узнавание боли",
        musicMood: "premium",
        musicTrackId: "smooth_pulse",
        voiceoverStyle: "calm_confident",
        scenes: [
          {
            style: "hook",
            duration: 3.5,
            headline: "Кондиционер есть. Прохлады нет?",
            subheadline: "для больших помещений",
            visualBrief:
              "warm commercial cafe interior, subtle feeling of heat, clean negative space at top, no text",
            motion: "slow_zoom",
            imageIndex: 0,
          },
          {
            style: "pain",
            duration: 3.5,
            headline: "Обычная сплитка не тянет зал",
            subheadline: "и гости это чувствуют",
            visualBrief:
              "large commercial room, warm atmosphere, weak cooling feeling, no text",
            motion: "push_in",
            imageIndex: 1,
          },
          {
            style: "proof",
            duration: 4,
            headline: "Напольно-потолочный формат",
            subheadline: "для равномерного потока воздуха",
            bullets: ["для больших помещений", "монтаж у пола или потолка"],
            visualBrief:
              "Midea floor-ceiling split system installed in a clean modern commercial interior, premium lighting, no text",
            motion: "product_reveal",
            imageIndex: 2,
          },
          {
            style: "cta",
            duration: 4,
            headline: "Подберите под своё помещение",
            subheadline: "характеристики и цена на сайте",
            buttonText: "Смотреть",
            visualBrief:
              "premium product hero shot, clean background, empty CTA area at bottom, no text",
            motion: "button_pop",
            imageIndex: 3,
          },
        ],
      })
    );
  }

  const hooks = intel?.rankedSellingPoints?.length
    ? intel.rankedSellingPoints
    : rankConsumerHooks(input.product, input.highlights, intel);

  const pain =
    intel?.consumerPainPoints?.[0] ?? "Снова выбираете не то решение?";
  const reviewQuote = canUseReviews
    ? pickReviewQuote(input.product, intel)
    : undefined;
  const category = input.product.category?.trim();
  const hook =
    hooks[0] ??
    (category
      ? `Нужен ${category.toLowerCase()}?`
      : input.product.title.slice(0, 40));
  const proofHeadline =
    reviewQuote?.replace(/^«|»$/g, "").slice(0, 48) ??
    hooks[1] ??
    hooks[0] ??
    "Проверенные характеристики";
  const priceLabel = formatPrice(input.product, canUsePrice);
  const buttonText = sanitizeCtaText(CTA_MAP[input.ctaType]);
  const mood = pickMusicMood(input.reelType);

  return normalizeReelScript(
    reelScriptSchema.parse({
      templateId: "minimal_product_reel_v2",
      audience: category ? `покупатели ${category.toLowerCase()}` : "целевая аудитория",
      pain,
      desire: hooks[0] ?? "получить нужный результат без компромиссов",
      angle: hook.slice(0, 60),
      creativeMechanic: "узнавание боли",
      musicMood: mood,
      musicTrackId: pickMusicTrackId(mood),
      voiceoverStyle: "calm_confident",
      ctaText: buttonText,
      priceLabel: priceLabel || undefined,
      scenes: [
        {
          style: "hook",
          duration: 3.5,
          headline: hook.slice(0, 48),
          subheadline: category ?? undefined,
          visualBrief:
            "premium minimal product scene, clean negative space at top, no text",
          motion: "slow_zoom",
          imageIndex: 0,
        },
        {
          style: "pain",
          duration: 3.5,
          headline: pain.slice(0, 48),
          visualBrief:
            "relatable problem moment, soft lighting, empty text area, no text",
          motion: "push_in",
          imageIndex: 1,
        },
        {
          style: "proof",
          duration: 4,
          headline: proofHeadline.slice(0, 48),
          bullets: hooks.slice(0, 2),
          visualBrief:
            "product hero in modern interior, premium commercial lighting, no text",
          motion: "product_reveal",
          imageIndex: 2,
        },
        {
          style: "cta",
          duration: 4,
          headline: priceLabel ? `от ${priceLabel}` : "Узнайте подробности",
          buttonText,
          visualBrief:
            "product hero, clean background, empty CTA zone at bottom, no text",
          motion: "button_pop",
          imageIndex: 3,
        },
      ],
    })
  );
}
