import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateSaleableQuantity,
  applyStockBuffer,
  validateSupplierQuantity,
  processSupplierStockUpdate,
  processSupplierSyncFailure,
  runInventoryStockSync,
  createStockReservation,
  releaseReservation,
  consumeReservation,
  cancelReservation,
  markOfferDiscontinued,
  pauseOffer,
  resumeOffer,
  getSupplierSelectionStockInfo,
  isPricingRecalculationRequired,
  consumePricingRecalculationFlag,
  getStockRecord,
  listStockRecords,
  clearStockRegistry,
  clearAllReservations,
  clearStockEvents,
  clearStockAuditLog,
  getStockEvents,
  getStockAuditLog,
  computeMarketAvailability,
  computeChannelAvailability,
  buildStockUpdateFixture,
  STOCK_TEST_SCENARIOS,
  TEST_SUPPLIER_ID,
  rejectClientInventoryModification,
  validateInventoryRequest,
  getInventoryAdminOverview,
  recomputeStockRecord,
  upsertStockRecord,
  createInitialStockRecord,
} from "./index";

describe("Inventory Engine Foundation", () => {
  beforeEach(() => {
    clearStockRegistry();
    clearAllReservations();
    clearStockEvents();
    clearStockAuditLog();
  });

  describe("Inventory Model", () => {
    it("creates supplier stock record — NOT Buzzard-owned inventory", () => {
      const result = processSupplierStockUpdate(
        buildStockUpdateFixture("reifen-pilot-sport", 100)
      );
      expect(result.ok).toBe(true);
      const record = result.record!;
      expect(record.quantity).toBe(100);
      expect(record.saleableQuantity).toBeLessThan(100);
      expect(record.saleableQuantity).toBeGreaterThan(0);
    });
  });

  describe("Supplier Stock vs Buzzard Stock", () => {
    it("tracks supplier quantity without representing Buzzard warehouse inventory", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 100));
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      expect(record.quantity).toBe(100);
      expect(record.availableQuantity).toBe(100);
      expect(record.saleableQuantity).toBe(95);
    });
  });

  describe("Multi-Supplier Stock", () => {
    it("maintains independent stock per supplier offer", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 0));
      processSupplierStockUpdate({
        ...buildStockUpdateFixture("reifen-pilot-sport", 25),
        supplierId: "SUPPLIER_B",
        supplierOfferId: "SB-TIRE",
        supplierSku: "SB-TIRE",
      });
      const records = listStockRecords({ productId: "reifen-pilot-sport" });
      expect(records).toHaveLength(2);
      expect(records.find((r) => r.supplierId === TEST_SUPPLIER_ID)?.quantity).toBe(0);
      expect(records.find((r) => r.supplierId === "SUPPLIER_B")?.quantity).toBe(25);
    });
  });

  describe("Saleable Quantity", () => {
    it("calculates saleable = available - buffer - reserved", () => {
      const saleable = calculateSaleableQuantity({
        availableQuantity: 100,
        stockBuffer: { type: "absolute", value: 5 },
        reservedQuantity: 10,
      });
      expect(saleable).toBe(85);
    });
  });

  describe("Stock Buffer", () => {
    it("absolute buffer", () => {
      expect(applyStockBuffer(100, { type: "absolute", value: 5 })).toBe(95);
    });

    it("percentage buffer", () => {
      expect(applyStockBuffer(100, { type: "percentage", value: 0.1 })).toBe(90);
    });
  });

  describe("Stock Validation", () => {
    it("rejects negative stock", () => {
      const v = validateSupplierQuantity(-5);
      expect(v.valid).toBe(false);
      expect(v.errors).toContain("INVALID_STOCK");
    });

    it("handles missing stock as UNKNOWN", () => {
      const v = validateSupplierQuantity(null);
      expect(v.valid).toBe(false);
      expect(v.stockStatus).toBe("UNKNOWN");
    });

    it("rejects invalid text", () => {
      const v = validateSupplierQuantity("abc");
      expect(v.valid).toBe(false);
      expect(v.errors).toContain("INVALID_STOCK");
    });
  });

  describe("Zero Stock", () => {
    it("marks offer OUT_OF_STOCK", () => {
      const result = processSupplierStockUpdate(
        buildStockUpdateFixture("motoroel-5w30", STOCK_TEST_SCENARIOS.OUT_OF_STOCK_0)
      );
      expect(result.record?.stockStatus).toBe("OUT_OF_STOCK");
      expect(result.record?.saleableQuantity).toBe(0);
    });
  });

  describe("Stale Stock", () => {
    it("marks stale stock as NOT saleable by default", () => {
      const base = createInitialStockRecord({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        supplierSku: "TSA-TIRE-225-45-17",
        quantity: 50,
        source: "test",
      });
      const staleRecord = recomputeStockRecord({
        ...base,
        lastSuccessfulSyncAt: new Date(Date.now() - 86400000).toISOString(),
      });
      upsertStockRecord(staleRecord);
      expect(staleRecord.isStale).toBe(true);
      expect(staleRecord.saleableQuantity).toBe(0);
    });
  });

  describe("Stock Sync", () => {
    it("FULL_STOCK_SYNC processes batch", async () => {
      const result = await runInventoryStockSync(TEST_SUPPLIER_ID, [
        { supplierSku: "TSA-TIRE-225-45-17", rawQuantity: 100 },
        { supplierSku: "TSA-OIL-5W30-5L", rawQuantity: 25 },
      ]);
      expect(result.productsUpdated).toBe(2);
      expect(result.syncType).toBe("FULL_STOCK_SYNC");
    });

    it("SINGLE_PRODUCT_STOCK_SYNC", () => {
      const result = processSupplierStockUpdate(
        buildStockUpdateFixture("bremsscheibe-280", 40)
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("Stock Reservation", () => {
    it("creates and releases reservation", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 10));
      const created = createStockReservation({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        quantity: 2,
        orderId: "ORD-1",
      });
      expect(created.ok).toBe(true);
      expect(created.reservation?.isSupplierConfirmed).toBe(false);

      const released = releaseReservation(created.reservation!.reservationId);
      expect(released.ok).toBe(true);
      expect(released.reservation?.status).toBe("RELEASED");
    });

    it("consumes reservation", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 10));
      const created = createStockReservation({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        quantity: 1,
      });
      const consumed = consumeReservation(created.reservation!.reservationId);
      expect(consumed.reservation?.status).toBe("CONSUMED");
    });

    it("cancels reservation", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 10));
      const created = createStockReservation({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        quantity: 1,
      });
      const cancelled = cancelReservation(created.reservation!.reservationId);
      expect(cancelled.reservation?.status).toBe("CANCELLED");
    });
  });

  describe("Overselling Protection", () => {
    it("rejects second reservation when only 1 saleable", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 6));
      const orderA = createStockReservation({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        quantity: 1,
        orderId: "ORD-A",
      });
      expect(orderA.ok).toBe(true);

      const orderB = createStockReservation({
        productId: "reifen-pilot-sport",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-TIRE-225-45-17",
        quantity: 5,
        orderId: "ORD-B",
      });
      expect(orderB.ok).toBe(false);
      expect(orderB.reason).toBe("INSUFFICIENT_SALEABLE_STOCK");
    });
  });

  describe("Market Availability", () => {
    it("market-aware availability", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 50));
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      const de = computeMarketAvailability(record, "DE");
      expect(de.available).toBe(true);
    });
  });

  describe("Channel Availability", () => {
    it("channel-specific availability", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 50));
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      const direct = computeChannelAvailability(record, "direct", "DE");
      const amazon = computeChannelAvailability(record, "amazon", "DE");
      expect(direct.available).toBe(true);
      expect(amazon.available).toBe(true);
    });

    it("paused offer unavailable on channels", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 50));
      pauseOffer("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17");
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      const direct = computeChannelAvailability(record, "direct", "DE");
      expect(direct.status).toBe("PAUSED");
    });
  });

  describe("Discontinued Product", () => {
    it("discontinued offer becomes unavailable without deleting product", () => {
      markOfferDiscontinued("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17");
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      expect(record.stockStatus).toBe("DISCONTINUED");
      expect(record.saleableQuantity).toBe(0);
    });

    it("other supplier offers remain sellable", () => {
      markOfferDiscontinued("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17");
      processSupplierStockUpdate({
        ...buildStockUpdateFixture("reifen-pilot-sport", 20),
        supplierId: "SUPPLIER_B",
        supplierOfferId: "SB-TIRE",
        supplierSku: "SB-TIRE",
      });
      const alt = getStockRecord("reifen-pilot-sport", "SUPPLIER_B", "SB-TIRE")!;
      expect(alt.saleableQuantity).toBeGreaterThan(0);
    });
  });

  describe("Supplier Recovery", () => {
    it("recovers from OUT_OF_STOCK when stock returns", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("motoroel-5w30", 0));
      processSupplierStockUpdate(buildStockUpdateFixture("motoroel-5w30", 20));
      const record = getStockRecord("motoroel-5w30", TEST_SUPPLIER_ID, "TSA-OIL-5W30-5L")!;
      expect(record.stockStatus).toBe("IN_STOCK");
    });

    it("does NOT reactivate manually DISCONTINUED offer", () => {
      markOfferDiscontinued("motoroel-5w30", TEST_SUPPLIER_ID, "TSA-OIL-5W30-5L");
      const retry = processSupplierStockUpdate(buildStockUpdateFixture("motoroel-5w30", 20));
      expect(retry.record?.manuallyDiscontinued).toBe(true);
      expect(retry.record?.stockStatus).toBe("DISCONTINUED");
    });
  });

  describe("Supplier Failure", () => {
    it("retains last known stock on sync failure", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("bremsscheibe-280", 24));
      const before = getStockRecord("bremsscheibe-280", TEST_SUPPLIER_ID, "TSA-DISC-280")!;
      const failure = processSupplierSyncFailure({
        productId: "bremsscheibe-280",
        supplierId: TEST_SUPPLIER_ID,
        supplierOfferId: "TSA-DISC-280",
        source: TEST_SUPPLIER_ID,
        error: "SUPPLIER_UNAVAILABLE",
      });
      expect(failure.record?.quantity).toBe(before.quantity);
      expect(failure.record?.lastSyncFailed).toBe(true);
    });
  });

  describe("Stock Events", () => {
    it("emits stock events on update", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("bremsbelaege-vorder", 5));
      processSupplierStockUpdate(buildStockUpdateFixture("bremsbelaege-vorder", 25));
      const events = getStockEvents({ productId: "bremsbelaege-vorder" });
      expect(events.some((e) => e.type === "STOCK_INCREASED" || e.type === "STOCK_CHANGED")).toBe(true);
    });
  });

  describe("Audit", () => {
    it("records auditable stock changes", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 100));
      const audit = getStockAuditLog({ productId: "reifen-pilot-sport" });
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].newQuantity).toBe(100);
    });
  });

  describe("Supplier Selection Integration", () => {
    it("exposes stock info for supplier selection", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 25));
      const info = getSupplierSelectionStockInfo(
        "reifen-pilot-sport",
        TEST_SUPPLIER_ID,
        "TSA-TIRE-225-45-17"
      );
      expect(info?.saleableQuantity).toBeGreaterThan(0);
      expect(info?.stockStatus).toBe("IN_STOCK");
    });
  });

  describe("Pricing Integration", () => {
    it("signals pricing recalculation required on stock change", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 10));
      expect(isPricingRecalculationRequired("reifen-pilot-sport")).toBe(true);
      expect(consumePricingRecalculationFlag("reifen-pilot-sport")).toBe(true);
    });
  });

  describe("Security", () => {
    it("rejects client stock modification", () => {
      const result = rejectClientInventoryModification({ saleableQuantity: 999 });
      expect(result.allowed).toBe(false);
    });

    it("validates inventory request", () => {
      expect(validateInventoryRequest({}).valid).toBe(false);
      expect(
        validateInventoryRequest({
          productId: "x",
          supplierId: "y",
          supplierOfferId: "z",
        }).valid
      ).toBe(true);
    });
  });

  describe("Admin", () => {
    it("builds admin overview rows", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 100));
      const rows = getInventoryAdminOverview({ productId: "reifen-pilot-sport" });
      expect(rows).toHaveLength(1);
      expect(rows[0].supplierQuantity).toBe(100);
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects invalid stock in sync without corrupting record", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 50));
      const invalid = processSupplierStockUpdate(
        buildStockUpdateFixture("reifen-pilot-sport", STOCK_TEST_SCENARIOS.NEGATIVE)
      );
      expect(invalid.ok).toBe(false);
      expect(getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")?.quantity).toBe(50);
    });
  });

  describe("Resume Offer", () => {
    it("resumes paused offer", () => {
      processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 50));
      pauseOffer("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17");
      resumeOffer("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17");
      const record = getStockRecord("reifen-pilot-sport", TEST_SUPPLIER_ID, "TSA-TIRE-225-45-17")!;
      expect(record.manuallyPaused).toBe(false);
    });
  });
});
