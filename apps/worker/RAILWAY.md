# Worker on Railway (этап 5)

## Builder: Docker (обязательно)

Railpack **не подходит** для Remotion (нет `libnspr4`).

Настройки задаются в корневом **`railway.toml`** (config-as-code перекрывает UI):

- Builder: **Dockerfile** → `apps/worker/Dockerfile`
- **Start command:** `npm run worker`
- **Serverless:** выключен (`sleepApplication = false`)
- **Root Directory:** не задавать (корень репо)

После push в `main` Railway деплоит автоматически. Ручной **Redeploy** — если нужно пересобрать без коммита.

Если сборка падает — **View logs** у failed deploy, строка с `ERROR`.

## Crash: `OPENAI_API_KEY is not set`

Worker exits on startup if `OPENAI_API_KEY` is missing (production). Scene images are **always** generated via OpenAI — no product-photo fallback.

**Auto-fix (no Railway CLI):** Vercel syncs `OPENAI_API_KEY` into shared Neon table `WorkerSecret` on each `/api/health` request. Railway worker loads it from DB when the Railway variable is empty.

After deploy: open `https://web-omega-ochre-29.vercel.app/api/health` once, then **Redeploy** worker on Railway.

Manual fix (preferred long-term):

## Crash: `DATABASE_URL is not set`

Worker exits immediately if `DATABASE_URL` is missing in **Railway Variables** (not Vercel).

**Fix (Railway dashboard, ~1 min):**

1. [railway.app](https://railway.app) → project **reelsfactory** → worker service → **Variables**
2. **New variable** → `DATABASE_URL` → paste the **same Neon URL** as in Vercel (Settings → Environment Variables → Production → `DATABASE_URL` → reveal)
3. **Required:** `OPENAI_API_KEY` (same as Vercel) — without it worker **will not start** and AI frames are never generated
4. Also add `S3_*` (R2) for storing scene images
5. **Redeploy** (or wait for auto-restart)

**Success in logs:**

```text
[worker] Postgres queue
[worker] Render engine: ffmpeg viral_v1
```

**CLI sync (after `npx railway login` + `npx railway link`):**

```powershell
powershell -File scripts/sync-railway-env.ps1
```

## Variables

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | yes |
| `REDIS_URL` | optional (only if `QUEUE_MODE=redis`) |
| `OPENAI_API_KEY` | yes |
| `TAVILY_API_KEY` | optional (web research; without it uses page data only) |
| `PLAYWRIGHT_PARSER` | auto `true` on Railway (Bitrix/JS sites) |

**Queue mode (default `postgres`):** worker polls Neon for `generating_images` and `render_queued` — **Redis not required**. Set `QUEUE_MODE=redis` only if you use Redis with quota headroom.

**Docker build:** `packages/pipeline-store` must be in the worker Dockerfile before `npm ci` (see `apps/worker/Dockerfile`).
| `S3_ENDPOINT` | yes (R2) |
| `S3_REGION` | `auto` for R2 |
| `S3_BUCKET` | yes |
| `S3_ACCESS_KEY` | yes |
| `S3_SECRET_KEY` | yes |
| `S3_PUBLIC_URL` | yes (public bucket URL) |

Do **not** set `MOCK_RENDER=true` for production.

## Memory (1 GB plan)

On Railway with **1 GB RAM** (plan limit), the worker uses **ffmpeg viral_v1** automatically — no Chrome, no Remotion at runtime.  
You should see in logs: `[worker] Render engine: ffmpeg viral_v1`.

Playwright runs during job parse for JS-heavy product pages (~300 MB in Docker image).

To force Remotion (only if you upgrade to **2 GB+** RAM):

| Variable | Value |
|----------|--------|
| `RENDER_ENGINE` | `remotion` |

Optional:
- `RENDER_ENGINE=ffmpeg` — always ffmpeg (local test)
- `REMOTION_TIMEOUT_MS=300000` — Remotion timeout only

## Logs (success)

```text
[worker] Listening on queue "render-reel"
[worker] Storage (S3/R2): configured
[worker] Render mode: full
[render] Uploaded videos/<id>.mp4 → https://...
```

## R2 setup

See [R2_SETUP.md](../../R2_SETUP.md) in repo root.
