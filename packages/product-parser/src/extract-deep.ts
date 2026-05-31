import * as cheerio from "cheerio";
import type {
  AggregateRating,
  ProductReview,
  ProductSpec,
} from "@reels-factory/shared";

type CheerioRoot = ReturnType<typeof cheerio.load>;

export type DeepProductFields = {
  brand?: string;
  category?: string;
  specs?: ProductSpec[];
  reviews?: ProductReview[];
  prosFromPage?: string[];
  aggregateRating?: AggregateRating;
};

type JsonLdNode = Record<string, unknown>;

const SPEC_NOISE = /^(артикул|sku|ean|штрих|код товара|id товара)$/i;

export function extractDeepFromHtml(html: string): DeepProductFields {
  const $ = cheerio.load(html);
  const specs = dedupeSpecs([
    ...extractMicrodataSpecs($),
    ...extractTableSpecs($),
    ...extractDlSpecs($),
    ...extractWooCommerceSpecs($),
  ]);
  const reviews = dedupeReviews([
    ...extractMicrodataReviews($),
    ...extractCommentReviews($),
  ]);
  const prosFromPage = extractProsLists($);

  return {
    specs: specs.length ? specs : undefined,
    reviews: reviews.length ? reviews : undefined,
    prosFromPage: prosFromPage.length ? prosFromPage : undefined,
  };
}

export function extractDeepFromJsonLd(
  html: string
): DeepProductFields & { description?: string } {
  const $ = cheerio.load(html);
  const result: DeepProductFields & { description?: string } = {};
  const specs: ProductSpec[] = [];
  const reviews: ProductReview[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      walkJsonLd(data, (node) => {
        if (!isType(node, "Product")) return;

        if (typeof node.brand === "string") result.brand = node.brand;
        else if (node.brand && typeof node.brand === "object") {
          const b = node.brand as JsonLdNode;
          if (typeof b.name === "string") result.brand = b.name;
        }

        if (typeof node.category === "string") result.category = node.category;

        if (typeof node.description === "string" && !result.description) {
          result.description = stripHtml(node.description).slice(0, 2000);
        }

        const props = node.additionalProperty;
        if (props) {
          const list = Array.isArray(props) ? props : [props];
          for (const p of list) {
            const row = propToSpec(p);
            if (row) specs.push(row);
          }
        }

        const agg = node.aggregateRating as JsonLdNode | undefined;
        if (agg && agg.ratingValue != null) {
          result.aggregateRating = {
            value: Number(agg.ratingValue),
            count:
              agg.reviewCount != null
                ? Number(agg.reviewCount)
                : agg.ratingCount != null
                  ? Number(agg.ratingCount)
                  : undefined,
          };
        }

        const rev = node.review;
        if (rev) {
          const list = Array.isArray(rev) ? rev : [rev];
          for (const r of list) {
            const parsed = jsonLdReviewToReview(r);
            if (parsed) reviews.push(parsed);
          }
        }
      });
    } catch {
      /* skip */
    }
  });

  if (specs.length) result.specs = dedupeSpecs(specs);
  if (reviews.length) result.reviews = dedupeReviews(reviews);
  return result;
}

function walkJsonLd(
  data: unknown,
  visit: (node: JsonLdNode) => void
): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    for (const item of data) walkJsonLd(item, visit);
    return;
  }
  const node = data as JsonLdNode;
  visit(node);
  if (node["@graph"]) walkJsonLd(node["@graph"], visit);
}

function isType(node: JsonLdNode, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t === type;
  if (Array.isArray(t)) return t.includes(type);
  return false;
}

function propToSpec(raw: unknown): ProductSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as JsonLdNode;
  const name = String(p.name ?? p.propertyID ?? "").trim();
  const value = String(p.value ?? "").trim();
  if (!name || !value || SPEC_NOISE.test(name)) return null;
  return { name, value };
}

function jsonLdReviewToReview(raw: unknown): ProductReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as JsonLdNode;
  const body =
    typeof r.reviewBody === "string"
      ? r.reviewBody
      : typeof r.description === "string"
        ? r.description
        : "";
  const text = stripHtml(body).trim();
  if (text.length < 8) return null;

  let rating: number | undefined;
  const ratingNode = r.reviewRating as JsonLdNode | undefined;
  if (ratingNode?.ratingValue != null) {
    rating = Number(ratingNode.ratingValue);
  }

  const author =
    typeof r.author === "string"
      ? r.author
      : r.author && typeof r.author === "object"
        ? String((r.author as JsonLdNode).name ?? "")
        : undefined;

  return {
    text: text.slice(0, 500),
    rating: Number.isFinite(rating) ? rating : undefined,
    author: author?.trim() || undefined,
  };
}

function extractMicrodataSpecs($: CheerioRoot): ProductSpec[] {
  const specs: ProductSpec[] = [];
  $('[itemprop="additionalProperty"]').each((_, el) => {
    const name =
      $(el).find('[itemprop="name"]').first().text().trim() ||
      $(el).attr("name") ||
      "";
    const value =
      $(el).find('[itemprop="value"]').first().text().trim() ||
      $(el).attr("content") ||
      "";
    if (name && value && !SPEC_NOISE.test(name)) specs.push({ name, value });
  });
  return specs;
}

function extractTableSpecs($: CheerioRoot): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const selectors = [
    "table.woocommerce-product-attributes tr",
    ".product-specs table tr",
    ".specifications table tr",
    "#tab-specifications table tr",
    ".product-characteristics table tr",
    ".props_list tr",
    ".product-item-detail-properties tr",
    ".product-item-detail-tab-content table tr",
    ".bx-catalog-tab-body table tr",
    "div.props tr",
  ];
  for (const sel of selectors) {
    $(sel).each((_, row) => {
      const cells = $(row).find("th, td");
      if (cells.length < 2) return;
      const name = $(cells[0]).text().replace(/\s+/g, " ").trim();
      const value = $(cells[1]).text().replace(/\s+/g, " ").trim();
      if (name && value && !SPEC_NOISE.test(name)) specs.push({ name, value });
    });
  }
  return specs;
}

function extractDlSpecs($: CheerioRoot): ProductSpec[] {
  const specs: ProductSpec[] = [];
  $("dl").each((_, dl) => {
    $(dl)
      .find("dt")
      .each((_, dt) => {
        const name = $(dt).text().replace(/\s+/g, " ").trim();
        const value = $(dt).next("dd").text().replace(/\s+/g, " ").trim();
        if (name && value && name.length < 80 && !SPEC_NOISE.test(name)) {
          specs.push({ name, value });
        }
      });
  });
  return specs;
}

function extractWooCommerceSpecs($: CheerioRoot): ProductSpec[] {
  const specs: ProductSpec[] = [];
  $(".woocommerce-product-attributes-item").each((_, item) => {
    const name = $(item)
      .find(".woocommerce-product-attributes-item__label")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const value = $(item)
      .find(".woocommerce-product-attributes-item__value")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    if (name && value && !SPEC_NOISE.test(name)) specs.push({ name, value });
  });
  return specs;
}

function extractMicrodataReviews($: CheerioRoot): ProductReview[] {
  const reviews: ProductReview[] = [];
  $('[itemprop="review"]').each((_, el) => {
    const text = stripHtml(
      $(el).find('[itemprop="reviewBody"]').text() ||
        $(el).find(".description").text()
    ).trim();
    if (text.length < 8) return;
    const ratingRaw = $(el).find('[itemprop="ratingValue"]').attr("content");
    reviews.push({
      text: text.slice(0, 500),
      rating: ratingRaw ? Number(ratingRaw) : undefined,
      author:
        $(el).find('[itemprop="author"]').text().trim() || undefined,
    });
  });
  return reviews;
}

function extractCommentReviews($: CheerioRoot): ProductReview[] {
  const reviews: ProductReview[] = [];
  const selectors = [
    ".woocommerce-review__content",
    ".comment-text",
    ".review-text",
    ".product-review-content",
  ];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const text = stripHtml($(el).text()).trim();
      if (text.length < 15) return;
      const ratingEl = $(el)
        .closest(".comment, .review, li")
        .find(".star-rating, [class*='rating']")
        .first();
      let rating: number | undefined;
      const width = ratingEl.attr("style")?.match(/width:\s*(\d+)/);
      if (width) rating = Math.round(Number(width[1]) / 20);
      reviews.push({ text: text.slice(0, 500), rating });
    });
  }
  return reviews;
}

function extractProsLists($: CheerioRoot): string[] {
  const pros: string[] = [];
  const headingRe =
    /преимущ|особенност|плюс|почему|выгод|характеристик|комплектац/i;

  $("h2, h3, h4, .tab-title, .accordion-title").each((_, heading) => {
    const title = $(heading).text().trim();
    if (!headingRe.test(title)) return;
    const section = $(heading).nextUntil("h2, h3, h4");
    section.find("li").each((_, li) => {
      const text = stripHtml($(li).text()).trim();
      if (text.length >= 5 && text.length <= 120) pros.push(text);
    });
  });

  $(".product-advantages li, .benefits-list li, ul.features li").each(
    (_, li) => {
      const text = stripHtml($(li).text()).trim();
      if (text.length >= 5 && text.length <= 120) pros.push(text);
    }
  );

  return [...new Set(pros)].slice(0, 12);
}

function dedupeSpecs(specs: ProductSpec[]): ProductSpec[] {
  const seen = new Set<string>();
  const out: ProductSpec[] = [];
  for (const s of specs) {
    const key = `${s.name.toLowerCase()}|${s.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: s.name.slice(0, 120), value: s.value.slice(0, 200) });
    if (out.length >= 40) break;
  }
  return out;
}

function dedupeReviews(reviews: ProductReview[]): ProductReview[] {
  const seen = new Set<string>();
  const out: ProductReview[] = [];
  for (const r of reviews) {
    const key = r.text.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= 8) break;
  }
  return out;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
