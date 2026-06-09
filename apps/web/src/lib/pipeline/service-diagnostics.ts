import {
  appendServiceLog,
  maskSecret,
  type PipelineProgress,
} from "@reels-factory/shared";

function parseDbHost(databaseUrl?: string): string | undefined {
  if (!databaseUrl) return undefined;
  try {
    const url = new URL(databaseUrl);
    return url.hostname;
  } catch {
    return undefined;
  }
}

function parseS3Host(endpoint?: string): string | undefined {
  if (!endpoint) return undefined;
  try {
    return new URL(endpoint).hostname;
  } catch {
    return endpoint.slice(0, 40);
  }
}

export function applyWebServiceDiagnostics(
  progress: PipelineProgress,
  userEmail?: string | null
): PipelineProgress {
  let next = progress;
  const openaiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o";
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  next = appendServiceLog(next, {
    service: `OpenAI · ${openaiModel}`,
    account: openaiKey ? maskSecret(openaiKey) : "не задан (mock)",
    runtime: "Vercel",
  });

  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const tavilyMode = tavilyKey
    ? "api_key"
    : process.env.TAVILY_KEYLESS === "false"
      ? "off"
      : "keyless";

  next = appendServiceLog(next, {
    service: "Tavily Search",
    account: tavilyKey
      ? maskSecret(tavilyKey)
      : tavilyMode === "keyless"
        ? "keyless (без ключа)"
        : "выключен",
    runtime: "Vercel",
    detail:
      tavilyMode === "api_key"
        ? "1000 credits/mo"
        : tavilyMode === "keyless"
          ? "режим без API-ключа · лимиты ниже"
          : "без Tavily · только DuckDuckGo",
  });

  const dbHost = parseDbHost(process.env.DATABASE_URL);
  next = appendServiceLog(next, {
    service: "Neon Postgres",
    account: dbHost ?? "не задан",
    runtime: "Vercel",
    detail: dbHost ? "подключено" : undefined,
  });

  if (userEmail) {
    next = appendServiceLog(next, {
      service: "сессия",
      account: userEmail,
      runtime: "Vercel",
    });
  }

  if (process.env.SKIP_PAYMENT !== "true") {
    next = appendServiceLog(next, {
      service: "Stripe Checkout",
      account: process.env.STRIPE_SECRET_KEY?.trim()
        ? maskSecret(process.env.STRIPE_SECRET_KEY)
        : "не задан",
      runtime: "Vercel",
    });
  }

  next = appendServiceLog(next, {
    service: "Ozon / WB / М.Видео",
    detail: "без API · Tavily + HTML-парсинг",
    runtime: "Vercel",
  });

  return next;
}

export function applyWorkerServiceDiagnostics(
  progress: PipelineProgress
): PipelineProgress {
  let next = progress;
  const imageModel =
    process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  next = appendServiceLog(next, {
    service: `OpenAI Images · ${imageModel}`,
    account: openaiKey ? maskSecret(openaiKey) : "не задан (mock)",
    runtime: "Railway",
  });

  const bucket = process.env.S3_BUCKET?.trim();
  const s3Host = parseS3Host(process.env.S3_ENDPOINT);
  next = appendServiceLog(next, {
    service: "Cloudflare R2",
    account: bucket ?? "не задан",
    runtime: "Railway",
    detail: s3Host ? `endpoint ${s3Host}` : undefined,
  });

  const dbHost = parseDbHost(process.env.DATABASE_URL);
  next = appendServiceLog(next, {
    service: "Neon Postgres",
    account: dbHost ?? "не задан",
    runtime: "Railway",
    detail: dbHost ? "подключено" : undefined,
  });

  return next;
}
