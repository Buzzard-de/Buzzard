import { getMarket, getMarketCurrency, listMarkets } from "@/lib/market-engine/registry";

export function resolveMarketContext(input: {
  market?: string;
  country?: string;
  language?: string;
}): { market: string; country: string; language: string; currency: string } {
  const marketCode = (input.market ?? input.country ?? "DE").toUpperCase();
  const market = getMarket(marketCode);
  const fallback = listMarkets()[0];

  return {
    market: marketCode,
    country: marketCode,
    language: input.language ?? market?.defaultLanguage ?? fallback?.defaultLanguage ?? "de",
    currency: getMarketCurrency(marketCode).code,
  };
}

export function isValidMarketCode(code: string): boolean {
  return Boolean(getMarket(code.toUpperCase()));
}
