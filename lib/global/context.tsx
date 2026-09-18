"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import type { BuzzardLocale } from "@/lib/i18n/types";
import {
  applyCountryLocalePersistence,
  buildLocalizedUrlForSelection,
  resolveLanguageForCountry,
  resolveLocaleForCountryChange,
} from "@/lib/i18n/international/countryLocaleSwitch";
import { validateCountryCode } from "@/lib/i18n/international/validateInput";
import { getGlobalCountry, type GlobalLocaleContextValue } from "./types";

const GlobalLocaleContext = createContext<GlobalLocaleContextValue | null>(null);

export function GlobalLocaleProvider({ children }: { children: ReactNode }) {
  const { locale, setLocale, dir } = useLocale();
  const { countryCode, country, currency, setCountryCode } = useMarket();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const globalCountry = getGlobalCountry(countryCode);

  const navigateForSelection = useCallback(
    (selection: NonNullable<ReturnType<typeof resolveLocaleForCountryChange>>) => {
      const nextUrl = buildLocalizedUrlForSelection(pathname, selection);
      if (nextUrl !== pathname) {
        router.push(nextUrl);
      }
    },
    [pathname, router],
  );

  const setCountry = useCallback(
    (code: string, manual = true) => {
      const valid = validateCountryCode(code);
      if (!valid) return;

      const selection = resolveLocaleForCountryChange(valid, {
        respectManualLanguage: false,
      });
      if (!selection) return;

      setCountryCode(valid, manual);
      setLocale(selection.languageCode as BuzzardLocale, false);
      applyCountryLocalePersistence(selection, { manualCountry: manual, manualLanguage: false });
      navigateForSelection(selection);
    },
    [navigateForSelection, setCountryCode, setLocale],
  );

  const setLanguage = useCallback(
    (code: string, manual = true) => {
      const selection = resolveLanguageForCountry(countryCode, code);
      if (!selection) return;

      setLocale(selection.languageCode as BuzzardLocale, manual);
      applyCountryLocalePersistence(selection, { manualLanguage: manual });
      navigateForSelection(selection);
    },
    [countryCode, navigateForSelection, setLocale],
  );

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
      uiReady: true,
      setCountry,
      setLanguage,
    }),
    [country, countryCode, currency, dir, globalCountry, locale, setCountry, setLanguage],
  );

  return <GlobalLocaleContext.Provider value={value}>{children}</GlobalLocaleContext.Provider>;
}

export function useGlobalLocale() {
  const ctx = useContext(GlobalLocaleContext);
  if (!ctx) throw new Error("useGlobalLocale must be used within GlobalLocaleProvider");
  return ctx;
}
