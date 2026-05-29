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

## Variables

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | yes |
| `REDIS_URL` | yes |
| `OPENAI_API_KEY` | yes |
| `S3_ENDPOINT` | yes (R2) |
| `S3_REGION` | `auto` for R2 |
| `S3_BUCKET` | yes |
| `S3_ACCESS_KEY` | yes |
| `S3_SECRET_KEY` | yes |
| `S3_PUBLIC_URL` | yes (public bucket URL) |

Do **not** set `MOCK_RENDER=true` for production.

## Memory (important)

Remotion needs **≥ 2 GB RAM** for stable renders. If you see  
`Timed out while setting up the headless browser`, in Railway → **Scale** set **Memory to 2 GB** (or higher).

Optional env:
- `REMOTION_TIMEOUT_MS=300000` — render timeout (default 5 min)
- `REMOTION_MULTI_PROCESS=true` — faster on multi-GB plans only

## Logs (success)

```text
[worker] Listening on queue "render-reel"
[worker] Storage (S3/R2): configured
[worker] Render mode: full
[render] Uploaded videos/<id>.mp4 → https://...
```

## R2 setup

See [R2_SETUP.md](../../R2_SETUP.md) in repo root.
