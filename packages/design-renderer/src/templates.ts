import type { ReelScene, ReelScript } from "@reels-factory/shared";
import { DESIGN_TOKENS } from "./tokens";

export type TemplateLayout = {
  id: string;
  headlineY: number;
  headlineMaxWidth: number;
  subheadlineY?: number;
  productZone: { y: number; height: number };
  bulletsY?: number;
  buttonY?: number;
  showButton: boolean;
};

export const TEMPLATE_LAYOUTS: Record<string, TemplateLayout> = {
  minimal_product_reel_v2: {
    id: "minimal_product_reel_v2",
    headlineY: DESIGN_TOKENS.canvas.safeTop,
    headlineMaxWidth: DESIGN_TOKENS.canvas.width - DESIGN_TOKENS.canvas.safeSide * 2,
    subheadlineY: DESIGN_TOKENS.canvas.safeTop + 140,
    productZone: { y: 520, height: 900 },
    buttonY: DESIGN_TOKENS.canvas.height - DESIGN_TOKENS.canvas.safeBottom - 20,
    showButton: false,
  },
  problem_solution_v1: {
    id: "problem_solution_v1",
    headlineY: DESIGN_TOKENS.canvas.safeTop,
    headlineMaxWidth: DESIGN_TOKENS.canvas.width - DESIGN_TOKENS.canvas.safeSide * 2,
    subheadlineY: DESIGN_TOKENS.canvas.safeTop + 130,
    productZone: { y: 480, height: 950 },
    buttonY: DESIGN_TOKENS.canvas.height - DESIGN_TOKENS.canvas.safeBottom,
    showButton: false,
  },
  expert_pick_v1: {
    id: "expert_pick_v1",
    headlineY: DESIGN_TOKENS.canvas.safeTop,
    headlineMaxWidth: DESIGN_TOKENS.canvas.width - DESIGN_TOKENS.canvas.safeSide * 2,
    subheadlineY: DESIGN_TOKENS.canvas.safeTop + 120,
    productZone: { y: 500, height: 700 },
    bulletsY: 1280,
    buttonY: DESIGN_TOKENS.canvas.height - DESIGN_TOKENS.canvas.safeBottom,
    showButton: false,
  },
  marketplace_clean_v1: {
    id: "marketplace_clean_v1",
    headlineY: DESIGN_TOKENS.canvas.safeTop + 20,
    headlineMaxWidth: DESIGN_TOKENS.canvas.width - DESIGN_TOKENS.canvas.safeSide * 2,
    productZone: { y: 400, height: 1000 },
    bulletsY: 1450,
    buttonY: DESIGN_TOKENS.canvas.height - DESIGN_TOKENS.canvas.safeBottom,
    showButton: false,
  },
};

export function getTemplateLayout(script: ReelScript): TemplateLayout {
  const id = script.templateId ?? "minimal_product_reel_v2";
  const base = TEMPLATE_LAYOUTS[id] ?? TEMPLATE_LAYOUTS.minimal_product_reel_v2;
  return {
    ...base,
    showButton: base.showButton,
  };
}

export function layoutForScene(
  script: ReelScript,
  scene: ReelScene
): TemplateLayout & { showButton: boolean } {
  const layout = getTemplateLayout(script);
  return {
    ...layout,
    showButton: scene.style === "cta",
  };
}
