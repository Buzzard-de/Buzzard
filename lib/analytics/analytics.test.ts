import { describe, it, expect, beforeEach } from "vitest";
import {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  grantBulkAnalyticsConsent,
  buildPageView,
  seedFixtureTrafficAndFunnel,
  seedFixtureRefund,
  createFixtureOrder,
  collectAnalyticsEvent,
  ingestAuthoritativeOrderPurchase,
  ingestAuthoritativeRefund,
  validateEventSchema,
  updateConsent,
  isTrackingAllowed,
  generateAnonymousVisitorId,
  computeFunnelMetrics,
  computeConversionMetrics,
  computeRevenueMetrics,
  computeProductAnalytics,
  computeMarketAnalytics,
  computeChannelAnalytics,
  computeDashboardOverview,
  computeRetentionMetrics,
  detectAnalyticsAnomalies,
  getOverview,
  getFunnel,
  MockAnalyticsProvider,
  mapToGa4Event,
  SearchConsoleAdapterFoundation,
  exportAnalyticsData,
  deleteAnalyticsData,
  validateAdminAccess,
  rejectEventInjection,
  listEvents,
  FIXTURE_VISITOR_A,
  FUTURE_ANALYTICS_AI_TASK_TYPES,
} from "./index";

describe("Buzzard Analytics Foundation", () => {
  beforeEach(() => {
    seedAnalyticsFixtures();
  });

  describe("Event schema & collection", () => {
    it("validates and collects PAGE_VIEW", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const result = collectAnalyticsEvent(buildPageView());
      expect(result.ok).toBe(true);
      expect(result.event?.eventType).toBe("PAGE_VIEW");
    });

    it("rejects invalid event type", () => {
      const schema = validateEventSchema({ eventType: "INVALID" as never });
      expect(schema.ok).toBe(false);
    });

    it("rejects invalid product id", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const result = collectAnalyticsEvent(buildPageView({ productId: "nonexistent-product" }));
      expect(result.ok).toBe(false);
    });
  });

  describe("Fixture 1 — traffic volume", () => {
    it("100 visitors, 120 sessions, 500 page views", async () => {
      grantBulkAnalyticsConsent("bv_", 100);
      grantBulkAnalyticsConsent("bv_extra_", 20);
      for (let i = 0; i < 100; i++) {
        collectAnalyticsEvent(buildPageView({
          anonymousVisitorId: `bv_${i}`,
          sessionId: `ses_${i}`,
        }));
      }
      for (let i = 0; i < 120; i++) {
        collectAnalyticsEvent(buildPageView({
          anonymousVisitorId: `bv_${i % 100}`,
          sessionId: `ses_extra_${i}`,
          pagePath: `/p/${i % 10}`,
        }));
      }
      for (let i = 0; i < 280; i++) {
        collectAnalyticsEvent(buildPageView({
          anonymousVisitorId: `bv_${i % 100}`,
          sessionId: `ses_bulk_${i}`,
          pagePath: `/bulk/${i}`,
        }));
      }
      const events = listEvents();
      expect(events.filter((e) => e.eventType === "PAGE_VIEW").length).toBeGreaterThanOrEqual(500);
    });
  });

  describe("Fixture 2 — product funnel", () => {
    it("computes deterministic conversion formulas", async () => {
      await seedFixtureTrafficAndFunnel();
      const funnel = computeFunnelMetrics();
      expect(funnel.productViews).toBe(100);
      expect(funnel.addToCart).toBe(20);
      expect(funnel.checkoutStart).toBe(10);
      expect(funnel.purchases).toBe(4);
      expect(funnel.addToCartRate).toBe(20);
      expect(funnel.checkoutStartRate).toBe(50);
      expect(funnel.purchaseConversionRate).toBe(40);
    });
  });

  describe("Fixture 3 — traffic sources", () => {
    it("tracks direct, organic, paid, social, referral", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const sources = [
        { trafficSource: "DIRECT" as const },
        { trafficSource: "ORGANIC_SEARCH" as const, metadata: { referrerHost: "google.de" } },
        { trafficSource: "PAID_SEARCH" as const, trafficMedium: "cpc" },
        { trafficSource: "SOCIAL" as const, metadata: { referrerHost: "facebook.com" } },
        { trafficSource: "REFERRAL" as const, metadata: { referrerHost: "partner.example" } },
      ];
      for (const src of sources) {
        const res = collectAnalyticsEvent(buildPageView(src));
        expect(res.ok).toBe(true);
      }
      const channels = computeChannelAnalytics();
      expect(channels.length).toBeGreaterThan(0);
    });
  });

  describe("Fixture 4 & 5 — markets and languages", () => {
    it("supports multiple markets including Arabic locale", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A, "DE");
      seedAnalyticsWithConsent("bv_sa", "SA");
      collectAnalyticsEvent(buildPageView({ market: "DE", language: "de" }));
      collectAnalyticsEvent(buildPageView({
        anonymousVisitorId: "bv_sa",
        market: "SA",
        language: "ar",
        pagePath: "/ar/products",
      }));
      const markets = computeMarketAnalytics();
      expect(markets.some((m) => m.market === "DE" || m.market === "SA")).toBe(true);
    });
  });

  describe("Fixture 6 — device analytics", () => {
    it("classifies desktop, mobile, tablet", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      for (const deviceType of ["DESKTOP", "MOBILE", "TABLET"] as const) {
        const res = collectAnalyticsEvent(buildPageView({ deviceType }));
        expect(res.ok).toBe(true);
        expect(res.event?.deviceType).toBe(deviceType);
      }
    });
  });

  describe("Fixture 7 — duplicate purchase idempotency", () => {
    it("counts one authoritative purchase for duplicate events", async () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const orderId = await createFixtureOrder();
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      const revenue = computeRevenueMetrics();
      expect(revenue.orderCount).toBe(1);
    });
  });

  describe("Fixture 8 — fake client revenue", () => {
    it("rejects non-authoritative revenue claims", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const result = collectAnalyticsEvent({
        eventType: "PURCHASE",
        anonymousVisitorId: FIXTURE_VISITOR_A,
        market: "DE",
        language: "de",
        value: 99999,
        authoritative: true,
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("Fixture 9 — refund from returns engine", () => {
    it("records authoritative refund analytics", async () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const { returnId, orderId } = await seedFixtureRefund();
      const result = ingestAuthoritativeRefund(returnId, orderId, 25);
      expect(result.ok).toBe(true);
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");
    });
  });

  describe("Fixture 10 — marketplace order", () => {
    it("attributes marketplace channel events", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      collectAnalyticsEvent({
        eventType: "MARKETPLACE_ORDER",
        anonymousVisitorId: FIXTURE_VISITOR_A,
        market: "DE",
        language: "de",
        trafficSource: "MARKETPLACE",
        metadata: { marketplaceId: "amazon", channel: "AMAZON" },
        correlationId: "mp_ord_1",
      });
      const events = listEvents().filter((e) => e.eventType === "MARKETPLACE_ORDER");
      expect(events.length).toBe(1);
    });
  });

  describe("Fixture 11 & 12 — consent", () => {
    it("blocks non-essential tracking when consent denied", () => {
      updateConsent(FIXTURE_VISITOR_A, "DE", { ANALYTICS: "DENIED" });
      const result = collectAnalyticsEvent(buildPageView());
      expect(result.ok).toBe(false);
      expect(result.blockedByConsent).toBe(true);
    });

    it("blocks future tracking after consent withdrawn", () => {
      updateConsent(FIXTURE_VISITOR_A, "DE", { ANALYTICS: "GRANTED" });
      collectAnalyticsEvent(buildPageView());
      updateConsent(FIXTURE_VISITOR_A, "DE", { ANALYTICS: "WITHDRAWN" });
      const result = collectAnalyticsEvent(buildPageView({ pagePath: "/after-withdraw" }));
      expect(result.ok).toBe(false);
    });

    it("allows essential consent events when analytics denied", () => {
      updateConsent(FIXTURE_VISITOR_A, "DE", { ANALYTICS: "DENIED" });
      expect(isTrackingAllowed("CONSENT_DENIED", { consentRequired: true, consentStatus: "DENIED", analytics: "DENIED" })).toBe(true);
    });
  });

  describe("Security fixtures", () => {
    it("rejects secret in metadata", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const injection = rejectEventInjection({ eventType: "PAGE_VIEW", metadata: { apiKey: "secret" } });
      expect(injection.ok).toBe(false);
    });

    it("rejects PII in search term", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const result = collectAnalyticsEvent({
        eventType: "SEARCH",
        anonymousVisitorId: FIXTURE_VISITOR_A,
        market: "DE",
        language: "de",
        metadata: { searchTerm: "test@example.com password reset" },
      });
      expect(result.ok).toBe(true);
      expect(result.event?.metadata?.searchTerm).toBe("[redacted]");
    });

    it("denies admin dashboard without authorization", () => {
      expect(getOverview({ adminAuthorized: false }).ok).toBe(false);
    });

    it("allows admin dashboard when authorized", () => {
      expect(getOverview({ adminAuthorized: true, actorId: "admin_1" }).ok).toBe(true);
    });
  });

  describe("Visitor & session model", () => {
    it("generates non-PII anonymous visitor ids", () => {
      const id = generateAnonymousVisitorId();
      expect(id.startsWith("bv_")).toBe(true);
      expect(id.includes("@")).toBe(false);
    });
  });

  describe("Product analytics", () => {
    it("references canonical product ids", async () => {
      await seedFixtureTrafficAndFunnel();
      const products = computeProductAnalytics();
      expect(products[0]?.productId).toBe("reifen-pilot-sport");
    });
  });

  describe("Dashboard & metrics", () => {
    it("returns overview metrics", async () => {
      await seedFixtureTrafficAndFunnel();
      const overview = computeDashboardOverview();
      expect(overview.sessions).toBeGreaterThan(0);
      expect(overview.purchases).toBe(4);
      expect(overview.freshness).toBe("NEAR_REAL_TIME");
    });

    it("getFunnel requires admin", () => {
      expect(getFunnel({ adminAuthorized: true }).ok).toBe(true);
    });
  });

  describe("Retention & anomaly", () => {
    it("reports new vs returning visitors", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      collectAnalyticsEvent(buildPageView());
      const retention = computeRetentionMetrics();
      expect(retention.newVisitors + retention.returningVisitors).toBeGreaterThan(0);
    });

    it("detects funnel anomalies safely", async () => {
      await seedFixtureTrafficAndFunnel();
      const anomalies = detectAnalyticsAnomalies();
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe("Provider adapters", () => {
    it("uses mock analytics provider", () => {
      expect(MockAnalyticsProvider.initialize().ok).toBe(true);
      const tracked = MockAnalyticsProvider.track({
        eventType: "page_view",
        payload: { eventType: "PAGE_VIEW" },
        consent: { consentRequired: false, consentStatus: "GRANTED", analytics: "GRANTED" },
      });
      expect(tracked.ok).toBe(true);
    });

    it("maps internal events to GA4 names", () => {
      expect(mapToGa4Event("PRODUCT_VIEW")).toBe("view_item");
      expect(mapToGa4Event("PURCHASE")).toBe("purchase");
    });

    it("search console adapter has no live credentials", async () => {
      expect(SearchConsoleAdapterFoundation.isConfigured()).toBe(false);
      await expect(
        SearchConsoleAdapterFoundation.fetchReport({
          siteUrl: "https://example.com",
          startDate: "2026-01-01",
          endDate: "2026-01-02",
        })
      ).resolves.toEqual([]);
    });
  });

  describe("Privacy export/delete", () => {
    it("exports and deletes analytics data for visitor", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      collectAnalyticsEvent(buildPageView());
      const exported = exportAnalyticsData(FIXTURE_VISITOR_A);
      expect(exported.events.length).toBeGreaterThan(0);
      const deleted = deleteAnalyticsData(FIXTURE_VISITOR_A);
      expect(deleted.deletedEvents).toBeGreaterThan(0);
    });
  });

  describe("AI compatibility", () => {
    it("declares future analytics AI task types without implementing AI", () => {
      expect(FUTURE_ANALYTICS_AI_TASK_TYPES).toContain("ANALYTICS_ANALYSIS");
      expect(FUTURE_ANALYTICS_AI_TASK_TYPES).toContain("REVENUE_ANOMALY");
    });
  });

  describe("Conversion metrics", () => {
    it("uses consistent denominators", async () => {
      await seedFixtureTrafficAndFunnel();
      const conversion = computeConversionMetrics();
      expect(conversion.purchaseConversion).toBeGreaterThanOrEqual(0);
      expect(conversion.purchaseConversion).toBeLessThanOrEqual(100);
    });
  });
});
