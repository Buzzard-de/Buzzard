"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { getMarket } from "./registry";
import type { BuzzardMarketContextValue, MarketConfig } from "./types";

const BuzzardMarketContext = createContext<BuzzardMarketContextValue | null>(null);

export function BuzzardMarketProvider({ children }: { children: ReactNode }) {
  const { countryCode } = useMarket();
  const { locale } = useLocale();

  const value = useMemo((): BuzzardMarketContextValue => {
    const market: MarketConfig = getMarket(countryCode) ?? getMarket("DE")!;
    const language = locale || market.defaultLanguage;

    return {
      market,
      country: market.countryCode,
      language,
      currency: market.currency,
      vat: market.vat,
      shippingRegion: market.shippingRegion,
      paymentRegion: market.paymentRegion,
      legalRegion: market.legalRegion,
      returnRegion: market.returnRegion,
      supplierRegion: market.supplierRegion,
      status: market.status,
      featureFlags: market.featureFlags,
    };
  }, [countryCode, locale]);

  return (
    <BuzzardMarketContext.Provider value={value}>{children}</BuzzardMarketContext.Provider>
  );
}

export function useBuzzardMarket(): BuzzardMarketContextValue {
  const ctx = useContext(BuzzardMarketContext);
  if (!ctx) throw new Error("useBuzzardMarket must be used within BuzzardMarketProvider");
  return ctx;
}
