import type { ProductReview, ProductSpec } from "@reels-factory/shared";
import { extractDeepFromHtml, extractDeepFromJsonLd } from "./extract-deep";

/** Pull product fields from embedded JSON in SPA marketplace pages. */
export function extractMarketplaceEmbedded(html: string): {
  reviews?: ProductReview[];
  specs?: ProductSpec[];
  title?: string;
  rating?: { value: number; count?: number };
} {
  const jsonLd = extractDeepFromJsonLd(html);
  const htmlDeep = extractDeepFromHtml(html);
  const fromScripts = extractJsonBlobFields(html);

  const reviews = [
    ...(jsonLd.reviews ?? []),
    ...(htmlDeep.reviews ?? []),
    ...(fromScripts.reviews ?? []),
  ];

  const specs = [
    ...(jsonLd.specs ?? []),
    ...(htmlDeep.specs ?? []),
    ...(fromScripts.specs ?? []),
  ];

  return {
    title: fromScripts.title,
    reviews: dedupeReviews(reviews).slice(0, 8) || undefined,
    specs: dedupeSpecs(specs).slice(0, 40) || undefined,
    rating: jsonLd.aggregateRating ?? fromScripts.rating,
  };
}

function extractJsonBlobFields(html: string): {
  reviews?: ProductReview[];
  specs?: ProductSpec[];
  title?: string;
  rating?: { value: number; count?: number };
} {
  const reviews: ProductReview[] = [];
  const specs: ProductSpec[] = [];
  let title: string | undefined;
  let rating: { value: number; count?: number } | undefined;

  const blobs = collectJsonStrings(html);
  for (const raw of blobs) {
    try {
      walkJson(raw, (node) => {
        if (!node || typeof node !== "object") return;
        const obj = node as Record<string, unknown>;

        if (!title && typeof obj.name === "string" && obj.name.length > 3) {
          title = obj.name;
        }
        if (!title && typeof obj.title === "string" && obj.title.length > 3) {
          title = obj.title;
        }

        const reviewText =
          typeof obj.text === "string"
            ? obj.text
            : typeof obj.reviewBody === "string"
              ? obj.reviewBody
              : typeof obj.comment === "string"
                ? obj.comment
                : typeof obj.content === "string"
                  ? obj.content
                  : undefined;

        if (reviewText && reviewText.length >= 15 && reviewText.length < 2000) {
          if (/отзыв|покуп|достоин|недостат|рекоменд|качеств/i.test(reviewText)) {
            reviews.push({
              text: reviewText.slice(0, 500),
              rating:
                typeof obj.rating === "number"
                  ? obj.rating
                  : typeof obj.score === "number"
                    ? obj.score
                    : undefined,
              author:
                typeof obj.author === "string"
                  ? obj.author
                  : obj.author && typeof obj.author === "object"
                    ? String((obj.author as Record<string, unknown>).name ?? "")
                    : undefined,
            });
          }
        }

        if (
          typeof obj.name === "string" &&
          (typeof obj.value === "string" || typeof obj.value === "number")
        ) {
          const name = obj.name.trim();
          const value = String(obj.value).trim();
          if (name.length > 1 && name.length < 80 && value.length > 0) {
            specs.push({ name, value: value.slice(0, 200) });
          }
        }

        const rv = obj.ratingValue ?? obj.averageRating ?? obj.score;
        if (rv != null && Number(rv) > 0 && Number(rv) <= 5) {
          rating = {
            value: Number(rv),
            count:
              obj.reviewCount != null
                ? Number(obj.reviewCount)
                : obj.ratingCount != null
                  ? Number(obj.ratingCount)
                  : obj.commentsCount != null
                    ? Number(obj.commentsCount)
                    : undefined,
          };
        }
      });
    } catch {
      /* skip invalid blob */
    }
  }

  return {
    reviews: reviews.length ? dedupeReviews(reviews) : undefined,
    specs: specs.length ? dedupeSpecs(specs) : undefined,
    title,
    rating,
  };
}

function collectJsonStrings(html: string): string[] {
  const out: string[] = [];

  const dataStateRe = /data-state="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = dataStateRe.exec(html)) !== null) {
    try {
      out.push(
        m[1]!
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'")
      );
    } catch {
      /* skip */
    }
  }

  const scriptRe =
    /<script[^>]*>([\s\S]*?(?:reviewBody|feedbacks|webReview|reviewCount)[\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const block = m[1]!.trim();
    if (block.length > 40 && block.length < 500_000) out.push(block);
  }

  return out.slice(0, 30);
}

function walkJson(raw: string, visit: (node: unknown) => void): void {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) return;
    return walkJson(jsonMatch[1]!, visit);
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return;
  }

  const stack = [data];
  let steps = 0;
  while (stack.length && steps < 8000) {
    steps++;
    const node = stack.pop();
    visit(node);
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
    } else if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        stack.push(value);
      }
    }
  }
}

function dedupeReviews(reviews: ProductReview[]): ProductReview[] {
  const seen = new Set<string>();
  const out: ProductReview[] = [];
  for (const r of reviews) {
    const key = r.text.slice(0, 40).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function dedupeSpecs(specs: ProductSpec[]): ProductSpec[] {
  const seen = new Set<string>();
  const out: ProductSpec[] = [];
  for (const s of specs) {
    const key = `${s.name}|${s.value}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function isMarketplaceHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return /^(ozon\.ru|wildberries\.ru|mvideo\.ru|market\.yandex\.ru)$/.test(
      host
    );
  } catch {
    return false;
  }
}
