# Деплой Reels Factory на Vercel + GitHub

## 1. GitHub

```bash
cd "c:\cursor\reels factory"
git init
git add .
git commit -m "feat: landing page and Vercel config"
```

На [github.com](https://github.com) → **New repository** → имя `reels-factory` → без README.

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/reels-factory.git
git branch -M main
git push -u origin main
```

## 2. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import репозитория `reels-factory`
3. **Root Directory:** `apps/web` (обязательно!)
4. Framework: Next.js (подтянется автоматически)
5. **Environment Variables** (для первого деплоя лендинга):

| Key | Value |
|-----|--------|
| `NEXTAUTH_SECRET` | любая длинная строка (32+ символа) |
| `NEXT_PUBLIC_APP_URL` | `https://ваш-проект.vercel.app` |
| `SKIP_PAYMENT` | `true` |

6. **Deploy**

После первого деплоя обновите `NEXT_PUBLIC_APP_URL` на финальный URL.

## 3. Автодеплой

После подключения GitHub каждый `git push` в `main` автоматически деплоит сайт.

## 4. Позже (полный функционал)

Добавьте в Vercel:

- `DATABASE_URL` — [Neon](https://neon.tech) (Postgres)
- `REDIS_URL` — [Upstash](https://upstash.com)
- `OPENAI_API_KEY` — опционально

Затем локально: `npm run db:push` с production `DATABASE_URL`.
