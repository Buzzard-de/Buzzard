import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSupplierOrder,
  validateSupplierOrderPayload,
  fetchSupplierTracking,
  createSupplierReturn,
  selectBestSupplierForOrder,
  TEST_SUPPLIER_ID,
  resetOrderIdempotencyKeys,
  evaluateSupplierOrderNetworkSafety,
  runSupplierOrderSandbox,
  getSupplierOrderSandboxByIdempotency,
  getSupplierOrderSandboxByReference,
  resetSupplierOrderSandboxStore,
  hydrateSupplierOrderSandboxFromPersistence,
  buildSupplierOrderIdempotencyKey,
  sanitizePayloadForInspection,
  filterSupplierFulfillmentAddress,
  assertNoSecretsInPayload,
  classifySupplierOrderFailure,
  canTransitionSupplierOrderStatus,
  advanceSandboxSimulation,
} from "./index";
import { resetSupplierEngineForTests } from "./testReset";
import { disableSupplier, recordSupplierHealthFailure } from "./index";
import { createOrder, clearOrderRegistry, seedOrderEngineFixtures, buildSingleItemOrderInput } from "@/lib/order-engine";
import { importMarketplaceOrder, seedMarketplaceEngineFixtures, buildImportOrderInput, TEST_AMAZON } from "@/lib/marketplace-engine";
import { clearAllReservations, clearStockRegistry } from "@/lib/inventory-engine";

const ORIGINAL_ORDER_NETWORK = process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
const ORIGINAL_LIVE_READ = process.env.SUPPLIER_LIVE_READ_ENABLED;

function sandboxRequest(orderId = "ORD-SBX-1") {
  return {
    supplierId: TEST_SUPPLIER_ID,
    orderId,
    lines: [{ supplierSku: "TSA-TIRE-225-45-17", quantity: 2, unitPrice: 55.5 }],
    shippingAddress: {
      country: "DE",
      city: "Berlin",
      postalCode: "10115",
      street: "Musterstrasse",
      recipientName: "Max Mustermann",
      phone: "+491234567890",
      email: "customer@example.com",
      paymentToken: "secret-should-not-leak",
    },
    currency: "EUR",
    priceSnapshotId: "snap-123",
    customerReference: "BZ-2026-001",
  };
}

describe("#335 Supplier Order Sandbox & Fulfillment Validation", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
    resetSupplierEngineForTests();
    clearOrderRegistry();
    clearStockRegistry();
    clearAllReservations();
    seedOrderEngineFixtures();
    seedMarketplaceEngineFixtures();
  });

  afterEach(() => {
    if (ORIGINAL_ORDER_NETWORK === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_ORDER_NETWORK;
    if (ORIGINAL_LIVE_READ === undefined) delete process.env.SUPPLIER_LIVE_READ_ENABLED;
    else process.env.SUPPLIER_LIVE_READ_ENABLED = ORIGINAL_LIVE_READ;
  });

  describe("A. Supplier order payload", () => {
    it("builds canonical sandbox payload with required fields", async () => {
      const result = await runSupplierOrderSandbox(sandboxRequest());
      expect(result.ok).toBe(true);
      expect(result.supplierOrderId).toMatch(/^SANDBOX-ORDER-/);
      expect(result.payload?.buzzardOrderId).toBe("ORD-SBX-1");
      expect(result.payload?.supplierId).toBe(TEST_SUPPLIER_ID);
      expect(result.payload?.lines[0].unitPrice).toBe(55.5);
      expect(result.payload?.currency).toBe("EUR");
      expect(result.payload?.source).toBe("SANDBOX");
    });
  });

  describe("B. PII filtering", () => {
    it("strips blocked keys from fulfillment address", () => {
      const filtered = filterSupplierFulfillmentAddress({
        country: "DE",
        city: "Berlin",
        paymentToken: "secret",
        email: "a@b.com",
      });
      expect(filtered.country).toBe("DE");
      expect(filtered.paymentToken).toBeUndefined();
      expect(filtered.email).toBeUndefined();
    });

    it("masks PII in sanitized inspection payload", () => {
      const sanitized = sanitizePayloadForInspection({
        shippingAddress: { recipientName: "Max Mustermann", country: "DE" },
        api_key: "abc",
      });
      expect(String(sanitized.api_key)).toBe("[REDACTED]");
      const address = sanitized.shippingAddress as Record<string, string>;
      expect(address.recipientName).toContain("*");
    });

    it("rejects payloads containing secret keys", () => {
      const violations = assertNoSecretsInPayload({ oauth_token: "x", country: "DE" });
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe("C. Supplier selection", () => {
    it("uses deterministic supplier selection without AI override", async () => {
      const { getProduct } = await import("@/lib/product-engine");
      const { bootstrapSupplierEnginePersistence } = await import("./bootstrap");
      bootstrapSupplierEnginePersistence();
      const product = getProduct("reifen-pilot-sport");
      expect(product).toBeDefined();
      const selection = selectBestSupplierForOrder(product!, { countryCode: "DE" });
      expect(selection?.offer.supplierId).toBeTruthy();
      expect(selection?.reasons.length).toBeGreaterThan(0);
    });
  });

  describe("D. Inventory reservation", () => {
    it("reserves inventory once for order creation", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.ok).toBe(true);
      expect(result.order?.reservationIds).toHaveLength(1);
      expect(result.order?.supplierOrders[0].supplierOrderId).toMatch(/^SANDBOX-ORDER-/);
    });
  });

  describe("E. Price snapshot", () => {
    it("uses immutable supplier cost from order item in sandbox payload", async () => {
      const orderResult = await createOrder(buildSingleItemOrderInput("bremsscheibe-280"));
      const itemCost = orderResult.order!.items[0].supplierCostSnapshot;
      const sandbox = getSupplierOrderSandboxByReference(orderResult.order!.supplierOrders[0].supplierOrderId);
      expect(sandbox?.payload.lines[0].unitPrice).toBe(itemCost);
    });
  });

  describe("F. Idempotency", () => {
    it("returns same sandbox order for duplicate orderId + supplierId", async () => {
      const first = await createSupplierOrder(sandboxRequest("ORD-IDEM-1"));
      const second = await createSupplierOrder(sandboxRequest("ORD-IDEM-1"));
      expect(first.supplierOrderId).toBe(second.supplierOrderId);
      expect(second.status).toBe("IDEMPOTENT_REPLAY");
    });

    it("uses deterministic BUZZARD-{orderId}-{supplierId} key", () => {
      const key = buildSupplierOrderIdempotencyKey(TEST_SUPPLIER_ID, "ORD-9");
      expect(key).toBe(`BUZZARD-ORD-9-${TEST_SUPPLIER_ID}`);
    });
  });

  describe("G. Sandbox createOrder", () => {
    it("never enables real supplier order network", async () => {
      const safety = evaluateSupplierOrderNetworkSafety();
      expect(safety.supplierOrderNetworkEnabled).toBe(false);
      expect(safety.safe).toBe(true);
    });
  });

  describe("H. Status machine", () => {
    it("supports canonical lifecycle transitions", () => {
      expect(canTransitionSupplierOrderStatus("PREPARED", "VALIDATED")).toBe(true);
      expect(canTransitionSupplierOrderStatus("SANDBOX_ACCEPTED", "SUPPLIER_PENDING")).toBe(true);
      expect(advanceSandboxSimulation("SANDBOX_ACCEPTED")).toBe("SUPPLIER_PENDING");
      expect(advanceSandboxSimulation("SHIPPED")).toBe("DELIVERED");
    });
  });

  describe("I. Failure / retry", () => {
    it("classifies retryable vs permanent failures", () => {
      expect(classifySupplierOrderFailure("TIMEOUT")).toBe("RETRYABLE");
      expect(classifySupplierOrderFailure("UNKNOWN_SUPPLIER")).toBe("PERMANENT");
    });

    it("handles disabled supplier as permanent failure", async () => {
      disableSupplier(TEST_SUPPLIER_ID);
      const result = await runSupplierOrderSandbox(sandboxRequest("ORD-FAIL-DISABLED"));
      expect(result.ok).toBe(false);
      expect(result.failureClass).toBe("PERMANENT");
    });

    it("handles unhealthy connector as permanent failure", async () => {
      for (let i = 0; i < 5; i++) {
        recordSupplierHealthFailure(TEST_SUPPLIER_ID, { errorCode: "TIMEOUT" });
      }
      const result = await runSupplierOrderSandbox(sandboxRequest("ORD-FAIL-HEALTH"));
      expect(result.ok).toBe(false);
      expect(result.message).toBe("CONNECTOR_UNHEALTHY");
    });
  });

  describe("J. Tracking handoff", () => {
    it("returns simulated sandbox tracking without carrier API", async () => {
      const created = await runSupplierOrderSandbox(sandboxRequest("ORD-TRK-1"));
      const tracking = await fetchSupplierTracking(TEST_SUPPLIER_ID, created.supplierOrderId!);
      expect(tracking.ok).toBe(true);
      expect(tracking.sandbox).toBe(true);
      expect(tracking.trackingNumber).toMatch(/^SBX-TRK-/);
      expect(tracking.carrier).toBe("SANDBOX_CARRIER");
    });
  });

  describe("K. Persistence", () => {
    it.skipIf(!loadPersistentStore())("persists sandbox order in SQLite", async () => {
      const created = await runSupplierOrderSandbox(sandboxRequest("ORD-PERSIST-1"));
      expect(created.supplierOrderId).toBeTruthy();
      resetSupplierOrderSandboxStore();
      resetOrderIdempotencyKeys();
      hydrateSupplierOrderSandboxFromPersistence();
      const key = `BUZZARD-ORD-PERSIST-1-${TEST_SUPPLIER_ID}`;
      const record = getSupplierOrderSandboxByIdempotency(key);
      expect(record?.buzzardOrderId).toBe("ORD-PERSIST-1");
      expect(record?.networkDispatched).toBe(false);
    });
  });

  describe("L. Restart", () => {
    it.skipIf(!loadPersistentStore())("reloads sandbox state after simulated restart", async () => {
      const created = await runSupplierOrderSandbox(sandboxRequest("ORD-RESTART-1"));
      resetSupplierOrderSandboxStore();
      hydrateSupplierOrderSandboxFromPersistence();
      const reloaded = getSupplierOrderSandboxByReference(created.supplierOrderId!);
      expect(reloaded?.status).toBe("SANDBOX_ACCEPTED");
    });
  });

  describe("M. Concurrency", () => {
    it("handles parallel sandbox attempts for same order", async () => {
      const input = sandboxRequest("ORD-CONCURRENT-1");
      const [a, b] = await Promise.all([
        runSupplierOrderSandbox(input),
        runSupplierOrderSandbox(input),
      ]);
      expect(a.supplierOrderId).toBe(b.supplierOrderId);
    });
  });

  describe("N. Admin / RBAC contract", () => {
    it("exposes sandbox summary helper for admin", async () => {
      await runSupplierOrderSandbox(sandboxRequest("ORD-ADMIN-1"));
      const { getSupplierOrderSandboxAdminSummary } = await import("./orderSandbox/orchestrator");
      const summary = getSupplierOrderSandboxAdminSummary(TEST_SUPPLIER_ID);
      expect(summary.realSupplierOrderNetwork).toBe("DISABLED");
      expect(summary.lastSandboxOrder?.supplierOrderId).toMatch(/^SANDBOX-ORDER-/);
    });
  });

  describe("O. Security", () => {
    it("network safety gate requires order network disabled", () => {
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "1";
      const unsafe = evaluateSupplierOrderNetworkSafety();
      expect(unsafe.safe).toBe(false);
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    });
  });

  describe("P. Marketplace → Order → Supplier", () => {
    it("routes marketplace import through central order engine to sandbox fulfillment", async () => {
      const imported = await importMarketplaceOrder(
        buildImportOrderInput({
          marketplaceId: TEST_AMAZON,
          marketplaceOrderId: `MP-ORD-335-${Date.now()}`,
          productId: "reifen-pilot-sport",
        })
      );
      expect(imported.ok, imported.errorMessage || imported.errorCode).toBe(true);
      const { getOrder } = await import("@/lib/order-engine");
      const order = getOrder(imported.orderId!);
      expect(order?.supplierOrders[0]?.supplierOrderId).toMatch(/^SANDBOX-ORDER-/);
      expect(order?.supplierOrders[0]?.dryRun).toBe(true);
    });
  });

  describe("Q. Returns boundary", () => {
    it("keeps supplier returns dry-run only", async () => {
      const result = await createSupplierReturn({
        supplierId: TEST_SUPPLIER_ID,
        orderId: "ORD-RET-1",
        supplierOrderId: "SANDBOX-ORDER-TEST",
        lines: [{ supplierSku: "SKU-1", quantity: 1 }],
        returnType: "REFUND",
      });
      expect(result.dryRun).toBe(true);
    });
  });

  describe("R. AI authority boundary", () => {
    it("does not expose supplier order dispatch from AI orchestrator", async () => {
      const ai = await import("@/lib/ai-orchestrator/index").catch(() => null);
      if (!ai) return;
      expect(Object.keys(ai).some((k) => /createSupplierOrder|dispatchSupplierOrder/i.test(k))).toBe(false);
    });
  });
});

function loadPersistentStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPersistentSupplierStore } = require("../../server/lib/supplier/persistentStore.js");
    return createPersistentSupplierStore()?.getMode() === "sqlite";
  } catch {
    return false;
  }
}
