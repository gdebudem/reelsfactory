import { existsSync } from "node:fs";

export type RenderFont = {
  sourcePath: string;
  fileName: string;
  family: string;
};

const FONT_CANDIDATES: RenderFont[] = [
  {
    sourcePath: "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    fileName: "NotoSans-Bold.ttf",
    family: "Noto Sans",
  },
  {
    sourcePath: "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    fileName: "LiberationSans-Bold.ttf",
    family: "Liberation Sans",
  },
  {
    sourcePath: "C:/Windows/Fonts/arialbd.ttf",
    fileName: "arialbd.ttf",
    family: "Arial",
  },
];

export function resolveRenderFont(): RenderFont {
  for (const font of FONT_CANDIDATES) {
    if (existsSync(font.sourcePath)) return font;
  }
  throw new Error(
    `No bold font for subtitles. Tried: ${FONT_CANDIDATES.map((f) => f.sourcePath).join(", ")}`
  );
}
