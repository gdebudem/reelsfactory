# Важно: настройка Vercel (один раз)

Если сайт показывает **404**, в Vercel нужно указать папку приложения:

1. [vercel.com](https://vercel.com) → проект **web**
2. **Settings** → **General**
3. **Root Directory** → `apps/web`
4. **Save**
5. **Deployments** → последний деплой → **Redeploy**

После этого главная и `/create` будут открываться нормально.
