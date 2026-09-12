import { describe, it, expect, beforeEach } from "vitest";
import {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  createFixtureOrder,
  ingestAuthoritativeOrderPurchase,
  ingestAuthoritativeRefund,
  seedFixtureRefund,
  listEvents,
  computeRevenueMetrics,
  getOverview,
} from "../index";
import {
  handleStorefrontAnalyticsEvent,
  handleStorefrontPurchaseSignal,
  parseStorefrontEventBody,
  mapMarketingEventToAnalyticsType,
  buildAnalyticsPayloadFromMarketing,
  buildAnalyticsConsentFromMarketing,
  marketingConsentToAnalyticsStatus,
  buildStorefrontBrowserContext,
  ingestStorefrontPurchaseSignal,
} from "./index";
import { classifyDevice } from "../device";
import { updateConsent } from "../consent";

const VISITOR = "bv_storefront_test";
const SESSION = "ses_storefront_test";

function baseEvent(overrides: Record<string, unknown> = {}) {
  seedAnalyticsWithConsent(VISITOR, "DE");
  return {
    eventType: "PAGE_VIEW" as const,
    anonymousVisitorId: VISITOR,
    sessionId: SESSION,
    market: "DE",
    country: "DE",
    language: "de",
    pagePath: "/de/",
    ...overrides,
  };
}

describe("Buzzard Analytics Storefront Integration", () => {
  beforeEach(() => {
    seedAnalyticsFixtures();
  });

  describe("Navigation", () => {
    it("collects SESSION_START and PAGE_VIEW", () => {
      expect(handleStorefrontAnalyticsEvent(baseEvent({ eventType: "SESSION_START" })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent()).ok).toBe(true);
      const events = listEvents();
      expect(events.some((e) => e.eventType === "SESSION_START")).toBe(true);
      expect(events.some((e) => e.eventType === "PAGE_VIEW")).toBe(true);
    });

    it("maps marketing page_view to PAGE_VIEW", () => {
      expect(mapMarketingEventToAnalyticsType("page_view")).toBe("PAGE_VIEW");
    });
  });

  describe("Product", () => {
    it("collects PRODUCT_VIEW with canonical productId", () => {
      const mapped = buildAnalyticsPayloadFromMarketing("view_item", { product_id: "reifen-pilot-sport" });
      const result = handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "PRODUCT_VIEW",
        productId: mapped.productId,
      }));
      expect(result.ok).toBe(true);
      expect(listEvents().find((e) => e.eventType === "PRODUCT_VIEW")?.productId).toBe("reifen-pilot-sport");
    });

    it("collects SEARCH and CATEGORY_VIEW", () => {
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "SEARCH",
        metadata: { searchTerm: "reifen" },
      })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "CATEGORY_VIEW",
        categoryId: "automotive",
      })).ok).toBe(true);
    });
  });

  describe("Cart", () => {
    it("collects add/remove/view cart events", () => {
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "ADD_TO_CART",
        productId: "reifen-pilot-sport",
        quantity: 1,
      })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "REMOVE_FROM_CART",
        productId: "reifen-pilot-sport",
      })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({ eventType: "VIEW_CART" })).ok).toBe(true);
    });
  });

  describe("Checkout", () => {
    it("collects checkout lifecycle events", () => {
      expect(handleStorefrontAnalyticsEvent(baseEvent({ eventType: "CHECKOUT_START" })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "CHECKOUT_STEP",
        metadata: { step: "payment" },
      })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({ eventType: "CHECKOUT_ABANDONED" })).ok).toBe(true);
    });
  });

  describe("Financial — authoritative purchase", () => {
    it("ingests purchase from Order Engine only", async () => {
      const orderId = await createFixtureOrder();
      const result = handleStorefrontPurchaseSignal(orderId, orderId);
      expect(result.ok).toBe(true);
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");
      expect(computeRevenueMetrics().orderCount).toBe(1);
    });

    it("rejects client PURCHASE with fake revenue", () => {
      const result = handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "PURCHASE",
        orderIdReference: "fake_order",
        value: 99999,
        authoritative: true,
      }));
      expect(result.ok).toBe(false);
    });

    it("rejects duplicate purchase", async () => {
      const orderId = await createFixtureOrder();
      handleStorefrontPurchaseSignal(orderId, orderId);
      handleStorefrontPurchaseSignal(orderId, orderId);
      expect(computeRevenueMetrics().orderCount).toBe(1);
    });

    it("rejects purchase when order engine order missing", () => {
      const result = ingestStorefrontPurchaseSignal("commerce_ord_unknown");
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("ORDER_NOT_FOUND");
    });
  });

  describe("Financial — authoritative refund", () => {
    it("ingests refund from Returns Engine", async () => {
      seedAnalyticsWithConsent(VISITOR);
      const { returnId, orderId } = await seedFixtureRefund();
      const result = ingestAuthoritativeRefund(returnId, orderId, 25);
      expect(result.ok).toBe(true);
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");
    });

    it("rejects client REFUND event", () => {
      const result = handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "REFUND",
        value: 100,
        authoritative: true,
      }));
      expect(result.ok).toBe(false);
    });
  });

  describe("Consent", () => {
    it("blocks when consent denied", () => {
      updateConsent(VISITOR, "DE", { ANALYTICS: "DENIED" });
      const result = handleStorefrontAnalyticsEvent({
        eventType: "PAGE_VIEW",
        anonymousVisitorId: VISITOR,
        sessionId: SESSION,
        market: "DE",
        country: "DE",
        language: "de",
        pagePath: "/",
      });
      expect(result.ok).toBe(false);
      expect(result.blockedByConsent).toBe(true);
    });

    it("maps marketing consent to analytics consent", () => {
      expect(marketingConsentToAnalyticsStatus({ necessary: true, analytics: true, marketing: false, updatedAt: "" })).toBe("GRANTED");
      expect(buildAnalyticsConsentFromMarketing(null, true).consentStatus).toBe("UNKNOWN");
    });
  });

  describe("Localization DE/EN/TR/AR", () => {
    it("accepts multiple locales", () => {
      for (const lang of ["de", "en", "tr", "ar"]) {
        seedAnalyticsWithConsent(`${VISITOR}_${lang}`, lang === "ar" ? "SA" : "DE");
        const market = lang === "ar" ? "SA" : "DE";
        const result = handleStorefrontAnalyticsEvent(baseEvent({
          anonymousVisitorId: `${VISITOR}_${lang}`,
          language: lang,
          market,
          pagePath: `/${lang}/`,
        }));
        expect(result.ok).toBe(true);
      }
    });

    it("tracks language and market changes", () => {
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "LANGUAGE_CHANGED",
        metadata: { from: "de", to: "en" },
      })).ok).toBe(true);
      expect(handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "MARKET_CHANGED",
        metadata: { from: "DE", to: "TR" },
        market: "TR",
        language: "tr",
      })).ok).toBe(true);
    });
  });

  describe("Traffic & device", () => {
    it("classifies device types", () => {
      expect(classifyDevice("Mozilla/5.0 (iPhone)", "mobile")).toBe("MOBILE");
      expect(classifyDevice("Mozilla/5.0 (iPad)", "tablet")).toBe("TABLET");
      expect(classifyDevice("Mozilla/5.0 (Windows NT 10.0)", "desktop")).toBe("DESKTOP");
    });

    it("builds browser context with traffic source", () => {
      const ctx = buildStorefrontBrowserContext("/de/");
      expect(ctx.pagePath).toBe("/de/");
      expect(ctx.deviceType).toBeDefined();
    });
  });

  describe("Security", () => {
    it("rejects malformed payload", () => {
      expect(parseStorefrontEventBody("{invalid")).toBeNull();
    });

    it("rejects sensitive metadata", () => {
      const result = handleStorefrontAnalyticsEvent(baseEvent({
        metadata: { apiKey: "secret" },
      }));
      expect(result.ok).toBe(false);
    });

    it("admin dashboard requires authorization", () => {
      expect(getOverview({ adminAuthorized: false }).ok).toBe(false);
      expect(getOverview({ adminAuthorized: true }).ok).toBe(true);
    });
  });

  describe("Dashboard foundation data", () => {
    it("computes metrics from collected storefront events", () => {
      handleStorefrontAnalyticsEvent(baseEvent({ eventType: "SESSION_START" }));
      handleStorefrontAnalyticsEvent(baseEvent());
      handleStorefrontAnalyticsEvent(baseEvent({
        eventType: "PRODUCT_VIEW",
        productId: "reifen-pilot-sport",
      }));
      const overview = getOverview({ adminAuthorized: true });
      expect(overview.ok).toBe(true);
      if (overview.ok) {
        expect(overview.data.sessions).toBeGreaterThan(0);
        expect(overview.data.pageViews).toBeGreaterThan(0);
      }
    });
  });
});
