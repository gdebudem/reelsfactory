import type { ProductCard, ProductIntel } from "@reels-factory/shared";

type LinkItem = {
  label: string;
  url: string;
  hint?: string;
};

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function collectLinks(
  product: ProductCard,
  productUrl?: string | null,
  intel?: ProductIntel | null
): LinkItem[] {
  const seen = new Set<string>();
  const links: LinkItem[] = [];

  const add = (label: string, url: string, hint?: string) => {
    const key = url.split("?")[0]!.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ label, url, hint });
  };

  const landing = product.sourceUrl || productUrl;
  if (landing) {
    add("Посадочная страница товара", landing, hostLabel(landing));
  }

  for (const listing of intel?.marketplaceListings ?? []) {
    add(
      listing.platform,
      listing.url,
      listing.title?.slice(0, 60) ?? hostLabel(listing.url)
    );
  }

  for (const url of intel?.researchSources ?? []) {
    if (!url.startsWith("http")) continue;
    add(hostLabel(url), url);
  }

  return links;
}

type Props = {
  product: ProductCard;
  productUrl?: string | null;
  intel?: ProductIntel | null;
};

export function StoryboardLinks({ product, productUrl, intel }: Props) {
  const links = collectLinks(product, productUrl, intel);

  if (links.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ссылки на посадочные
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-lg border border-slate-100 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <span className="text-sm font-medium text-indigo-700 group-hover:underline">
                {item.label}
              </span>
              {item.hint ? (
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {item.hint}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
