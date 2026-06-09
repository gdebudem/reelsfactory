export type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export type TavilySearchOptions = {
  include_domains?: string[];
  exclude_domains?: string[];
  search_depth?: "basic" | "advanced";
  country?: string;
};

export type TavilyMode = "api_key" | "keyless" | "off";

/** How Tavily will be called for this process. */
export function getTavilyMode(): TavilyMode {
  if (process.env.TAVILY_API_KEY?.trim()) return "api_key";
  if (process.env.TAVILY_KEYLESS === "false") return "off";
  return "keyless";
}

export function isTavilyAvailable(): boolean {
  return getTavilyMode() !== "off";
}

function buildSearchBody(
  query: string,
  maxResults: number,
  options: TavilySearchOptions,
  apiKey?: string
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    query,
    search_depth: options.search_depth ?? "basic",
    max_results: maxResults,
    include_answer: false,
    country: options.country ?? "russia",
  };
  if (options.include_domains?.length) {
    body.include_domains = options.include_domains;
  }
  if (options.exclude_domains?.length) {
    body.exclude_domains = options.exclude_domains;
  }
  if (apiKey) {
    body.api_key = apiKey;
  }
  return body;
}

export async function tavilySearch(
  query: string,
  maxResults = 5,
  options: TavilySearchOptions = {},
  onSearch?: (query: string) => void | Promise<void>
): Promise<TavilyResult[]> {
  const mode = getTavilyMode();
  if (mode === "off") return [];

  const apiKey =
    mode === "api_key" ? process.env.TAVILY_API_KEY!.trim() : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (mode === "keyless") {
    headers["X-Tavily-Access-Mode"] = "keyless";
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers,
    body: JSON.stringify(buildSearchBody(query, maxResults, options, apiKey)),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(
      `[product-intel] Tavily HTTP ${res.status} (${mode}) for: ${query.slice(0, 60)}${detail ? ` — ${detail.slice(0, 120)}` : ""}`
    );
    return [];
  }

  await onSearch?.(query);

  const data = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };

  return (data.results ?? [])
    .filter((r) => r.url && (r.content || r.title))
    .map((r) => ({
      title: r.title ?? "",
      url: r.url!,
      content: (r.content ?? r.title ?? "").slice(0, 500),
    }));
}

export async function searchProductWeb(
  productTitle: string,
  brand?: string,
  onSearch?: (query: string) => void | Promise<void>
) {
  const label = brand ? `${productTitle} ${brand}` : productTitle;
  const queries = [
    `${label} отзывы покупателей`,
    `${label} характеристики обзор`,
    `${label} site:ozon.ru OR site:wildberries.ru OR site:mvideo.ru`,
  ];

  const batches = await Promise.all([
    tavilySearch(queries[0]!, 4, { country: "russia" }, onSearch),
    tavilySearch(queries[1]!, 4, { country: "russia" }, onSearch),
    tavilySearch(
      queries[2]!,
      5,
      {
        country: "russia",
        include_domains: [
          "ozon.ru",
          "wildberries.ru",
          "mvideo.ru",
          "market.yandex.ru",
        ],
      },
      onSearch
    ),
  ]);

  const seen = new Set<string>();
  const merged: TavilyResult[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      const key = item.url.split("?")[0]!;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged.slice(0, 12);
}
