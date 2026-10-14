import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { db } = require("../lib/db");
const checkoutService = require("../lib/commerce/checkoutService.js");
const orderService = require("../lib/commerce/orderService.js");

function insertGuestCheckout() {
  const suffix = Date.now().toString(36);
  const cartId = `cart_gst_${suffix}`;
  const checkoutId = `chk_gst_${suffix}`;
  const sessionId = `sess_gst_${suffix}`;
  db.prepare(`
    INSERT INTO commerce_carts(id, customer_id, session_id, country, currency, status, expires_at)
    VALUES (?, NULL, ?, 'DE', 'EUR', 'active', ?)
  `).run(cartId, sessionId, new Date(Date.now() + 86400000).toISOString());
  db.prepare(`
    INSERT INTO commerce_checkouts(id, cart_id, customer_id, state, order_type, metadata_json)
    VALUES (?, ?, NULL, 'READY', 'DRY_RUN', ?)
  `).run(checkoutId, cartId, JSON.stringify({ guestToken: sessionId }));
  return { cartId, checkoutId, sessionId };
}

describe("guest commerce checkout and order access", () => {
  it("rejects guest checkout lookup without session proof", () => {
    const { checkoutId, sessionId } = insertGuestCheckout();
    const denied = checkoutService.getCheckout(checkoutId);
    expect(denied.status).toBe(401);
    expect(denied.blocked).toBe(true);

    const allowed = checkoutService.getCheckout(checkoutId, { guestToken: sessionId });
    expect(allowed.id).toBe(checkoutId);
    expect(allowed.guestToken).toBe(sessionId);
  });

  it("rejects guest cart writes without the bound session", () => {
    const cartService = require("../lib/commerce/cartService.js");
    const sessionId = `sess_write_${Date.now().toString(36)}`;
    const cart = cartService.createCart({ sessionId });
    const denied = cartService.addItem(cart.cart.id, {
      productId: "missing-product",
      quantity: 1,
    });
    expect(denied.status).toBe(401);
    expect(denied.blocked).toBe(true);

    const other = cartService.addItem(cart.cart.id, {
      productId: "missing-product",
      quantity: 1,
      sessionId: "sess_other_guest",
    });
    expect(other.status).toBe(401);

    const allowed = cartService.addItem(cart.cart.id, {
      productId: "missing-product",
      quantity: 1,
      sessionId,
    });
    expect(allowed.error).toBe("product_not_found");
  });

  it("rejects guest order lookup without session proof", () => {
    const { checkoutId, sessionId } = insertGuestCheckout();
    const orderId = `ord_gst_${Date.now().toString(36)}`;
    db.prepare(`
      INSERT INTO commerce_orders(
        id, checkout_id, customer_id, order_type, status, payment_status, fulfillment_status,
        currency, subtotal, shipping, tax, discount, total, items_json, metadata_json
      ) VALUES (?, ?, NULL, 'DRY_RUN', 'CONFIRMED', 'NONE', 'NONE', 'EUR', 0, 0, 0, 0, 0, '[]', ?)
    `).run(orderId, checkoutId, JSON.stringify({ guestToken: sessionId, dryRun: true }));

    const denied = orderService.getOrder(orderId);
    expect(denied.status).toBe(401);
    expect(denied.blocked).toBe(true);

    const allowed = orderService.getOrder(orderId, { sessionId });
    expect(allowed.id).toBe(orderId);
    expect(allowed.metadata.guestToken).toBeUndefined();
  });
});
