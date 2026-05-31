import * as cheerio from "cheerio";

const url = process.argv[2]!;
const r = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9",
  },
});
const $ = cheerio.load(await r.text());

console.log("tables", $("table").length);
$("table tr").slice(0, 5).each((i, row) => {
  const tds = $(row).find("td, th");
  if (tds.length >= 2) {
    console.log(i, $(tds[0]).text().trim().slice(0, 40), "=>", $(tds[1]).text().trim().slice(0, 40));
  }
});

$(".props_list tr, .product-item-detail-properties tr").slice(0, 8).each((i, row) => {
  console.log("props", i, $(row).text().replace(/\s+/g, " ").trim().slice(0, 80));
});

$("[class*='prop'], [class*='charact'], [class*='spec']").slice(0, 5).each((i, el) => {
  console.log("class", i, $(el).attr("class"), $(el).text().slice(0, 60));
});
