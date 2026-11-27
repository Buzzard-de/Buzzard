import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `buzzard-cancel-audit-${process.pid}.sqlite`);
const dataDir = path.join(os.tmpdir(), `buzzard-cancel-audit-data-${process.pid}`);
process.env.BUZZARD_DB_PATH = dbPath;
process.env.BUZZARD_DATA_DIR = dataDir;
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const orderManagement = require("../lib/orderManagement.js");
const { db } = require("../lib/db.js");
const childPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "support", "partialCancelRaceChild.cjs");

function cents(value) {
  return Math.round(Number(value) * 100);
}

function createOrder(items, totals = {}) {
  const created = orderManagement.createOrder({
    idempotencyKey: `audit-${Date.now()}-${Math.random()}`,
    customerId: "dry-customer",
    currency: "EUR",
    shippingTotal: totals.shippingTotal ?? 0,
    discountTotal: totals.discountTotal ?? 0,
    taxTotal: totals.taxTotal ?? 0,
    items,
  });
  expect(created.order?.id).toBeTruthy();
  const rows = db.prepare("SELECT * FROM oms_order_items WHERE order_id = ? ORDER BY id").all(created.order.id);
  rows.forEach((row, index) => {
    const rate = items[index].taxRate || 0;
    db.prepare("UPDATE oms_order_items SET tax_rate = ?, reserved_quantity = quantity WHERE id = ?").run(rate, row.id);
  });
  return {
    order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(created.order.id),
    items: db.prepare("SELECT * FROM oms_order_items WHERE order_id = ? ORDER BY id").all(created.order.id),
  };
}

function line(orderId, itemId) {
  return db.prepare("SELECT * FROM oms_order_items WHERE id = ? AND order_id = ?").get(itemId, orderId);
}

describe("MF-ORD-03 cancel audit", () => {
  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch { /* temp db */ }
  });

  it("refuses a later cancel after the selected quantity is already closed", () => {
    const { order, items } = createOrder([{ sku: "REPEAT", quantity: 3, unitPrice: 10, taxRate: 0 }]);
    const actor = { actorId: "desk@example.invalid", actorType: "HUMAN" };
    const first = orderManagement.cancelOrderLines(order.id, { ...actor, lines: [{ itemId: items[0].id, quantity: 1 }] });
    const second = orderManagement.cancelOrderLines(order.id, { ...actor, lines: [{ itemId: items[0].id, quantity: 1 }] });
    const third = orderManagement.cancelOrderLines(order.id, { ...actor, lines: [{ itemId: items[0].id, quantity: 2 }] });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.order.order_status).toBe("pending");
    expect(third.code).toBe("QTY_EXCEEDS_OPEN");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(2);
    const closed = orderManagement.cancelOrderLines(order.id, { ...actor, lines: [{ itemId: items[0].id, quantity: 1 }] });
    const again = orderManagement.cancelOrderLines(order.id, { ...actor, lines: [{ itemId: items[0].id, quantity: 1 }] });
    expect(closed.order.order_status).toBe("cancelled");
    expect(again.code).toBe("ORDER_NOT_CANCELLABLE");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(3);
  });

  it("rejects the same line twice in one request when the sum exceeds the open quantity", () => {
    const { order, items } = createOrder([{ sku: "ONCE", quantity: 1, unitPrice: 10, taxRate: 0 }]);
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [
        { itemId: items[0].id, quantity: 1 },
        { itemId: items[0].id, quantity: 1 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("QTY_EXCEEDS_OPEN");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(0);
  });

  it("does not cancel a line that belongs to another order", () => {
    const first = createOrder([{ sku: "OWN", quantity: 1, unitPrice: 10, taxRate: 0 }]);
    const other = createOrder([{ sku: "OTHER", quantity: 1, unitPrice: 15, taxRate: 0 }]);
    const result = orderManagement.cancelOrderLines(first.order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [{ itemId: other.items[0].id, sku: "OWN", quantity: 1 }],
    });
    expect(result.code).toBe("LINE_NOT_FOUND");
    expect(line(first.order.id, first.items[0].id).cancelled_quantity).toBe(0);
    expect(line(other.order.id, other.items[0].id).cancelled_quantity).toBe(0);
    expect(db.prepare("SELECT grand_total FROM oms_orders WHERE id = ?").get(other.order.id).grand_total).toBe(other.order.grand_total);
  });

  it("rejects zero, negative, fractional, textual, and boolean quantities", () => {
    const { order, items } = createOrder([{ sku: "QTY", quantity: 2, unitPrice: 10, taxRate: 0 }]);
    for (const quantity of [0, -1, 1.5, "1", true, false, null]) {
      const result = orderManagement.cancelOrderLines(order.id, {
        actorId: "desk@example.invalid",
        actorType: "HUMAN",
        lines: [{ itemId: items[0].id, quantity }],
      });
      expect(result.code).toBe("QTY_INVALID");
    }
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(0);
    const over = orderManagement.cancelOrderLines(order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [{ itemId: items[0].id, quantity: 3 }],
    });
    expect(over.code).toBe("QTY_EXCEEDS_OPEN");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(0);
  });

  it("cancels every line and zeroes merchandise, tax, discount, and shipping", () => {
    const { order, items } = createOrder(
      [
        { sku: "ALL-A", quantity: 1, unitPrice: 10, taxRate: 19 },
        { sku: "ALL-B", quantity: 1, unitPrice: 10, taxRate: 19 },
      ],
      { shippingTotal: 5, discountTotal: 2, taxTotal: 3.8 }
    );
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [
        { itemId: items[0].id, quantity: 1 },
        { itemId: items[1].id, quantity: 1 },
      ],
    });
    expect(result.order.order_status).toBe("cancelled");
    expect(cents(result.order.subtotal)).toBe(0);
    expect(cents(result.order.tax_total)).toBe(0);
    expect(cents(result.order.discount_total)).toBe(0);
    expect(cents(result.order.shipping_total)).toBe(0);
    expect(cents(result.order.grand_total)).toBe(0);
    expect(result.order.payment_status).toBe(order.payment_status);
    expect(result.refundIssued).toBe(false);
  });

  it("recalculates tax, discount, and shipping from the lines that stay open", () => {
    const { order, items } = createOrder(
      [
        { sku: "TAX-A", quantity: 2, unitPrice: 10, taxRate: 19 },
        { sku: "TAX-B", quantity: 1, unitPrice: 20, taxRate: 7 },
      ],
      { shippingTotal: 5, discountTotal: 4, taxTotal: 5.2 }
    );
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    expect(result.order.order_status).toBe("pending");
    expect(cents(result.order.subtotal)).toBe(3000);
    expect(cents(result.order.tax_total)).toBe(330);
    expect(cents(result.order.discount_total)).toBe(300);
    expect(cents(result.order.shipping_total)).toBe(500);
    expect(cents(result.order.grand_total)).toBe(3530);
    expect(line(order.id, items[0].id).reserved_quantity).toBe(1);
    expect(line(order.id, items[1].id).reserved_quantity).toBe(1);
  });

  it("caps the scaled discount at the remaining merchandise", () => {
    const { order, items } = createOrder(
      [
        { sku: "CAP-A", quantity: 1, unitPrice: 20, taxRate: 0 },
        { sku: "CAP-B", quantity: 1, unitPrice: 20, taxRate: 0 },
      ],
      { discountTotal: 50 }
    );
    const result = orderManagement.cancelOrderLines(order.id, {
      actorId: "desk@example.invalid",
      actorType: "HUMAN",
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    expect(cents(result.order.subtotal)).toBe(2000);
    expect(cents(result.order.discount_total)).toBe(2000);
    expect(cents(result.order.grand_total)).toBe(0);
    expect(result.refundIssued).toBe(false);
  });

  it("keeps one reservation when two processes cancel the same open quantity", async () => {
    const { order, items } = createOrder([{ sku: "RACE", quantity: 2, unitPrice: 8, taxRate: 0 }]);
    const run = () => new Promise((resolve) => {
      const child = spawn(process.execPath, [childPath, dbPath, String(order.id), String(items[0].id), dataDir], {
        env: { ...process.env, BUZZARD_DB_PATH: dbPath, BUZZARD_SALES_ENABLED: "0", BUZZARD_DATA_DIR: dataDir },
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk) => { out += chunk; });
      child.stderr.on("data", (chunk) => { err += chunk; });
      child.on("close", (code) => resolve({ code, out, err }));
    });
    const [left, right] = await Promise.all([run(), run()]);
    expect(left.code).toBe(0);
    expect(right.code).toBe(0);
    const readChild = (out) => JSON.parse(out.trim().split("\n").filter((row) => row.startsWith("{")).pop());
    const parsed = [readChild(left.out), readChild(right.out)];
    expect(parsed.filter((row) => row.ok && row.code === "PARTIAL_CANCELLED")).toHaveLength(1);
    parsed.forEach((row) => {
      expect(row.realMoneyMovement).toBe(false);
      if (!row.ok) expect(["QTY_EXCEEDS_OPEN", "ORDER_NOT_CANCELLABLE"]).toContain(row.code);
    });
    const saved = line(order.id, items[0].id);
    expect(saved.cancelled_quantity).toBe(2);
    expect(saved.reserved_quantity).toBe(0);
    expect(saved.cancelled_quantity).toBeLessThanOrEqual(saved.quantity);
  });

  it("refuses a missing actor and an AI actor before any line changes", () => {
    const { order, items } = createOrder([{ sku: "ACTOR", quantity: 1, unitPrice: 10, taxRate: 0 }]);
    const missing = orderManagement.cancelOrderLines(order.id, { lines: [{ itemId: items[0].id, quantity: 1 }] });
    const blank = orderManagement.cancelOrderLines(order.id, {
      actorId: "   ",
      actorType: "HUMAN",
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    const ai = orderManagement.cancelOrderLines(order.id, {
      actorId: "mira",
      actorType: "AI",
      lines: [{ itemId: items[0].id, quantity: 1 }],
    });
    expect(missing.code).toBe("ACTOR_REQUIRED");
    expect(blank.code).toBe("ACTOR_REQUIRED");
    expect(ai.code).toBe("AI_WRITE_DENIED");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(0);
  });

  it("blocks refund and real-money flags without changing payment status", () => {
    const { order, items } = createOrder([{ sku: "MONEY", quantity: 1, unitPrice: 10, taxRate: 0 }]);
    const cases = [
      [{ refund: true }, "REFUND_NOT_LIVE"],
      [{ capture: true }, "PAYMENT_NOT_LIVE"],
      [{ realMoneyMovement: true }, "PAYMENT_NOT_LIVE"],
      [{ payment: { refund: true } }, "REFUND_NOT_LIVE"],
      [{ payment: { captured: true, realMoneyMovement: true } }, "PAYMENT_NOT_LIVE"],
    ];
    for (const [extra, code] of cases) {
      const result = orderManagement.cancelOrderLines(order.id, {
        actorId: "desk@example.invalid",
        actorType: "HUMAN",
        lines: [{ itemId: items[0].id, quantity: 1 }],
        ...extra,
      });
      expect(result.code).toBe(code);
      expect(result.realMoneyMovement).toBe(false);
      expect(result.refundIssued).toBe(false);
    }
    const saved = db.prepare("SELECT payment_status, order_status FROM oms_orders WHERE id = ?").get(order.id);
    expect(saved.payment_status).toBe(order.payment_status);
    expect(saved.order_status).toBe("pending");
    expect(line(order.id, items[0].id).cancelled_quantity).toBe(0);
    expect(process.env.BUZZARD_SALES_ENABLED).toBe("0");
  });
});
