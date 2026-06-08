import type { ProductCard, ReelScript } from "@reels-factory/shared";

type MusicMood = "energetic" | "trust" | "premium";

const MOOD_ART: Record<
  MusicMood,
  { palette: string; lighting: string; typography: string }
> = {
  energetic: {
    palette:
      "deep indigo (#1e1b4b) flowing into electric violet (#7c3aed), hot coral accent (#fb7185)",
    lighting:
      "crisp studio key light, vibrant rim glow, high-contrast TikTok commercial energy",
    typography:
      "bold geometric sans-serif Cyrillic, white with soft violet glow, kinetic poster style",
  },
  trust: {
    palette:
      "soft navy (#0f172a) to calm teal (#0d9488), warm off-white text, subtle grain",
    lighting:
      "diffused natural daylight, clean trustworthy e-commerce photography",
    typography:
      "friendly rounded sans-serif Cyrillic, high readability, calm authority",
  },
  premium: {
    palette:
      "charcoal black to champagne gold (#d4af37), subtle marble and velvet texture",
    lighting:
      "luxury catalog lighting, soft falloff, premium brand campaign aesthetic",
    typography:
      "elegant condensed sans-serif Cyrillic, gold and ivory, high-end retail ad",
  },
};

const SCENE_BLUEPRINTS: Record<string, string> = {
  hook: `FRAME ROLE: Viral Reels HOOK — scroll-stopping first frame.
COMPOSITION: Product hero in lower 45%, headline in upper third, generous safe margins (8%).
MOOD: Pattern interrupt, curiosity, “stop scrolling” energy.`,
  pain: `FRAME ROLE: PAIN — empathize with buyer frustration.
COMPOSITION: Product smaller (30%), emotional headline dominant, moody negative space.
MOOD: Relatable problem, tension before solution, cinematic desaturation.`,
  proof: `FRAME ROLE: PROOF — trust and social validation.
COMPOSITION: Product detail or hero 40%, proof line as quote/stat badge, bright confident layout.
MOOD: Credibility, relief, “this works” confidence.`,
  cta: `FRAME ROLE: CTA — conversion and urgency.
COMPOSITION: Product + price block, prominent CTA strip at bottom third, offer hierarchy.
MOOD: Urgency, clarity, ready to buy.`,
};

function formatPrice(product: ProductCard): string {
  if (product.price == null) return "";
  const value = Math.round(product.price).toLocaleString("ru-RU");
  return product.currency === "USD" ? `$${value}` : `${value} ₽`;
}

export function buildVisualSeriesBrief(
  script: ReelScript,
  product: ProductCard
): string {
  const mood = (script.musicMood ?? "energetic") as MusicMood;
  const art = MOOD_ART[mood] ?? MOOD_ART.energetic;

  return [
    "VISUAL SERIES (keep identical look across all 4 frames):",
    `Mood: ${mood}.`,
    `Palette: ${art.palette}.`,
    `Lighting: ${art.lighting}.`,
    `Typography system: ${art.typography}.`,
    product.brand ? `Brand to respect: ${product.brand}.` : "",
    "Same font family, margin system, and color grading on every frame.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildSceneImagePrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number
): string {
  const style = scene.style ?? "hook";
  const blueprint = SCENE_BLUEPRINTS[style] ?? SCENE_BLUEPRINTS.hook!;
  const price = formatPrice(product);
  const emphasis = scene.emphasis?.trim();

  return [
    "TYPE: Award-winning Russian social commerce static ad, 9:16 vertical mobile screen, ultra high-end DTC creative.",
    buildVisualSeriesBrief(script, product),
    blueprint,
    `Scene ${sceneIndex + 1} of 4 (${style}).`,
    "",
    "BACKGROUND:",
    "Premium gradient studio backdrop, subtle depth, no clutter, magazine-quality color grading.",
    "",
    "SUBJECT:",
    `Photorealistic product: "${product.title}".`,
    product.brand ? `Brand: ${product.brand}.` : "",
    price ? `Price to show if relevant: ${price}.` : "",
    "Product must look sharp, realistic, desirable — studio product photography quality.",
    "",
    "ON-IMAGE TEXT (Russian, exact wording, large and perfectly legible on phone):",
    `"${scene.text}"`,
    emphasis ? `Emphasis line (smaller, optional): "${emphasis}".` : "",
    "Spell Cyrillic correctly. No English UI. No random extra words.",
    "",
    "COMPOSITION:",
    "Rule of thirds, professional ad layout, 8% safe margins, text never cropped.",
    "",
    "CONSTRAINTS:",
    "Photorealistic only. No watermarks. No logos except product brand.",
    "No blurry text, no distorted product, no cheap clip art, no stock-photo feel.",
    "No misspelled Russian, no gibberish letters, no duplicate headlines.",
    "Output must look like a $5000 agency static ad frame, not AI slop.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildReferenceEditPrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number
): string {
  const base = buildSceneImagePrompt(product, script, scene, sceneIndex);
  return [
    "Use the attached product photo as the hero subject. Preserve product shape, colors, and branding accurately.",
    "Place it inside a new premium ad environment — do not replace the product with a generic lookalike.",
    base,
  ].join("\n");
}
