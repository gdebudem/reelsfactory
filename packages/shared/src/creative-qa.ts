import type { ProductConfidence } from "./product-confidence";
import type { ReelScript, ReelScene } from "./reel-script";

export type CreativeQualityScore = {
  hookScore: number;
  audienceSpecificity: number;
  visualCleanliness: number;
  textReadability: number;
  proofStrength: number;
  ctaClarity: number;
  riskFlags: string[];
  needsRegeneration: boolean;
};

const GENERIC_PHRASES = [
  /краткое описание/i,
  /лучшее качество/i,
  /выгодная покупка/i,
  /^на сайт$/i,
  /покупай скорее/i,
  /топ товар/i,
  /успей купить/i,
  /хит продаж/i,
  /покупатели говорят/i,
  /разбирают/i,
  /лучший выбор/i,
  /супер товар/i,
  /выгодн/i,
];

const GENERIC_HOOKS = [
  /^качество/i,
  /^лучш/i,
  /^топ/i,
  /^выгод/i,
  /^супер/i,
];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sceneHeadline(scene: ReelScene): string {
  return scene.headline ?? scene.text ?? "";
}

function hasGenericPhrase(text: string): boolean {
  return GENERIC_PHRASES.some((re) => re.test(text.trim()));
}

export function scoreCreativeQuality(
  script: ReelScript,
  confidence?: ProductConfidence
): CreativeQualityScore {
  const riskFlags: string[] = [];
  const hook = sceneHeadline(script.scenes[0] ?? { style: "hook", duration: 3.5, headline: "", visualBrief: "", motion: "slow_zoom", imageIndex: 0 });
  const ctaScene = script.scenes[3];
  const ctaHeadline = ctaScene ? sceneHeadline(ctaScene) : "";
  const ctaButton = ctaScene?.buttonText ?? script.ctaText ?? "";

  if (wordCount(hook) > 8) riskFlags.push("headline_too_long");
  if (GENERIC_HOOKS.some((re) => re.test(hook))) riskFlags.push("generic_hook");
  if (ctaButton === "На сайт" || /^на сайт$/i.test(ctaHeadline))
    riskFlags.push("generic_cta");
  if (script.scenes.some((s) => wordCount(sceneHeadline(s)) > 10))
    riskFlags.push("headline_too_long");
  if (script.scenes.some((s) => hasGenericPhrase(sceneHeadline(s))))
    riskFlags.push("generic_hook");

  if (!script.audience?.trim() || script.audience.length < 8)
    riskFlags.push("no_specific_audience");
  if (!script.pain?.trim() || script.pain.length < 10)
    riskFlags.push("weak_pain");

  if (!confidence?.canUseReviews && script.reviewQuote)
    riskFlags.push("unverified_reviews");
  if (!confidence?.canUseRating && /★|звезд|рейтинг|4[.,]\d/i.test(hook + ctaHeadline))
    riskFlags.push("unverified_rating");
  if (!confidence?.canUsePrice && script.priceLabel)
    riskFlags.push("unverified_price");

  const hookScore = riskFlags.includes("generic_hook") ? 0.35 : wordCount(hook) <= 8 ? 0.85 : 0.55;
  const audienceSpecificity = riskFlags.includes("no_specific_audience") ? 0.3 : 0.85;
  const textReadability = riskFlags.includes("headline_too_long") ? 0.4 : 0.9;
  const proofStrength = script.scenes[2]?.bullets?.length ? 0.8 : 0.55;
  const ctaClarity = riskFlags.includes("generic_cta") ? 0.25 : 0.85;
  const visualCleanliness = 0.85;

  const needsRegeneration =
    riskFlags.includes("generic_hook") ||
    riskFlags.includes("generic_cta") ||
    riskFlags.includes("no_specific_audience") ||
    riskFlags.includes("weak_pain") ||
    riskFlags.includes("unverified_reviews") ||
    riskFlags.includes("unverified_rating") ||
    hookScore < 0.5 ||
    ctaClarity < 0.5;

  return {
    hookScore,
    audienceSpecificity,
    visualCleanliness,
    textReadability,
    proofStrength,
    ctaClarity,
    riskFlags,
    needsRegeneration,
  };
}
