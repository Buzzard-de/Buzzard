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
import type { BuzzardLocale } from "@/lib/i18n/types";
import { hasManualLocaleOverride } from "@/lib/i18n/detect";
import { useLocale } from "@/lib/i18n/context";
import {
  defaultMarketCountryCode,
  detectMarketCountryCode,
  getDeliverableMarketCountry,
} from "./countries";
import type { MarketCountry } from "./types";
import {
  hasManualCountryOverride,
  persistCountryCode,
  readStoredCountryCode,
} from "./storage";

interface MarketContextValue {
  countryCode: string;
  country: MarketCountry;
  currency: string;
  deliveryDays: string;
  setCountryCode: (code: string, manual?: boolean) => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const { setLocale } = useLocale();
  const [countryCode, setCountryCodeState] = useState(defaultMarketCountryCode());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredCountryCode();
    const detected = detectMarketCountryCode();
    const initial = getDeliverableMarketCountry(stored ?? detected)?.code ?? defaultMarketCountryCode();
    setCountryCodeState(initial);
    setReady(true);
  }, []);

  const setCountryCode = useCallback(
    (code: string, manual = true) => {
      const country = getDeliverableMarketCountry(code);
      if (!country) return;

      setCountryCodeState(country.code);
      persistCountryCode(country.code, manual);

      if (manual && !hasManualLocaleOverride()) {
        const locale = country.language as BuzzardLocale;
        if (["de", "en", "tr", "ar"].includes(locale)) {
          setLocale(locale, false);
        }
      }
    },
    [setLocale]
  );

  useEffect(() => {
    if (!ready || hasManualCountryOverride()) return;
    const detected = detectMarketCountryCode();
    const country = getDeliverableMarketCountry(detected);
    if (country) setCountryCodeState(country.code);
  }, [ready]);

  const country = getDeliverableMarketCountry(countryCode) ?? getDeliverableMarketCountry("DE")!;

  const value = useMemo(
    (): MarketContextValue => ({
      countryCode: country.code,
      country,
      currency: country.currency,
      deliveryDays: country.deliveryDays,
      setCountryCode,
    }),
    [country, setCountryCode]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used within MarketProvider");
  return ctx;
}
