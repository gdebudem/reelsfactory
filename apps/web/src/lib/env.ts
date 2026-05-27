export function hasDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function hasRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
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

