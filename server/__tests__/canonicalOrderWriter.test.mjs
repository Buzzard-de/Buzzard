import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const orderService = require("../lib/commerce/orderService.js");
const orderManagement = require("../lib/orderManagement.js");
const dbOrders = require("../lib/dbOrders.js");
const { db } = require("../lib/db.js");

const sales = process.env.BUZZARD_SALES_ENABLED;

describe("canonical order writer", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  afterEach(() => {
    process.env.BUZZARD_SALES_ENABLED = sales;
  });

  it("refuses a commercial order and a captured payment while sales are locked", () => {
    const before = orderService.getCommercialOrderCount();
    const commercial = orderService.recordCanonicalOrder({
      orderType: "COMMERCIAL",
      items: [{ sku: "DRY-SKU-001", quantity: 1, unitPrice: 40 }],
      total: 40,
    });
    expect(commercial.blocked).toBe(true);
    expect(commercial.code).toBe("sales_disabled");
    expect(orderService.getCommercialOrderCount()).toBe(before);

    const captured = orderService.recordCanonicalOrder({
      orderType: "DRY_RUN",
      items: [{ sku: "DRY-SKU-001", quantity: 1, unitPrice: 40 }],
      payment: { captured: true },
    });
    expect(captured.code).toBe("PAYMENT_NOT_LIVE");
    expect(captured.captured).toBe(false);
  });

  it("rejects an empty item list and reuses one row for the same idempotency key", () => {
    const empty = orderService.recordCanonicalOrder({ orderType: "DRY_RUN", items: [], idempotencyKey: "empty" });
    expect(empty.code).toBe("ITEMS_REQUIRED");

    const key = `canon-once-${crypto.randomBytes(4).toString("hex")}`;
    const first = orderService.recordCanonicalOrder({
      orderType: "DRY_RUN",
      idempotencyKey: key,
      currency: "EUR",
      subtotal: 40,
      total: 40,
      items: [{ sku: "DRY-SKU-001", title: "Bremsbelag", quantity: 1, unitPrice: 40 }],
    });
    expect(first.created).toBe(true);
    expect(first.canonical).toBe(true);
    expect(first.metadata.captured).toBe(false);
    expect(first.metadata.realMoneyMovement).toBe(false);
    expect(first.isCommercial).toBe(false);

    const second = orderService.recordCanonicalOrder({
      orderType: "DRY_RUN",
      idempotencyKey: key,
      items: [{ sku: "DRY-SKU-001", quantity: 1, unitPrice: 40 }],
    });
    expect(second.created).toBe(false);
    expect(second.id).toBe(first.id);
    const copies = db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE id = ?").get(first.id).n;
    expect(copies).toBe(1);
  });

  it("makes the OMS writer delegate and still cancel without a refund", () => {
    const omsKey = `oms-delegate-${crypto.randomBytes(4).toString("hex")}`;
    const created = orderManagement.createOrder({
      idempotencyKey: omsKey,
      customerEmail: "dry@example.com",
      currency: "EUR",
      items: [{ sku: "DRY-SKU-001", title: "Bremsbelag", quantity: 1, unitPrice: 40 }],
    });
    expect(created.error).toBeUndefined();
    expect(created.canonicalOrderId).toMatch(/^ord_/);
    expect(created.order.order_status).toBe("pending");
    const canonical = orderService.getOrder(created.canonicalOrderId);
    expect(canonical.orderType).toBe("DRY_RUN");
    expect(canonical.metadata.captured).toBe(false);

    const again = orderManagement.createOrder({
      idempotencyKey: omsKey,
      items: [{ sku: "DRY-SKU-001", quantity: 1, unitPrice: 40 }],
    });
    expect(again.order.id).toBe(created.order.id);
    const rows = db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE id = ?").get(created.canonicalOrderId).n;
    expect(rows).toBe(1);

    const cancelled = orderManagement.cancelOrder(created.order.id, { reason: "synthetic" });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.order.order_status).toBe("cancelled");
    const commerce = orderService.transitionOrderStatus(created.canonicalOrderId, "CANCELLED", { actorId: "order-test" });
    expect(commerce.status).toBe("CANCELLED");
    expect(orderService.getCommercialOrderCount()).toBe(0);
  });

  it("does not create a cart order or change stock while sales are locked", () => {
    const result = dbOrders.createOrderFromCart("user-locked", {
      idempotencyKey: "cart-locked",
      countryCode: "DE",
    });
    expect(result.code).toBe("sales_disabled");
    expect(result.status).toBe(403);
  });
});
