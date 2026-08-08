import { SUPPORTED_LOCALES, type BuzzardLocale } from "./types";

export const DEFAULT_LOCALE: BuzzardLocale = "de";
export const LOCALE_PREFIX_PATTERN = /^\/(de|en|tr|ar)(\/|$)/;

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

export function hreflangAlternates(path = "/"): Array<{ locale: BuzzardLocale; href: string }> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const basePath = stripLocalePrefix(normalized).path;
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    href: localizePath(basePath, locale),
  }));
}
