import {
  appendServiceLog,
  maskSecret,
  type PipelineProgress,
} from "@reels-factory/shared";

function parseDbHost(databaseUrl?: string): string | undefined {
  if (!databaseUrl) return undefined;
  try {
    return new URL(databaseUrl).hostname;
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
