import type { RequestLogPayload } from "@reels-factory/shared";
import { shortenRequestUrl } from "@reels-factory/shared";
import type { TavilyExtractRequestInfo, TavilyRequestInfo } from "./tavily";
import type { ResearchProgressReporter } from "./progress";

export function buildTavilyRequestLog(
  info: TavilyRequestInfo,
  target?: string
): RequestLogPayload {
  const bodyParts = [
    `query="${info.query.length > 100 ? `${info.query.slice(0, 97)}…` : info.query}"`,
    `max_results=${info.maxResults}`,
  ];
  if (info.options.search_depth) {
    bodyParts.push(`search_depth=${info.options.search_depth}`);
  }
  if (info.options.include_domains?.length) {
    bodyParts.push(`include_domains=[${info.options.include_domains.join(", ")}]`);
  }
  if (info.options.country) {
    bodyParts.push(`country=${info.options.country}`);
  }
  bodyParts.push(`auth=${info.mode}`);

  let result: string | undefined;
  if (info.status !== 200) {
    result = "ошибка HTTP";
  } else if (info.resultCount > 0) {
    result = `${info.resultCount} результатов`;
  } else {
    result = "пустой ответ";
  }

  return {
    method: "POST",
    url: "https://api.tavily.com/search",
    service: "Tavily",
    target: target ?? "веб-поиск",
    body: bodyParts.join(" · "),
    status: info.status,
    result,
    runtime: "Vercel",
  };
}

export function buildTavilyExtractRequestLog(
  info: TavilyExtractRequestInfo,
  target?: string
): RequestLogPayload {
  const urlPreview = info.urls
    .map((u) => shortenRequestUrl(u))
    .slice(0, 3)
    .join(", ");
  const bodyParts = [
    `urls=[${urlPreview}${info.urls.length > 3 ? ", …" : ""}]`,
    "extract_depth=advanced",
    "format=text",
    `auth=${info.mode}`,
  ];
  if (info.query) {
    bodyParts.push(
      `query="${info.query.length > 72 ? `${info.query.slice(0, 69)}…` : info.query}"`
    );
  }

  let result: string | undefined;
  if (info.status !== 200) {
    result = "ошибка HTTP";
  } else if (info.resultCount > 0) {
    result = `${info.resultCount} страниц извлечено`;
  } else {
    result = "пустой ответ";
  }

  return {
    method: "POST",
    url: "https://api.tavily.com/extract",
    service: "Tavily",
    target: target ?? "извлечение HTML страницы",
    body: bodyParts.join(" · "),
    status: info.status,
    result,
    runtime: "Vercel",
  };
}

export function createTavilyRequestHandler(
  reporter: ResearchProgressReporter,
  target?: string
): ((info: TavilyRequestInfo) => void | Promise<void>) | undefined {
  if (!reporter.logRequest && !reporter.logTavilySearch) return undefined;
  return async (info) => {
    if (reporter.logRequest) {
      await reporter.logRequest(buildTavilyRequestLog(info, target));
    }
    if (info.status === 200 && reporter.logTavilySearch) {
      await reporter.logTavilySearch(info.query);
    }
  };
}

export function createTavilyExtractRequestHandler(
  reporter: ResearchProgressReporter,
  target?: string
): ((info: TavilyExtractRequestInfo) => void | Promise<void>) | undefined {
  const logRequest = reporter.logRequest;
  if (!logRequest) return undefined;
  return async (info) => {
    await logRequest(buildTavilyExtractRequestLog(info, target));
  };
}
