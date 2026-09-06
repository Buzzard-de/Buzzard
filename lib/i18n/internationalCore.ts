/**
 * Buzzard International i18n Core — 35 markets (27 EU + TR + 6 GCC + EG).
 * Complements existing lib/i18n (de/en/tr/ar UI) and lib/market (shipping/tax).
 */
import marketsJson from "@/data/buzzard_international_markets_35.json";
import { TRANSLATIONS, EN_DICTIONARY } from "./internationalDictionaries";
import type { TranslationDictionary } from "./internationalTypes";
import type { BuzzardLocale } from "./types";

export type Direction = "ltr" | "rtl";

export type CountryCode =
  | "DE" | "AT" | "BE" | "BG" | "HR" | "CY" | "CZ" | "DK"
  | "EE" | "FI" | "FR" | "GR" | "HU" | "IE" | "IT" | "LV"
  | "LT" | "LU" | "MT" | "NL" | "PL" | "PT" | "RO" | "SK"
  | "SI" | "ES" | "SE"
  | "TR"
  | "SA" | "AE" | "QA" | "KW" | "BH" | "OM"
  | "EG";

export type Locale =
  | "de-DE" | "de-AT" | "fr-BE" | "nl-BE" | "de-BE" | "bg-BG" | "hr-HR"
  | "el-CY" | "cs-CZ" | "da-DK" | "et-EE" | "fi-FI" | "fr-FR" | "el-GR"
  | "hu-HU" | "en-IE" | "it-IT" | "lv-LV" | "lt-LT" | "lb-LU" | "fr-LU"
  | "de-LU" | "mt-MT" | "nl-NL" | "pl-PL" | "pt-PT" | "ro-RO" | "sk-SK"
  | "sl-SI" | "es-ES" | "sv-SE" | "tr-TR"
  | "ar-SA" | "ar-AE" | "ar-QA" | "ar-KW" | "ar-BH" | "ar-OM" | "ar-EG";

export interface MarketConfig {
  country: CountryCode;
  name: string;
  nativeName: string;
  locale: Locale;
  language: string;
  languageName: string;
  direction: Direction;
  currency: string;
  currencySymbol: string;
  vatRate: number;
  domain: string;
  timezone: string;
  enabled: boolean;
}

export type { TranslationDictionary } from "./internationalTypes";

export const MARKETS = marketsJson as Record<CountryCode, MarketConfig>;

export const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  nl: "Nederlands",
  bg: "Български",
  hr: "Hrvatski",
  el: "Ελληνικά",
  cs: "Čeština",
  da: "Dansk",
  et: "Eesti",
  fi: "Suomi",
  hu: "Magyar",
  en: "English",
  it: "Italiano",
  lv: "Latviešu",
  lt: "Lietuvių",
  lb: "Lëtzebuergesch",
  mt: "Malti",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  sk: "Slovenčina",
  sl: "Slovenščina",
  es: "Español",
  sv: "Svenska",
  tr: "Türkçe",
  ar: "العربية",
};

const LANGUAGE_STORAGE_KEY = "buzzard-language";
const COUNTRY_STORAGE_KEY = "buzzard-country";

export function getMarketByLocale(locale: string): MarketConfig | undefined {
  return Object.values(MARKETS).find(
    (market) => market.locale.toLowerCase() === locale.toLowerCase()
  );
}

export function getMarket(country: CountryCode): MarketConfig {
  return MARKETS[country];
}

export function normalizeLanguage(input?: string): string {
  if (!input) return "en";
  const language = input.replace("_", "-").split("-")[0].toLowerCase();
  return TRANSLATIONS[language] ? language : "en";
}

export function normalizeLocale(locale?: string, fallback = "en-GB"): string {
  if (!locale) return fallback;
  const exact = Object.values(MARKETS).find(
    (m) => m.locale.toLowerCase() === locale.toLowerCase()
  );
  if (exact) return exact.locale;
  const language = normalizeLanguage(locale);
  const match = Object.values(MARKETS).find((m) => m.language === language);
  return match?.locale ?? fallback;
}

export function detectBrowserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of languages) {
    const normalized = normalizeLanguage(lang);
    if (TRANSLATIONS[normalized]) return normalized;
  }
  return "en";
}

/** Browser fallback — production should prefer server GeoIP/CDN headers. */
export async function detectCountry(): Promise<CountryCode> {
  try {
    const response = await fetch("/api/geo", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as { country?: string };
      if (data?.country && MARKETS[data.country as CountryCode]) {
        return data.country as CountryCode;
      }
    }
  } catch {
    /* silent fallback */
  }
  return "DE";
}

export async function resolveInitialMarket(): Promise<MarketConfig> {
  const country = await detectCountry();
  return MARKETS[country] ?? MARKETS.DE;
}

export function getTranslations(locale?: string): TranslationDictionary {
  const language = normalizeLanguage(locale);
  return TRANSLATIONS[language] ?? EN_DICTIONARY;
}

export function t(locale: string, key: keyof TranslationDictionary): string {
  const dictionary = getTranslations(locale);
  return dictionary[key] ?? EN_DICTIONARY[key] ?? key;
}

export function formatCurrency(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatMarketPrice(amount: number, country: CountryCode): string {
  const market = MARKETS[country];
  return formatCurrency(amount, market.currency, market.locale);
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(date: Date | string | number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(
  date: Date | string | number,
  locale: string,
  timezone?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(date));
}

export function isRTL(locale: string): boolean {
  return normalizeLanguage(locale) === "ar";
}

export function applyDocumentDirection(locale: string): void {
  if (typeof document === "undefined") return;
  const direction = isRTL(locale) ? "rtl" : "ltr";
  document.documentElement.dir = direction;
  document.documentElement.lang = locale;
  document.body.dir = direction;
  document.documentElement.classList.toggle("rtl", direction === "rtl");
  document.documentElement.classList.toggle("ltr", direction === "ltr");
}

export function saveLanguage(locale: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLocale(locale));
}

export function getSavedLanguage(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LANGUAGE_STORAGE_KEY);
}

export function saveCountry(country: CountryCode): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(COUNTRY_STORAGE_KEY, country);
}

export function getSavedCountry(): CountryCode | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(COUNTRY_STORAGE_KEY);
  if (value && MARKETS[value as CountryCode]) return value as CountryCode;
  return null;
}

export function changeLanguage(locale: string): MarketConfig | undefined {
  const normalized = normalizeLocale(locale);
  const market = getMarketByLocale(normalized);
  saveLanguage(normalized);
  applyDocumentDirection(normalized);
  return market;
}

export function changeCountry(country: CountryCode): MarketConfig {
  const market = MARKETS[country];
  saveCountry(country);
  saveLanguage(market.locale);
  applyDocumentDirection(market.locale);
  return market;
}

export function getLocalizedPath(path: string, locale: string): string {
  const normalized = normalizeLocale(locale);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${normalized}${cleanPath}`;
}

export function removeLocaleFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return "/";
  const possibleLocale = parts[0];
  const isLocale = Object.values(MARKETS).some((market) => market.locale === possibleLocale);
  if (!isLocale) return path;
  return `/${parts.slice(1).join("/")}`;
}

export interface HreflangEntry {
  locale: string;
  url: string;
}

export function generateHreflang(baseUrl: string, path = ""): HreflangEntry[] {
  const entries: HreflangEntry[] = [];
  for (const market of Object.values(MARKETS)) {
    entries.push({
      locale: market.locale,
      url: `${baseUrl.replace(/\/$/, "")}/${market.locale}${path.startsWith("/") ? path : `/${path}`}`,
    });
  }
  entries.push({
    locale: "x-default",
    url: `${baseUrl.replace(/\/$/, "")}/en-GB${path.startsWith("/") ? path : `/${path}`}`,
  });
  return entries;
}

export function createHreflangTags(baseUrl: string, path = ""): string {
  return generateHreflang(baseUrl, path)
    .map((entry) => `<link rel="alternate" hreflang="${entry.locale}" href="${entry.url}" />`)
    .join("\n");
}

export function isMarketEnabled(country: CountryCode): boolean {
  return MARKETS[country]?.enabled === true;
}

export function getEnabledMarkets(): MarketConfig[] {
  return Object.values(MARKETS).filter((market) => market.enabled);
}

export function getRTLMarkets(): MarketConfig[] {
  return Object.values(MARKETS).filter((market) => market.direction === "rtl");
}

export function getCountrySelectorData() {
  return getEnabledMarkets().map((market) => ({
    country: market.country,
    name: market.name,
    nativeName: market.nativeName,
    locale: market.locale,
    language: market.language,
    languageName: market.languageName,
    currency: market.currency,
    direction: market.direction,
    domain: market.domain,
  }));
}

export function getLanguageSelectorData() {
  const unique = new Map<string, { language: string; name: string; direction: Direction }>();
  for (const market of Object.values(MARKETS)) {
    if (!unique.has(market.language)) {
      unique.set(market.language, {
        language: market.language,
        name: market.languageName,
        direction: market.direction,
      });
    }
  }
  return [...unique.values()];
}

export function validateMarkets(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const markets = Object.values(MARKETS);
  if (markets.length !== 35) {
    errors.push(`Expected 35 markets, found ${markets.length}.`);
  }
  for (const market of markets) {
    if (!market.country) errors.push("Missing country code.");
    if (!market.locale) errors.push(`${market.country}: missing locale.`);
    if (!market.currency) errors.push(`${market.country}: missing currency.`);
    if (market.direction === "rtl" && market.language !== "ar") {
      errors.push(`${market.country}: invalid RTL configuration.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Map 35-market language to existing storefront UI locale (de/en/tr/ar). */
export function toBuzzardLocale(languageOrLocale: string): BuzzardLocale {
  const language = normalizeLanguage(languageOrLocale);
  if (language === "de" || language === "en" || language === "tr" || language === "ar") {
    return language;
  }
  if (language === "ar") return "ar";
  return "en";
}

export async function initializeBuzzardI18n(): Promise<MarketConfig> {
  const savedCountry = getSavedCountry();
  const savedLanguage = getSavedLanguage();
  let market: MarketConfig;
  if (savedCountry && MARKETS[savedCountry]) {
    market = MARKETS[savedCountry];
  } else {
    market = await resolveInitialMarket();
  }
  const finalLocale = savedLanguage ?? market.locale;
  applyDocumentDirection(finalLocale);
  return market;
}

export { TRANSLATIONS };
