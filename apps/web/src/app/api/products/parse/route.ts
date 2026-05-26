import { NextResponse } from "next/server";
import { parseProductRequestSchema } from "@reels-factory/shared";
import {
  parseProductUrl,
  ProductParseError,
} from "@reels-factory/product-parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = parseProductRequestSchema.parse(body);
    const product = await parseProductUrl(url);
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof ProductParseError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    console.error("[parse]", e);
    return NextResponse.json(
      { error: "Ошибка при разборе страницы" },
      { status: 500 }
    );
  }
}
