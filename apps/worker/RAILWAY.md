# Worker on Railway (этап 5)

## Builder: Docker (обязательно)

Railpack **не подходит** для Remotion (нет `libnspr4`).

1. Railway → `@reels-factory/worker` → **Settings**
2. **Build** → Builder: **Dockerfile**
3. Dockerfile path: `apps/worker/Dockerfile`
4. **Root Directory:** пусто / `.` (корень репозитория, **не** `apps/worker`)
5. **Build Command:** пусто
6. **Deploy / Redeploy**

Если сборка падает — открой **View logs** у failed deploy и ищи красную строку с `ERROR`.

Или используйте `railway.toml` в корне репо.

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

## Logs (success)

```text
[worker] Listening on queue "render-reel"
[worker] Storage (S3/R2): configured
[worker] Render mode: full
[render] Uploaded videos/<id>.mp4 → https://...
```

## R2 setup

See [R2_SETUP.md](../../R2_SETUP.md) in repo root.
