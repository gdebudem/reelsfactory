import type { ReelScript } from "@reels-factory/shared";
import { buildViralMockScript } from "@reels-factory/ai-script";
import type { ProductCard } from "@reels-factory/shared";

/** Map legacy 5-scene scripts to 4 viral beats for render. */
export function normalizeScriptForViralRender(
  script: ReelScript,
  product: ProductCard
): ReelScript {
  if (
    script.templateId === "viral_v1" &&
    script.scenes.length >= 4 &&
    script.musicMood
  ) {
    return script;
  }

  if (script.scenes.length >= 4) {
    const fallbacks = [
      script.headline,
      script.subheadline,
      script.reviewQuote ?? script.bullets?.[0] ?? script.headline,
      script.ctaText,
    ];
    const scenes = script.scenes.slice(0, 4).map((s, i) => ({
      ...s,
      startSec: i * 3.75,
      endSec: (i + 1) * 3.75,
      text: s.text?.trim() || fallbacks[i] || script.headline,
      imageIndex: s.imageIndex ?? i,
      style:
        s.style ??
        (["hook", "pain", "proof", "cta"] as const)[i],
    }));
    return {
      ...script,
      templateId: "viral_v1",
      musicMood: script.musicMood ?? "trust",
      musicTrackId: script.musicTrackId ?? "steady_groove",
      scenes,
    };
  }

  return buildViralMockScript(
    {
      product,
      reelType: "features",
      highlights: script.bullets ?? [],
      ctaType: "website",
    },
    undefined
  );
}
