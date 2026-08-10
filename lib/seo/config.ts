export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

export const SEO_DEFAULTS = {
  siteName: "Buzzard24",
  legalName: "Buzzard Kfz-Teile",
  alternateNames: ["Buzzard", "Buzzard24.de", "Buzzard Online-Shop", "Buzzard Autoteile"],
  defaultTitle: "Buzzard24 – Kfz-Teile & Autoteile Online-Shop",
  defaultDescription:
    "Buzzard24 (buzzard24.de) – Online-Shop für Kfz-Teile, Autoteile, Motoröl, Bremsen und Fahrzeugzubehör. Große Auswahl, schnelle Lieferung in Deutschland.",
  locale: "de_DE",
  twitterCard: "summary_large_image" as const,
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path.endsWith("/") ? path : `${path}/`;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized.endsWith("/") ? normalized : `${normalized}/`}`;
}
