# Golden dataset — product URLs for manual QA

Use these URLs to verify parse → research → script → render quality after each release.

| # | URL | Platform | Expect |
|---|-----|----------|--------|
| 1 | https://tdrubin.com/catalog/... | Bitrix | ≥1 photo, specs via Playwright |
| 2 | https://rubinauto.ru/... | Bitrix/Woo | Multiple images |
| 3 | Ozon product page | Marketplace | External reviews in intel |
| 4 | WooCommerce demo store | Woo | Table specs |
| 5 | Simple landing with JSON-LD | Generic | Fast parse, no Playwright |

Replace `...` with real product URLs from your catalog.

## Viral quality checklist

Before release, confirm each test render:

- [ ] Hook appears within 1.5 sec, ≤ 8 words
- [ ] 4 visual scene changes with xfade transitions
- [ ] Background music audible, fades in/out cleanly
- [ ] Social proof on proof scene when intel found reviews
- [ ] CTA readable with price (if available)
- [ ] No fabricated specs — facts traceable to page or research sources
- [ ] Job page shows intel sources during/after processing

## Commands

```bash
# Generate music placeholders locally
bash apps/worker/scripts/generate-music.sh

# Test ffmpeg render (requires product + script JSON)
npm run test:ffmpeg
```
