export type MarketplaceConfig = {
  platform: string;
  domains: string[];
  productPathRe: RegExp;
  searchPathRe?: RegExp;
};

export const MARKETPLACES: MarketplaceConfig[] = [
  {
    platform: "Ozon",
    domains: ["ozon.ru", "www.ozon.ru"],
    productPathRe: /\/product\/|\/t\/[a-zA-Z0-9_-]+/i,
    searchPathRe: /\/search\//i,
  },
  {
    platform: "Wildberries",
    domains: ["wildberries.ru", "www.wildberries.ru"],
    productPathRe: /\/catalog\/\d+\/detail\.aspx/i,
    searchPathRe: /\/catalog\/0\/search\.aspx/i,
  },
  {
    platform: "М.Видео",
    domains: ["mvideo.ru", "www.mvideo.ru"],
    productPathRe: /\/products\/[^/]+-\d+/i,
    searchPathRe: /\/product-list-page/i,
  },
  {
    platform: "Яндекс Маркет",
    domains: ["market.yandex.ru"],
    productPathRe: /\/product--|\/product\//i,
    searchPathRe: /\/search\?/i,
  },
];

export function detectMarketplace(url: string): MarketplaceConfig | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      MARKETPLACES.find((mp) =>
        mp.domains.some((d) => host === d.replace(/^www\./, ""))
      ) ?? null
    );
  } catch {
    return null;
  }
}

export function isMarketplaceProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const mp = detectMarketplace(url);
    if (!mp) return false;
    if (mp.searchPathRe?.test(parsed.pathname + parsed.search)) return false;
    return mp.productPathRe.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function normalizePageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}
