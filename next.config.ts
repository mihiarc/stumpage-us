import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Set for GitHub Pages project hosting (e.g. "/stumpage-us"); empty for
  // local dev and custom-domain deploys. Raw fetch()/href call sites use
  // src/lib/asset.ts, which must see the same value.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
