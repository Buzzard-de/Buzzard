import { SUPPORTED_LOCALES, type BuzzardLocale } from "./types";
import { absoluteUrl } from "@/lib/seo/config";

export const DEFAULT_LOCALE: BuzzardLocale = "de";
export const LOCALE_PREFIX_PATTERN =
  /^\/(de|en|tr|ar|fr|nl|bg|hr|el|cs|da|et|fi|hu|it|lv|lt|lb|mt|pl|pt|ro|sk|sl|es|ca|eu|gl|sv|ga)(\/|$)/;

export function stripLocalePrefix(pathname: string): { locale: BuzzardLocale | null; path: string } {
  const match = pathname.match(LOCALE_PREFIX_PATTERN);
  if (!match) return { locale: null, path: pathname };
  const locale = match[1] as BuzzardLocale;
  const path = pathname.replace(LOCALE_PREFIX_PATTERN, "/") || "/";
  return { locale, path: path.endsWith("/") ? path : `${path}/` };
}

export function localizePath(path: string, locale: BuzzardLocale): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const clean = normalized.endsWith("/") ? normalized : `${normalized}/`;
  if (locale === DEFAULT_LOCALE) return clean;
  if (LOCALE_PREFIX_PATTERN.test(clean)) return clean;
  return `/${locale}${clean === "/" ? "/" : clean}`;
}

export function localeLandingPath(locale: BuzzardLocale): string {
  return `/${locale}/`;
}

export function isRoutingLocale(lang: string): lang is BuzzardLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang);
}

/** Every supported catalog language is a URL prefix. Unknown codes use German. */
export function toRoutingLocale(lang: string): BuzzardLocale {
  return isRoutingLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Build a prefixed path. Country is an extra query, not a substitute for the language prefix. */
export function buildLanguageUrl(path: string, languageCode: string, countryCode?: string): string {
  const localized = localizePath(path, toRoutingLocale(languageCode));
  if (!countryCode) return localized;
  const sep = localized.includes("?") ? "&" : "?";
  return `${localized}${sep}country=${countryCode}&lang=${languageCode}`;
}

export function hreflangAlternates(path = "/"): Array<{ locale: BuzzardLocale; href: string }> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const basePath = stripLocalePrefix(normalized).path;
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    href: absoluteUrl(localizePath(basePath, locale)),
  }));
}
