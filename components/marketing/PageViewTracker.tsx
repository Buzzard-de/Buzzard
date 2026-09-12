"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackMarketingEvent } from "@/lib/marketing/events";
import { useLocale } from "@/lib/i18n/context";
import { useMarket } from "@/lib/market/context";

export default function PageViewTracker() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { countryCode, currency } = useMarket();

  useEffect(() => {
    trackMarketingEvent("page_view", {
      page_path: pathname,
      locale,
      country: countryCode,
      currency,
    });
  }, [pathname, locale, countryCode, currency]);

  return null;
}
