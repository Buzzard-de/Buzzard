import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cartService = require("../lib/commerce/cartService.js");
const checkoutService = require("../lib/commerce/checkoutService.js");
const inventory = require("../lib/commerce/inventoryIntegration.js");
const fulfillment = require("../lib/fulfillmentPipeline.js");
const productService = require("../lib/productService.js");
const { db } = require("../lib/db");

function product() {
  return productService.createProduct({
    sku: `CART-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    title: "Cart gate product",
    price: 18,
    stock: 6,
    visibility: "PUBLIC",
    status: "READY",
  });
}

describe("cart add is not a stock purchase", () => {
  it("refuses a direct add and leaves the cart unchanged", () => {
    const item = product();
    const cart = cartService.createCart({ sessionId: `gate-${item.sku}` });
    const beforeItems = db.prepare("SELECT COUNT(*) n FROM commerce_cart_items WHERE cart_id = ?").get(cart.cart.id).n;
    const beforeReservations = db.prepare("SELECT COUNT(*) n FROM inventory_sot_reservations").get().n;
    const added = cartService.addItem(cart.cart.id, {
      productId: item.id,
      quantity: 1,
      live: true,
      verified: true,
      available: true,
      mock: true,
    });
    expect(added.code).toBe("SALES_CLOSED");
    expect(added.reasons[0]).toBe("SALES_CLOSED");
    expect(added.reasons).toEqual(
      expect.arrayContaining([
        "STOCK_UNVERIFIED",
        "STALE_STOCK",
        "MOCK_STOCK",
        "ORDER_UNVERIFIED",
        "PRICE_POLICY_BLOCKED",
      ])
    );
    expect(added.stored).toBe(false);
    expect(added.reserved).toBe(false);
    expect(added.purchased).toBe(false);
    expect(added.stockDecremented).toBe(false);
    expect(added.checkoutAllowed).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_cart_items WHERE cart_id = ?").get(cart.cart.id).n).toBe(beforeItems);
    expect(db.prepare("SELECT COUNT(*) n FROM inventory_sot_reservations").get().n).toBe(beforeReservations);
    expect(productService.getProduct(item.id).stock).toBe(6);
  });

  it("does not raise the quantity of an existing cart line", () => {
    const item = product();
    const cart = cartService.createCart({ sessionId: `dup-${item.sku}` });
    db.prepare(
      `INSERT INTO commerce_cart_items(id, cart_id, product_id, quantity, price_snapshot, currency, metadata_json)
       VALUES (?, ?, ?, 1, 18, 'EUR', ?)`
    ).run(`ci-${item.sku}`, cart.cart.id, item.id, JSON.stringify({ idempotencyKey: `idem-${item.sku}` }));
    const again = cartService.addItem(cart.cart.id, {
      productId: item.id,
      quantity: 4,
      idempotencyKey: `idem-${item.sku}`,
    });
    const row = db.prepare("SELECT quantity FROM commerce_cart_items WHERE id = ?").get(`ci-${item.sku}`);
    expect(again.code).toBe("DUPLICATE_CART_ITEM");
    expect(again.duplicate).toBe(true);
    expect(again.stored).toBe(false);
    expect(row.quantity).toBe(1);
    const raised = cartService.updateItemQuantity(cart.cart.id, `ci-${item.sku}`, 9);
    expect(raised.code).toBe("SALES_CLOSED");
    expect(db.prepare("SELECT quantity FROM commerce_cart_items WHERE id = ?").get(`ci-${item.sku}`).quantity).toBe(1);
  });

  it("blocks checkout, reservation, and fulfillment from a direct call", () => {
    const item = product();
    const cart = cartService.createCart({ sessionId: `out-${item.sku}` });
    const before = db.prepare("SELECT COUNT(*) n FROM commerce_checkouts").get().n;
    const started = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "DRY_RUN", idempotencyKey: `chk-${item.sku}` });
    const again = checkoutService.startCheckout({ cartId: cart.cart.id, orderType: "COMMERCIAL", approved: true });
    expect(started.code).toBe("SALES_CLOSED");
    expect(started.checkoutCreated).toBe(false);
    expect(again.checkoutCreated).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_checkouts").get().n).toBe(before);
    const stock = cartService.validateStockForCheckout(cart.cart.id);
    expect(stock.ok).toBe(false);
    expect(stock.code).toBe("SALES_CLOSED");
    expect(stock.checkoutAllowed).toBe(false);
    const reserved = inventory.reserve({ productId: item.id, quantity: 1, idempotencyKey: `rsv-${item.sku}` });
    expect(reserved.code).toBe("SALES_CLOSED");
    expect(reserved.created).toBe(false);
    const prepared = fulfillment.createFulfillmentsForOrder({ orderNumber: `ff-${item.sku}` });
    expect(prepared[0].blocked).toBe(true);
    expect(prepared[0].code).toBe("SALES_CLOSED");
  });
});
