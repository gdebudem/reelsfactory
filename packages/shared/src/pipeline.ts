import type { ReelScript } from "@reels-factory/shared";

export const PIPELINE_VERSION = 3;

export function isViralScript(script: ReelScript | null | undefined): boolean {
  if (!script) return false;
  if (script.templateId !== "viral_v1") return false;
  if (script.scenes.length < 4) return false;
  const styles = new Set(script.scenes.map((s) => s.style));
  return (
    styles.has("hook") ||
    styles.has("pain") ||
    styles.has("proof") ||
    script.scenes.some((s) => s.imageIndex != null)
  );
}

export function shouldRegenerateScript(script: ReelScript | null | undefined): boolean {
  return !isViralScript(script);
}
