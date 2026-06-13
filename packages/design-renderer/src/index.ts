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

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

function headlineFontSize(
  role: string,
  lineCount: number,
  longestLine: number,
  wordCnt: number
): number {
  const { maxFontSize, minFontSize } = DESIGN_TOKENS.headline;
  const limit = role === "proof" ? 10 : 8;
  if (wordCnt > limit || longestLine > 30 || lineCount > 2) return minFontSize;
  if (longestLine > 22) return 44;
  if (role === "cta") return 52;
  return maxFontSize;
}

function buildOverlaySvg(script: ReelScript, scene: ReelScene): string {
  const w = DESIGN_TOKENS.canvas.width;
  const h = DESIGN_TOKENS.canvas.height;
  const layout = layoutForScene(script, scene);
  const role = scene.style ?? "hook";
  const headlineRaw = sceneHeadline(scene);
  const headline = escapeXml(headlineRaw);
  const sub = scene.subheadline?.trim()
    ? escapeXml(scene.subheadline.trim())
    : "";
  const maxChars = role === "proof" ? 26 : 22;
  const lines = wrapLines(headlineRaw, maxChars, DESIGN_TOKENS.headline.maxLines);
  const fontSize = headlineFontSize(
    role,
    lines.length,
    Math.max(...lines.map((l) => l.length), 0),
    wordCount(headlineRaw)
  );
  const lineHeight = Math.round(fontSize * DESIGN_TOKENS.headline.lineHeight);
  const anchor = layout.headlineAlign === "middle" ? "middle" : "start";
  const x =
    layout.headlineAlign === "middle" ? w / 2 : layout.headlineX;

  const headlineTspans = lines
    .map((line, i) => {
      const dy = i === 0 ? 0 : lineHeight;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  let subBlock = "";
  if (sub && layout.subheadlineY) {
    subBlock = `<text x="${layout.headlineX}" y="${layout.subheadlineY + DESIGN_TOKENS.subheadline.fontSize}" font-family="${DESIGN_TOKENS.fonts.body}" font-size="${DESIGN_TOKENS.subheadline.fontSize}" font-weight="500" fill="${DESIGN_TOKENS.colors.subheadline}">${sub}</text>`;
  }

  let bulletsBlock = "";
  if (scene.bullets?.length && layout.bulletsY && role === "proof") {
    const panelX = layout.bulletsX ?? DESIGN_TOKENS.canvas.safeSide;
    const panelY = layout.bulletsY - 24;
    const panelW = Math.floor(w * 0.48);
    const panelH = 24 + scene.bullets.slice(0, 2).length * 48;
    const panel = layout.bulletsPanel
      ? `<rect x="${panelX - 16}" y="${panelY}" width="${panelW}" height="${panelH}" rx="${DESIGN_TOKENS.radii.card}" fill="${DESIGN_TOKENS.colors.panelDark}"/>`
      : "";
    const items = scene.bullets.slice(0, 2).map((b, i) => {
      const by = layout.bulletsY! + i * 44;
      return `<text x="${panelX + 8}" y="${by}" font-family="${DESIGN_TOKENS.fonts.body}" font-size="26" font-weight="500" fill="${DESIGN_TOKENS.colors.bullet}">• ${escapeXml(b)}</text>`;
    });
    bulletsBlock = panel + items.join("");
  }

  let buttonBlock = "";
  if (layout.showButton && role === "cta") {
    const btnText = escapeXml(
      sanitizeCtaText(scene.buttonText ?? script.ctaText ?? "Смотреть")
    );
    const btnW = Math.min(440, Math.max(260, btnText.length * 17 + 88));
    const btnX = (w - btnW) / 2;
    const btnY = layout.buttonY ?? h - DESIGN_TOKENS.canvas.safeBottom;
    buttonBlock = `
      <rect x="${btnX}" y="${btnY}" width="${btnW}" height="${DESIGN_TOKENS.button.height}" rx="${DESIGN_TOKENS.radii.button}" fill="${DESIGN_TOKENS.colors.buttonBg}"/>
      <text x="${w / 2}" y="${btnY + DESIGN_TOKENS.button.height / 2 + 9}" text-anchor="middle" font-family="${DESIGN_TOKENS.fonts.button}" font-size="${DESIGN_TOKENS.button.fontSize}" font-weight="700" fill="${DESIGN_TOKENS.colors.buttonText}">${btnText}</text>`;
  }

  const gradient = `
    <defs>
      <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${DESIGN_TOKENS.colors.textDark}" stop-opacity="0.62"/>
        <stop offset="50%" stop-color="${DESIGN_TOKENS.colors.textDark}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" stop-color="${DESIGN_TOKENS.colors.textDark}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${DESIGN_TOKENS.colors.textDark}" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    ${layout.showTopGradient ? `<rect width="${w}" height="${h * 0.32}" fill="url(#topFade)"/>` : ""}
    ${layout.showBottomGradient ? `<rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="url(#bottomFade)"/>` : ""}
  `;

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${gradient}
    <text text-anchor="${anchor}" x="${x}" y="${layout.headlineY + fontSize}" font-family="${DESIGN_TOKENS.fonts.headline}" font-size="${fontSize}" font-weight="800" fill="${DESIGN_TOKENS.colors.headline}">
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
  const layout = layoutForScene(script, scene);
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
export { TEMPLATE_LAYOUTS, ROLE_LAYOUTS, getTemplateLayout } from "./templates";
