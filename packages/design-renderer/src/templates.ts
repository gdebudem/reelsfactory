import type { ReelScene, ReelScript } from "@reels-factory/shared";
import { DESIGN_TOKENS } from "./tokens";

export type TemplateLayout = {
  id: string;
  headlineY: number;
  headlineX: number;
  headlineMaxWidth: number;
  headlineAlign: "start" | "middle";
  subheadlineY?: number;
  productZone: { y: number; height: number; x?: number; width?: number };
  bulletsY?: number;
  bulletsX?: number;
  bulletsPanel?: boolean;
  buttonY?: number;
  showButton: boolean;
  showTopGradient: boolean;
  showBottomGradient: boolean;
};

const BASE = DESIGN_TOKENS.canvas;

export const ROLE_LAYOUTS: Record<string, TemplateLayout> = {
  hook: {
    id: "hook",
    headlineY: BASE.safeTop,
    headlineX: BASE.safeSide,
    headlineMaxWidth: BASE.width - BASE.safeSide * 2,
    headlineAlign: "start",
    subheadlineY: BASE.safeTop + 130,
    productZone: { y: 720, height: 820, x: 0, width: BASE.width },
    showButton: false,
    showTopGradient: true,
    showBottomGradient: false,
  },
  pain: {
    id: "pain",
    headlineY: BASE.safeTop + 40,
    headlineX: BASE.safeSide,
    headlineMaxWidth: BASE.width - BASE.safeSide * 2,
    headlineAlign: "start",
    subheadlineY: BASE.safeTop + 170,
    productZone: { y: 1100, height: 400, x: BASE.width * 0.25, width: BASE.width * 0.5 },
    showButton: false,
    showTopGradient: true,
    showBottomGradient: true,
  },
  proof: {
    id: "proof",
    headlineY: BASE.safeTop,
    headlineX: BASE.safeSide,
    headlineMaxWidth: Math.floor(BASE.width * 0.52),
    headlineAlign: "start",
    subheadlineY: BASE.safeTop + 110,
    productZone: { y: 420, height: 1100, x: Math.floor(BASE.width * 0.42), width: Math.floor(BASE.width * 0.58) },
    bulletsY: 520,
    bulletsX: BASE.safeSide,
    bulletsPanel: true,
    showButton: false,
    showTopGradient: true,
    showBottomGradient: false,
  },
  cta: {
    id: "cta",
    headlineY: BASE.safeTop + 20,
    headlineX: BASE.safeSide,
    headlineMaxWidth: BASE.width - BASE.safeSide * 2,
    headlineAlign: "start",
    subheadlineY: BASE.safeTop + 140,
    productZone: { y: 480, height: 900, x: 0, width: BASE.width },
    buttonY: BASE.height - BASE.safeBottom - 16,
    showButton: true,
    showTopGradient: true,
    showBottomGradient: true,
  },
};

export const TEMPLATE_LAYOUTS: Record<string, Partial<TemplateLayout>> = {
  minimal_product_reel_v2: {},
  problem_solution_v1: {
    productZone: { y: 500, height: 950, x: 0, width: BASE.width },
  },
  expert_pick_v1: {
    headlineMaxWidth: BASE.width - BASE.safeSide * 2,
    bulletsPanel: true,
  },
  marketplace_clean_v1: {
    bulletsY: 1420,
    productZone: { y: 380, height: 1000, x: 0, width: BASE.width },
  },
  native_tiktok_v1: {
    headlineY: BASE.safeTop + 60,
    headlineX: BASE.safeSide + 8,
    headlineMaxWidth: BASE.width - BASE.safeSide * 2 - 16,
    bulletsPanel: true,
    showTopGradient: false,
    showBottomGradient: true,
  },
};

export function getTemplateLayout(script: ReelScript): TemplateLayout {
  const id = script.templateId ?? "minimal_product_reel_v2";
  return ROLE_LAYOUTS.hook!;
}

export function layoutForScene(
  script: ReelScript,
  scene: ReelScene
): TemplateLayout {
  const role = scene.style ?? "hook";
  const base = ROLE_LAYOUTS[role] ?? ROLE_LAYOUTS.hook!;
  const templateTweak = TEMPLATE_LAYOUTS[script.templateId ?? ""] ?? {};
  const merged: TemplateLayout = {
    ...base,
    ...templateTweak,
    productZone: { ...base.productZone, ...templateTweak.productZone },
    showButton: role === "cta",
  };
  return merged;
}
