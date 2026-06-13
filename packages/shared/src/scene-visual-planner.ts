import type { ReelScene, ReelScript } from "./reel-script";

export type PlannerProduct = {
  title: string;
  brand?: string;
  category?: string;
};

export const SCENE_VISUAL_TYPES = [
  "problem_context",
  "product_hero",
  "detail_macro",
  "solution_scene",
  "lifestyle_context",
] as const;

export const SCENE_COMPOSITIONS = [
  "top_text_space",
  "center_product",
  "bottom_cta_space",
  "split_screen",
  "center_empty_space",
  "right_product_left_bullets",
] as const;

export const SCENE_CAMERAS = [
  "close_up",
  "medium",
  "wide",
  "low_angle",
  "top_angle",
] as const;

export const SCENE_PRODUCT_PLACEMENTS = [
  "center",
  "bottom_third",
  "right_third",
  "hero_large",
  "subtle_or_absent",
  "none_or_small",
] as const;

export const OVERLAY_LAYOUTS = [
  "hook_top",
  "pain_center",
  "proof_bullets",
  "cta_button",
] as const;

export type SceneVisualPlan = {
  sceneType: (typeof SCENE_VISUAL_TYPES)[number];
  composition: (typeof SCENE_COMPOSITIONS)[number];
  camera: (typeof SCENE_CAMERAS)[number];
  background: string;
  productPlacement: (typeof SCENE_PRODUCT_PLACEMENTS)[number];
  mood: string;
  prompt: string;
};

export type SceneOverlayPlan = {
  headline: string;
  subheadline?: string;
  bullets?: string[];
  buttonText?: string;
  layout: (typeof OVERLAY_LAYOUTS)[number];
  animation: "fade_up" | "punch_in" | "type_pop" | "slide_up";
};

export type PlannedScene = {
  id: string;
  role: "hook" | "pain" | "proof" | "cta";
  duration: number;
  visual: SceneVisualPlan;
  overlay: SceneOverlayPlan;
};

const NO_TEXT_RULES = `DO NOT generate any text.
NO letters. NO words. NO captions. NO numbers. NO UI. NO badges. NO buttons. NO typography. NO poster design.
The image must be a clean visual background/product scene only.
Leave empty negative space for text overlay.`;

function roleOf(scene: ReelScene, index: number): PlannedScene["role"] {
  const style = scene.style ?? (["hook", "pain", "proof", "cta"][index] as PlannedScene["role"]);
  if (style === "hook" || style === "pain" || style === "proof" || style === "cta") return style;
  return (["hook", "pain", "proof", "cta"][index] ?? "hook") as PlannedScene["role"];
}

function defaultBackground(script: ReelScript, product: PlannerProduct): string {
  const category = product.category?.toLowerCase() ?? "";
  if (
    category.includes("кондицион") ||
    category.includes("сплит") ||
    product.title.toLowerCase().includes("midea")
  ) {
    return "clean modern commercial interior, cafe or office or retail hall";
  }
  if (category.includes("детск") || category.includes("велосип")) {
    return "bright suburban lifestyle context, clean daylight";
  }
  return "premium minimal studio or modern lifestyle interior";
}

function planVisualForRole(
  role: PlannedScene["role"],
  script: ReelScript,
  product: PlannerProduct,
  scene: ReelScene,
  index: number
): SceneVisualPlan {
  const audience = script.audience ?? "target audience";
  const pain = script.pain ?? script.angle ?? "customer pain point";
  const angle = script.angle ?? "";
  const brief = scene.visualBrief?.trim() ?? "";
  const bg = defaultBackground(script, product);

  if (role === "hook") {
    const prompt = [
      `Vertical 9:16 scroll-stopping opening frame for ${product.title}.`,
      `Audience: ${audience}. Angle: ${angle || pain}.`,
      brief || "Strong context or subtle product presence, premium commercial mood.",
      "Composition: large visual interest with clean empty space at top for headline.",
      "Camera: wide establishing shot.",
      "Product: subtle or lower third, not dominating.",
      NO_TEXT_RULES,
    ].join(" ");
    return {
      sceneType: "problem_context",
      composition: "top_text_space",
      camera: "wide",
      background: bg,
      productPlacement: "subtle_or_absent",
      mood: "scroll-stopping but premium",
      prompt,
    };
  }

  if (role === "pain") {
    const prompt = [
      `Vertical 9:16 pain recognition scene without product focus.`,
      `Pain: ${pain}. Audience: ${audience}.`,
      brief || `Everyday situation where the pain is felt — ${bg}.`,
      "Composition: environmental context, empty center/top for text, minimal or no product.",
      "Camera: medium shot, relatable space.",
      "Warm or slightly uncomfortable atmosphere suggesting the problem.",
      NO_TEXT_RULES,
    ].join(" ");
    return {
      sceneType: "problem_context",
      composition: "center_empty_space",
      camera: "medium",
      background: brief || `place where the pain happens — ${bg}`,
      productPlacement: "none_or_small",
      mood: "recognizable everyday problem",
      prompt,
    };
  }

  if (role === "proof") {
    const prompt = [
      `Vertical 9:16 proof scene for ${product.title}.`,
      `Show why the product solves: ${angle || pain}.`,
      brief || "Product as solution, detail or install format visible, expert trustworthy mood.",
      "Composition: product on right third, clean space on left for bullet panel overlay.",
      "Camera: close-up or medium on product detail.",
      "Lighting: soft premium, realistic proportions.",
      NO_TEXT_RULES,
    ].join(" ");
    return {
      sceneType: "detail_macro",
      composition: "right_product_left_bullets",
      camera: "close_up",
      background: `clean premium interior — ${bg}`,
      productPlacement: "right_third",
      mood: "expert and trustworthy",
      prompt,
    };
  }

  const prompt = [
    `Vertical 9:16 final CTA hero frame for ${product.title}.`,
    brief || "Cleanest premium product hero, minimal background, maximum clarity.",
    "Composition: product centered in lower two-thirds, large empty safe zone at bottom for CTA button.",
    "Camera: low angle hero shot.",
    "Most polished and minimal frame of the series.",
    NO_TEXT_RULES,
  ].join(" ");
  return {
    sceneType: "product_hero",
    composition: "bottom_cta_space",
    camera: "low_angle",
    background: `clean studio or premium interior — ${bg}`,
    productPlacement: "center",
    mood: "premium final frame",
    prompt,
  };
}

function planOverlayForRole(
  role: PlannedScene["role"],
  scene: ReelScene,
  script: ReelScript
): SceneOverlayPlan {
  const headline = (scene.headline ?? scene.text ?? "").trim();
  const motion = scene.motion ?? "slow_zoom";
  const animation =
    motion === "button_pop"
      ? "type_pop"
      : motion === "push_in"
        ? "slide_up"
        : motion === "product_reveal"
          ? "fade_up"
          : "punch_in";

  if (role === "hook") {
    return {
      headline,
      subheadline: scene.subheadline,
      layout: "hook_top",
      animation,
    };
  }
  if (role === "pain") {
    return {
      headline,
      subheadline: scene.subheadline,
      layout: "pain_center",
      animation,
    };
  }
  if (role === "proof") {
    return {
      headline,
      subheadline: scene.subheadline,
      bullets: scene.bullets?.slice(0, 2),
      layout: "proof_bullets",
      animation,
    };
  }
  return {
    headline,
    subheadline: scene.subheadline,
    buttonText: scene.buttonText ?? script.ctaText,
    layout: "cta_button",
    animation,
  };
}

export function planSceneVisuals(
  script: ReelScript,
  product: PlannerProduct
): PlannedScene[] {
  const scenes = script.scenes.slice(0, 4);
  return scenes.map((scene, index) => {
    const role = roleOf(scene, index);
    const duration = scene.duration ?? [3.5, 3.5, 4.2, 3.8][index] ?? 3.75;
    return {
      id: `scene_${index + 1}`,
      role,
      duration,
      visual: planVisualForRole(role, script, product, scene, index),
      overlay: planOverlayForRole(role, scene, script),
    };
  });
}

export function validateVisualDiversity(plans: PlannedScene[]): string[] {
  const issues: string[] = [];
  if (plans.length < 4) issues.push("missing_scenes");

  const types = plans.map((p) => p.visual.sceneType);
  const cameras = plans.map((p) => p.visual.camera);
  const placements = plans.map((p) => p.visual.productPlacement);
  const prompts = plans.map((p) => p.visual.prompt);

  if (new Set(types).size < 3) issues.push("low_visual_type_diversity");
  if (new Set(cameras).size < 3) issues.push("low_camera_diversity");
  if (new Set(placements).size < 3) issues.push("low_placement_diversity");
  if (new Set(prompts).size < 4) issues.push("duplicate_image_prompts");

  const contextCount = types.filter((t) => t === "problem_context").length;
  const heroCount = types.filter((t) => t === "product_hero" || t === "detail_macro").length;
  if (contextCount < 1) issues.push("missing_context_scene");
  if (heroCount < 1) issues.push("missing_proof_or_hero_scene");

  for (const prompt of prompts) {
    if (/headline|buttonText|bullet|CTA|На сайт/i.test(prompt)) {
      issues.push("text_in_image_prompt");
    }
    if (!/NO letters|NO words|NO text/i.test(prompt)) {
      issues.push("missing_no_text_rule");
    }
  }

  return issues;
}

export function buildImagePromptFromPlan(
  plan: PlannedScene,
  product: PlannerProduct,
  sceneIndex: number
): string {
  const v = plan.visual;
  return [
    "You are creating a vertical 9:16 visual background for a modern product Reel.",
    "",
    `This is scene ${sceneIndex + 1} of 4.`,
    `Scene role: ${plan.role}.`,
    `Scene visual type: ${v.sceneType}.`,
    "",
    "Create ONLY the visual scene.",
    NO_TEXT_RULES,
    "",
    `Product: ${product.title}`,
    product.brand ? `Brand: ${product.brand}` : "",
    "",
    "Use the product reference image accurately.",
    "Keep the product realistic and proportional.",
    "Do not distort the product.",
    "Do not invent labels or extra branding.",
    "",
    `Composition: ${v.composition}`,
    `Camera: ${v.camera}`,
    `Product placement: ${v.productPlacement}`,
    `Background: ${v.background}`,
    `Mood: ${v.mood}`,
    "",
    v.prompt,
    "",
    "Style: premium minimal, modern, clean, realistic, mobile-first, high-end advertising, soft shadows, cinematic but not dramatic, not a marketplace banner, not a poster.",
    "Leave clean negative space for overlay text.",
    "Respect safe zones for vertical video.",
    "",
    "Negative: low quality, distorted product, extra objects, fake text, watermark, random letters, cluttered background, oversaturated colors, cartoon style, ugly poster, marketplace banner.",
  ]
    .filter(Boolean)
    .join("\n");
}
