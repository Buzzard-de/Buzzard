export {
  VISITOR_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  ANALYTICS_EVENTS_PATH,
  ANALYTICS_PURCHASE_PATH,
  ANALYTICS_FOUNDATION_OVERVIEW_PATH,
} from "./constants";
export { getOrCreateAnonymousVisitorId, getOrCreateSessionId, clearAnonymousVisitorId, rotateSessionId } from "./identity";
export { buildStorefrontBrowserContext } from "./browserContext";
export { mapMarketingEventToAnalyticsType, buildAnalyticsPayloadFromMarketing } from "./mapper";
export { marketingConsentToAnalyticsStatus, buildAnalyticsConsentFromMarketing } from "./consentBridge";
export { trackStorefrontEvent, trackStorefrontEventSafe, signalAuthoritativePurchase } from "./tracker";
export {
  maybeTrackStorefrontAnalytics,
  trackStorefrontConsentChange,
  trackStorefrontConsentWithdrawn,
  trackLanguageChanged,
  trackMarketChanged,
  trackCheckoutAbandoned,
  resetStorefrontAnalyticsSessionForTests,
} from "./bridge";
export {
  handleStorefrontAnalyticsEvent,
  handleStorefrontPurchaseSignal,
  parseStorefrontEventBody,
} from "./serverHandler";
export { ingestStorefrontPurchaseSignal } from "./purchaseIngest";
