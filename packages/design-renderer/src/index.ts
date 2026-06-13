import sharp from "sharp";
import type { ReelScene, ReelScript } from "@reels-factory/shared";
import { sceneHeadline, sanitizeCtaText } from "@reels-factory/shared";
import { DESIGN_TOKENS } from "./tokens";
import { layoutForScene } from "./templates";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

function headlineFontSize(lineCount: number, longestLine: number): number {
  const { maxFontSize, minFontSize } = DESIGN_TOKENS.headline;
  if (longestLine > 28 || lineCount > 2) return minFontSize;
  if (longestLine > 20) return 48;
  return maxFontSize;
}

function buildOverlaySvg(script: ReelScript, scene: ReelScene): string {
  const w = DESIGN_TOKENS.canvas.width;
  const h = DESIGN_TOKENS.canvas.height;
  const layout = layoutForScene(script, scene);
  const headline = escapeXml(sceneHeadline(scene));
  const sub = scene.subheadline?.trim()
    ? escapeXml(scene.subheadline.trim())
    : "";
  const lines = wrapLines(headline, 22, DESIGN_TOKENS.headline.maxLines);
  const fontSize = headlineFontSize(lines.length, Math.max(...lines.map((l) => l.length), 0));
  const lineHeight = Math.round(fontSize * DESIGN_TOKENS.headline.lineHeight);
  const x = DESIGN_TOKENS.canvas.safeSide;
  let y = layout.headlineY + fontSize;

  const headlineTspans = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  let subBlock = "";
  if (sub && layout.subheadlineY) {
    subBlock = `<text x="${x}" y="${layout.subheadlineY + DESIGN_TOKENS.subheadline.fontSize}" font-family="${DESIGN_TOKENS.fonts.body}" font-size="${DESIGN_TOKENS.subheadline.fontSize}" font-weight="500" fill="${DESIGN_TOKENS.colors.subheadline}">${sub}</text>`;
  }

  let bulletsBlock = "";
  if (scene.bullets?.length && layout.bulletsY) {
    const items = scene.bullets.slice(0, 3);
    bulletsBlock = items
      .map((b, i) => {
        const by = layout.bulletsY! + i * 44;
        return `<text x="${x + 24}" y="${by}" font-family="${DESIGN_TOKENS.fonts.body}" font-size="26" font-weight="500" fill="${DESIGN_TOKENS.colors.bullet}">• ${escapeXml(b)}</text>`;
      })
      .join("");
  }

  let buttonBlock = "";
  if (layout.showButton) {
    const btnText = escapeXml(
      sanitizeCtaText(scene.buttonText ?? script.ctaText ?? "Смотреть")
    );
    const btnW = Math.min(420, Math.max(240, btnText.length * 18 + 80));
    const btnX = (w - btnW) / 2;
    const btnY = layout.buttonY ?? h - DESIGN_TOKENS.canvas.safeBottom;
    buttonBlock = `
      <rect x="${btnX}" y="${btnY}" width="${btnW}" height="${DESIGN_TOKENS.button.height}" rx="${DESIGN_TOKENS.button.radius}" fill="${DESIGN_TOKENS.colors.buttonBg}"/>
      <text x="${w / 2}" y="${btnY + DESIGN_TOKENS.button.height / 2 + 10}" text-anchor="middle" font-family="${DESIGN_TOKENS.fonts.button}" font-size="${DESIGN_TOKENS.button.fontSize}" font-weight="700" fill="${DESIGN_TOKENS.colors.buttonText}">${btnText}</text>`;
  }

  const gradient = `
    <defs>
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${DESIGN_TOKENS.colors.dark}" stop-opacity="0.55"/>
        <stop offset="45%" stop-color="${DESIGN_TOKENS.colors.dark}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" stop-color="${DESIGN_TOKENS.colors.dark}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${DESIGN_TOKENS.colors.dark}" stop-opacity="0.65"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h * 0.35}" fill="url(#topFade)"/>
    <rect y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="url(#bottomFade)"/>
  `;

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${gradient}
    <text font-family="${DESIGN_TOKENS.fonts.headline}" font-size="${fontSize}" font-weight="800" fill="${DESIGN_TOKENS.colors.headline}">
      ${headlineTspans}
    </text>
    ${subBlock}
    ${bulletsBlock}
    ${buttonBlock}
  </svg>`;
}

export async function compositeSceneWithDesign(
  backgroundBuffer: Buffer,
  script: ReelScript,
  sceneIndex: number
): Promise<Buffer> {
  const scene = script.scenes[sceneIndex];
  if (!scene) throw new Error(`Scene ${sceneIndex} missing`);

  const { width, height } = DESIGN_TOKENS.canvas;
  const resized = await sharp(backgroundBuffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const svg = Buffer.from(buildOverlaySvg(script, scene));
  return sharp(resized)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export { DESIGN_TOKENS } from "./tokens";
export { TEMPLATE_LAYOUTS, getTemplateLayout } from "./templates";
