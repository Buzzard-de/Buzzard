"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultMarketCountryCode,
  getDeliverableMarketCountry,
} from "./countries";
import { fetchCountryConfig } from "@/lib/localizationFeeds/client";
import { isLocalizationFeedsEnabled } from "@/lib/api/config";
import type { LocalizationCountryConfig } from "@/lib/localizationFeeds/types";
import type { MarketCountry } from "./types";
import { persistCountryCode } from "./storage";
import { resolveBootCountryCode } from "./resolveInitialCountry";

interface MarketContextValue {
  countryCode: string;
  country: MarketCountry;
  currency: string;
  deliveryDays: string;
  taxRate: number;
  ready: boolean;
  setCountryCode: (code: string, manual?: boolean) => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCodeState] = useState(defaultMarketCountryCode());
  const [ready, setReady] = useState(false);
  const [apiCountryConfig, setApiCountryConfig] = useState<LocalizationCountryConfig | null>(null);

  useEffect(() => {
    setCountryCodeState(resolveBootCountryCode());
    setReady(true);
  }, []);

  const setCountryCode = useCallback((code: string, manual = true) => {
    const country = getDeliverableMarketCountry(code);
    if (!country) return;

    setCountryCodeState(country.code);
    persistCountryCode(country.code, manual);
  }, []);

  useEffect(() => {
    if (!ready || !isLocalizationFeedsEnabled()) {
      setApiCountryConfig(null);
      return;
    }
    fetchCountryConfig(countryCode)
      .then(setApiCountryConfig)
      .catch(() => setApiCountryConfig(null));
  }, [countryCode, ready]);

  const country = getDeliverableMarketCountry(countryCode) ?? getDeliverableMarketCountry("DE")!;

  const value = useMemo(
    (): MarketContextValue => ({
      countryCode: country.code,
      country,
      currency: apiCountryConfig?.locale?.currency || country.currency,
      deliveryDays: country.deliveryDays,
      taxRate: apiCountryConfig?.taxRate ?? country.taxRate,
      ready,
      setCountryCode,
    }),
    [country, setCountryCode, apiCountryConfig, ready]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used within MarketProvider");
  return ctx;
}
