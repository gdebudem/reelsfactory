import { z } from "zod";

export const sceneMotionSchema = z.enum([
  "slow_zoom",
  "push_in",
  "product_reveal",
  "button_pop",
  "punch_in",
]);

export const voiceoverStyleSchema = z.enum([
  "calm_confident",
  "energetic",
  "expert",
]);

export const reelTemplateIdSchema = z.enum([
  "minimal_product_reel_v2",
  "problem_solution_v1",
  "expert_pick_v1",
  "marketplace_clean_v1",
  "native_tiktok_v1",
  "viral_v1",
  "promo",
  "features",
]);

export const sceneStyleSchema = z.enum([
  "headline",
  "subheadline",
  "bullet",
  "review",
  "cta",
  "hook",
  "pain",
  "proof",
]);

export const musicMoodSchema = z.enum(["energetic", "trust", "premium"]);

export const reelSceneSchema = z.object({
  style: sceneStyleSchema,
  duration: z.number().positive().optional(),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  visualBrief: z.string().optional(),
  motion: sceneMotionSchema.optional(),
  imageIndex: z.number().int().min(0).max(4).optional(),
  bullets: z.array(z.string()).optional(),
  buttonText: z.string().optional(),
  /** @deprecated legacy v1 */
  startSec: z.number().optional(),
  endSec: z.number().optional(),
  text: z.string().optional(),
  emphasis: z.string().optional(),
});

export type ReelScene = z.infer<typeof reelSceneSchema>;

export const creativeQualityScoreSchema = z.object({
  hookScore: z.number(),
  audienceSpecificity: z.number(),
  visualCleanliness: z.number(),
  textReadability: z.number(),
  proofStrength: z.number(),
  ctaClarity: z.number(),
  riskFlags: z.array(z.string()),
  needsRegeneration: z.boolean(),
});

export const reelScriptSchema = z.object({
  templateId: reelTemplateIdSchema.default("minimal_product_reel_v2"),
  audience: z.string().optional(),
  pain: z.string().optional(),
  desire: z.string().optional(),
  angle: z.string().optional(),
  creativeMechanic: z.string().optional(),
  musicMood: musicMoodSchema.optional(),
  musicTrackId: z.string().optional(),
  voiceoverStyle: voiceoverStyleSchema.optional(),
  scenes: z.array(reelSceneSchema).min(1),
  /** legacy top-level fields */
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  priceLabel: z.string().optional(),
  ctaText: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  reviewQuote: z.string().optional(),
  qualityScore: creativeQualityScoreSchema.optional(),
});

export type ReelScript = z.infer<typeof reelScriptSchema>;

const SCENE_STYLES_V2 = ["hook", "pain", "proof", "cta"] as const;
const DEFAULT_DURATIONS = [3.5, 3.5, 4, 4];
const DEFAULT_MOTIONS = [
  "punch_in",
  "push_in",
  "product_reveal",
  "button_pop",
] as const;

export function sceneHeadline(scene: ReelScene): string {
  return (scene.headline ?? scene.text ?? "").trim();
}

export function sceneDuration(scene: ReelScene, index: number): number {
  return scene.duration ?? DEFAULT_DURATIONS[index] ?? 3.75;
}

export function sceneVisualBrief(scene: ReelScene): string {
  return (
    scene.visualBrief?.trim() ||
    `Premium minimal product scene for ${scene.style}, clean negative space, no text`
  );
}

export function isV2Script(script: ReelScript | null | undefined): boolean {
  if (!script) return false;
  if (
    script.templateId === "minimal_product_reel_v2" ||
    script.templateId === "problem_solution_v1" ||
    script.templateId === "expert_pick_v1" ||
    script.templateId === "marketplace_clean_v1" ||
    script.templateId === "native_tiktok_v1"
  ) {
    return script.scenes.length >= 4;
  }
  return Boolean(
    script.audience &&
      script.scenes.length >= 4 &&
      script.scenes.some((s) => s.headline || s.visualBrief)
  );
}

export function isViralScript(script: ReelScript | null | undefined): boolean {
  if (!script) return false;
  if (isV2Script(script)) return true;
  if (script.templateId === "viral_v1" && script.scenes.length >= 4) {
    const styles = new Set(script.scenes.map((s) => s.style));
    return (
      styles.has("hook") ||
      styles.has("pain") ||
      styles.has("proof") ||
      script.scenes.some((s) => s.imageIndex != null)
    );
  }
  return false;
}

export function shouldRegenerateScript(
  script: ReelScript | null | undefined
): boolean {
  return !isViralScript(script);
}

/** Normalize GPT output or legacy script to v2 4-scene structure. */
export function normalizeReelScript(raw: ReelScript): ReelScript {
  let t = 0;
  const scenes = SCENE_STYLES_V2.map((style, i) => {
    const src = raw.scenes[i] ?? raw.scenes.find((s) => s.style === style);
    const dur = src?.duration ?? DEFAULT_DURATIONS[i]!;
    const startSec = t;
    t += dur;
    return {
      style,
      duration: dur,
      startSec,
      endSec: t,
      headline:
        src?.headline ??
        src?.text ??
        (i === 0 ? raw.headline : undefined) ??
        "",
      subheadline: src?.subheadline ?? (i === 0 ? raw.subheadline : undefined),
      visualBrief: src?.visualBrief,
      motion: src?.motion ?? DEFAULT_MOTIONS[i],
      imageIndex: src?.imageIndex ?? i,
      bullets: src?.bullets ?? (i === 2 ? raw.bullets : undefined),
      buttonText:
        src?.buttonText ??
        (i === 3 ? raw.ctaText : undefined),
      text: src?.headline ?? src?.text,
      emphasis: src?.emphasis,
    };
  });

  return reelScriptSchema.parse({
    ...raw,
    templateId: raw.templateId ?? "minimal_product_reel_v2",
    audience: raw.audience ?? "",
    pain: raw.pain ?? "",
    desire: raw.desire ?? "",
    angle: raw.angle ?? "",
    creativeMechanic: raw.creativeMechanic ?? "узнавание боли",
    musicMood: raw.musicMood ?? "trust",
    musicTrackId: raw.musicTrackId ?? "steady_groove",
    headline: raw.headline ?? sceneHeadline(scenes[0]!),
    subheadline: raw.subheadline ?? scenes[0]?.subheadline,
    ctaText:
      raw.ctaText ??
      scenes[3]?.buttonText ??
      "Смотреть характеристики",
    scenes,
  });
}

export const BANNED_CTA_PHRASES = ["На сайт", "Покупай скорее", "Успей купить"];

export function sanitizeCtaText(text: string): string {
  const t = text.trim();
  if (BANNED_CTA_PHRASES.some((b) => t.toLowerCase() === b.toLowerCase()))
    return "Смотреть характеристики";
  return t;
}
