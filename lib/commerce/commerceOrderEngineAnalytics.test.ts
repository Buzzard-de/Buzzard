import { describe, it, expect, beforeEach } from "vitest";
import { getOrder, clearOrderRegistry } from "@/lib/order-engine";
import { saveOrder } from "@/lib/order-engine/registry";
import { seedOrderEngineFixtures, TEST_CUSTOMER_A, TEST_CUSTOMER_B } from "@/lib/order-engine/test-fixtures";
import { clearStockRegistry } from "@/lib/inventory-engine/registry";
import {
  seedAnalyticsFixtures,
  seedAnalyticsWithConsent,
  computeRevenueMetrics,
  listEvents,
  getOverview,
} from "@/lib/analytics";
import {
  handleStorefrontPurchaseSignal,
  ingestStorefrontPurchaseSignal,
} from "@/lib/analytics/storefront";
import {
  syncCommerceOrderToEngine,
  mapCommerceAddressToSnapshot,
  resolveOrderEngineOrderId,
  validatePurchaseSignalAccess,
  ingestAuthoritativePurchaseForOrder,
  ingestStorefrontPurchaseSignalResolved,
  type CommerceOrderSyncInput,
} from "./orderEngineBridge";
import {
  clearCommerceOrderMappings,
  getCommerceOrderMapping,
  saveCommerceOrderMapping,
} from "./orderEngineRegistry";
import { validateOrderIdForAuthoritativePurchase } from "./purchaseValidation";

let commerceOrderCounter = 0;

function nextCommerceOrderId(): string {
  commerceOrderCounter += 1;
  return `ord_commerce_test_${commerceOrderCounter.toString().padStart(3, "0")}`;
}

function buildSyncInput(overrides: Partial<CommerceOrderSyncInput> = {}): CommerceOrderSyncInput {
  const commerceOrderId = overrides.commerceOrderId || nextCommerceOrderId();
  return {
    commerceOrderId,
    checkoutId: `chk_${commerceOrderId}`,
    customerId: TEST_CUSTOMER_A,
    marketId: "DE",
    channel: "direct",
    language: "de",
    currency: "EUR",
    items: [{ productId: "reifen-pilot-sport", quantity: 1 }],
    shippingAddress: mapCommerceAddressToSnapshot({
      line1: "Musterstraße 12",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
    }),
    idempotencyKey: `idem_${commerceOrderId}`,
    ...overrides,
  };
}

describe("Commerce → Order Engine → Authoritative Analytics", () => {
  beforeEach(() => {
    clearOrderRegistry();
    clearStockRegistry();
    seedOrderEngineFixtures();
    seedAnalyticsFixtures();
    clearCommerceOrderMappings();
    seedAnalyticsWithConsent("bv_commerce_sync", "DE");
  });

  describe("Commerce → Order Engine sync", () => {
    it("creates canonical Order Engine order from commerce checkout", async () => {
      const result = await syncCommerceOrderToEngine(buildSyncInput());
      expect(result.ok).toBe(true);
      expect(result.analytics?.ok).toBe(true);
      expect(result.analytics?.event?.revenueAuthority).toBe("AUTHORITATIVE");
      expect(result.orderEngineOrderId).toBeDefined();

      const engineOrder = getOrder(result.orderEngineOrderId!);
      expect(engineOrder).toBeDefined();
      expect(engineOrder?.items[0]?.productId).toBe("reifen-pilot-sport");
      expect(engineOrder?.currency).toBe("EUR");
      expect(engineOrder?.marketId).toBe("DE");
      expect(engineOrder?.totalGross).toBeGreaterThan(0);
    });

    it("persists commerce → engine mapping", async () => {
      const input = buildSyncInput();
      const result = await syncCommerceOrderToEngine(input);
      const mapping = getCommerceOrderMapping(input.commerceOrderId);
      expect(mapping?.orderEngineOrderId).toBe(result.orderEngineOrderId);
      expect(resolveOrderEngineOrderId(input.commerceOrderId)).toBe(result.orderEngineOrderId);
    });

    it("replays idempotent sync without duplicate engine orders", async () => {
      const input = buildSyncInput();
      const first = await syncCommerceOrderToEngine(input);
      const second = await syncCommerceOrderToEngine(input);
      expect(second.idempotentReplay).toBe(true);
      expect(second.orderEngineOrderId).toBe(first.orderEngineOrderId);
    });
  });

  describe("Authoritative purchase ingest", () => {
    it("valid order → authoritative PURCHASE", async () => {
      const input = buildSyncInput();
      const sync = await syncCommerceOrderToEngine(input);
      const result = ingestStorefrontPurchaseSignalResolved(input.commerceOrderId, input.commerceOrderId, TEST_CUSTOMER_A);
      expect(result.ok).toBe(true);
      expect(result.event?.eventType).toBe("PURCHASE");
      expect(result.event?.revenueAuthority).toBe("AUTHORITATIVE");
      expect(result.event?.value).toBe(getOrder(sync.orderEngineOrderId!)?.totalGross);
    });

    it("unknown order → rejected", () => {
      const result = ingestStorefrontPurchaseSignal("ord_unknown_commerce");
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("ORDER_NOT_FOUND");
    });

    it("cancelled order → rejected", async () => {
      const sync = await syncCommerceOrderToEngine(buildSyncInput());
      const order = getOrder(sync.orderEngineOrderId!)!;
      saveOrder({ ...order, status: "CANCELLED" });
      const validation = validateOrderIdForAuthoritativePurchase(order.orderId);
      expect(validation.ok).toBe(false);
      expect(validation.errorCode).toBe("ORDER_NOT_ELIGIBLE");
    });

    it("duplicate request → one purchase revenue", async () => {
      const input = buildSyncInput();
      await syncCommerceOrderToEngine(input);
      handleStorefrontPurchaseSignal(input.commerceOrderId, input.commerceOrderId);
      handleStorefrontPurchaseSignal(input.commerceOrderId, input.commerceOrderId);
      handleStorefrontPurchaseSignal(input.commerceOrderId, input.commerceOrderId);
      expect(computeRevenueMetrics().orderCount).toBe(1);
    });
  });

  describe("Financial security", () => {
    it("ignores fake client revenue/total/currency on purchase signal", async () => {
      const input = buildSyncInput();
      await syncCommerceOrderToEngine(input);
      const engineOrder = getOrder(resolveOrderEngineOrderId(input.commerceOrderId)!)!;
      const result = handleStorefrontPurchaseSignal({
        orderId: input.commerceOrderId,
        correlationId: input.commerceOrderId,
        revenue: 999999,
        total: 888888,
        subtotal: 777777,
        tax: 666666,
        discount: 555555,
        shipping: 444444,
        currency: "USD",
      });
      expect(result.ok).toBe(true);
      expect(result.event?.value).toBe(engineOrder.totalGross);
      expect(result.event?.currency).toBe(engineOrder.currency);
      expect(result.event?.value).not.toBe(999999);
    });
  });

  describe("Provisional → authoritative", () => {
    it("CHECKOUT_COMPLETED lifecycle + authoritative PURCHASE without duplicate revenue", async () => {
      const input = buildSyncInput();
      await syncCommerceOrderToEngine(input);
      const checkoutEvents = listEvents().filter((e) => e.eventType === "CHECKOUT_COMPLETED");
      expect(checkoutEvents.length).toBeGreaterThan(0);

      ingestAuthoritativePurchaseForOrder(resolveOrderEngineOrderId(input.commerceOrderId)!, input.commerceOrderId);
      expect(computeRevenueMetrics().orderCount).toBe(1);
      expect(listEvents().filter((e) => e.eventType === "PURCHASE").length).toBe(1);
    });
  });

  describe("Customer security", () => {
    it("cross-customer order access rejected", async () => {
      const input = buildSyncInput({ customerId: TEST_CUSTOMER_A });
      await syncCommerceOrderToEngine(input);
      const access = validatePurchaseSignalAccess(input.commerceOrderId, TEST_CUSTOMER_B);
      expect(access.ok).toBe(false);
      expect(access.errorCode).toBe("CROSS_CUSTOMER_ACCESS");
    });

    it("matching customer allowed", async () => {
      const input = buildSyncInput({ customerId: TEST_CUSTOMER_A });
      await syncCommerceOrderToEngine(input);
      const access = validatePurchaseSignalAccess(input.commerceOrderId, TEST_CUSTOMER_A);
      expect(access.ok).toBe(true);
    });
  });

  describe("Dashboard", () => {
    it("counts authoritative purchases and excludes provisional revenue", async () => {
      const input = buildSyncInput();
      await syncCommerceOrderToEngine(input);
      handleStorefrontPurchaseSignal(input.commerceOrderId, input.commerceOrderId);

      const overview = getOverview({ adminAuthorized: true });
      expect(overview.ok).toBe(true);
      if (overview.ok) {
        expect(overview.data.purchases).toBeGreaterThan(0);
        expect(overview.data.grossRevenueCents).toBeGreaterThan(0);
      }
      expect(computeRevenueMetrics().authoritativeOnly).toBe(true);
    });
  });

  describe("Pre-sync mapping guard", () => {
    it("manual mapping enables purchase resolution by commerce order id", () => {
      saveCommerceOrderMapping({
        commerceOrderId: "ord_manual_map",
        orderEngineOrderId: "ord_engine_manual",
        customerId: TEST_CUSTOMER_A,
        marketId: "DE",
        currency: "EUR",
        syncedAt: new Date().toISOString(),
      });
      expect(resolveOrderEngineOrderId("ord_manual_map")).toBe("ord_engine_manual");
    });
  });
});
