export function hasDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function hasRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

export function hasOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasTavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

export function getTavilyStatus(): "api_key" | "keyless" | "off" {
  if (hasTavilyConfigured()) return "api_key";
  if (process.env.TAVILY_KEYLESS === "false") return "off";
  return "keyless";
}

export function hasTavilyAvailable() {
  return getTavilyStatus() !== "off";
}

export function hasStorageConfigured() {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY?.trim() &&
      process.env.S3_SECRET_KEY?.trim()
  );
}

export function envProblemResponse(kind: "db" | "redis") {
  if (kind === "db") {
    return {
      status: 503,
      body: {
        error:
          "База данных не настроена. Добавьте DATABASE_URL (Neon) в Vercel Environment Variables.",
        code: "DATABASE_NOT_CONFIGURED",
      },
    } as const;
  }

  return {
    status: 503,
    body: {
      error:
        "Очередь не настроена. Добавьте REDIS_URL (Upstash Redis) в Vercel Environment Variables.",
      code: "REDIS_NOT_CONFIGURED",
    },
  } as const;
}

