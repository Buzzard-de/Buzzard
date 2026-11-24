import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const returnsRma = require("../lib/returnsRma");
const { db } = require("../lib/db");

describe("return quantity guard", () => {
  it("rejects a negative return quantity and leaves no return row", () => {
    const before = db.prepare("SELECT COUNT(*) n FROM rma_returns").get().n;
    const rejected = returnsRma.createReturn({
      orderNumber: "BZ-QTY-1",
      reason: "defective",
      items: [{ sku: "DRY", quantity: -2, unitPrice: 4 }],
    });
    expect(rejected.code).toBe("quantity_invalid");
    expect(rejected.status).toBe(400);
    expect(db.prepare("SELECT COUNT(*) n FROM rma_returns").get().n).toBe(before);
    expect(db.prepare("SELECT COUNT(*) n FROM rma_return_items WHERE sku = 'DRY'").get().n).toBe(0);
  });

  it("stores a positive quantity through the existing returns writer", () => {
    const created = returnsRma.createReturn({
      orderNumber: "BZ-QTY-2",
      reason: "defective",
      refundAmount: 4,
      items: [{ sku: "DRY-OK", quantity: 2, unitPrice: 2 }],
    });
    expect(created.created).toBe(true);
    const item = db.prepare("SELECT quantity FROM rma_return_items WHERE return_id = ?").get(created.return.id);
    expect(item.quantity).toBe(2);
  });
});
