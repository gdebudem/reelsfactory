import type { RequestLogPayload } from "@reels-factory/shared";
import type { TavilyRequestInfo } from "./tavily";
import type { ResearchProgressReporter } from "./progress";

export function buildTavilyRequestLog(
  info: TavilyRequestInfo,
  target?: string
): RequestLogPayload {
  const bodyParts = [
    `query="${info.query.length > 56 ? `${info.query.slice(0, 53)}…` : info.query}"`,
    `max=${info.maxResults}`,
  ];
  if (info.options.search_depth) {
    bodyParts.push(`depth=${info.options.search_depth}`);
  }
  if (info.options.include_domains?.length) {
    bodyParts.push(`domains: ${info.options.include_domains.join(", ")}`);
  }
  if (info.options.country) {
    bodyParts.push(`country=${info.options.country}`);
  }
  bodyParts.push(`mode=${info.mode}`);

  let result: string | undefined;
  if (info.status !== 200) {
    result = "ошибка";
  } else if (info.resultCount > 0) {
    result = `${info.resultCount} результатов`;
  } else {
    result = "пусто";
  }

  return {
    method: "POST",
    url: "https://api.tavily.com/search",
    service: "Tavily",
    target,
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
