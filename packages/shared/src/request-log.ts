export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestLogPayload = {
  method: HttpMethod;
  /** Full request URL (secrets are masked in display). */
  url: string;
  service: string;
  /** Business purpose / pipeline step. */
  target?: string;
  /** Request body or parameters (no secrets). */
  body?: string;
  status?: number;
  /** Short response summary. */
  result?: string;
  runtime?: string;
};

export function shortenRequestUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "") || "/";
    const search = u.search ? u.search.slice(0, 80) : "";
    return `${u.hostname}${path}${search}`;
  } catch {
    return url.length > 96 ? `${url.slice(0, 93)}…` : url;
  }
}

export function maskSecretsInText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
    .replace(/api_key["']?\s*[:=]\s*["']?[A-Za-z0-9_-]+/gi, "api_key=***")
    .replace(/tvly-[A-Za-z0-9]+/gi, "tvly-***")
    .replace(/sk-[A-Za-z0-9]+/gi, "sk-***");
}

export function formatRequestLogText(payload: RequestLogPayload): string {
  const endpoint = shortenRequestUrl(payload.url);
  const lines: string[] = [];

  const head = `→ ${payload.service} · ${payload.method} ${endpoint}`;
  lines.push(payload.target ? `${head} · куда: ${payload.target}` : head);

  if (payload.body) {
    lines.push(`  отправляю: ${maskSecretsInText(payload.body)}`);
  }

  const response: string[] = [];
  if (payload.status !== undefined) response.push(String(payload.status));
  if (payload.result) response.push(payload.result);

  if (response.length > 0) {
    let answer = `  ответ: ${response.join(" · ")}`;
    if (payload.runtime) answer += ` · ${payload.runtime}`;
    lines.push(answer);
  } else if (payload.runtime) {
    lines.push(`  среда: ${payload.runtime}`);
  }

  return lines.join("\n");
}

export function buildOpenAiChatRequestLog(params: {
  target: string;
  model: string;
  body: string;
  status?: number;
  result?: string;
  runtime?: string;
}): RequestLogPayload {
  return {
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    service: "OpenAI",
    target: params.target,
    body: `model=${params.model} · ${params.body}`,
    status: params.status,
    result: params.result,
    runtime: params.runtime ?? "Vercel",
  };
}

export function buildOpenAiImageRequestLog(params: {
  endpoint: "generations" | "edits";
  target: string;
  model: string;
  body: string;
  status?: number;
  result?: string;
  runtime?: string;
}): RequestLogPayload {
  return {
    method: "POST",
    url: `https://api.openai.com/v1/images/${params.endpoint}`,
    service: "OpenAI",
    target: params.target,
    body: `model=${params.model} · ${params.body}`,
    status: params.status,
    result: params.result,
    runtime: params.runtime ?? "Railway",
  };
}

export function buildHttpGetRequestLog(params: {
  url: string;
  service: string;
  target: string;
  body?: string;
  status?: number;
  result?: string;
  runtime?: string;
}): RequestLogPayload {
  return {
    method: "GET",
    url: params.url,
    service: params.service,
    target: params.target,
    body: params.body,
    status: params.status,
    result: params.result,
    runtime: params.runtime,
  };
}

export function buildS3PutRequestLog(params: {
  endpoint: string;
  bucket: string;
  key: string;
  contentType: string;
  bytes?: number;
  publicUrl?: string;
  target?: string;
  runtime?: string;
}): RequestLogPayload {
  const sizePart =
    params.bytes !== undefined
      ? `${Math.max(1, Math.round(params.bytes / 1024))} KB`
      : "размер неизвестен";
  return {
    method: "PUT",
    url: params.endpoint
      ? `${params.endpoint.replace(/\/$/, "")}/${params.bucket}/${params.key}`
      : `s3://${params.bucket}/${params.key}`,
    service: "R2/S3",
    target: params.target ?? "загрузка файла",
    body: `bucket=${params.bucket} · key=${params.key} · ${params.contentType} · ${sizePart}`,
    status: 200,
    result: params.publicUrl
      ? shortenRequestUrl(params.publicUrl)
      : "upload ok",
    runtime: params.runtime ?? "Railway",
  };
}
