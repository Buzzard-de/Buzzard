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
  validateAdminAccess,
  listEvents,
  storeEvent,
  FIXTURE_VISITOR_A,
  FIXTURE_SESSION_A,
} from "../index";
import { computeBusinessKpis } from "./compute";
import { computeExecutiveKpis } from "./executive";
import { computeFunnelKpis } from "./funnelKpi";
import { computeProductKpis, computeMarketKpis, computeLanguageKpis, computeCommerceChannelKpis, computeTrafficSourceKpis, computeDeviceKpis } from "./intelligence";
import { computeProfitabilityKpis } from "./profitability";
import { getBusinessKpiDashboard } from "./dashboard";
import { safeRate, validateKpiQuery, resolveDateRange, loadEventsForRange } from "./query";
import { listMarkets } from "@/lib/market-engine/registry";

describe("Analytics KPI Layer (#327)", () => {
  beforeEach(() => {
    seedAnalyticsFixtures();
  });

  describe("Executive KPIs", () => {
    it("computes orders, revenue, AOV, units from authoritative purchases only", async () => {
      await seedFixtureTrafficAndFunnel();
      const events = listEvents();
      const exec = computeExecutiveKpis(events);
      expect(exec.orders).toBe(4);
      expect(exec.grossRevenueCents).toBeGreaterThan(0);
      expect(exec.authoritativeRevenueCents).toBe(exec.grossRevenueCents);
      expect(exec.averageOrderValueCents).toBe(Math.round(exec.grossRevenueCents / exec.orders));
      expect(exec.unitsSold).toBeGreaterThanOrEqual(4);
      expect(exec.netRevenueCents).toBeLessThanOrEqual(exec.grossRevenueCents);
    });

    it("excludes client/provisional revenue from financial KPIs", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const base = {
        anonymousVisitorId: FIXTURE_VISITOR_A,
        sessionId: FIXTURE_SESSION_A,
        market: "DE",
        country: "DE",
        language: "de",
        currency: "EUR",
        deviceType: "DESKTOP" as const,
        trafficSource: "DIRECT" as const,
        timestamp: new Date().toISOString(),
        sanitized: true,
      };
      storeEvent({
        ...base,
        eventId: "evt_client_purchase",
        eventType: "PURCHASE",
        value: 9999,
        revenueAuthority: "REJECTED",
      });
      storeEvent({
        ...base,
        eventId: "evt_provisional_purchase",
        eventType: "PURCHASE",
        value: 8888,
        revenueAuthority: "PROVISIONAL",
      });
      const exec = computeExecutiveKpis(listEvents());
      expect(exec.orders).toBe(0);
      expect(exec.grossRevenueCents).toBe(0);
    });
  });

  describe("Funnel", () => {
    it("computes stage counts, conversion and drop-off with zero-division safety", async () => {
      await seedFixtureTrafficAndFunnel();
      const funnel = computeFunnelKpis(listEvents());
      expect(funnel.steps.length).toBe(7);
      expect(funnel.steps.find((s) => s.stage === "Product View")?.count).toBe(100);
      expect(funnel.steps.find((s) => s.stage === "Add To Cart")?.count).toBe(20);
      expect(funnel.steps.find((s) => s.stage === "Purchase")?.count).toBe(4);
      expect(funnel.visitorToPurchase).toBeGreaterThan(0);
      expect(safeRate(0, 0)).toBe(0);
    });

    it("handles empty events without NaN", () => {
      const funnel = computeFunnelKpis([]);
      expect(funnel.visitorToPurchase).toBe(0);
      expect(funnel.sessionToPurchase).toBe(0);
      funnel.steps.forEach((step) => {
        expect(Number.isFinite(step.conversionFromPrevious)).toBe(true);
        expect(Number.isFinite(step.dropOffFromPrevious)).toBe(true);
      });
    });
  });

  describe("Product intelligence", () => {
    it("aggregates views, carts, purchases and margin for canonical product", async () => {
      await seedFixtureTrafficAndFunnel();
      const products = computeProductKpis(listEvents(), 10);
      const top = products.find((p) => p.productId === "reifen-pilot-sport");
      expect(top).toBeDefined();
      expect(top!.views).toBe(100);
      expect(top!.addToCart).toBe(20);
      expect(top!.purchases).toBe(4);
      expect(top!.revenueCents).toBeGreaterThan(0);
    });
  });

  describe("Market intelligence", () => {
    it("supports all 35 markets from Market Engine", async () => {
      await seedFixtureTrafficAndFunnel();
      const markets = computeMarketKpis(listEvents());
      expect(markets.length).toBe(listMarkets().length);
      const de = markets.find((m) => m.market === "DE");
      expect(de!.orders).toBe(4);
      expect(de!.revenueCents).toBeGreaterThan(0);
    });
  });

  describe("Language intelligence", () => {
    it("includes DE language metrics", async () => {
      await seedFixtureTrafficAndFunnel();
      const langs = computeLanguageKpis(listEvents());
      const de = langs.find((l) => l.language === "de");
      expect(de).toBeDefined();
      expect(de!.sessions).toBeGreaterThan(0);
      expect(de!.purchases).toBe(4);
    });

    it("tracks TR EN AR when present", () => {
      for (const lang of ["de", "en", "tr", "ar"] as const) {
        seedAnalyticsWithConsent(`visitor_${lang}`, "DE");
        collectAnalyticsEvent({
          eventType: "SESSION_START",
          anonymousVisitorId: `visitor_${lang}`,
          sessionId: `ses_${lang}`,
          market: "DE",
          language: lang,
        });
        collectAnalyticsEvent({
          eventType: "PRODUCT_VIEW",
          anonymousVisitorId: `visitor_${lang}`,
          sessionId: `ses_${lang}`,
          market: "DE",
          language: lang,
          productId: "reifen-pilot-sport",
        });
      }
      const langs = computeLanguageKpis(listEvents());
      for (const code of ["de", "en", "tr", "ar"]) {
        expect(langs.some((l) => l.language === code)).toBe(true);
      }
    });
  });

  describe("Channel intelligence", () => {
    it("includes direct and marketplace channels", async () => {
      await seedFixtureTrafficAndFunnel();
      const channels = computeCommerceChannelKpis(listEvents());
      expect(channels.some((c) => c.channel === "direct")).toBe(true);
      expect(channels.some((c) => c.channel === "amazon")).toBe(true);
      expect(channels.some((c) => c.channel === "ebay")).toBe(true);
    });
  });

  describe("Traffic & device", () => {
    it("classifies traffic sources", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      seedAnalyticsWithConsent("bv_b");
      collectAnalyticsEvent({
        ...buildPageView(),
        trafficSource: "ORGANIC_SEARCH",
      });
      collectAnalyticsEvent({
        ...buildPageView({ anonymousVisitorId: "bv_b", sessionId: "ses_b" }),
        trafficSource: "PAID_SEARCH",
      });
      const traffic = computeTrafficSourceKpis(listEvents());
      expect(traffic.some((t) => t.source === "ORGANIC_SEARCH")).toBe(true);
      expect(traffic.some((t) => t.source === "PAID_SEARCH")).toBe(true);
    });

    it("segments by device type", () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      seedAnalyticsWithConsent("bv_d");
      collectAnalyticsEvent({ ...buildPageView(), deviceType: "MOBILE" });
      collectAnalyticsEvent({
        ...buildPageView({ anonymousVisitorId: "bv_d", sessionId: "ses_d" }),
        deviceType: "DESKTOP",
      });
      const devices = computeDeviceKpis(listEvents());
      expect(devices.some((d) => d.device === "MOBILE")).toBe(true);
      expect(devices.some((d) => d.device === "DESKTOP")).toBe(true);
    });
  });

  describe("Profitability", () => {
    it("uses authoritative order snapshots, not invented margins", async () => {
      await seedFixtureTrafficAndFunnel();
      const profit = computeProfitabilityKpis(listEvents());
      expect(profit.authoritativeOnly).toBe(true);
      expect(profit.grossRevenueCents).toBeGreaterThan(0);
      expect(profit.contributionCents).toBeDefined();
      expect(Number.isFinite(profit.contributionMarginPercent)).toBe(true);
    });

    it("deduplicates purchase revenue", async () => {
      const orderId = await createFixtureOrder();
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      const profit = computeProfitabilityKpis(listEvents());
      const exec = computeExecutiveKpis(listEvents());
      expect(exec.orders).toBe(1);
      expect(profit.grossRevenueCents).toBeGreaterThan(0);
    });
  });

  describe("Time ranges & comparison", () => {
    it("resolves today, yesterday, 7d, 30d presets", () => {
      const now = new Date("2026-09-12T12:00:00.000Z");
      expect(resolveDateRange({ range: "today", now }).from).toBe("2026-09-12");
      expect(resolveDateRange({ range: "yesterday", now }).from).toBe("2026-09-11");
      expect(resolveDateRange({ range: "last_7_days", now }).from).toBe("2026-09-06");
      expect(resolveDateRange({ range: "last_30_days", now }).from).toBe("2026-08-14");
    });

    it("computes previous-period comparison deltas", async () => {
      await seedFixtureTrafficAndFunnel();
      const dashboard = computeBusinessKpis({ comparePrevious: true, now: new Date() });
      expect(dashboard.deltas).toBeDefined();
      expect(dashboard.previousExecutive).toBeDefined();
    });

    it("loads bounded date range events", async () => {
      await seedFixtureTrafficAndFunnel();
      const range = resolveDateRange({ range: "last_30_days" });
      const events = loadEventsForRange(range);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("Security & validation", () => {
    it("rejects invalid limit", () => {
      expect(validateKpiQuery({ limit: 0 }).ok).toBe(false);
      expect(validateKpiQuery({ limit: 500 }).ok).toBe(false);
    });

    it("rejects malformed custom date range", () => {
      expect(validateKpiQuery({ range: "custom" }).ok).toBe(false);
      expect(validateKpiQuery({ range: "custom", from: "2026-09-12", to: "2026-01-01" }).ok).toBe(false);
    });

    it("requires admin authorization for KPI dashboard", () => {
      const denied = getBusinessKpiDashboard({ adminAuthorized: false });
      expect(denied.ok).toBe(false);
      const allowed = getBusinessKpiDashboard({ adminAuthorized: true, actorId: "admin_test" });
      expect(allowed.ok).toBe(true);
    });

    it("blocks unauthorized admin access", () => {
      expect(validateAdminAccess({ adminAuthorized: false }).ok).toBe(false);
      expect(validateAdminAccess({ adminAuthorized: true }).ok).toBe(true);
    });
  });

  describe("Returns", () => {
    it("computes return and refund rates from authoritative events", async () => {
      seedAnalyticsWithConsent(FIXTURE_VISITOR_A);
      const { returnId, orderId } = await seedFixtureRefund();
      const result = ingestAuthoritativeRefund(returnId, orderId, 25);
      expect(result.ok).toBe(true);
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");
      const exec = computeExecutiveKpis(listEvents());
      expect(exec.refundAmountCents).toBeGreaterThan(0);
    });
  });

  describe("Full dashboard aggregation", () => {
    it("returns complete BusinessKpiDashboard shape", async () => {
      await seedFixtureTrafficAndFunnel();
      const dashboard = computeBusinessKpis({ limit: 10 });
      expect(dashboard.executive).toBeDefined();
      expect(dashboard.funnel).toBeDefined();
      expect(dashboard.products.length).toBeGreaterThan(0);
      expect(dashboard.markets.length).toBe(35);
      expect(dashboard.rankings.productsByRevenue.length).toBeLessThanOrEqual(10);
      expect(dashboard.profitability.authoritativeOnly).toBe(true);
    });
  });
});
