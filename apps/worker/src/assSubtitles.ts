import type { ReelScript } from "@reels-factory/shared";
import { sceneDuration, sceneHeadline } from "@reels-factory/shared";

const OUT_W = 720;
const OUT_H = 1280;

const STYLE_BY_SCENE: Record<
  string,
  { fontSize: number; color: string; align: number; marginV: number }
> = {
  hook: { fontSize: 44, color: "&H00FFFFFF", align: 8, marginV: 200 },
  pain: { fontSize: 36, color: "&H00C4B5FD", align: 8, marginV: 220 },
  proof: { fontSize: 34, color: "&H00B8E6FF", align: 8, marginV: 220 },
  cta: { fontSize: 40, color: "&H00FFFFFF", align: 2, marginV: 140 },
  headline: { fontSize: 44, color: "&H00FFFFFF", align: 8, marginV: 200 },
  bullet: { fontSize: 32, color: "&H00FFFFFF", align: 8, marginV: 240 },
  review: { fontSize: 28, color: "&H00B8E6FF", align: 2, marginV: 160 },
  subheadline: { fontSize: 30, color: "&H00C4B5FD", align: 8, marginV: 220 },
};

function secToAss(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/\{/g, "\\{");
}

export function buildAssSubtitles(
  script: ReelScript,
  fontFamily = "Noto Sans"
): string {
  const scenes =
    script.scenes.length >= 4
      ? script.scenes.slice(0, 4)
      : script.scenes;

  const styles = Object.entries(STYLE_BY_SCENE)
    .map(([name, cfg]) => {
      return `Style: ${name},${fontFamily},${cfg.fontSize},${cfg.color},&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,5,3,${cfg.align},80,80,${cfg.marginV},1`;
    })
    .join("\n");

  let timeline = 0;
  const dialogues = scenes
    .filter((scene) => sceneHeadline(scene).trim())
    .map((scene, index) => {
      const style = scene.style ?? "subheadline";
      const cfg = STYLE_BY_SCENE[style] ?? STYLE_BY_SCENE.subheadline!;
      const dur = sceneDuration(scene, index);
      const start = scene.startSec ?? timeline;
      const end = scene.endSec ?? start + dur;
      timeline = end;
      const startAss = secToAss(start);
      const endAss = secToAss(end);
      const text = escapeAss(sceneHeadline(scene).trim().slice(0, 90));
      const fadeIn = 250;
      const fadeOut = 200;
      const centerX = OUT_W / 2;
      const moveY =
        cfg.align === 2 ? OUT_H - cfg.marginV : cfg.marginV + 40;
      const tags = `{\\fad(${fadeIn},${fadeOut})}{\\move(${centerX},${moveY + 36},${centerX},${moveY},0,400)}`;
      return `Dialogue: 0,${startAss},${endAss},${style},,0,0,0,,${tags}${text}`;
    })
    .join("\n");

  return `[Script Info]
Title: Reels Factory
ScriptType: v4.00+
PlayResX: ${OUT_W}
PlayResY: ${OUT_H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues}
`;
}
