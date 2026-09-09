import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrder,
  cancelOrder,
  getPriceSnapshot,
  getOrderEvents,
  getOrderAuditLog,
  getCustomerOrder,
  listCustomerOrders,
  getOrderAdminDetail,
  clearOrderRegistry,
  clearOrderEvents,
  clearOrderAuditLog,
  canTransitionOrderStatus,
  rejectClientOrderModification,
  documentRefundChain,
  seedOrderEngineFixtures,
  buildSingleItemOrderInput,
  buildMultiItemOrderInput,
  TEST_CUSTOMER_A,
  TEST_CUSTOMER_B,
} from "./index";
import {
  clearStockRegistry,
  clearAllReservations,
  clearStockEvents,
  clearStockAuditLog,
  processSupplierStockUpdate,
} from "@/lib/inventory-engine";
import { buildStockUpdateFixture } from "@/lib/inventory-engine/test-fixtures";

describe("Order Engine Foundation", () => {
  beforeEach(() => {
    clearOrderRegistry();
    clearOrderEvents();
    clearOrderAuditLog();
    clearStockRegistry();
    clearAllReservations();
    clearStockEvents();
    clearStockAuditLog();
    seedOrderEngineFixtures();
  });

  describe("Order Model", () => {
    it("creates order with canonical fields", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.ok).toBe(true);
      const order = result.order!;
      expect(order.orderId).toBeTruthy();
      expect(order.orderNumber).toMatch(/^BZ-2026-/);
      expect(order.items).toHaveLength(1);
      expect(order.currency).toBe("EUR");
    });
  });

  describe("Order Creation", () => {
    it("creates single item order", async () => {
      const result = await createOrder(buildSingleItemOrderInput("motoroel-5w30"));
      expect(result.ok).toBe(true);
      expect(result.order?.status).toBe("SUPPLIER_PENDING");
    });

    it("creates multi-item order", async () => {
      const result = await createOrder(buildMultiItemOrderInput());
      expect(result.ok).toBe(true);
      expect(result.order?.items).toHaveLength(2);
    });
  });

  describe("Price Snapshot", () => {
    it("immutable price snapshot at order time", async () => {
      const result = await createOrder(buildSingleItemOrderInput("bremsscheibe-280"));
      const order = result.order!;
      const snapshot = getPriceSnapshot(order.items[0].priceSnapshotId);
      expect(snapshot?.customerGrossPrice).toBe(order.items[0].unitGrossPrice);
      expect(snapshot?.supplierCost).toBeGreaterThan(0);
      expect(snapshot?.targetMarginPercent).toBeGreaterThan(0);
    });
  });

  describe("Supplier Snapshot", () => {
    it("stores supplier assignment snapshot", async () => {
      const result = await createOrder(buildSingleItemOrderInput("bremsbelaege-vorder"));
      expect(result.order?.supplierAssignments[0].supplierId).toBeTruthy();
      expect(result.order?.supplierAssignments[0].selectionScore).toBeGreaterThan(0);
    });
  });

  describe("Inventory Reservation", () => {
    it("creates reservation on order", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.order?.reservationIds.length).toBe(1);
      expect(result.order?.items[0].inventoryReservationId).toBeTruthy();
    });
  });

  describe("Payment Failure", () => {
    it("releases reservation on payment failure", async () => {
      const result = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { _testPaymentShouldFail: true })
      );
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("PAYMENT_FAILED");
      expect(result.order?.reservationIds).toEqual([]);
    });
  });

  describe("Supplier Selection Failure", () => {
    it("fails when supplier unavailable", async () => {
      const result = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { _testForceSupplierUnavailable: true })
      );
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("SUPPLIER_UNAVAILABLE");
    });
  });

  describe("Out of Stock", () => {
    it("fails when no saleable stock", async () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 0));
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("OUT_OF_STOCK");
    });
  });

  describe("Idempotency", () => {
    it("returns existing order for duplicate idempotency key", async () => {
      const input = buildSingleItemOrderInput("reifen-pilot-sport", {
        idempotencyKey: "idem_duplicate_test",
      });
      const first = await createOrder(input);
      const second = await createOrder(input);
      expect(second.idempotentReplay).toBe(true);
      expect(second.order?.orderId).toBe(first.order?.orderId);
    });
  });

  describe("Concurrency", () => {
    it("prevents overselling last unit", async () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 6));
      const inputA = buildSingleItemOrderInput("reifen-pilot-sport", {
        idempotencyKey: "concurrency_a",
      });
      const inputB = buildSingleItemOrderInput("reifen-pilot-sport", {
        idempotencyKey: "concurrency_b",
      });
      const [resultA, resultB] = await Promise.all([createOrder(inputA), createOrder(inputB)]);
      const successes = [resultA, resultB].filter((r) => r.ok);
      const failures = [resultA, resultB].filter((r) => !r.ok);
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].errorCode).toMatch(/OUT_OF_STOCK|RESERVATION_FAILED/);
    });
  });

  describe("Order Status Machine", () => {
    it("valid transitions", () => {
      expect(canTransitionOrderStatus("PENDING_PAYMENT", "PAID")).toBe(true);
      expect(canTransitionOrderStatus("PAID", "CONFIRMED")).toBe(true);
      expect(canTransitionOrderStatus("DELIVERED", "CANCELLED")).toBe(false);
    });
  });

  describe("Cancellation", () => {
    it("cancels order and releases reservation", async () => {
      const created = await createOrder(buildSingleItemOrderInput("motoroel-5w30"));
      const cancelled = cancelOrder(created.order!.orderId, { customerId: TEST_CUSTOMER_A });
      expect(cancelled.ok).toBe(true);
      expect(cancelled.order?.status).toBe("CANCELLED");
      expect(cancelled.order?.reservationIds).toEqual([]);
    });
  });

  describe("Market Snapshot", () => {
    it("stores immutable market/channel snapshot", async () => {
      const result = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { marketId: "PL", channel: "allegro" })
      );
      expect(result.order?.marketChannelSnapshot.marketId).toBe("PL");
      expect(result.order?.marketChannelSnapshot.channel).toBe("allegro");
    });
  });

  describe("Address Snapshot", () => {
    it("retains shipping address on order", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.order?.shippingAddress.city).toBe("Berlin");
      expect(result.order?.shippingAddress.country).toBe("DE");
    });
  });

  describe("Supplier Order Dry Run", () => {
    it("prepares dry-run supplier orders", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.order?.supplierOrders[0].dryRun).toBe(true);
      expect(result.order?.supplierOrders[0].status).toBe("PREPARED");
    });
  });

  describe("Order Events", () => {
    it("records append-only events", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const events = getOrderEvents(result.order!.orderId);
      expect(events.some((e) => e.type === "ORDER_CREATED")).toBe(true);
      expect(events.some((e) => e.type === "ORDER_CONFIRMED")).toBe(true);
      expect(events.some((e) => e.type === "SUPPLIER_ORDER_PREPARED")).toBe(true);
    });
  });

  describe("Audit", () => {
    it("records auditable actions", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const audit = getOrderAuditLog(result.order!.orderId);
      expect(audit.length).toBeGreaterThan(0);
    });
  });

  describe("Return/Refund Foundation", () => {
    it("documents refund chain", () => {
      expect(documentRefundChain()).toContain("Supplier Credit");
      expect(documentRefundChain()).toContain("Buzzard Final Loss");
    });

    it("initializes return/refund fields", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      expect(result.order?.returnRefund.returnStatus).toBe("NONE");
      expect(result.order?.returnRefund.refundStatus).toBe("NONE");
    });
  });

  describe("Security", () => {
    it("rejects client order field modification", () => {
      const result = rejectClientOrderModification({ supplierCostSnapshot: 1 });
      expect(result.allowed).toBe(false);
    });

    it("rejects client status modification", () => {
      const result = rejectClientOrderModification({ status: "DELIVERED" });
      expect(result.allowed).toBe(false);
    });
  });

  describe("Customer Isolation", () => {
    it("customer A cannot access customer B order", async () => {
      const result = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", { customerId: TEST_CUSTOMER_A })
      );
      const view = getCustomerOrder(result.order!.orderId, TEST_CUSTOMER_B);
      expect(view).toBeNull();
    });

    it("customer sees order without internal costs", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const view = getCustomerOrder(result.order!.orderId, TEST_CUSTOMER_A)!;
      expect(view.totalGross).toBeGreaterThan(0);
      expect("supplierCostSnapshot" in view).toBe(false);
      expect("marginSnapshot" in view).toBe(false);
    });

    it("lists customer orders", async () => {
      await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const orders = listCustomerOrders(TEST_CUSTOMER_A);
      expect(orders.length).toBeGreaterThan(0);
    });
  });

  describe("Admin", () => {
    it("admin can inspect order details", async () => {
      const result = await createOrder(buildSingleItemOrderInput("reifen-pilot-sport"));
      const admin = getOrderAdminDetail(result.order!.orderId);
      expect(admin?.orderNumber).toBe(result.order?.orderNumber);
      expect(admin?.supplierOrderStatus).toBe("PREPARED");
    });
  });

  describe("Order Totals", () => {
    it("aggregates line totals", async () => {
      const result = await createOrder(buildMultiItemOrderInput());
      const order = result.order!;
      expect(order.totalGross).toBeGreaterThan(0);
      expect(order.subtotalNet).toBeGreaterThan(0);
    });
  });

  describe("Multi-Market", () => {
    it("supports different market orders", async () => {
      const de = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", {
          marketId: "DE",
          idempotencyKey: "market_de",
        })
      );
      const pl = await createOrder(
        buildSingleItemOrderInput("reifen-pilot-sport", {
          marketId: "PL",
          idempotencyKey: "market_pl",
        })
      );
      expect(de.order?.marketId).toBe("DE");
      expect(pl.order?.marketId).toBe("PL");
    });
  });
});
