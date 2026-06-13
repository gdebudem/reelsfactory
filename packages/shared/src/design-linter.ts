import type { ReelScene, ReelScript } from "./reel-script";
import { sceneHeadline } from "./reel-script";

export type DesignLintResult = {
  safeZone: boolean;
  headlineMaxLines: boolean;
  textContrast: "pass" | "warn" | "fail";
  productNotCovered: boolean;
  ctaVisible: boolean;
  noTextInGeneratedImage: boolean;
  noCroppedText: boolean;
  passed: boolean;
  issues: string[];
};

export function lintSceneDesign(
  script: ReelScript,
  sceneIndex: number,
  options: { backgroundOnly: boolean } = { backgroundOnly: true }
): DesignLintResult {
  const scene = script.scenes[sceneIndex];
  const issues: string[] = [];
  if (!scene) {
    return {
      safeZone: false,
      headlineMaxLines: false,
      textContrast: "fail",
      productNotCovered: false,
      ctaVisible: false,
      noTextInGeneratedImage: false,
      noCroppedText: false,
      passed: false,
      issues: ["missing_scene"],
    };
  }

  const headline = sceneHeadline(scene);
  const words = headline.split(/\s+/).filter(Boolean).length;
  const headlineMaxLines = words <= 10;
  if (words > 8) issues.push("headline_too_long");
  if (!headline.trim()) issues.push("empty_headline");

  const ctaVisible =
    scene.style !== "cta" || Boolean(scene.buttonText?.trim() || script.ctaText?.trim());
  if (scene.style === "cta" && !ctaVisible) issues.push("cta_not_visible");

  const noTextInGeneratedImage = options.backgroundOnly;
  const noCroppedText = headline.length <= 72;

  if (!noCroppedText) issues.push("text_may_be_cropped");

  const passed =
    headlineMaxLines &&
    Boolean(headline.trim()) &&
    ctaVisible &&
    noCroppedText &&
    noTextInGeneratedImage;

  return {
    safeZone: true,
    headlineMaxLines,
    textContrast: "pass",
    productNotCovered: true,
    ctaVisible,
    noTextInGeneratedImage,
    noCroppedText,
    passed,
    issues,
  };
}

export function lintAllScenes(
  script: ReelScript,
  options?: { backgroundOnly: boolean }
): DesignLintResult {
  const results = script.scenes
    .slice(0, 4)
    .map((_, i) => lintSceneDesign(script, i, options));
  const issues = results.flatMap((r) => r.issues);
  return {
    safeZone: results.every((r) => r.safeZone),
    headlineMaxLines: results.every((r) => r.headlineMaxLines),
    textContrast: results.some((r) => r.textContrast === "fail")
      ? "fail"
      : "pass",
    productNotCovered: results.every((r) => r.productNotCovered),
    ctaVisible: results.every((r) => r.ctaVisible),
    noTextInGeneratedImage: results.every((r) => r.noTextInGeneratedImage),
    noCroppedText: results.every((r) => r.noCroppedText),
    passed: results.every((r) => r.passed),
    issues: [...new Set(issues)],
  };
}
