import {
  hasManualLocaleOverride,
  persistLocale,
  persistMarketLocale,
  readStoredLocale,
} from "@/lib/i18n/detect";
import { buildLanguageUrl, stripLocalePrefix } from "@/lib/i18n/routing";
import type { BuzzardLanguageCode, BuzzardLocale } from "@/lib/i18n/types";
import { getCountryConfig, getDefaultLocaleForCountry, getLanguageOptionsForCountry } from "./config";
import { resolveLanguage, toBuzzardUiLocale } from "./resolveLanguage";
import { isLanguageSupportedForCountry, validateCountryCode, validateLanguageCode } from "./validateInput";

export interface CountryLocaleSelection {
  countryCode: string;
  languageCode: BuzzardLanguageCode;
  locale: string;
  direction: "ltr" | "rtl";
  defaultLocale: string;
  supportedLocales: string[];
}

export function countryCodeToFlag(countryCode: string): string {
  const code = validateCountryCode(countryCode);
  if (!code) return "🏳️";
  const base = 0x1f1e6 - 65;
  return String.fromCodePoint(base + code.charCodeAt(0), base + code.charCodeAt(1));
}

export function getDefaultLanguageForCountry(countryCode: string): BuzzardLanguageCode {
  const country = getCountryConfig(validateCountryCode(countryCode) ?? "DE");
  const lang = country?.defaultLanguage ?? "de";
  return toBuzzardUiLocale(lang);
}

export function buildCountryLocaleSelection(
  countryCode: string,
  languageCode?: string,
): CountryLocaleSelection | null {
  const validCountry = validateCountryCode(countryCode);
  if (!validCountry) return null;

  const lang = languageCode ?? getDefaultLanguageForCountry(validCountry);
  const resolved = resolveLanguage({
    explicitCountryCode: validCountry,
    explicitLanguage: lang,
    manualOverride: true,
  });

  const uiLocale = toBuzzardUiLocale(resolved.languageCode);
  const options = getLanguageOptionsForCountry(validCountry);

  return {
    countryCode: validCountry,
    languageCode: uiLocale,
    locale: resolved.locale,
    direction: resolved.direction,
    defaultLocale: getDefaultLocaleForCountry(validCountry),
    supportedLocales: options.map((o) => o.locale),
  };
}

/** Country change → default locale (unless user manually picked language). */
export function resolveLocaleForCountryChange(
  countryCode: string,
  options: { respectManualLanguage?: boolean } = {},
): CountryLocaleSelection | null {
  const validCountry = validateCountryCode(countryCode);
  if (!validCountry) return null;

  const respectManual = options.respectManualLanguage ?? hasManualLocaleOverride();
  const savedLang = respectManual ? readStoredLocale() ?? undefined : undefined;

  const resolved = resolveLanguage({
    explicitCountryCode: validCountry,
    savedLanguage: savedLang,
    savedManualOverride: respectManual,
    manualOverride: respectManual,
  });

  const uiLocale = toBuzzardUiLocale(resolved.languageCode);
  const langOptions = getLanguageOptionsForCountry(validCountry);

  return {
    countryCode: validCountry,
    languageCode: uiLocale,
    locale: resolved.locale,
    direction: resolved.direction,
    defaultLocale: getDefaultLocaleForCountry(validCountry),
    supportedLocales: langOptions.map((o) => o.locale),
  };
}

export function applyCountryLocalePersistence(
  selection: CountryLocaleSelection,
  options: { manualCountry?: boolean; manualLanguage?: boolean } = {},
): void {
  persistMarketLocale(selection.locale, options.manualLanguage ?? false);
  persistLocale(selection.languageCode as BuzzardLocale, options.manualLanguage ?? false);
  void options.manualCountry;
}

export function buildLocalizedUrlForSelection(
  pathname: string,
  selection: CountryLocaleSelection,
): string {
  const { path } = stripLocalePrefix(pathname);
  return buildLanguageUrl(path, selection.languageCode, selection.countryCode);
}

export function resolveLanguageForCountry(
  countryCode: string,
  languageCode: string,
): CountryLocaleSelection | null {
  const validCountry = validateCountryCode(countryCode);
  const validLang = validateLanguageCode(languageCode);
  if (!validCountry || !validLang) return null;
  if (!isLanguageSupportedForCountry(validCountry, validLang)) return null;

  return buildCountryLocaleSelection(validCountry, validLang);
}

/** First-visit bootstrap — explicit preference > saved > browser > country default. */
export function bootstrapCountryLocale(input: {
  savedCountryCode?: string | null;
  savedLanguage?: string | null;
  browserLanguages?: string[];
}): CountryLocaleSelection {
  const resolved = resolveLanguage({
    savedCountryCode: input.savedCountryCode ?? undefined,
    savedLanguage: input.savedLanguage ?? undefined,
    savedManualOverride: hasManualLocaleOverride(),
    browserLanguages: input.browserLanguages,
    browserLocale: input.browserLanguages?.[0],
  });

  const uiLocale = toBuzzardUiLocale(resolved.languageCode);
  const options = getLanguageOptionsForCountry(resolved.countryCode);

  return {
    countryCode: resolved.countryCode,
    languageCode: uiLocale,
    locale: resolved.locale,
    direction: resolved.direction,
    defaultLocale: getDefaultLocaleForCountry(resolved.countryCode),
    supportedLocales: options.map((o) => o.locale),
  };
}
