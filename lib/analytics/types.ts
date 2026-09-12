export type ConsentCategory = "ANALYTICS" | "MARKETING" | "PERSONALIZATION";

export type ConsentStatus = "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN";

export type AnalyticsEventType =
  | "PAGE_VIEW"
  | "SESSION_START"
  | "SESSION_END"
  | "PRODUCT_VIEW"
  | "PRODUCT_SEARCH"
  | "CATEGORY_VIEW"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "VIEW_CART"
  | "CHECKOUT_START"
  | "CHECKOUT_STEP"
  | "CHECKOUT_COMPLETED"
  | "CHECKOUT_ABANDONED"
  | "PURCHASE"
  | "REFUND"
  | "RETURN"
  | "MARKETPLACE_ORDER"
  | "MARKETPLACE_RETURN"
  | "SEARCH"
  | "FILTER_USED"
  | "LANGUAGE_CHANGED"
  | "MARKET_CHANGED"
  | "CONSENT_GRANTED"
  | "CONSENT_DENIED"
  | "CONSENT_WITHDRAWN";

export type TrafficSourceType =
  | "DIRECT"
  | "ORGANIC_SEARCH"
  | "PAID_SEARCH"
  | "SOCIAL"
  | "EMAIL"
  | "REFERRAL"
  | "MARKETPLACE"
  | "OTHER";

export type DeviceType = "DESKTOP" | "MOBILE" | "TABLET" | "OTHER";

export type AttributionModel = "firstTouch" | "lastTouch" | "sessionTouch";

export type DataFreshness = "CURRENT" | "NEAR_REAL_TIME" | "REPORTING_DELAYED";

export type RevenueAuthority = "AUTHORITATIVE" | "PROVISIONAL" | "REJECTED";

export interface ConsentState {
  consentRequired: boolean;
  consentStatus: ConsentStatus;
  consentTimestamp?: string;
  consentVersion?: string;
  analytics?: ConsentStatus;
  marketing?: ConsentStatus;
  personalization?: ConsentStatus;
}

export interface TrafficSource {
  source: TrafficSourceType;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrerHost?: string;
}

export interface AnalyticsEventInput {
  eventId?: string;
  eventType: AnalyticsEventType;
  timestamp?: string;
  sessionId?: string;
  anonymousVisitorId?: string;
  customerIdReference?: string;
  market?: string;
  country?: string;
  language?: string;
  currency?: string;
  deviceType?: DeviceType;
  trafficSource?: TrafficSourceType;
  trafficMedium?: string;
  trafficCampaign?: string;
  landingPage?: string;
  pagePath?: string;
  productId?: string;
  categoryId?: string;
  orderIdReference?: string;
  cartIdReference?: string;
  value?: number;
  quantity?: number;
  metadata?: Record<string, unknown>;
  consentState?: Partial<ConsentState>;
  correlationId?: string;
  authoritative?: boolean;
}

export interface AnalyticsEvent extends AnalyticsEventInput {
  eventId: string;
  timestamp: string;
  sessionId: string;
  anonymousVisitorId: string;
  market: string;
  country: string;
  language: string;
  currency: string;
  deviceType: DeviceType;
  trafficSource: TrafficSourceType;
  revenueAuthority: RevenueAuthority;
  sanitized: boolean;
}

export interface AnalyticsSession {
  sessionId: string;
  anonymousVisitorId: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  landingPage?: string;
  exitPage?: string;
  pageViews: number;
  productViews: number;
  cartEvents: number;
  checkoutStarted: boolean;
  purchaseCompleted: boolean;
  trafficSource: TrafficSourceType;
  market: string;
  language: string;
  deviceType: DeviceType;
}

export interface VisitorRecord {
  anonymousVisitorId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  isReturning: boolean;
}

export interface CollectEventResult {
  ok: boolean;
  event?: AnalyticsEvent;
  errorCode?: string;
  errorMessage?: string;
  blockedByConsent?: boolean;
}

export interface FunnelMetrics {
  visitors: number;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStart: number;
  checkoutCompleted: number;
  purchases: number;
  productViewRate: number;
  addToCartRate: number;
  checkoutStartRate: number;
  checkoutCompletionRate: number;
  purchaseConversionRate: number;
  overallConversionRate: number;
}

export interface ConversionMetrics {
  eligibleSessions: number;
  addToCartConversion: number;
  checkoutConversion: number;
  purchaseConversion: number;
}

export interface RevenueMetrics {
  grossRevenueCents: number;
  refundAmountCents: number;
  netRevenueCents: number;
  orderCount: number;
  averageOrderValueCents: number;
  authoritativeOnly: boolean;
}

export interface DashboardOverview {
  freshness: DataFreshness;
  visitorsToday: number;
  visitorsYesterday: number;
  visitorsLast7Days: number;
  visitorsLast30Days: number;
  uniqueVisitors: number;
  sessions: number;
  newVisitors: number;
  returningVisitors: number;
  pageViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  purchases: number;
  conversionRate: number;
  averageOrderValueCents: number;
  grossRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  activeSessions: number;
  activeVisitors: number;
  eventsPerMinute: number;
  ordersToday: number;
  revenueTodayCents: number;
}

export interface AnalyticsProviderDefinition {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AnalyticsProviderTrackInput {
  eventType: string;
  payload: Record<string, unknown>;
  consent: ConsentState;
}

export interface SearchConsoleReportRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
}

export interface RetentionPolicyConfig {
  eventType?: AnalyticsEventType;
  market?: string;
  consentCategory?: ConsentCategory;
  retentionDays: number;
}

export interface AnalyticsAuditEntry {
  auditId: string;
  action: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AdminAnalyticsContext {
  adminAuthorized: boolean;
  actorId?: string;
}
