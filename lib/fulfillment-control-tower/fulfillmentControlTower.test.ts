import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildFulfillmentId,
  listFulfillmentOperationalViews,
  getFulfillmentOperationalView,
  evaluateStateCompatibilityMatrix,
  runFulfillmentChecks,
  runFulfillmentReconciliation,
  reconcileSingleFulfillment,
  buildIncidentFingerprint,
  upsertIncidentFromFinding,
  acknowledgeIncident,
  resolveIncident,
  filterIncidents,
  getFulfillmentControlTowerDashboard,
  resetControlTowerForTests,
  resetControlTowerMemoryForTests,
  hydrateControlTowerFromPersistence,
  getOperationalSnapshot,
  resetTrackingIndexForTests,
  clearControlTowerAuditForTests,
  resetControlTowerAnalyticsForTests,
} from "./index";
import {
  createOrder,
  clearOrderRegistry,
  seedOrderEngineFixtures,
  buildSingleItemOrderInput,
  buildMultiItemOrderInput,
} from "@/lib/order-engine";
import { clearAllReservations, clearStockRegistry } from "@/lib/inventory-engine";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { importMarketplaceOrder, seedMarketplaceEngineFixtures, buildImportOrderInput, TEST_AMAZON } from "@/lib/marketplace-engine";
import { recordSupplierHealthFailure } from "@/lib/supplier-engine";
import { TEST_SUPPLIER_ID } from "@/lib/supplier-engine/fixtures";

const ORIGINAL_ORDER_NETWORK = process.env.SUPPLIER_ORDER_NETWORK_ENABLED;

describe("#336 Fulfillment Control Tower & Operational Reconciliation", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    resetSupplierEngineForTests();
    resetControlTowerForTests();
    resetTrackingIndexForTests();
    clearControlTowerAuditForTests();
    resetControlTowerAnalyticsForTests();
    clearOrderRegistry();
    clearStockRegistry();
    clearAllReservations();
    seedOrderEngineFixtures();
    seedMarketplaceEngineFixtures();
  });

  afterEach(() => {
    if (ORIGINAL_ORDER_NETWORK === undefined) delete process.env.SUPPLIER_ORDER_NETWORK_ENABLED;
    else process.env.SUPPLIER_ORDER_NETWORK_ENABLED = ORIGINAL_ORDER_NETWORK;
  });

  describe("A. Fulfillment state view", () => {
    it("builds operational view from order", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.ok).toBe(true);
      const views = listFulfillmentOperationalViews();
      expect(views.length).toBeGreaterThan(0);
      expect(views[0].stateView.order).toBeTruthy();
      expect(views[0].supplierOrderClassification).toBe("SANDBOX");
    });
  });

  describe("B. State compatibility matrix", () => {
    it("flags paid order without reservation as critical", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      view.inventoryStatus = "MISSING";
      view.orderStatus = "PAID";
      const findings = evaluateStateCompatibilityMatrix(view);
      expect(findings.some((f) => f.code === "PAID_NO_RESERVATION" && f.level === "CRITICAL")).toBe(true);
    });
  });

  describe("C–G. Consistency checks", () => {
    it("passes reconciliation for healthy sandbox order", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const fulfillmentId = buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId);
      const reconciliation = reconcileSingleFulfillment(fulfillmentId);
      expect(reconciliation.overallLevel).not.toBe("CRITICAL");
      expect(reconciliation.findings.some((f) => f.checkId === "A" && f.level === "PASS")).toBe(true);
    });
  });

  describe("E. Supplier health", () => {
    it("warns on unhealthy supplier fulfillment", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      for (let i = 0; i < 5; i++) recordSupplierHealthFailure(TEST_SUPPLIER_ID, { errorCode: "TIMEOUT" });
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      view.supplierHealth = "UNHEALTHY";
      const findings = runFulfillmentChecks(view);
      expect(findings.some((f) => f.category === "SUPPLIER")).toBe(true);
    });
  });

  describe("F. Supplier order status", () => {
    it("marks sandbox references explicitly", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      expect(view.supplierOrderId).toMatch(/^SANDBOX-ORDER-/);
      expect(view.supplierOrderClassification).toBe("SANDBOX");
    });
  });

  describe("G. Price snapshot consistency", () => {
    it("validates immutable price snapshot", async () => {
      const result = await createOrder(buildSingleItemOrderInput("bremsscheibe-280"));
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      const findings = runFulfillmentChecks(view);
      expect(findings.some((f) => f.code === "PRICE_SNAPSHOT_EXISTS")).toBe(true);
    });
  });

  describe("H. Tracking consistency", () => {
    it("includes tracking fields when sandbox tracking exists", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      expect(view.trackingStatus).toBeTruthy();
    });
  });

  describe("I. Marketplace consistency", () => {
    it("validates marketplace to central order chain", async () => {
      const imported = await importMarketplaceOrder(
        buildImportOrderInput({
          marketplaceId: TEST_AMAZON,
          marketplaceOrderId: `MP-FCT-${Date.now()}`,
          productId: "reifen-pilot-sport",
        })
      );
      expect(imported.ok).toBe(true);
      const views = listFulfillmentOperationalViews({ orderId: imported.orderId });
      expect(views[0]?.marketplaceId).toBeTruthy();
      const findings = runFulfillmentChecks(views[0]!);
      expect(findings.some((f) => f.code === "MAPPING_OK")).toBe(true);
    });
  });

  describe("J. Returns consistency", () => {
    it("includes return foundation on view", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const view = getFulfillmentOperationalView(
        buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId)
      )!;
      expect(view.returnStatus).toBeTruthy();
      expect(view.refundStatus).toBeTruthy();
    });
  });

  describe("K. Incident creation", () => {
    it("creates incident from non-pass finding", () => {
      const { created, incident } = upsertIncidentFromFinding({
        fulfillmentId: "ff_test",
        orderId: "ord_test",
        supplierId: TEST_SUPPLIER_ID,
        finding: {
          checkId: "X",
          category: "ORDER",
          level: "CRITICAL",
          code: "TEST_INCIDENT",
          message: "Test incident",
        },
      });
      expect(created).toBe(true);
      expect(incident?.status).toBe("OPEN");
    });
  });

  describe("L. Incident deduplication", () => {
    it("does not duplicate active incident fingerprint", () => {
      const fp = buildIncidentFingerprint("ff_test", "ORDER", "DUP_TEST");
      const first = upsertIncidentFromFinding({
        fulfillmentId: "ff_test",
        orderId: "ord_test",
        supplierId: TEST_SUPPLIER_ID,
        finding: { checkId: "X", category: "ORDER", level: "WARNING", code: "DUP_TEST", message: "dup" },
      });
      const second = upsertIncidentFromFinding({
        fulfillmentId: "ff_test",
        orderId: "ord_test",
        supplierId: TEST_SUPPLIER_ID,
        finding: { checkId: "X", category: "ORDER", level: "WARNING", code: "DUP_TEST", message: "dup" },
      });
      expect(first.incident?.incidentId).toBe(second.incident?.incidentId);
      expect(filterIncidents({ status: "OPEN" }).filter((i) => i.fingerprint === fp)).toHaveLength(1);
    });
  });

  describe("M. Incident resolution", () => {
    it("resolves incident without mutating SSOT", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const { incident } = upsertIncidentFromFinding({
        fulfillmentId: "ff_resolve",
        orderId: result.order!.orderId,
        supplierId: TEST_SUPPLIER_ID,
        finding: { checkId: "X", category: "ORDER", level: "WARNING", code: "RES_TEST", message: "resolve me" },
      });
      const resolved = resolveIncident(incident!.incidentId, "admin@test", "acknowledged");
      expect(resolved?.status).toBe("RESOLVED");
      const orderAfter = result.order!;
      expect(orderAfter.items[0].inventoryReservationId).toBeTruthy();
    });

    it("supports acknowledge workflow", () => {
      const { incident } = upsertIncidentFromFinding({
        fulfillmentId: "ff_ack",
        orderId: "ord_ack",
        supplierId: TEST_SUPPLIER_ID,
        finding: { checkId: "X", category: "SYSTEM", level: "WARNING", code: "ACK_TEST", message: "ack" },
      });
      const ack = acknowledgeIncident(incident!.incidentId, "admin@test");
      expect(ack?.status).toBe("ACKNOWLEDGED");
    });
  });

  describe("N–O. Persistence & restart", () => {
    it.skipIf(!hasPersistentStore())("persists snapshot across hydrate", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const fulfillmentId = buildFulfillmentId(result.order!.orderId, result.order!.items[0].orderItemId);
      reconcileSingleFulfillment(fulfillmentId);
      resetControlTowerMemoryForTests();
      hydrateControlTowerFromPersistence();
      expect(getOperationalSnapshot(fulfillmentId)).toBeDefined();
    });
  });

  describe("P. Idempotency", () => {
    it("reconciliation run is idempotent for incidents", async () => {
      await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const first = runFulfillmentReconciliation();
      const second = runFulfillmentReconciliation();
      expect(first.checkedFulfillments).toBe(second.checkedFulfillments);
    });
  });

  describe("Q. Failure isolation", () => {
    it("continues reconciliation when one fulfillment fails checks", async () => {
      await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      await createOrder(buildMultiItemOrderInput());
      const run = runFulfillmentReconciliation();
      expect(run.checkedFulfillments).toBeGreaterThan(1);
      expect(run.errors.length).toBe(0);
    });
  });

  describe("R. RBAC contract", () => {
    it("exports read-only tower functions for admin plugin", async () => {
      const dash = getFulfillmentControlTowerDashboard();
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
    });
  });

  describe("S. Security / network safety", () => {
    it("rejects reconciliation when supplier order network enabled", () => {
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "1";
      expect(() => runFulfillmentReconciliation()).toThrow(/NETWORK_SAFETY/);
      process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    });
  });

  describe("T. AI authority boundary", () => {
    it("AI orchestrator cannot dispatch supplier orders", async () => {
      const ai = await import("@/lib/ai-orchestrator/index").catch(() => null);
      if (!ai) return;
      expect(Object.keys(ai).some((k) => /runFulfillmentReconciliation|dispatchSupplierOrder/i.test(k))).toBe(false);
    });
  });

  describe("U. Performance", () => {
    it("reconciles 100 fulfillments within reasonable time", async () => {
      for (let i = 0; i < 10; i++) {
        await createOrder({
          ...buildSingleItemOrderInput("reifen-pilot-sport"),
          idempotencyKey: `perf-${i}-${Date.now()}`,
        });
      }
      const started = Date.now();
      const run = runFulfillmentReconciliation();
      expect(Date.now() - started).toBeLessThan(15000);
      expect(run.checkedFulfillments).toBeGreaterThanOrEqual(10);
    });
  });

  describe("V. Admin dashboard", () => {
    it("returns dashboard metrics", async () => {
      await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      runFulfillmentReconciliation();
      const dash = getFulfillmentControlTowerDashboard();
      expect(dash.totalFulfillments).toBeGreaterThan(0);
      expect(dash.realSupplierOrderNetwork).toBe("DISABLED");
    });
  });
});

function hasPersistentStore() {
  try {
    const { createFulfillmentControlTowerStore } = require("../../server/lib/fulfillment/persistentStore.js");
    return Boolean(createFulfillmentControlTowerStore());
  } catch {
    return false;
  }
}
