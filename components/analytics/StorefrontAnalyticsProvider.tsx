"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";
import { readConsent } from "@/lib/marketing/consent";
import {
  trackLanguageChanged,
  trackMarketChanged,
  trackCheckoutAbandoned,
  trackStorefrontConsentChange,
  trackStorefrontConsentWithdrawn,
} from "@/lib/analytics/storefront/bridge";
import { CHECKOUT_STARTED_KEY, LAST_LOCALE_KEY, LAST_MARKET_KEY } from "@/lib/analytics/storefront/constants";

export default function StorefrontAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { countryCode, currency } = useMarket();
  const prevLocale = useRef<string | null>(null);
  const prevMarket = useRef<string | null>(null);
  const checkoutStarted = useRef(false);

  useEffect(() => {
    function onConsent(event: Event) {
      const detail = (event as CustomEvent).detail as { analytics?: boolean } | undefined;
      if (!detail) return;
      if (detail.analytics) trackStorefrontConsentChange(true, countryCode);
      else trackStorefrontConsentWithdrawn(countryCode);
    }

    window.addEventListener("buzzard:consent", onConsent);
    const existing = readConsent();
    if (existing?.analytics) trackStorefrontConsentChange(true, countryCode);

    return () => window.removeEventListener("buzzard:consent", onConsent);
  }, [countryCode]);

  useEffect(() => {
    if (prevLocale.current && prevLocale.current !== locale) {
      trackLanguageChanged(prevLocale.current, locale, countryCode, currency);
    }
    prevLocale.current = locale;
    try {
      localStorage.setItem(LAST_LOCALE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale, countryCode, currency]);

  useEffect(() => {
    if (prevMarket.current && prevMarket.current !== countryCode) {
      trackMarketChanged(prevMarket.current, countryCode, locale, currency);
    }
    prevMarket.current = countryCode;
    try {
      localStorage.setItem(LAST_MARKET_KEY, countryCode);
    } catch {
      /* ignore */
    }
  }, [countryCode, locale, currency]);

  useEffect(() => {
    if (pathname?.startsWith("/checkout")) {
      try {
        sessionStorage.setItem(CHECKOUT_STARTED_KEY, "1");
      } catch {
        /* ignore */
      }
      checkoutStarted.current = true;
      return;
    }

    if (checkoutStarted.current || (typeof window !== "undefined" && sessionStorage.getItem(CHECKOUT_STARTED_KEY) === "1")) {
      if (!pathname?.startsWith("/checkout/erfolg")) {
        trackCheckoutAbandoned(countryCode, locale, currency);
      }
      checkoutStarted.current = false;
      try {
        sessionStorage.removeItem(CHECKOUT_STARTED_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [pathname, countryCode, locale, currency]);

  return <>{children}</>;
}
