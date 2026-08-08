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
import { isRtlLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type BuzzardLocale } from "./types";

const STORAGE_KEY = "buzzard_locale";

interface LocaleContextValue {
  locale: BuzzardLocale;
  setLocale: (locale: BuzzardLocale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectLocale(): BuzzardLocale {
  if (typeof window === "undefined") return "de";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as BuzzardLocale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (browser === "de" || browser === "en" || browser === "tr" || browser === "ar") {
    return browser;
  }
  return "de";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<BuzzardLocale>("de");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, ready]);

  const setLocale = useCallback((next: BuzzardLocale) => {
    setLocaleState(next);
  }, []);

  const value = useMemo(
    (): LocaleContextValue => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
      dir: isRtlLocale(locale) ? "rtl" : "ltr",
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
