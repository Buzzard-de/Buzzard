import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production static hosting still exports. `next dev` must not use
  // `output: "export"` or unknown /produkt/[slug] paths overlay a
  // generateStaticParams error instead of a 404. PIM API slugs stay
  // out of generateStaticParams (Product SoT inactive; no dual-publish).
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
