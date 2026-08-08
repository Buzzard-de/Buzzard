import type { BuzzardLocale } from "./types";
import { translate } from "./translations";

export function siteMetadata(locale: BuzzardLocale) {
  return {
    title: translate(locale, "seo.siteTitle"),
    description: translate(locale, "seo.siteDescription"),
    openGraph: {
      title: translate(locale, "seo.ogTitle"),
      description: translate(locale, "seo.ogDescription"),
    },
  };
}

export function htmlLang(locale: BuzzardLocale): string {
  return locale === "ar" ? "ar" : locale;
}
