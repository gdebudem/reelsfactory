# Деплой Reels Factory (GitHub + Vercel, без локального Docker)

## Репозиторий

- GitHub: https://github.com/gdebudem/reelsfactory
- Production URL: https://web-omega-ochre-29.vercel.app

## Автодеплой (как это работает)

1. Вы меняете код в `c:\cursor\reels factory`
2. `git add .` → `git commit -m "..."` → `git push origin main`
3. GitHub получает код
4. Vercel автоматически запускает сборку (1–3 минуты)
5. Сайт обновляется на URL выше

Проверка: Vercel → проект **web** → **Deployments** → статус **Ready**.

## Первичная настройка Vercel (один раз)

1. [vercel.com](https://vercel.com) → Import Git Repository → `gdebudem/reelsfactory`
2. **Framework:** Next.js
3. **Root Directory:** обязательно **`apps/web`** (см. [VERCEL_FIX.md](VERCEL_FIX.md))
4. **Environment Variables** (минимум для этапа 1 — лендинг + визард):

| Key | Value |
|-----|--------|
| `NEXTAUTH_SECRET` | случайная строка 32+ символов |
| `NEXT_PUBLIC_APP_URL` | `https://web-omega-ochre-29.vercel.app` |
| `SKIP_PAYMENT` | `true` |

5. Deploy

**Важно:** не задавайте вручную Output Directory = `.next` или `apps/web/.next` — иначе будет 404.

## Проверка после деплоя

- Главная: https://web-omega-ochre-29.vercel.app/
- Визард: https://web-omega-ochre-29.vercel.app/create
- Health: https://web-omega-ochre-29.vercel.app/api/health

## Этап 2: Neon + Upstash

| Key | Сервис |
|-----|--------|
| `DATABASE_URL` | [Neon](https://neon.tech) |
| `REDIS_URL` | [Upstash](https://upstash.com) |

Без `DATABASE_URL` кнопка «Создать видео» выдаст «Не удалось создать задачу».

## Этап 3: OpenAI gpt-4o

| Key | Значение |
|-----|----------|
| `OPENAI_API_KEY` | ключ с [platform.openai.com](https://platform.openai.com/api-keys) |

## Tavily (поиск на Ozon/WB/отзывы)

| Key | Значение |
|-----|----------|
| `TAVILY_API_KEY` | ключ с [app.tavily.com](https://app.tavily.com) — 1000 бесплатных credits/мес |
| *(без ключа)* | **keyless** — Tavily работает автоматически, лимиты ниже |

Добавить ключ на Vercel:

```powershell
$env:TAVILY_API_KEY = "tvly-..."
powershell -File scripts/sync-vercel-tavily.ps1
```

Проверка: `/api/health` → `"tavilyAvailable": true`, `"tavilyMode": "api_key"` или `"keyless"`.

Tavily нужен только на **Vercel** (storyboard/research), не на Railway worker.

Модель в коде: **`gpt-4o`** (можно переопределить `OPENAI_MODEL`).

Тот же `OPENAI_API_KEY` добавьте в **Railway worker** (сценарий генерируется при старте рендера).

Проверка после деплоя:

- https://web-omega-ochre-29.vercel.app/api/health  
  должно быть `"openaiConfigured": true`, `"openaiModel": "gpt-4o"`

Без ключа сценарий будет **mock** (шаблонный текст).

## Этап 4: одна кнопка

Визард вызывает `POST /api/pipeline/run` — создаёт job, генерирует сценарий, оплачивает (или пропускает) и ставит в очередь за один запрос.

## Этап 5: реальный MP4 (worker + R2)

1. Worker на **Railway** с **Dockerfile** `apps/worker/Dockerfile` (Chromium для Remotion).
2. Хранилище **Cloudflare R2** — пошагово: [R2_SETUP.md](R2_SETUP.md).
3. Переменные `S3_*` в Railway worker + **Redeploy**.
4. Новый ролик на сайте → в логах: `[render] Uploaded videos/....mp4`.

Без `S3_*` worker отдаёт демо-видео (не ваш MP4).

## Команды для отправки изменений

```powershell
cd "c:\cursor\reels factory"
git add .
git commit -m "описание изменений"
git push origin main
```
