import type { ProductCard, ReelScript, PromptOverrides } from "@reels-factory/shared";
import { resolvePromptText, sceneVisualBrief, sceneHeadline } from "@reels-factory/shared";

type MusicMood = "energetic" | "trust" | "premium";

const BACKGROUND_ONLY_BASE = `You are generating ONLY the background/product visual for a vertical product Reel.

Important:
- NO text
- NO letters
- NO captions
- NO logos except the original logo already visible on the product
- NO poster design
- NO fake UI
- NO badges
- NO typography

Use the reference product image accurately.
Keep the product realistic, clean, proportional, not distorted.
Create a premium minimal commercial scene.
Leave clean negative space for text overlay.
Lighting: soft, modern, high-end.
Composition: product hero, 9:16, mobile-first, safe top and bottom margins.
Style: premium minimal, not cartoon, not marketplace banner, not noisy.`;

export function buildVisualSeriesBrief(
  script: ReelScript,
  product: ProductCard,
  overrides?: PromptOverrides
): string {
  const mood = (script.musicMood ?? "trust") as MusicMood;
  const paletteId =
    mood === "trust"
      ? "scene_mood_trust_palette"
      : mood === "premium"
        ? "scene_mood_premium_palette"
        : "scene_mood_energetic_palette";
  const lightingId =
    mood === "trust"
      ? "scene_mood_trust_lighting"
      : mood === "premium"
        ? "scene_mood_premium_lighting"
        : "scene_mood_energetic_lighting";

  const artPalette = resolvePromptText(paletteId, overrides);
  const artLighting = resolvePromptText(lightingId, overrides);

  return [
    "VISUAL SERIES (identical look across 4 frames, backgrounds only):",
    `Mood: ${mood}.`,
    `Palette: ${artPalette}.`,
    `Lighting: ${artLighting}.`,
    product.brand ? `Brand to respect: ${product.brand}.` : "",
    "Same environment style and color grading. NO TEXT on any frame.",
  ]
    .filter(Boolean)
    .join(" ");
}

function getBlueprint(
  style: string,
  overrides?: PromptOverrides
): string {
  const id =
    style === "pain"
      ? "scene_blueprint_pain"
      : style === "proof"
        ? "scene_blueprint_proof"
        : style === "cta"
          ? "scene_blueprint_cta"
          : "scene_blueprint_hook";
  return resolvePromptText(id, overrides);
}

export function buildSceneImagePrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number,
  overrides?: PromptOverrides
): string {
  const style = scene.style ?? "hook";
  const blueprint = getBlueprint(style, overrides);
  const visualBrief = sceneVisualBrief(scene);

  const subject = resolvePromptText("scene_subject", overrides, {
    product_title: product.title,
    brand_line: product.brand ? `Brand: ${product.brand}.` : "",
    price_line: "",
  });

  return [
    BACKGROUND_ONLY_BASE,
    resolvePromptText("scene_type_line", overrides),
    buildVisualSeriesBrief(script, product, overrides),
    blueprint,
    `Scene ${sceneIndex + 1} of 4 (${style}).`,
    `Scene context (for mood only, do NOT render as text): ${sceneHeadline(scene)}`,
    "",
    "VISUAL BRIEF:",
    visualBrief,
    "",
    "BACKGROUND:",
    resolvePromptText("scene_background", overrides),
    "",
    "SUBJECT:",
    subject,
    "",
    resolvePromptText("scene_text_rules", overrides),
    "",
    "COMPOSITION:",
    resolvePromptText("scene_composition", overrides),
    "",
    "CONSTRAINTS:",
    resolvePromptText("scene_constraints", overrides),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReferenceEditPrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number,
  overrides?: PromptOverrides
): string {
  const base = buildSceneImagePrompt(
    product,
    script,
    scene,
    sceneIndex,
    overrides
  );
  return [resolvePromptText("scene_reference_prefix", overrides), base].join(
    "\n"
  );
}
