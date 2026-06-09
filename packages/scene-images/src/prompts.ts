import type { ProductCard, ReelScript, PromptOverrides } from "@reels-factory/shared";
import { resolvePromptText } from "@reels-factory/shared";

type MusicMood = "energetic" | "trust" | "premium";

function formatPrice(product: ProductCard): string {
  if (product.price == null) return "";
  const value = Math.round(product.price).toLocaleString("ru-RU");
  return product.currency === "USD" ? `$${value}` : `${value} ₽`;
}

export function buildVisualSeriesBrief(
  script: ReelScript,
  product: ProductCard,
  overrides?: PromptOverrides
): string {
  const mood = (script.musicMood ?? "energetic") as MusicMood;
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
  const typographyId =
    mood === "trust"
      ? "scene_mood_trust_typography"
      : mood === "premium"
        ? "scene_mood_premium_typography"
        : "scene_mood_energetic_typography";

  const artPalette = resolvePromptText(paletteId, overrides);
  const artLighting = resolvePromptText(lightingId, overrides);
  const artTypography = resolvePromptText(typographyId, overrides);

  return [
    "VISUAL SERIES (keep identical look across all 4 frames):",
    `Mood: ${mood}.`,
    `Palette: ${artPalette}.`,
    `Lighting: ${artLighting}.`,
    `Typography system: ${artTypography}.`,
    product.brand ? `Brand to respect: ${product.brand}.` : "",
    "Same font family, margin system, and color grading on every frame.",
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
  const price = formatPrice(product);
  const emphasis = scene.emphasis?.trim();

  const subject = resolvePromptText("scene_subject", overrides, {
    product_title: product.title,
    brand_line: product.brand ? `Brand: ${product.brand}.` : "",
    price_line: price ? `Price to show if relevant: ${price}.` : "",
  });

  const textRules = resolvePromptText("scene_text_rules", overrides, {
    scene_text: scene.text,
    emphasis_line: emphasis
      ? `Emphasis line (smaller, optional): "${emphasis}".`
      : "",
  });

  return [
    resolvePromptText("scene_type_line", overrides),
    buildVisualSeriesBrief(script, product, overrides),
    blueprint,
    `Scene ${sceneIndex + 1} of 4 (${style}).`,
    "",
    "BACKGROUND:",
    resolvePromptText("scene_background", overrides),
    "",
    "SUBJECT:",
    subject,
    "",
    "ON-IMAGE TEXT (Russian, exact wording, large and perfectly legible on phone):",
    textRules,
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
