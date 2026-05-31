import {
  reelScriptSchema,
  type ProductCard,
  type ProductIntel,
  type ReelScript,
} from "@reels-factory/shared";
import type { GenerateScriptInput } from "./index";
import { pickReviewQuote, rankConsumerHooks } from "./product-hooks";

const CTA_MAP = {
  website: "На сайт",
  whatsapp: "Написать в WhatsApp",
  store: "В магазин",
} as const;

function formatPrice(product: ProductCard): string {
  if (product.price == null) return "";
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

export function buildViralMockScript(
  input: GenerateScriptInput,
  intel?: ProductIntel
): ReelScript {
  const priceLabel = formatPrice(input.product);
  const hooks = intel?.rankedSellingPoints?.length
    ? intel.rankedSellingPoints
    : rankConsumerHooks(input.product, input.highlights);

  const pain =
    intel?.consumerPainPoints?.[0] ??
    "Нужно решение без компромиссов?";
  const proof =
    intel?.socialProof ??
    pickReviewQuote(input.product) ??
    hooks[1] ??
    hooks[0] ??
    "Проверенное качество";
  const hook = hooks[0] ?? input.product.title.slice(0, 40);
  const offer = priceLabel
    ? `${priceLabel} · ${CTA_MAP[input.ctaType]}`
    : CTA_MAP[input.ctaType];

  const mood = pickMusicMood(input.reelType);

  return reelScriptSchema.parse({
    headline: hook.slice(0, 40).toUpperCase(),
    subheadline: pain.slice(0, 60),
    priceLabel: priceLabel || undefined,
    ctaText: CTA_MAP[input.ctaType],
    reviewQuote: pickReviewQuote(input.product),
    bullets: hooks.slice(0, 3),
    templateId: "viral_v1",
    musicMood: mood,
    musicTrackId: pickMusicTrackId(mood),
    scenes: [
      {
        startSec: 0,
        endSec: 3.75,
        text: hook.slice(0, 48),
        style: "hook",
        imageIndex: 0,
      },
      {
        startSec: 3.75,
        endSec: 7.5,
        text: pain.slice(0, 48),
        style: "pain",
        imageIndex: 1,
      },
      {
        startSec: 7.5,
        endSec: 11.25,
        text: proof.slice(0, 56),
        style: "proof",
        imageIndex: 2,
      },
      {
        startSec: 11.25,
        endSec: 15,
        text: offer.slice(0, 48),
        style: "cta",
        imageIndex: 3,
      },
    ],
  });
}
