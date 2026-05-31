import type { ReelScript } from "@reels-factory/shared";

const OUT_W = 720;
const OUT_H = 1280;

const STYLE_BY_SCENE: Record<string, { fontSize: number; color: string; align: number }> = {
  hook: { fontSize: 44, color: "&H00FFFFFF", align: 8 },
  pain: { fontSize: 36, color: "&H00C4B5FD", align: 8 },
  proof: { fontSize: 34, color: "&H0068DEFD", align: 8 },
  cta: { fontSize: 38, color: "&H00312E81", align: 2 },
  headline: { fontSize: 44, color: "&H00FFFFFF", align: 8 },
  bullet: { fontSize: 32, color: "&H00FFFFFF", align: 8 },
  review: { fontSize: 28, color: "&H0068DEFD", align: 2 },
  subheadline: { fontSize: 30, color: "&H00C4B5FD", align: 8 },
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

export function buildAssSubtitles(script: ReelScript): string {
  const scenes =
    script.scenes.length >= 4
      ? script.scenes.slice(0, 4)
      : script.scenes;

  const styles = Object.entries(STYLE_BY_SCENE)
    .map(([name, cfg]) => {
      const marginV = name === "cta" ? 140 : 320;
      return `Style: ${name},Arial,${cfg.fontSize},${cfg.color},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,${cfg.align},80,80,${marginV},1`;
    })
    .join("\n");

  const dialogues = scenes
    .map((scene) => {
      const style = scene.style ?? "subheadline";
      const cfg = STYLE_BY_SCENE[style] ?? STYLE_BY_SCENE.subheadline!;
      const start = secToAss(scene.startSec);
      const end = secToAss(scene.endSec);
      const text = escapeAss(scene.text.slice(0, 90));
      const fadeIn = 250;
      const fadeOut = 200;
      const moveY = cfg.align === 2 ? 1100 : 900;
      const tags = `{\\fad(${fadeIn},${fadeOut})}{\\move(${OUT_W / 2},${moveY + 40},${OUT_W / 2},${moveY},0,400)}`;
      return `Dialogue: 0,${start},${end},${style},,0,0,0,,${tags}${text}`;
    })
    .join("\n");

  return `[Script Info]
Title: Reels Factory
ScriptType: v4.00+
PlayResX: ${OUT_W}
PlayResY: ${OUT_H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues}
`;
}
