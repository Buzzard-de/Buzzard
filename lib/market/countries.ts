import type { MarketCountry } from "./types";
import {
  getDefaultMarket,
  getMarket,
  listMarkets,
  type MarketConfig,
} from "@/lib/market-engine";
import { LOCALE_LABELS } from "@/lib/i18n/types";
import overlay from "@/data/global/market_country_overlay.json";

/** No language-only pseudo-countries in the Market Engine registry. */
export const LANGUAGE_ONLY_COUNTRY_CODES = new Set<string>();

type OverlayEntry = {
  flag?: string;
  taxRate?: number;
  deliveryDays?: string;
  rtl?: boolean;
  taxModel?: string;
  languageName?: string;
};

const overlayByCode = overlay as Record<string, OverlayEntry>;

function flagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

export function toMarketCountry(market: MarketConfig): MarketCountry {
  const language = market.defaultLanguage;
  const extra = overlayByCode[market.countryCode] ?? {};
  return {
    code: market.countryCode,
    name: market.nativeCountryName || market.countryName,
    flag: extra.flag ?? flagEmoji(market.countryCode),
    language,
    languageName: extra.languageName ?? LOCALE_LABELS[language as keyof typeof LOCALE_LABELS] ?? language,
    currency: market.currency,
    locale: market.locales[0] ?? market.source.locale,
    taxModel: extra.taxModel ?? market.vat.taxModel,
    taxRate: extra.taxRate ?? market.vat.standardRate,
    deliveryDays: extra.deliveryDays ?? "2–5",
    rtl: extra.rtl ?? market.textDirection === "rtl",
  };
}

export function getDeliverableMarketCountries(): MarketCountry[] {
  return listMarkets()
    .filter((market) => market.source.enabled !== false && market.status !== "DISABLED")
    .map(toMarketCountry);
}

export function getMarketCountry(code: string): MarketCountry | undefined {
  const market = getMarket(code);
  if (!market || market.source.enabled === false) return undefined;
  return toMarketCountry(market);
}

export function getDeliverableMarketCountry(code: string): MarketCountry | undefined {
  const country = getMarketCountry(code);
  if (!country || LANGUAGE_ONLY_COUNTRY_CODES.has(country.code)) return undefined;
  const market = getMarket(code);
  if (!market || market.status === "DISABLED") return undefined;
  return country;
}

export function defaultMarketCountryCode(): string {
  return getDefaultMarket().countryCode;
}

export function detectMarketCountryCode(): string {
  if (typeof navigator === "undefined") return defaultMarketCountryCode();

  const lang = (navigator.language || "de-DE").toLowerCase();
  const region = lang.split("-")[1]?.toUpperCase();
  if (region) {
    const match = getDeliverableMarketCountry(region);
    if (match) return match.code;
  }

  const language = lang.split("-")[0];
  const byLanguage = getDeliverableMarketCountries().find((c) => c.language === language);
  return byLanguage?.code ?? defaultMarketCountryCode();
}
