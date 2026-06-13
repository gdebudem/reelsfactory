import type { ProductCard, PromptOverrides, ReelScript } from "@reels-factory/shared";
import {
  buildImagePromptFromPlan,
  planSceneVisuals,
  type PlannedScene,
} from "@reels-factory/shared";

export type { PlannedScene };

export function buildSceneImagePrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number,
  _overrides?: PromptOverrides,
  planned?: PlannedScene
): string {
  const plans = planned ? [planned] : planSceneVisuals(script, product);
  const plan = planned ?? plans[sceneIndex];
  if (!plan) {
    throw new Error(`Missing visual plan for scene ${sceneIndex}`);
  }
  return buildImagePromptFromPlan(plan, product, sceneIndex);
}

export function buildReferenceEditPrompt(
  product: ProductCard,
  script: ReelScript,
  scene: ReelScript["scenes"][number],
  sceneIndex: number,
  overrides?: PromptOverrides,
  planned?: PlannedScene
): string {
  const base = buildSceneImagePrompt(
    product,
    script,
    scene,
    sceneIndex,
    overrides,
    planned
  );
  return [
    "Edit the reference product photo into a new scene. Preserve product shape and branding.",
    "Change only environment, lighting, camera, and composition.",
    base,
  ].join("\n");
}

/** @deprecated use planSceneVisuals diversity instead */
export function buildVisualSeriesBrief(
  _script: ReelScript,
  _product: ProductCard,
  _overrides?: PromptOverrides
): string {
  return "VISUAL SERIES: each of 4 frames must have a DIFFERENT role, camera, and composition. Same premium color grade only. NO TEXT on any frame.";
}
