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

export async function tavilySearch(
  query: string,
  maxResults = 5,
  options: TavilySearchOptions = {},
  onSearch?: (query: string) => void | Promise<void>
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options.search_depth ?? "basic",
      max_results: maxResults,
      include_answer: false,
      include_domains: options.include_domains,
      exclude_domains: options.exclude_domains,
      country: options.country ?? "russia",
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    console.warn(`[product-intel] Tavily HTTP ${res.status} for: ${query}`);
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
    tavilySearch(queries[2]!, 5, {
      country: "russia",
      include_domains: [
        "ozon.ru",
        "wildberries.ru",
        "mvideo.ru",
        "market.yandex.ru",
      ],
    }, onSearch),
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
