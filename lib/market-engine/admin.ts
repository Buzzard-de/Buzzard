import { getMarketLanguages } from "./registry";
import { getMarketplaces } from "./marketplace";
import { getMarketPaymentCapabilities } from "./payment";
import { getShippingRegion } from "./shipping";
import { listMarkets } from "./registry";
import type { MarketEngineAdminRow } from "./types";

function formatLanguageList(countryCode: string): string {
  const langs = getMarketLanguages(countryCode);
  const names: Record<string, string> = {
    de: "Deutsch", en: "English", fr: "Français", it: "Italiano", es: "Español",
    pl: "Polski", nl: "Nederlands", tr: "Türkçe", ar: "العربية",
  };
  return langs.map((l) => names[l] ?? l).join(" / ");
}

export function getMarketEngineAdminOverview(): MarketEngineAdminRow[] {
  return listMarkets().map((market) => ({
    country: market.countryCode,
    countryName: market.nativeCountryName,
    languages: formatLanguageList(market.countryCode),
    currency: market.currency,
    vatRate: `${Math.round(market.vat.standardRate * 1000) / 10}%`,
    shippingRegion: getShippingRegion(market.countryCode),
    paymentCapabilities: getMarketPaymentCapabilities(market.countryCode).join(", "),
    marketplaces: getMarketplaces(market.countryCode).map((m) => m.name).join(" / ") || "—",
    status: market.status,
  }));
}
