import { parseProductUrl } from "@reels-factory/product-parser";

const url = process.argv[2] ?? "https://rubinauto.com/";

parseProductUrl(url)
  .then((p) => {
    console.log({
      title: p.title,
      brand: p.brand,
      specs: p.specs?.length ?? 0,
      reviews: p.reviews?.length ?? 0,
      pros: p.prosFromPage?.length ?? 0,
      sampleSpecs: p.specs?.slice(0, 3),
      sampleReview: p.reviews?.[0]?.text?.slice(0, 80),
    });
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
