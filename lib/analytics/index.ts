export type {
  AnalyticsEvent,
  AnalyticsEventInput,
  AnalyticsEventType,
  AnalyticsSession,
  AdminAnalyticsContext,
  AttributionModel,
  CollectEventResult,
  ConsentCategory,
  ConsentState,
  ConsentStatus,
  ConversionMetrics,
  DashboardOverview,
  DataFreshness,
  DeviceType,
  FunnelMetrics,
  RevenueAuthority,
  RevenueMetrics,
  SearchConsoleReportRow,
  TrafficSource,
  TrafficSourceType,
  VisitorRecord,
} from "./types";

export {
  SESSION_TIMEOUT_MS,
  MOCK_ANALYTICS_PROVIDER_ID,
  FOUNDATION_EVENT_TYPES,
  GA4_EVENT_MAP,
  MARKETPLACE_CHANNELS,
  FUTURE_ANALYTICS_AI_TASK_TYPES,
} from "./constants";

export {
  collectAnalyticsEvent,
  ingestAuthoritativeOrderPurchase,
  ingestAuthoritativeRefund,
} from "./eventCollector";
export { validateEventSchema } from "./eventSchema";
export { updateConsent, isTrackingAllowed, resolveConsentRequired, buildDefaultConsentState } from "./consent";
export {
  sanitizeMetadata,
  sanitizeSearchTerm,
  exportAnalyticsData,
  deleteAnalyticsData,
  anonymizeAnalyticsData,
} from "./privacy";
export { generateAnonymousVisitorId, touchVisitor } from "./visitor";
export { generateSessionId, getOrCreateSession, updateSessionFromEvent, countActiveSessions } from "./session";
export { classifyTrafficSource, parseCampaignParams, resolveTrafficSource } from "./trafficSource";
export { classifyDevice, privacySafeBrowserFamily, privacySafeOsFamily } from "./device";
export { resolveMarketContext, isValidMarketCode } from "./geo";
export { computeFunnelMetrics } from "./funnel";
export { computeConversionMetrics } from "./conversion";
export { computeRevenueMetrics, resolveAuthoritativeOrderRevenue, validateClientRevenueClaim, toCents } from "./revenue";
export { computeProductAnalytics } from "./productAnalytics";
export { computeMarketAnalytics } from "./marketAnalytics";
export { computeChannelAnalytics } from "./channelAnalytics";
export { computeDashboardOverview } from "./metrics";
export {
  getOverview,
  getTraffic,
  getFunnel,
  getProducts,
  getMarkets,
  getChannels,
  getCampaigns,
  getRevenue,
  getReturns,
  getMarketplace,
} from "./dashboard";
export { computeRetentionMetrics } from "./retention";
export { detectAnalyticsAnomalies } from "./anomaly";
export { validateAdminAccess, rejectEventInjection } from "./security";
export { recordAnalyticsAudit, getAnalyticsAuditLog, clearAnalyticsAuditLog } from "./audit";
export {
  configureAnalyticsStore,
  getAnalyticsStore,
  getAnalyticsPersistenceMode,
  resetAnalyticsStoreToMemory,
} from "./store/configure";
export { bootstrapAnalyticsPersistence } from "./store/bootstrap";
export type { AnalyticsStore, AnalyticsPersistenceMode } from "./store/types";
export { MockAnalyticsProvider, mapToGa4Event, getMockProviderTrackedEvents, clearMockProviderEvents } from "./provider";
export { SearchConsoleAdapterFoundation } from "./searchConsoleAdapter";
export { attributeOrderToChannel, buildAttributionTouches } from "./attribution";
export {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  grantBulkAnalyticsConsent,
  buildPageView,
  seedFixtureTrafficAndFunnel,
  seedFixtureRefund,
  createFixtureOrder,
  FIXTURE_VISITOR_A,
  FIXTURE_SESSION_A,
} from "./fixtures";
export { clearAnalyticsRegistry, listEvents, listSessions, listVisitors } from "./registry";
export { fetchFoundationAnalyticsOverview } from "./foundationAdminClient";
export * from "./storefront";

export type { AnalyticsOverview, AnalyticsRangePreset } from "./adminTypes";
export {
  fetchAnalyticsOverview,
  fetchSalesAnalytics,
  fetchProductAnalytics,
  fetchCategoryAnalytics,
  fetchCustomerAnalytics,
  fetchInventoryAnalytics,
  fetchSupplierAnalytics,
  fetchFinanceAnalytics,
  downloadAnalyticsExport,
  ANALYTICS_RANGE_OPTIONS,
} from "./adminClient";
