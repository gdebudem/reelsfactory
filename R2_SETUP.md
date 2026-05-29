# Хранилище для MP4 (Cloudflare R2) — этап 5

Без R2/S3 worker не может сохранить **ваш** ролик — будет демо-видео.

## 1. Создать бакет в Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2**
2. **Create bucket** → имя, например `reels-factory`

## 2. API-токен

1. R2 → **Manage R2 API Tokens** → **Create API Token**
2. Права: чтение и запись в ваш бакет
3. Сохраните **Access Key ID** и **Secret Access Key**

## 3. Публичный доступ к файлам

1. Откройте бакет → **Settings**
2. Включите **Public access** (или привяжите домен `r2.dev`)
3. Скопируйте публичный URL бакета, например:  
   `https://pub-xxxxxxxx.r2.dev`

## 4. Переменные в Railway (`@reels-factory/worker`)

| Переменная | Пример |
|------------|--------|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `reels-factory` |
| `S3_ACCESS_KEY` | Access Key ID |
| `S3_SECRET_KEY` | Secret Access Key |
| `S3_PUBLIC_URL` | `https://pub-xxxxxxxx.r2.dev` |

Уберите или поставьте `MOCK_RENDER=false`.

## 5. Docker на Railway

В сервисе worker:

- **Settings** → Build → **Dockerfile**  
- Путь: `apps/worker/Dockerfile`  
- **Redeploy**

В логах при старте:

```text
[worker] Render mode: full
[worker] Storage (S3/R2): configured
```

## 6. Проверка

Создайте **новый** ролик на сайте. В логах worker:

```text
[render] Uploaded videos/<jobId>.mp4 → https://pub-....r2.dev/videos/...
```

Видео в плеере должно быть **новым**, не sample-5s.
