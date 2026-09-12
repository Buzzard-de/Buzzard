import type { ConsentState as MarketingConsent } from "@/lib/marketing/consent";
import type { ConsentState as AnalyticsConsent, ConsentStatus } from "../types";

export function marketingConsentToAnalyticsStatus(state: MarketingConsent | null): ConsentStatus {
  if (!state) return "UNKNOWN";
  if (state.analytics) return "GRANTED";
  return "DENIED";
}

export function buildAnalyticsConsentFromMarketing(
  state: MarketingConsent | null,
  consentRequired: boolean
): AnalyticsConsent {
  const analytics = marketingConsentToAnalyticsStatus(state);
  return {
    consentRequired,
    consentStatus: analytics,
    analytics,
    marketing: state?.marketing ? "GRANTED" : state ? "DENIED" : "UNKNOWN",
    personalization: "UNKNOWN",
    consentTimestamp: state?.updatedAt,
  };
}
