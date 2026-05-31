/**
 * Local smoke test: npm run test:ffmpeg
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildViralMockScript } from "@reels-factory/ai-script";

process.env.RENDER_ENGINE = "ffmpeg";
delete process.env.RAILWAY_ENVIRONMENT;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, "../.render-output/test-ffmpeg.mp4");

const product = {
  title: "Автомобильный компрессор X200",
  price: 4990,
  currency: "RUB",
  images: [
    "https://placehold.co/600x800/312e81/ffffff/png?text=1",
    "https://placehold.co/600x800/4338ca/ffffff/png?text=2",
    "https://placehold.co/600x800/6366f1/ffffff/png?text=3",
    "https://placehold.co/600x800/818cf8/ffffff/png?text=4",
  ],
  sourceUrl: "https://example.com/product",
  brand: "Rubin",
  specs: [
    { name: "Мощность", value: "120 Вт" },
    { name: "Давление", value: "до 7 бар" },
    { name: "Производительность", value: "35 л/мин" },
  ],
  reviews: [
    {
      text: "Отличный компрессор, накачивает колесо за минуту. Тихий и компактный.",
      rating: 5,
      author: "Иван",
    },
  ],
  prosFromPage: ["Компактный размер", "LED-подсветка"],
};

const script = buildViralMockScript({
  product,
  reelType: "features",
  highlights: ["надёжность"],
  ctaType: "website",
  tier: "basic",
});

async function main() {
  const { renderReelWithFfmpeg } = await import("../src/renderFfmpeg.js");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log("Scenes:", script.scenes.length, "Bullets:", script.bullets?.length);
  console.log("Rendering to", out);
  await renderReelWithFfmpeg("test-local", product, script, out);
  const stat = fs.statSync(out);
  console.log("OK:", out, stat.size, "bytes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
