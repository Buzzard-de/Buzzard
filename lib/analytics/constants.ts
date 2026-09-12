import type { AnalyticsEventType, ConsentCategory } from "./types";

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const MOCK_ANALYTICS_PROVIDER_ID = "MOCK_ANALYTICS_PROVIDER";

export const FOUNDATION_EVENT_TYPES: AnalyticsEventType[] = [
  "PAGE_VIEW",
  "SESSION_START",
  "SESSION_END",
  "PRODUCT_VIEW",
  "PRODUCT_SEARCH",
  "CATEGORY_VIEW",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "VIEW_CART",
  "CHECKOUT_START",
  "CHECKOUT_STEP",
  "CHECKOUT_COMPLETED",
  "CHECKOUT_ABANDONED",
  "PURCHASE",
  "REFUND",
  "RETURN",
  "MARKETPLACE_ORDER",
  "MARKETPLACE_RETURN",
  "SEARCH",
  "FILTER_USED",
  "LANGUAGE_CHANGED",
  "MARKET_CHANGED",
  "CONSENT_GRANTED",
  "CONSENT_DENIED",
  "CONSENT_WITHDRAWN",
];

export const IDEMPOTENT_EVENT_TYPES = new Set<AnalyticsEventType>([
  "PURCHASE",
  "REFUND",
  "RETURN",
  "CHECKOUT_COMPLETED",
  "MARKETPLACE_ORDER",
]);

export const ESSENTIAL_EVENT_TYPES = new Set<AnalyticsEventType>([
  "CONSENT_GRANTED",
  "CONSENT_DENIED",
  "CONSENT_WITHDRAWN",
]);

export const GA4_EVENT_MAP: Record<string, string> = {
  PAGE_VIEW: "page_view",
  PRODUCT_VIEW: "view_item",
  CATEGORY_VIEW: "view_item_list",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  VIEW_CART: "view_cart",
  CHECKOUT_START: "begin_checkout",
  CHECKOUT_COMPLETED: "purchase",
  PURCHASE: "purchase",
  REFUND: "refund",
  SEARCH: "search",
};

export const MARKETPLACE_CHANNELS = [
  "AMAZON",
  "EBAY",
  "KAUFLAND",
  "ALLEGRO",
  "BOL",
  "CDISCOUNT",
  "OTTO",
] as const;

export const SENSITIVE_METADATA_KEYS = [
  "email",
  "phone",
  "password",
  "token",
  "apiKey",
  "cardNumber",
  "cvv",
  "paymentCredential",
  "name",
  "fullName",
  "address",
  "ip",
  "ipAddress",
] as const;

export const SEARCH_ENGINE_HOSTS: Record<string, string> = {
  "google.": "Google",
  "bing.": "Bing",
  "duckduckgo.": "DuckDuckGo",
  "yahoo.": "Yahoo",
};

export const SOCIAL_HOSTS: Record<string, string> = {
  "facebook.": "Facebook",
  "instagram.": "Instagram",
  "tiktok.": "TikTok",
  "youtube.": "YouTube",
};

/** Future AI Orchestrator task types — compatibility only, not implemented. */
export const FUTURE_ANALYTICS_AI_TASK_TYPES = [
  "ANALYTICS_ANALYSIS",
  "TRAFFIC_ANOMALY",
  "CONVERSION_ANOMALY",
  "PRODUCT_PERFORMANCE_ANALYSIS",
  "MARKET_PERFORMANCE_ANALYSIS",
  "CAMPAIGN_ANALYSIS",
  "REVENUE_ANOMALY",
] as const;

export const DEFAULT_RETENTION_DAYS: Record<ConsentCategory, number> = {
  ANALYTICS: 365,
  MARKETING: 180,
  PERSONALIZATION: 90,
};

export const DEFAULT_CONSENT_VERSION = "1.0.0-foundation";
