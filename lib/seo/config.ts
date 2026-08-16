export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");

export const SEO_DEFAULTS = {
  siteName: "Buzzard24",
  legalName: "Buzzard Kfz-Teile",
  alternateNames: ["Buzzard", "Buzzard24.de", "Buzzard Online-Shop", "Buzzard Autoteile"],
  defaultTitle: "Buzzard24 – Online-Katalog mit 41 Kategorien",
  defaultDescription:
    "Buzzard24 (buzzard24.de) – Demo-Katalog mit 41 Kategorien: Automotive, Textil, Elektronik, Garten, Haushalt und mehr. Produkte entdecken — Online-Verkauf startet demnächst.",
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
