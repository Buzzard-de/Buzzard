"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { resolveLocaleAfterMarketChange } from "@/lib/i18n/marketCompatibility";

/**
 * Applies locale fallback only when a market change makes the current language invalid.
 * Does not live in MarketProvider (language and market stay independently stored).
 */
export default function LocaleMarketBridge({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useLocale();
  const { countryCode, ready } = useMarket();
  const previousCountry = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (previousCountry.current === null) {
      previousCountry.current = countryCode;
      return;
    }
    if (previousCountry.current === countryCode) return;
    previousCountry.current = countryCode;
    const next = resolveLocaleAfterMarketChange(locale, countryCode);
    if (next !== locale) setLocale(next, false);
  }, [ready, countryCode, locale, setLocale]);

  return <>{children}</>;
}
