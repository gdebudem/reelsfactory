# Deploy viral v2 pipeline

## Why the video looked the same

The v2 code was **only on your PC** — not pushed to GitHub. Production (Vercel + Railway) still ran the old pipeline: one photo, no music, old script.

## Steps after `git push`

### 1. Neon — new column

```bash
npm run db:push
```

Adds `productIntelJson` to `ReelJob`.

### 2. Railway worker — variables

| Variable | Required |
|----------|----------|
| `TAVILY_API_KEY` | Recommended — web search for reviews |
| `OPENAI_API_KEY` | Yes |
| `DATABASE_URL` | Yes |
| `S3_*` | Yes (R2) |

Redeploy worker (Docker rebuild ~5–10 min — Playwright + music).

### 3. Vercel — redeploy web

Auto on push to `main`.

### 4. Create a **new** reel

Old jobs in DB may have cached `scriptJson` with template `promo`. v2 worker now **regenerates** non-viral scripts automatically.

## How to verify in Railway logs

```text
[worker] Researching product for ... (tavily=on)
[worker] Intel: 5 selling points, 2 web snippets
[worker] Generating viral script ... (old template=promo)
[worker] Script: viral_v1, 4 scenes, mood=trust
[render:viral] ... music=steady_groove, scenes=4
```

If you see `music=NONE` — music files missing; worker runs `ensureMusicAssets()` on startup.

## Without Tavily

Pipeline still works using page specs/reviews only. Add `TAVILY_API_KEY` for Ozon/WB mentions.
