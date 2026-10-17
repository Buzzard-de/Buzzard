import type { NextConfig } from "next";

// Next compiles this file into the active distDir cache. When `next dev`
// and `next build` share `.next`, the production export overwrites the live
// webpack chunks and next-server returns HTTP 500 (missing './3897.js').
// Keep development artifacts in `.next-dev` so `next build` can use the
// framework default `.next` without clobbering the running dev server.
const nextConfig: NextConfig = {
  // Production static hosting still exports. `next dev` must not use
  // `output: "export"` or unknown /produkt/[slug] paths overlay a
  // generateStaticParams error instead of a 404. PIM API slugs stay
  // out of generateStaticParams (Product SoT inactive; no dual-publish).
  distDir: process.env.NODE_ENV === "production" ? ".next" : ".next-dev",
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
