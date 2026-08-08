export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

export const SEO_DEFAULTS = {
  siteName: "Buzzard",
  locale: "de_DE",
  twitterCard: "summary_large_image" as const,
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized.endsWith("/") ? normalized : `${normalized}/`}`;
}
