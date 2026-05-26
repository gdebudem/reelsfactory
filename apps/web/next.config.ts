import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@reels-factory/shared",
    "@reels-factory/product-parser",
    "@reels-factory/ai-script",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
