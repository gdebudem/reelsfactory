const url = process.argv[2]!;
const r = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9",
  },
});
const h = await r.text();
console.log("status", r.status, "len", h.length);
const og = h.match(/property="og:image"\s+content="([^"]+)"/i);
console.log("og:image", og?.[1]);
console.log(
  "img count",
  (h.match(/<img/gi) ?? []).length
);
const srcs = [...h.matchAll(/(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi)]
  .map((m) => m[1])
  .filter((s) => /\.(jpg|jpeg|png|webp|gif)/i.test(s) || s.includes("/upload/"))
  .slice(0, 15);
console.log("image attrs", srcs);
console.log("has Product ld", /"@type"\s*:\s*"Product"/.test(h));
console.log("title", h.match(/<title>([^<]+)/)?.[1]?.slice(0, 100));
