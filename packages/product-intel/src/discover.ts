import type { ProductCard, PipelineStepId } from "@reels-factory/shared";
import { tavilySearch } from "./tavily";
import {
  MARKETPLACES,
  detectMarketplace,
  isMarketplaceProductUrl,
  normalizePageUrl,
  type MarketplaceConfig,
} from "./marketplaces";
import { buildProductSearchQuery } from "./search-terms";
import type { ResearchProgressReporter } from "./progress";
import { noopReporter } from "./progress";

export type DiscoveredListing = {
  platform: string;
  url: string;
  title?: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PLATFORM_STEP: Partial<Record<string, PipelineStepId>> = {
  Ozon: "search_ozon",
  Wildberries: "search_wildberries",
  "М.Видео": "search_mvideo",
};

const SEARCH_ORDER: MarketplaceConfig[] = MARKETPLACES.filter((mp) =>
  Boolean(PLATFORM_STEP[mp.platform])
);

export async function discoverMarketplaceUrls(
  product: ProductCard,
  reporter: ResearchProgressReporter = noopReporter
): Promise<DiscoveredListing[]> {
  const query = buildProductSearchQuery(product);
  const seen = new Set<string>();
  const listings: DiscoveredListing[] = [];

  const add = (item: DiscoveredListing) => {
    const key = normalizePageUrl(item.url);
    if (seen.has(key)) return;
    if (!isMarketplaceProductUrl(item.url)) return;
    seen.add(key);
    listings.push(item);
  };

  const onTavily = reporter.logTavilySearch
    ? (q: string) => reporter.logTavilySearch!(q)
    : undefined;

  await reporter.start("search_marketplaces");

  for (const mp of SEARCH_ORDER) {
    const stepId = PLATFORM_STEP[mp.platform];
    if (stepId) await reporter.start(stepId);

    const results = await tavilySearch(
      `${query} купить`,
      4,
      {
        include_domains: mp.domains,
        search_depth: "advanced",
      },
      onTavily
    );

    for (const r of results) {
      add({
        platform: mp.platform,
        url: r.url,
        title: r.title || undefined,
      });
    }

    if (results.length === 0) {
      const fallback = await duckDuckGoMarketplaceSearch(query, mp);
      for (const item of fallback) add(item);
    }

    if (results.length > 0) {
      const sample = results[0]!.url.replace(/^https?:\/\//, "").slice(0, 60);
      await reporter.log(`${mp.platform}: найдено ${results.length} · ${sample}`);
    }

    if (stepId) await reporter.complete(stepId);
  }

  const crossResults = await tavilySearch(
    `${query} отзывы цена site:ozon.ru OR site:wildberries.ru OR site:mvideo.ru OR site:market.yandex.ru`,
    6,
    {},
    onTavily
  );
  for (const r of crossResults) {
    const mp = detectMarketplace(r.url);
    if (!mp) continue;
    add({
      platform: mp.platform,
      url: r.url,
      title: r.title || undefined,
    });
  }

  if (listings.length === 0) {
    for (const mp of SEARCH_ORDER) {
      const fallback = await duckDuckGoMarketplaceSearch(query, mp);
      for (const item of fallback) add(item);
    }
  }

  await reporter.complete("search_marketplaces");

  const sourceKey = normalizePageUrl(product.sourceUrl);
  const sorted = [...listings].sort((a, b) => {
    const aSrc = normalizePageUrl(a.url) === sourceKey ? 1 : 0;
    const bSrc = normalizePageUrl(b.url) === sourceKey ? 1 : 0;
    return aSrc - bSrc;
  });

  console.log(
    `[product-intel] Marketplace discovery: query="${query.slice(0, 50)}", found=${sorted.length}`
  );

  return sorted.slice(0, 8);
}

async function duckDuckGoMarketplaceSearch(
  query: string,
  mp: MarketplaceConfig
): Promise<DiscoveredListing[]> {
  const listings: DiscoveredListing[] = [];
  const domain = mp.domains[0]!.replace(/^www\./, "");
  const q = `site:${domain} ${query}`;

  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return listings;
    const html = await res.text();
    const links = parseDuckDuckGoLinks(html);
    for (const url of links) {
      if (!isMarketplaceProductUrl(url)) continue;
      listings.push({ platform: mp.platform, url });
    }
  } catch {
    /* optional fallback */
  }

  return listings;
}

function parseDuckDuckGoLinks(html: string): string[] {
  const links: string[] = [];
  const re = /uddg=([^&"]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    try {
      links.push(decodeURIComponent(match[1]!));
    } catch {
      /* skip */
    }
  }
  return links;
}
