import type { ReelScript } from "@reels-factory/shared";
import { normalizeReelScript, sceneHeadline } from "@reels-factory/shared";
import type { ProductCard } from "@reels-factory/shared";

/** Map legacy scripts to 4-scene viral beats for render. */
export function normalizeScriptForViralRender(
  script: ReelScript,
  product: ProductCard
): ReelScript {
  const normalized = normalizeReelScript(script);
  if (normalized.scenes.length >= 4) {
    return {
      ...normalized,
      scenes: normalized.scenes.slice(0, 4).map((s, i) => ({
        ...s,
        text: sceneHeadline(s) || s.text || normalized.headline || product.title,
        imageIndex: s.imageIndex ?? i,
      })),
    };
  }
  return normalized;
}
