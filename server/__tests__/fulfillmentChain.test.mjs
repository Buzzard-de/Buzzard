import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-fulfillment-"));
const previous = process.env.BUZZARD_FULFILLMENT_DIR;

beforeAll(() => {
  process.env.BUZZARD_FULFILLMENT_DIR = dir;
});

afterAll(() => {
  if (previous == null) delete process.env.BUZZARD_FULFILLMENT_DIR;
  else process.env.BUZZARD_FULFILLMENT_DIR = previous;
});

const pipeline = require("../lib/fulfillmentPipeline.js");
const store = require("../lib/fulfillmentStore.js");
const payment = require("../lib/paymentVerification.js");
const orderManagement = require("../lib/orderManagement.js");
const { db } = require("../lib/db");

describe("fulfillment stays unsubmitted without live proof", () => {
  it("blocks a flagged checkout while sales are closed and writes nothing", async () => {
    const before = store.readFulfillments().length;
    const result = pipeline.createFulfillmentsForOrder(
      {
        orderNumber: "ORD-CLOSED",
        lines: [{ productId: 1, sku: "X", quantity: 1 }],
        live: true,
        verified: true,
        submitted: true,
        approved: true,
        paymentVerified: true,
        supplierCostVerified: true,
        stockVerified: true,
      },
      new Map([[1, { supplier_id: "SUP-1" }]]),
    );
    expect(result[0].blocked).toBe(true);
    expect(result[0].code).toBe("SALES_CLOSED");
    expect(result[0].reasons).toEqual(expect.arrayContaining([
      "PAYMENT_UNVERIFIED",
      "SUPPLIER_COST_UNVERIFIED",
      "STOCK_UNVERIFIED",
      "SHIPPING_RATE_UNVERIFIED",
      "ORDER_UNVERIFIED",
    ]));
    expect(result[0].fulfillmentCreated).toBe(false);
    expect(result[0].sent).toBe(false);
    expect(result[0].accepted).toBe(false);
    expect(result[0].supplierOrderNumber).toBeNull();
    expect(result[0].submissionStatus).toBe("BLOCKED_EXTERNAL");
    expect(store.readFulfillments().length).toBe(before);
    expect(store.readSupplierOrders().length).toBe(0);

    const [first, second] = await Promise.all([
      Promise.resolve().then(() => pipeline.createFulfillmentsForOrder(
        { orderNumber: "ORD-CONCURRENT", lines: [], customerId: "a", ownerId: "b", sent: true, accepted: true },
        new Map(),
      )),
      Promise.resolve().then(() => pipeline.createFulfillmentsForOrder(
        { orderNumber: "ORD-CONCURRENT", lines: [], customerId: "a", ownerId: "b", sent: true, accepted: true },
        new Map(),
      )),
    ]);
    expect(first[0].sent).toBe(false);
    expect(second[0].sent).toBe(false);
    expect(first[0].accepted).toBe(false);
    expect(second[0].accepted).toBe(false);
    expect(first[0].supplierOrderCreated).toBe(false);
    expect(second[0].supplierOrderCreated).toBe(false);
    expect(store.readSupplierOrders().length).toBe(0);
    expect(store.readFulfillments().some((row) => row.orderNumber === "ORD-CONCURRENT")).toBe(false);
  });

  it("rejects mock data and does not create a second fulfillment", () => {
    const mock = pipeline.createFulfillmentsForOrder({ orderNumber: "ORD-MOCK", mock: true, lines: [] }, new Map());
    expect(mock[0].reasons).toContain("MOCK_NOT_COMMERCIAL");
    expect(mock[0].fulfillmentCreated).toBe(false);

    fs.writeFileSync(path.join(dir, "fulfillments.json"), JSON.stringify([{
      id: "ful-dup",
      orderNumber: "ORD-DUP",
      supplierId: "SUP-1",
      model: null,
      status: "PREPARED",
      lines: [],
    }]));
    const count = store.readFulfillments().filter((row) => row.orderNumber === "ORD-DUP").length;
    const duplicate = pipeline.createFulfillmentsForOrder({ orderNumber: "ORD-DUP", lines: [] }, new Map());
    expect(duplicate[0].code).toBe("DUPLICATE_FULFILLMENT");
    expect(store.readFulfillments().filter((row) => row.orderNumber === "ORD-DUP").length).toBe(count);
    expect(store.readFulfillments().find((row) => row.orderNumber === "ORD-DUP").status).toBe("PREPARED");
  });

  it("keeps timeout, network, demo, and repeat supplier calls unsubmitted", () => {
    const timeout = pipeline.submitSupplierOrder({ requestId: "req-timeout", timeout: true }, { active: true });
    expect(timeout.code).toBe("TIMEOUT");
    expect(timeout.submissionStatus).toBe("SUBMISSION_FAILED");
    expect(timeout.submitted).toBe(false);
    expect(timeout.supplierOrderCreated).toBe(false);

    const network = pipeline.submitSupplierOrder({ requestId: "req-net", networkError: true }, { active: true });
    expect(network.code).toBe("NETWORK_ERROR");
    expect(network.submitted).toBe(false);

    const demo = pipeline.submitSupplierOrder({ requestId: "req-demo", trackingNumber: "DEMO123456" }, { active: true });
    expect(demo.code).toBe("MOCK_NOT_COMMERCIAL");
    expect(demo.trackingNumber).toBeNull();
    expect(demo.submissionStatus).not.toBe("SUBMITTED_CONFIRMED");

    const first = pipeline.submitSupplierOrder({ requestId: "req-dup", status: "submitted" }, { active: true });
    const second = pipeline.submitSupplierOrder({ requestId: "req-dup", status: "submitted" }, { active: true });
    expect(first.submitted).toBe(false);
    expect(first.submissionStatus).not.toBe("SUBMITTED_CONFIRMED");
    expect(second.code).toBe("DUPLICATE_SUPPLIER_SUBMISSION");
    expect(second.duplicate).toBe(true);
  });

  it("does not turn a retry or a delivery claim into a shipment", () => {
    fs.writeFileSync(path.join(dir, "fulfillments.json"), JSON.stringify([{
      id: "ful-retry",
      orderNumber: "ORD-RETRY",
      supplierId: "SUP-2",
      model: null,
      status: "PREPARED",
      lines: [],
    }]));
    const direct = store.createFulfillment({ orderNumber: "ORD-DIRECT", supplierId: "SUP-2", model: null, lines: [] });
    expect(direct.ok).toBe(false);
    expect(direct.code).toBe("SALES_CLOSED");
    expect(direct.stored).toBe(false);
    const retry = pipeline.retryFulfillment("ful-retry", { userId: "ai" });
    expect(retry.ok).toBe(false);
    expect(retry.shipmentCreated).toBe(false);
    expect(retry.supplierCancelled).toBe(false);
    fs.writeFileSync(path.join(dir, "shipments.json"), JSON.stringify([{
      id: "shp-retry",
      orderNumber: "ORD-RETRY",
      trackingNumber: null,
      status: "PREPARED",
    }]));
    const shipment = store.createShipment({ orderNumber: "ORD-RETRY", fulfillmentId: "ful-retry", supplierId: "SUP-2", lines: [] });
    expect(shipment.ok).toBe(false);
    expect(shipment.code).toBe("SALES_CLOSED");
    expect(shipment.stored).toBe(false);
    const delivered = store.updateShipment("shp-retry", { status: "delivered", trackingNumber: "AB123456" });
    expect(delivered.code).toBe("DELIVERY_UNCONFIRMED");
    expect(delivered.delivered).toBe(false);
    expect(store.readShipments().find((row) => row.id === "shp-retry").trackingNumber).toBeNull();
  });

  it("does not verify a demo payment or mark an order paid, shipped, or cancelled", () => {
    const intent = payment.verifyPaymentIntent({ provider: "stripe", amount: 10, currency: "EUR" });
    expect(intent.ok).toBe(false);
    expect(intent.code).toBe("PAYMENT_UNVERIFIED");
    expect(intent.transactionId).toBeNull();
    expect(intent.demo).toBe(false);
    const cryptoPay = payment.verifyPaymentIntent({ provider: "stripe", amount: 10, currency: "BTC" });
    expect(cryptoPay.code).toBe("REJECTED_CRYPTO_POLICY");

    const orderNumber = `OMS-${Date.now()}`;
    const inserted = db.prepare("INSERT INTO oms_orders (order_number) VALUES (?)").run(orderNumber);
    const paid = orderManagement.updatePaymentStatus(inserted.lastInsertRowid, { status: "paid" });
    const shipped = orderManagement.updateFulfillmentStatus(inserted.lastInsertRowid, { status: "delivered" });
    const cancelled = orderManagement.cancelOrder(inserted.lastInsertRowid, { reason: "test" });
    expect(paid.code).toBe("PAYMENT_UNVERIFIED");
    expect(shipped.code).toBe("FULFILLMENT_NOT_LIVE");
    expect(cancelled.code).toBe("CANCELLATION_UNVERIFIED");
    expect(cancelled.supplierCancelled).toBe(false);
    const row = db.prepare("SELECT payment_status, fulfillment_status, order_status FROM oms_orders WHERE id = ?").get(inserted.lastInsertRowid);
    expect(row.payment_status).toBe("pending");
    expect(row.fulfillment_status).toBe("unfulfilled");
    expect(row.order_status).toBe("pending");
    const moved = orderManagement.updateOrderStatus(inserted.lastInsertRowid, { status: "fulfilled" });
    expect(moved.code).toBe("ORDER_UNVERIFIED");
    expect(moved.applied).toBe(false);
    const { separateRefundAndCredit } = require("../lib/commerce/commerceRiskGates.js");
    const open = separateRefundAndCredit({});
    expect(open.customerRefund).toBeNull();
    expect(open.supplierCredit).toBeNull();
    expect(open.reconciled).toBe(false);
  });
});
