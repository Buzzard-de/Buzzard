import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pipeline = require("../lib/fulfillmentPipeline.js");

describe("local fulfillment does not become a shipment", () => {
  it("stops before supplier routing when the customer order is unverified", () => {
    const blocked = pipeline.runFulfillmentPlan({ orderNumber: "ORD-NO-CUSTOMER", supplierAccepted: true, carrierConnected: true });
    expect(blocked.code).toBe("ORDER_UNVERIFIED");
    expect(blocked.stage).toBe("ORDER");
    expect(blocked.fulfillmentCreated).toBe(false);
    expect(blocked.supplierOrderCreated).toBe(false);
    expect(blocked.shipmentCreated).toBe(false);
    expect(blocked.purchased).toBe(false);
    expect(blocked.reserved).toBe(false);
    expect(blocked.stockStatus).toBe("UNKNOWN");
  });

  it("holds packing when the supplier has not accepted and the carrier is not live", () => {
    const supplier = pipeline.runFulfillmentPlan({
      orderNumber: "ORD-HOLD",
      customerOrderVerified: true,
      customerApproved: true,
    });
    expect(supplier.code).toBe("SUPPLIER_NOT_ACCEPTED");
    expect(supplier.stage).toBe("SUPPLIER");
    expect(supplier.shipmentCreated).toBe(false);
    const pack = pipeline.runFulfillmentPlan({
      orderNumber: "ORD-PACK",
      customerOrderVerified: true,
      customerApproved: true,
      supplierAccepted: true,
      packed: true,
      trackingNumber: "AB123456",
    });
    expect(pack.code).toBe("CARRIER_NOT_LIVE");
    expect(pack.stage).toBe("PACK");
    expect(pack.packed).toBe(false);
    expect(pack.trackingNumber).toBeNull();
    expect(pack.shipmentCreated).toBe(false);
  });

  it("cancels, fails, and leaves a partial plan without a shipment", () => {
    pipeline.runFulfillmentPlan({
      orderNumber: "ORD-STOP",
      customerOrderVerified: true,
      customerApproved: true,
      supplierAccepted: true,
    });
    const cancelled = pipeline.runFulfillmentPlan({ orderNumber: "ORD-STOP", action: "cancel" });
    expect(cancelled.code).toBe("FULFILLMENT_CANCELLED");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.shipmentCreated).toBe(false);
    const again = pipeline.runFulfillmentPlan({ orderNumber: "ORD-STOP", action: "cancel" });
    expect(again.code).toBe("ILLEGAL_TRANSITION");
    expect(again.status).toBe("CANCELLED");

    pipeline.runFulfillmentPlan({
      orderNumber: "ORD-FAIL",
      customerOrderVerified: true,
      customerApproved: true,
    });
    const failed = pipeline.runFulfillmentPlan({ orderNumber: "ORD-FAIL", action: "fail" });
    expect(failed.code).toBe("FULFILLMENT_FAILED");
    expect(failed.status).toBe("FAILED");
    expect(pipeline.runFulfillmentPlan({ orderNumber: "ORD-FAIL", action: "fail" }).code).toBe("ILLEGAL_TRANSITION");

    const partial = pipeline.runFulfillmentPlan({
      orderNumber: "ORD-PART",
      customerOrderVerified: true,
      customerApproved: true,
      supplierAccepted: true,
      action: "partial",
      lines: [{ sku: "A" }, { sku: "B" }],
    });
    expect(partial.code).toBe("PARTIAL_FULFILLMENT");
    expect(partial.status).toBe("PARTIAL");
    expect(partial.linesShipped).toBe(0);
    expect(partial.linesHeld).toBe(2);
    expect(partial.shipmentCreated).toBe(false);
    expect(partial.reserved).toBe(false);
  });

  it("blocks a repeated fulfillment and a repeated shipment, including a synthetic label", () => {
    const first = pipeline.runFulfillmentPlan({ orderNumber: "ORD-DUP-LOCAL" });
    const second = pipeline.runFulfillmentPlan({ orderNumber: "ORD-DUP-LOCAL" });
    expect(first.code).toBe("ORDER_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_FULFILLMENT");
    expect(second.duplicate).toBe(true);
    expect(second.shipmentCreated).toBe(false);

    const label = pipeline.claimShipment({
      shipmentKey: "SHIP-1",
      trackingNumber: "1Z-MOCK",
      label: "PDF",
      carrierResponse: { status: "delivered" },
    });
    expect(label.code).toBe("TRACKING_NOT_A_SHIPMENT");
    expect(label.trackingNumber).toBeNull();
    expect(label.label).toBeNull();
    expect(label.shipmentCreated).toBe(false);
    const repeat = pipeline.claimShipment({ shipmentKey: "SHIP-1" });
    expect(repeat.code).toBe("DUPLICATE_SHIPMENT");
    expect(repeat.duplicate).toBe(true);
    expect(repeat.shipmentCreated).toBe(false);

    const submitted = pipeline.submitSupplierOrder(
      { requestId: "req-label", trackingNumber: "AB123456", carrierResponse: { ok: true } },
      { active: true },
    );
    expect(submitted.code).toBe("TRACKING_NOT_A_SHIPMENT");
    expect(submitted.trackingNumber).toBeNull();
    expect(submitted.shipmentCreated).toBe(false);
    expect(submitted.submitted).toBe(false);
  });
});
