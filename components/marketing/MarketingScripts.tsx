"use client";

import { useEffect, useState } from "react";
import { marketingConfig } from "@/lib/marketing/config";
import { hasAnalyticsConsent, hasMarketingConsent, readConsent, type ConsentState } from "@/lib/marketing/consent";

function injectScript(id: string, src: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export default function MarketingScripts() {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onConsent = (event: Event) => {
      setConsent((event as CustomEvent<ConsentState>).detail);
    };
    window.addEventListener("buzzard:consent", onConsent);
    return () => window.removeEventListener("buzzard:consent", onConsent);
  }, []);

  useEffect(() => {
    if (!consent) return;
    window.dataLayer = window.dataLayer || [];

    if (hasAnalyticsConsent(consent) && marketingConfig.gtmId) {
      injectScript(
        "buzzard-gtm",
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(marketingConfig.gtmId)}`
      );
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    }

    if (hasAnalyticsConsent(consent) && marketingConfig.ga4Id && !marketingConfig.gtmId) {
      injectScript(
        "buzzard-ga4",
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(marketingConfig.ga4Id)}`
      );
      (window.dataLayer as Array<unknown>).push(["js", new Date()]);
      (window.dataLayer as Array<unknown>).push(["config", marketingConfig.ga4Id, { anonymize_ip: true }]);
    }

    if (hasMarketingConsent(consent) && marketingConfig.metaPixelId) {
      injectScript(
        "buzzard-meta-pixel",
        `https://connect.facebook.net/en_US/fbevents.js`
      );
      window.dataLayer.push({ event: "meta_pixel_init", pixel_id: marketingConfig.metaPixelId });
    }
  }, [consent]);

  return null;
}
