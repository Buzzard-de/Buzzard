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
import { translate } from "./translations";
import { detectLocale, persistLocale, hasManualLocaleOverride } from "./detect";
import { setRuntimeLocale } from "./runtime";
import { formatDate, formatDateTime, formatNumber, formatPrice, formatPercent } from "./format";
import { isRtlLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type BuzzardLocale } from "./types";
import { getAccountToken } from "@/lib/account/client";

interface LocaleContextValue {
  locale: BuzzardLocale;
  setLocale: (locale: BuzzardLocale, manual?: boolean) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  formatPrice: (amount: number, currency?: string) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatDate: (value: Date | string | number) => string;
  formatDateTime: (value: Date | string | number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

async function syncAccountLanguage(locale: BuzzardLocale) {
  if (!getAccountToken()) return;
  try {
    const { updateAccountPreferences } = await import("@/lib/account/client");
    await updateAccountPreferences({ language: locale });
  } catch {
    /* ignore when API unavailable */
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<BuzzardLocale>("de");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || hasManualLocaleOverride()) return;
    import("@/lib/account/client").then(({ fetchAccountMe, getAccountToken }) => {
      if (!getAccountToken()) return;
      fetchAccountMe()
        .then((me) => {
          const lang = me.preferences?.language as BuzzardLocale | undefined;
          if (lang && SUPPORTED_LOCALES.includes(lang)) {
            setLocaleState(lang);
          }
        })
        .catch(() => {});
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    setRuntimeLocale(locale);
    document.documentElement.lang = locale === "ar" ? "ar" : locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    persistLocale(locale);
  }, [locale, ready]);

  const setLocale = useCallback((next: BuzzardLocale, manual = true) => {
    setLocaleState(next);
    persistLocale(next, manual);
    if (manual) syncAccountLanguage(next);
  }, []);

  const value = useMemo(
    (): LocaleContextValue => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
      dir: isRtlLocale(locale) ? "rtl" : "ltr",
      formatPrice: (amount, currency = "EUR") => formatPrice(amount, locale, currency),
      formatNumber: (value) => formatNumber(value, locale),
      formatPercent: (value) => formatPercent(value, locale),
      formatDate: (value) => formatDate(value, locale),
      formatDateTime: (value) => formatDateTime(value, locale),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export { LOCALE_LABELS, SUPPORTED_LOCALES };
