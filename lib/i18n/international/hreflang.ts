import { absoluteUrl } from "@/lib/seo/config";
import { buildLanguageUrl, localizePath, DEFAULT_LOCALE } from "@/lib/i18n/routing";
import type { BuzzardLanguageCode } from "@/lib/i18n/types";
import { getAllLocalePairs } from "./config";
import { toBuzzardUiLocale } from "./resolveLanguage";

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/**
 * Generate hreflang from existing Buzzard locale-prefix routing (/de/, /fr/, …).
 * Uses actual SITE_URL — no invented domains.
 */
export function buildBuzzardHreflangAlternates(path = "/"): HreflangAlternate[] {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const alternates: HreflangAlternate[] = [];
  const seen = new Set<string>();

  for (const pair of getAllLocalePairs()) {
    const hreflang = pair.locale;
    if (seen.has(hreflang)) continue;
    seen.add(hreflang);

    const uiLocale = toBuzzardUiLocale(pair.languageCode) as BuzzardLanguageCode;
    const localized = buildLanguageUrl(normalized, uiLocale, pair.countryCode);
    alternates.push({
      hreflang,
      href: absoluteUrl(localized),
    });
  }

  alternates.push({
    hreflang: "x-default",
    href: absoluteUrl(localizePath(normalized, DEFAULT_LOCALE)),
  });

  return alternates;
}

export function hreflangLinkTags(path = "/"): string {
  return buildBuzzardHreflangAlternates(path)
    .map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
    .join("\n");
}
