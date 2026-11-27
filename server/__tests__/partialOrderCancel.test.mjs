import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `buzzard-partial-cancel-${process.pid}.sqlite`);
process.env.BUZZARD_DB_PATH = dbPath;
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const orderManagement = require("../lib/orderManagement.js");
const { db } = require("../lib/db.js");

function createTwoLineOrder() {
  const created = orderManagement.createOrder({
    idempotencyKey: `partial-${Date.now()}-${Math.random()}`,
    customerId: "dry-customer",
    currency: "EUR",
    shippingTotal: 5,
    items: [
      { sku: "LINE-A", title: "Filter", quantity: 2, unitPrice: 10 },
      { sku: "LINE-B", title: "Blade", quantity: 1, unitPrice: 20 },
    ],
  });
  expect(created.order?.id).toBeTruthy();
  const items = db.prepare("SELECT * FROM oms_order_items WHERE order_id = ? ORDER BY id").all(created.order.id);
  db.prepare("UPDATE oms_order_items SET reserved_quantity = quantity WHERE order_id = ?").run(created.order.id);
  return { order: created.order, items };
}

describe("MF-ORD-03 selected line cancel", () => {
  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch { /* temp db */ }
  });

  it("refuses a line cancel without an actor and does not change the order", () => {
    const { order, items } = createTwoLineOrder();
    const denied = orderManagement.cancelOrderLines(order.id, { lines: [{ itemId: items[0].id, quantity: 1 }] });
    expect(denied.code).toBe("ACTOR_REQUIRED");
    expect(denied.realMoneyMovement).toBe(false);
    const row = db.prepare("SELECT cancelled_quantity FROM oms_order_items WHERE id = ?").get(items[0].id);
    expect(row.cancelled_quantity).toBe(0);
  });

  it("cancels one selected line, keeps the other, and does not refund", () => {
    const { order, items } = createTwoLineOrder();
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "order-desk@example.invalid",
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("PARTIAL_CANCELLED");
    expect(result.refundIssued).toBe(false);
    expect(result.realMoneyMovement).toBe(false);
    expect(result.live).toBe(false);
    expect(result.supplierOrder).toBe(false);
    expect(result.order.order_status).toBe("pending");
    expect(result.order.subtotal).toBe(30);
    expect(result.order.grand_total).toBe(35);

    const cancelled = db.prepare("SELECT cancelled_quantity, reserved_quantity FROM oms_order_items WHERE id = ?").get(items[0].id);
    const kept = db.prepare("SELECT cancelled_quantity, reserved_quantity FROM oms_order_items WHERE id = ?").get(items[1].id);
    expect(cancelled.cancelled_quantity).toBe(1);
    expect(cancelled.reserved_quantity).toBe(1);
    expect(kept.cancelled_quantity).toBe(0);
    expect(kept.reserved_quantity).toBe(1);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe("0");
  });

  it("refuses a refund flag and a quantity above the open amount", () => {
    const { order, items } = createTwoLineOrder();
    const refund = orderManagement.cancelOrderLines(order.id, {
      actorId: "order-desk@example.invalid",
      refund: true,
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    expect(refund.code).toBe("REFUND_NOT_LIVE");
    const over = orderManagement.cancelOrderLines(order.id, {
      actorId: "order-desk@example.invalid",
      lines: [{ itemId: items[0].id, quantity: 3 }],
    });
    expect(over.code).toBe("QTY_EXCEEDS_OPEN");
    const row = db.prepare("SELECT cancelled_quantity FROM oms_order_items WHERE id = ?").get(items[0].id);
    expect(row.cancelled_quantity).toBe(0);
  });

  it("cancels the remaining lines on the same order without calling whole-order cancel", () => {
    const { order, items } = createTwoLineOrder();
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "order-desk@example.invalid",
      lines: [
        { itemId: items[0].id, quantity: 2 },
        { sku: "LINE-B", quantity: 1 },
      ],
    });
    expect(result.order.order_status).toBe("cancelled");
    expect(result.order.subtotal).toBe(0);
    expect(result.order.grand_total).toBe(0);
    expect(result.refundIssued).toBe(false);
    const whole = orderManagement.cancelOrder(order.id, { reason: "already closed by lines" });
    expect(whole.status).toBe(400);
  });
});
