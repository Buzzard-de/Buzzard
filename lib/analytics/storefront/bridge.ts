import type { MarketingEventName, MarketingEventPayload } from "@/lib/marketing/events";
import { readConsent } from "@/lib/marketing/consent";
import { resolveConsentRequired } from "../consent";
import { buildAnalyticsConsentFromMarketing } from "./consentBridge";
import { getOrCreateAnonymousVisitorId, getOrCreateSessionId } from "./identity";
import { buildStorefrontBrowserContext } from "./browserContext";
import { buildAnalyticsPayloadFromMarketing, mapMarketingEventToAnalyticsType } from "./mapper";
import { signalAuthoritativePurchase, trackStorefrontEventSafe } from "./tracker";
import { LANDING_PAGE_KEY } from "./constants";
import type { AnalyticsEventInput } from "../types";

let sessionStarted = false;

function captureLandingPage(pagePath: string): string {
  if (typeof window === "undefined") return pagePath;
  try {
    const existing = sessionStorage.getItem(LANDING_PAGE_KEY);
    if (existing) return existing;
    sessionStorage.setItem(LANDING_PAGE_KEY, pagePath);
    return pagePath;
  } catch {
    return pagePath;
  }
}

function buildBaseEvent(
  eventType: AnalyticsEventInput["eventType"],
  market: string,
  language: string,
  currency: string,
  pagePath?: string
): AnalyticsEventInput {
  const browser = buildStorefrontBrowserContext(pagePath);
  const landingPage = captureLandingPage(browser.pagePath);
  const consent = buildAnalyticsConsentFromMarketing(readConsent(), resolveConsentRequired(market));

  return {
    eventType,
    anonymousVisitorId: getOrCreateAnonymousVisitorId(),
    sessionId: getOrCreateSessionId(),
    market,
    country: market,
    language,
    currency,
    pagePath: browser.pagePath,
    landingPage,
    deviceType: browser.deviceType,
    trafficSource: browser.trafficSource,
    trafficMedium: browser.trafficMedium,
    trafficCampaign: browser.trafficCampaign,
    consentState: consent,
    metadata: browser.referrerHost ? { referrerHost: browser.referrerHost } : undefined,
  };
}

export function maybeTrackStorefrontAnalytics(
  name: MarketingEventName,
  payload: MarketingEventPayload = {},
  context?: { market?: string; language?: string; currency?: string }
): void {
  try {
    const eventType = mapMarketingEventToAnalyticsType(name);
    if (!eventType) return;

    const market = (context?.market ?? payload.country ?? "DE").toString().toUpperCase();
    const language = (context?.language ?? payload.locale ?? "de").toString().toLowerCase();
    const currency = (context?.currency ?? "EUR").toString().toUpperCase();
    const mapped = buildAnalyticsPayloadFromMarketing(name, payload as Record<string, unknown>);

    const base = buildBaseEvent(eventType, market, language, currency, mapped.pagePath);

    if (!sessionStarted && typeof window !== "undefined") {
      sessionStarted = true;
      trackStorefrontEventSafe({
        ...base,
        eventType: "SESSION_START",
        landingPage: base.landingPage ?? base.pagePath,
      });
    }

    trackStorefrontEventSafe({
      ...base,
      ...mapped,
      eventType,
    });

    if (name === "purchase" && mapped.orderIdReference) {
      const customerId =
        typeof payload.customer_id === "string"
          ? payload.customer_id
          : typeof payload.customerId === "string"
            ? payload.customerId
            : undefined;
      void signalAuthoritativePurchase(mapped.orderIdReference, mapped.orderIdReference, customerId);
    }
  } catch {
    /* analytics must never break storefront */
  }
}

export function trackStorefrontConsentChange(granted: boolean, market = "DE"): void {
  try {
    const eventType = granted ? "CONSENT_GRANTED" : "CONSENT_DENIED";
    trackStorefrontEventSafe(buildBaseEvent(eventType, market, "de", "EUR"));
  } catch {
    /* ignore */
  }
}

export function trackStorefrontConsentWithdrawn(market = "DE"): void {
  try {
    trackStorefrontEventSafe(buildBaseEvent("CONSENT_WITHDRAWN", market, "de", "EUR"));
  } catch {
    /* ignore */
  }
}

export function trackLanguageChanged(from: string, to: string, market: string, currency: string): void {
  try {
    trackStorefrontEventSafe({
      ...buildBaseEvent("LANGUAGE_CHANGED", market, to, currency),
      metadata: { from, to },
    });
  } catch {
    /* ignore */
  }
}

export function trackMarketChanged(from: string, to: string, language: string, currency: string): void {
  try {
    trackStorefrontEventSafe({
      ...buildBaseEvent("MARKET_CHANGED", to, language, currency),
      metadata: { from, to },
    });
  } catch {
    /* ignore */
  }
}

export function trackCheckoutAbandoned(market: string, language: string, currency: string, step?: string): void {
  try {
    trackStorefrontEventSafe({
      ...buildBaseEvent("CHECKOUT_ABANDONED", market, language, currency, "/checkout/"),
      metadata: step ? { lastStep: step } : undefined,
    });
  } catch {
    /* ignore */
  }
}

export function resetStorefrontAnalyticsSessionForTests(): void {
  sessionStarted = false;
}
