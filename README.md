# Reels Factory

AI-платформа для автоматического создания рекламных Reels: **4 вопроса → готовое видео 9:16**.

## Production (без локального запуска)

- Сайт: **https://web-omega-ochre-29.vercel.app**
- GitHub: **https://github.com/gdebudem/reelsfactory**
- Автодеплой: `git push origin main` → Vercel собирает сайт автоматически
- Инструкция: [DEPLOY.md](DEPLOY.md)

## Стек

- **apps/web** — Next.js 15 (лендинг, визард, API, dashboard)
- **apps/worker** — BullMQ + Remotion render
- **packages/** — shared, product-parser, ai-script, video-templates
- **PostgreSQL**, **Redis**, **MinIO** (docker-compose)

## Быстрый старт

```bash
# 1. Инфраструктура
docker compose up -d

# 2. Переменные
cp .env.example .env
# Для локальной разработки без Stripe:
# SKIP_PAYMENT=true

# 3. Зависимости
npm install

# 4. База
npm run db:push

# 5. Web (терминал 1)
npm run dev

# 6. Worker (терминал 2)
npm run worker
```

Откройте [http://localhost:3000](http://localhost:3000) → **Создать ролик**.

## Переменные окружения

См. [`.env.example`](.env.example).

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis для очереди рендера |
| `OPENAI_API_KEY` | Сценарий (без ключа — mock) |
| `SKIP_PAYMENT=true` | Пропуск Stripe в dev |
| `S3_*` | MinIO / S3 для MP4 |

## Структура

```
apps/web          — UI + API
apps/worker       — рендер видео
packages/shared   — zod-схемы, константы
packages/product-parser
packages/ai-script
packages/video-templates  — Remotion 1080×1920
prisma/schema.prisma
```

## API

- `POST /api/pipeline/run` — **одна кнопка**: задача + сценарий + оплата + очередь
- `POST /api/products/parse` — парсинг URL товара
- `POST /api/reels/jobs` — создание задачи
- `POST /api/checkout` — оплата Stripe
- `POST /api/reels/jobs/:id/start` — постановка в очередь
- `GET /api/reels/jobs/:id` — статус

## Деплой

- **Web:** Vercel (`apps/web`)
- **Worker:** Railway + Docker (`apps/worker/Dockerfile`, Remotion + Chromium)
- **MP4 storage:** Cloudflare R2 — [R2_SETUP.md](R2_SETUP.md)
- **DB/Redis/S3:** managed services

## CI

GitHub Actions: lint + `prisma generate` + `next build` (см. `.github/workflows/ci.yml`).
