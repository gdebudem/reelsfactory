# Worker on Railway

## Service settings

- **Root Directory:** repository root (not `apps/worker`)
- **Start Command:** `npm run worker` (or use root `railway.toml`)

## Required variables

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon |
| `REDIS_URL` | Upstash |
| `OPENAI_API_KEY` | OpenAI (сценарий, модель `gpt-4o`) |
| `OPENAI_MODEL` | опционально, по умолчанию `gpt-4o` |

## Storage (for real MP4)

| Variable | Example (Cloudflare R2) |
|----------|-------------------------|
| `S3_ENDPOINT` | `https://<account>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `reels-factory` |
| `S3_ACCESS_KEY` | R2 access key |
| `S3_SECRET_KEY` | R2 secret |
| `S3_PUBLIC_URL` | public bucket URL |

## Quick test without full render

Set `MOCK_RENDER=true` — worker finishes jobs with a placeholder file (still needs S3 credentials).

## Success log line

```
[worker] Listening on queue "render-reel"
```

After that, create a **new** reel on the site (old `queued` jobs are not reprocessed automatically).
