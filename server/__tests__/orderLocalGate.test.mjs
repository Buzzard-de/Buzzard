import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const orderService = require("../lib/commerce/orderService.js");
const { buyStock } = require("../lib/buzzardNative/core/specialists/stockEngine.js");

describe("local order records stay non-commercial", () => {
  it("blocks an approved-looking checkout when price, stock, VAT, or shipping is unverified", () => {
    const order = orderService.createOrderFromCheckout({
      checkout: {
        id: "chk-local-approved",
        customerId: "cust-synthetic",
        customerApproved: true,
        country: "DE",
        items: [{ sku: "SYN-1", productId: "p-1" }],
        totals: { subtotal: 10, currency: "EUR" },
      },
      orderType: "DRY_RUN",
    });
    expect(order.orderCreated).toBe(false);
    expect(order.purchased).toBe(false);
    expect(order.code).toBe("SHIPPING_RATE_UNVERIFIED");
    expect(order.reasons).toEqual(expect.arrayContaining([
      "SHIPPING_RATE_UNVERIFIED",
      "VAT_UNVERIFIED",
      "STOCK_UNVERIFIED",
      "PAYMENT_UNVERIFIED",
      "SALES_CLOSED",
    ]));
    expect(order.reasons).not.toContain("CUSTOMER_UNVERIFIED");
    expect(order.localOrder.synthetic).toBe(true);
    expect(order.localOrder.commercial).toBe(false);
  });

  it("cancels a pending local order and rejects a second cancel or a paid transition", () => {
    const order = orderService.createOrderFromCheckout({
      checkout: { id: "chk-local-cancel", customerId: "cust-synthetic", customerApproved: true, country: "FR", items: [{ sku: "SYN-2" }] },
      orderType: "DRY_RUN",
    });
    const cancelled = orderService.cancelLocalOrder(order.localOrder.id);
    expect(cancelled.code).toBe("ORDER_CANCELLED");
    expect(cancelled.orderStatus).toBe("CANCELLED");
    expect(cancelled.purchased).toBe(false);
    expect(cancelled.reserved).toBe(false);
    const again = orderService.cancelLocalOrder(order.localOrder.id);
    expect(again.code).toBe("ILLEGAL_TRANSITION");
    expect(again.orderStatus).toBe("CANCELLED");
    const paid = orderService.cancelLocalOrder("missing-local-order");
    expect(paid.code).toBe("ORDER_UNKNOWN");
  });

  it("fails a pending local order and does not buy supplier stock without a customer order", () => {
    const order = orderService.createOrderFromCheckout({
      checkout: { id: "chk-local-fail", totals: { currency: "EUR", subtotal: 5 } },
      orderType: "DRY_RUN",
    });
    const failed = orderService.failLocalOrder(order.localOrder.id);
    expect(failed.code).toBe("ORDER_FAILED");
    expect(failed.orderStatus).toBe("FAILED");
    expect(failed.orderCreated).toBe(false);
    const stuck = orderService.failLocalOrder(order.localOrder.id);
    expect(stuck.code).toBe("ILLEGAL_TRANSITION");
    expect(stuck.orderStatus).toBe("FAILED");

    const purchase = orderService.submitSupplierOrder(order.localOrder.id, {});
    expect(purchase.code).toBe("ORDER_UNVERIFIED");
    expect(purchase.status).toBe(403);
    expect(purchase.supplierOrderCreated).toBe(false);
    expect(purchase.purchased).toBe(false);
    expect(purchase.reserved).toBe(false);
    const flagged = orderService.submitSupplierOrder(order.localOrder.id, { customerOrderVerified: true, customerApproved: true });
    expect(flagged.supplierOrderCreated).toBe(false);
    expect(flagged.purchased).toBe(false);
    expect(flagged.reserved).toBe(false);
    expect(buyStock().purchased).toBe(false);
    expect(buyStock().reason).toBe("ORDER_UNVERIFIED");
    expect(buyStock({ customerOrderVerified: true }).purchased).toBe(false);
  });
});
