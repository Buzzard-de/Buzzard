"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { getGlobalCountry, type GlobalLocaleContextValue } from "./types";

const GlobalLocaleContext = createContext<GlobalLocaleContextValue | null>(null);

export function GlobalLocaleProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale, dir } = useLocale();
  const { countryCode, country, currency, setCountryCode } = useMarket();
  const globalCountry = getGlobalCountry(countryCode);

  const value = useMemo(
    (): GlobalLocaleContextValue => ({
      country: countryCode,
      countryName: globalCountry?.nativeCountryName || country.name,
      language: locale,
      locale: globalCountry?.locale || country.locale,
      currency,
      direction: dir,
      measurementSystem: "metric",
      dateFormat: "DD.MM.YYYY",
      numberFormat: globalCountry?.locale || locale,
      fallbackLanguage: globalCountry?.fallbackLanguage || "de",
      uiReady: ["de", "en", "tr", "ar"].includes(locale),
      setCountry: (code, manual = true) => setCountryCode(code, manual),
      setLanguage: (code, manual = true) => setLocale(code as BuzzardLocale, manual),
    }),
    [country, countryCode, currency, dir, globalCountry, locale, setCountryCode, setLocale]
  );

  return <GlobalLocaleContext.Provider value={value}>{children}</GlobalLocaleContext.Provider>;
}

export function useGlobalLocale() {
  const ctx = useContext(GlobalLocaleContext);
  if (!ctx) throw new Error("useGlobalLocale must be used within GlobalLocaleProvider");
  return ctx;
}
