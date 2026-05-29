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

Модель в коде: **`gpt-4o`** (можно переопределить `OPENAI_MODEL`).

Тот же `OPENAI_API_KEY` добавьте в **Railway worker** (сценарий генерируется при старте рендера).

Проверка после деплоя:

- https://web-omega-ochre-29.vercel.app/api/health  
  должно быть `"openaiConfigured": true`, `"openaiModel": "gpt-4o"`

Без ключа сценарий будет **mock** (шаблонный текст).

## Команды для отправки изменений

```powershell
cd "c:\cursor\reels factory"
git add .
git commit -m "описание изменений"
git push origin main
```
