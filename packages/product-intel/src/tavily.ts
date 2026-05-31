export type TavilyResult = {
  title: string;
  url: string;
  content: string;
};

export async function tavilySearch(
  query: string,
  maxResults = 5
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    console.warn(`[product-intel] Tavily HTTP ${res.status} for: ${query}`);
    return [];
  }

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

export async function searchProductWeb(productTitle: string, brand?: string) {
  const label = brand ? `${productTitle} ${brand}` : productTitle;
  const queries = [
    `${label} отзывы`,
    `${label} характеристики`,
    `${label} site:ozon.ru OR site:wildberries.ru OR site:market.yandex.ru`,
  ];

  const batches = await Promise.all(
    queries.map((q) => tavilySearch(q, 4))
  );

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
