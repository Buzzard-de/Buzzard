import type { BuzzardLanguageCode, BuzzardRoutingLocale } from "./types";
import { ROUTING_LOCALE_PREFIXES } from "./types";
import { absoluteUrl } from "@/lib/seo/config";

export const DEFAULT_LOCALE: BuzzardRoutingLocale = "de";
export const LOCALE_PREFIX_PATTERN = /^\/(de|en|tr|ar)(\/|$)/;

export function isRoutingLocale(lang: BuzzardLanguageCode): lang is BuzzardRoutingLocale {
  return (ROUTING_LOCALE_PREFIXES as readonly string[]).includes(lang);
}

/** Map UI language to URL prefix locale (non-routing langs use default German path). */
export function toRoutingLocale(lang: BuzzardLanguageCode): BuzzardRoutingLocale {
  return isRoutingLocale(lang) ? lang : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): { locale: BuzzardRoutingLocale | null; path: string } {
  const match = pathname.match(LOCALE_PREFIX_PATTERN);
  if (!match) return { locale: null, path: pathname };
  const locale = match[1] as BuzzardRoutingLocale;
  const path = pathname.replace(LOCALE_PREFIX_PATTERN, "/") || "/";
  return { locale, path: path.endsWith("/") ? path : `${path}/` };
}

export function localizePath(path: string, locale: BuzzardRoutingLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const clean = normalized.endsWith("/") ? normalized : `${normalized}/`;
  if (locale === DEFAULT_LOCALE) return clean;
  if (LOCALE_PREFIX_PATTERN.test(clean)) return clean;
  return `/${locale}${clean === "/" ? "/" : clean}`;
}

export function localeLandingPath(locale: BuzzardRoutingLocale): string {
  return `/${locale}/`;
}

/** Build localized URL — routing prefix for de/en/tr/ar; query params for other languages. */
export function buildLanguageUrl(
  path: string,
  languageCode: BuzzardLanguageCode,
  countryCode?: string
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (isRoutingLocale(languageCode)) {
    const localized = localizePath(normalized, languageCode);
    if (!countryCode) return localized;
    const sep = localized.includes("?") ? "&" : "?";
    return `${localized}${sep}country=${countryCode}&lang=${languageCode}`;
  }

  const base = localizePath(normalized, DEFAULT_LOCALE);
  const sep = base.includes("?") ? "&" : "?";
  const country = countryCode ?? "DE";
  return `${base}${sep}country=${country}&lang=${languageCode}`;
}

/** Prefix-locale hreflang; full 35-market matrix lives in international/hreflang. */
export function hreflangAlternates(path = "/"): Array<{ locale: string; href: string }> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const basePath = stripLocalePrefix(normalized).path;
  return ROUTING_LOCALE_PREFIXES.map((locale) => ({
    locale,
    href: absoluteUrl(localizePath(basePath, locale)),
  }));
}
