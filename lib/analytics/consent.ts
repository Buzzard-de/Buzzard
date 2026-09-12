import { getMarket, isEuCountry } from "@/lib/market-engine/registry";
import type { ConsentCategory, ConsentState, ConsentStatus } from "./types";
import { DEFAULT_CONSENT_VERSION, ESSENTIAL_EVENT_TYPES } from "./constants";
import { getConsent, setConsent } from "./registry";

export function resolveConsentRequired(market: string): boolean {
  const code = market.toUpperCase();
  if (isEuCountry(code)) return true;
  const config = getMarket(code);
  if (!config) return true;
  return config.status === "ACTIVE";
}

export function buildDefaultConsentState(market: string): ConsentState {
  const consentRequired = resolveConsentRequired(market);
  return {
    consentRequired,
    consentStatus: consentRequired ? "UNKNOWN" : "GRANTED",
    consentVersion: DEFAULT_CONSENT_VERSION,
    analytics: consentRequired ? "UNKNOWN" : "GRANTED",
    marketing: "UNKNOWN",
    personalization: "UNKNOWN",
  };
}

export function updateConsent(
  anonymousVisitorId: string,
  market: string,
  updates: Partial<Record<ConsentCategory, ConsentStatus>>
): ConsentState {
  const existing = getConsent(anonymousVisitorId) ?? buildDefaultConsentState(market);
  const next: ConsentState = {
    ...existing,
    consentTimestamp: new Date().toISOString(),
    consentVersion: DEFAULT_CONSENT_VERSION,
  };

  if (updates.ANALYTICS) {
    next.analytics = updates.ANALYTICS;
    next.consentStatus = updates.ANALYTICS;
  }
  if (updates.MARKETING) next.marketing = updates.MARKETING;
  if (updates.PERSONALIZATION) next.personalization = updates.PERSONALIZATION;

  setConsent(anonymousVisitorId, next);
  return next;
}

export function isTrackingAllowed(
  eventType: string,
  consent: ConsentState
): boolean {
  if (ESSENTIAL_EVENT_TYPES.has(eventType as never)) return true;
  if (!consent.consentRequired) return true;
  if (consent.consentStatus === "WITHDRAWN" || consent.analytics === "WITHDRAWN") return false;
  if (consent.analytics === "DENIED" || consent.consentStatus === "DENIED") return false;
  return consent.analytics === "GRANTED" || consent.consentStatus === "GRANTED";
}

export function isMarketingAllowed(consent: ConsentState): boolean {
  return consent.marketing === "GRANTED";
}
