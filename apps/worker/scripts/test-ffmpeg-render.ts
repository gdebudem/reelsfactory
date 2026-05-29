/**
 * Local smoke test: RENDER_ENGINE=ffmpeg npx tsx apps/worker/scripts/test-ffmpeg-render.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.RENDER_ENGINE = "ffmpeg";
delete process.env.RAILWAY_ENVIRONMENT;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, "../.render-output/test-ffmpeg.mp4");

const product = {
  title: "Test",
  price: 100,
  currency: "RUB",
  images: ["https://placehold.co/600x800/312e81/ffffff/png?text=Test"],
  sourceUrl: "https://example.com",
};

const script = {
  headline: "СУПЕРЦЕНА",
  subheadline: "Тест рендера",
  priceLabel: "9 990 ₽",
  ctaText: "Купить",
  templateId: "promo",
  scenes: [],
};

async function main() {
  const { renderReelWithFfmpeg } = await import("../src/renderFfmpeg.js");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log("Rendering to", out);
  await renderReelWithFfmpeg("test-local", product, script, out);
  const stat = fs.statSync(out);
  console.log("OK:", out, stat.size, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
