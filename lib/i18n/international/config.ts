import countriesData from "@/data/global/global_countries_35.json";
import type { GlobalCountryEntry, LanguageOption, LocaleVariant } from "./types";

export const GLOBAL_COUNTRIES = countriesData as GlobalCountryEntry[];
export const REQUIRED_MARKET_COUNT = 35;

const countryByCode = new Map(GLOBAL_COUNTRIES.map((c) => [c.countryCode, c]));

export function getCountryConfig(countryCode: string): GlobalCountryEntry | undefined {
  return countryByCode.get(String(countryCode || "").toUpperCase());
}

export function listCountryConfigs(): GlobalCountryEntry[] {
  return GLOBAL_COUNTRIES;
}

export function getLocaleVariants(countryCode: string): LocaleVariant[] {
  const country = getCountryConfig(countryCode);
  if (!country) return [];
  const variants = (country as GlobalCountryEntry & { localeVariants?: LocaleVariant[] }).localeVariants;
  if (variants?.length) return variants;
  return [
    {
      languageCode: country.defaultLanguage,
      locale: country.locale,
      nativeName: country.defaultLanguage,
      isDefault: true,
    },
  ];
}

/** Selector options: local languages first; English only when officially supported. */
export function getLanguageOptionsForCountry(countryCode: string): LanguageOption[] {
  const country = getCountryConfig(countryCode);
  if (!country) return [];

  const variants = getLocaleVariants(country.countryCode);
  const code = country.countryCode;

  return variants
    .filter((v) => !v.uiExtension || country.supportedLanguages.includes(v.languageCode))
    .map((v) => ({
      languageCode: v.languageCode,
      nativeName: v.nativeName,
      locale: v.locale,
      countryCode: code,
      countryName: country.nativeCountryName || country.countryName,
      direction: v.languageCode === "ar" ? "rtl" : "ltr",
      uiReady: ["de", "en", "tr", "ar"].includes(v.languageCode),
    }));
}

export function getAllLocalePairs(): Array<{ countryCode: string; locale: string; languageCode: string }> {
  const pairs: Array<{ countryCode: string; locale: string; languageCode: string }> = [];
  for (const country of GLOBAL_COUNTRIES) {
    for (const variant of getLocaleVariants(country.countryCode)) {
      pairs.push({
        countryCode: country.countryCode,
        locale: variant.locale,
        languageCode: variant.languageCode,
      });
    }
  }
  return pairs;
}

export function findCountryByLocale(locale: string): GlobalCountryEntry | undefined {
  const normalized = locale.toLowerCase();
  for (const country of GLOBAL_COUNTRIES) {
    if (country.locale.toLowerCase() === normalized) return country;
    const match = getLocaleVariants(country.countryCode).find(
      (v) => v.locale.toLowerCase() === normalized
    );
    if (match) return country;
  }
  return undefined;
}

export function getDefaultLocaleForCountry(countryCode: string): string {
  const country = getCountryConfig(countryCode);
  return country?.locale ?? "de-DE";
}
