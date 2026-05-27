import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "reels-factory",
    version: "1.0.0",
  });
}
