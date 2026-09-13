/**
 * BUZZARD #329 — Integrated analytics chain regression gate (#323–#328)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  seedFixtureRefund,
  listEvents,
  computeRevenueMetrics,
  getOverview,
  getFunnel,
  getBusinessKpiDashboard,
  configureAnalyticsStore,
  resetAnalyticsStoreToMemory,
} from "./index";
import { computeBusinessKpis } from "./kpi/compute";
import { createMemoryAnalyticsStore } from "./store/memoryStore";
import { handleStorefrontPurchaseSignal } from "@/lib/analytics/storefront";
import {
  syncCommerceOrderToEngine,
  mapCommerceAddressToSnapshot,
  resolveOrderEngineOrderId,
  ingestAuthoritativePurchaseForOrder,
} from "@/lib/commerce/orderEngineBridge";
import { clearCommerceOrderMappings } from "@/lib/commerce/orderEngineRegistry";
import { getOrder } from "@/lib/order-engine";
import { seedOrderEngineFixtures, TEST_CUSTOMER_A } from "@/lib/order-engine/test-fixtures";
import { clearOrderRegistry } from "@/lib/order-engine/registry";
import { clearStockRegistry } from "@/lib/inventory-engine/registry";
import { listMarkets } from "@/lib/market-engine/registry";
import { collectAnalyticsEvent } from "./eventCollector";

function loadPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentAnalyticsStore } = require("../../server/lib/analytics/persistentStore.js");
    return createPersistentAnalyticsStore();
  } catch {
    return null;
  }
}

function buildCommerceInput(commerceOrderId: string) {
  return {
    commerceOrderId,
    checkoutId: `chk_${commerceOrderId}`,
    customerId: TEST_CUSTOMER_A,
    marketId: "DE",
    channel: "direct" as const,
    language: "de",
    currency: "EUR",
    items: [{ productId: "reifen-pilot-sport", quantity: 1 }],
    shippingAddress: mapCommerceAddressToSnapshot({
      line1: "Test 1",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
    }),
    idempotencyKey: `idem_${commerceOrderId}`,
  };
}

describe("Analytics Integration Gate (#323–#328)", () => {
  beforeEach(() => {
    clearOrderRegistry();
    clearStockRegistry();
    seedOrderEngineFixtures();
    seedAnalyticsFixtures();
    clearCommerceOrderMappings();
    seedAnalyticsWithConsent("bv_integration_gate", "DE");
  });

  describe("End-to-end commerce → KPI chain", () => {
    it("flows commerce checkout through Order Engine to KPI dashboard", async () => {
      const commerceOrderId = "ord_gate_e2e_001";
      const sync = await syncCommerceOrderToEngine(buildCommerceInput(commerceOrderId));
      expect(sync.ok).toBe(true);

      const purchase = handleStorefrontPurchaseSignal({
        orderId: commerceOrderId,
        correlationId: commerceOrderId,
        revenue: 999999,
        total: 999999,
        currency: "USD",
      });
      expect(purchase.ok).toBe(true);
      expect(purchase.event?.revenueAuthority).toBe("AUTHORITATIVE");

      const engineOrder = getOrder(resolveOrderEngineOrderId(commerceOrderId)!);
      expect(purchase.event?.value).toBe(engineOrder?.totalGross);
      expect(purchase.event?.value).not.toBe(999999);

      const kpis = computeBusinessKpis({ limit: 10 });
      expect(kpis.executive.orders).toBe(1);
      expect(kpis.executive.grossRevenueCents).toBeGreaterThan(0);
      expect(kpis.funnel.steps.length).toBe(7);
      expect(kpis.markets.length).toBe(listMarkets().length);
      expect(kpis.profitability.authoritativeOnly).toBe(true);

      const adminKpi = getBusinessKpiDashboard({ adminAuthorized: true });
      expect(adminKpi.ok).toBe(true);
    });
  });

  describe("Duplicate purchase idempotency", () => {
    it("allows one authoritative purchase per order across retries", async () => {
      const commerceOrderId = "ord_gate_dup_001";
      await syncCommerceOrderToEngine(buildCommerceInput(commerceOrderId));
      const engineId = resolveOrderEngineOrderId(commerceOrderId)!;

      handleStorefrontPurchaseSignal(commerceOrderId, commerceOrderId);
      handleStorefrontPurchaseSignal(commerceOrderId, commerceOrderId);
      ingestAuthoritativePurchaseForOrder(engineId, commerceOrderId);

      const purchases = listEvents().filter(
        (e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE",
      );
      const uniqueOrders = new Set(purchases.map((p) => p.orderIdReference));
      expect(uniqueOrders.size).toBe(1);
      expect(computeRevenueMetrics().orderCount).toBe(1);
    });
  });

  describe("SQLite persistence + restart simulation", () => {
    const persistentStore = loadPersistentStore();

    it.skipIf(!persistentStore)("survives store re-instantiation without duplicate revenue", async () => {
      persistentStore.clear();
      configureAnalyticsStore(persistentStore, "sqlite");

      const commerceOrderId = "ord_gate_restart_001";
      await syncCommerceOrderToEngine(buildCommerceInput(commerceOrderId));
      handleStorefrontPurchaseSignal(commerceOrderId, commerceOrderId);

      const ordersBefore = computeBusinessKpis().executive.orders;
      expect(ordersBefore).toBe(1);

      configureAnalyticsStore(loadPersistentStore()!, "sqlite");
      const ordersAfter = computeBusinessKpis().executive.orders;
      expect(ordersAfter).toBe(1);

      handleStorefrontPurchaseSignal(commerceOrderId, commerceOrderId);
      expect(computeBusinessKpis().executive.orders).toBe(1);

      resetAnalyticsStoreToMemory();
    });
  });

  describe("Returns → KPI net revenue", () => {
    it("reflects authoritative refund in net revenue", async () => {
      seedAnalyticsWithConsent("bv_refund_gate");
      const { returnId, orderId } = await seedFixtureRefund();
      const { ingestAuthoritativeOrderPurchase, ingestAuthoritativeRefund } = await import("./eventCollector");
      ingestAuthoritativeOrderPurchase(orderId, orderId);
      ingestAuthoritativeRefund(returnId, orderId, 25);

      const exec = computeBusinessKpis().executive;
      expect(exec.refundAmountCents).toBeGreaterThan(0);
      expect(exec.netRevenueCents).toBeLessThan(exec.grossRevenueCents);
    });
  });

  describe("API gate contracts", () => {
    it("overview and funnel remain available alongside KPI layer", () => {
      const overview = getOverview({ adminAuthorized: true });
      const funnel = getFunnel({ adminAuthorized: true });
      expect(overview.ok).toBe(true);
      expect(funnel.ok).toBe(true);
    });

    it("rejects unauthorized KPI access", () => {
      const denied = getBusinessKpiDashboard({ adminAuthorized: false });
      expect(denied.ok).toBe(false);
    });
  });

  describe("Privacy — KPI responses", () => {
    it("does not expose PII fields in KPI payload", async () => {
      const commerceOrderId = "ord_gate_pii_001";
      await syncCommerceOrderToEngine(buildCommerceInput(commerceOrderId));
      handleStorefrontPurchaseSignal(commerceOrderId, commerceOrderId);

      const payload = JSON.stringify(computeBusinessKpis());
      expect(payload).not.toMatch(/password/i);
      expect(payload).not.toMatch(/phone/i);
      expect(payload).not.toMatch(/street/i);
    });
  });

  describe("Analytics failure isolation", () => {
    it("order engine remains functional when analytics store throws on read", async () => {
      const commerceOrderId = "ord_gate_iso_001";
      const sync = await syncCommerceOrderToEngine(buildCommerceInput(commerceOrderId));
      expect(sync.ok).toBe(true);
      expect(getOrder(sync.orderEngineOrderId!)).toBeDefined();

      const brokenStore = createMemoryAnalyticsStore();
      const originalList = brokenStore.listEvents.bind(brokenStore);
      brokenStore.listEvents = () => {
        throw new Error("SIMULATED_ANALYTICS_DB_ERROR");
      };
      brokenStore.listEventsInRange = () => {
        throw new Error("SIMULATED_ANALYTICS_DB_ERROR");
      };
      configureAnalyticsStore(brokenStore, "memory");

      expect(() => computeBusinessKpis()).toThrow();
      expect(getOrder(sync.orderEngineOrderId!)).toBeDefined();

      brokenStore.listEvents = originalList;
      resetAnalyticsStoreToMemory();
    });
  });

  describe("Funnel event coverage", () => {
    it("tracks storefront events through to funnel KPIs", () => {
      collectAnalyticsEvent({
        eventType: "PRODUCT_VIEW",
        anonymousVisitorId: "bv_integration_gate",
        sessionId: "ses_gate",
        productId: "reifen-pilot-sport",
        market: "DE",
        language: "de",
      });
      collectAnalyticsEvent({
        eventType: "ADD_TO_CART",
        anonymousVisitorId: "bv_integration_gate",
        sessionId: "ses_gate",
        productId: "reifen-pilot-sport",
        market: "DE",
        language: "de",
      });

      const funnel = computeBusinessKpis().funnel;
      expect(funnel.steps.find((s) => s.stage === "Product View")?.count).toBeGreaterThan(0);
      expect(funnel.steps.find((s) => s.stage === "Add To Cart")?.count).toBeGreaterThan(0);
    });
  });
});
