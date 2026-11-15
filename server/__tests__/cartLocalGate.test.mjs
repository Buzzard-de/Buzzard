import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/commerce/cartGate.js");

function line(extra = {}) {
  return {
    cartId: "cart-1",
    customerId: "cust-1",
    cartCustomerId: "cust-1",
    productId: "prod-1",
    sku: "BZ-CART-1",
    productSku: "BZ-CART-1",
    country: "DE",
    quantity: 2,
    price: 19,
    stock: 5,
    shipping: 4.99,
    vat: 19,
    discount: 3,
    productVerified: true,
    priceVerified: true,
    stockVerified: true,
    purchasable: true,
    live: true,
    ...extra,
  };
}

describe("a cart line is not a purchase", () => {
  it("rejects a broken relation, a bad quantity, and an out-of-scope country", () => {
    const mismatch = gate.planCart(line({ idempotencyKey: "rel-1", productSku: "OTHER", cartCustomerId: "cust-2" }));
    expect(mismatch.code).toBe("CART_RELATION_MISMATCH");
    expect(mismatch.customerId).toBeNull();
    expect(mismatch.sku).toBeNull();
    expect(mismatch.added).toBe(false);
    expect(mismatch.purchasable).toBe(false);
    expect(mismatch.total).toBeNull();

    const zero = gate.planCart(line({ idempotencyKey: "qty-0", cartId: "cart-qty-0", quantity: 0 }));
    const negative = gate.planCart(line({ idempotencyKey: "qty-neg", cartId: "cart-qty-neg", quantity: -1 }));
    const fraction = gate.planCart(line({ idempotencyKey: "qty-bad", cartId: "cart-qty-bad", quantity: 1.5 }));
    expect(zero.code).toBe("QTY_REJECTED");
    expect(negative.code).toBe("QTY_REJECTED");
    expect(fraction.code).toBe("QTY_REJECTED");

    const abroad = gate.planCart(line({ idempotencyKey: "us-1", cartId: "cart-us", country: "US" }));
    expect(abroad.code).toBe("COUNTRY_OUT_OF_SCOPE");
    expect(abroad.countryScope).toBe("OUT_OF_SCOPE");
    expect(abroad.productEligibility).toBe("UNVERIFIED");
    expect(abroad.purchasable).toBe(false);
  });

  it("does not price, stock, ship, tax, or discount an unverified line", () => {
    const cart = gate.planCart(line({ idempotencyKey: "de-1", cartId: "cart-gr", country: "GR" }));
    expect(cart.country).toBe("EL");
    expect(cart.countryScope).toBe("IN_SCOPE");
    expect(cart.code).toBe("PRODUCT_UNVERIFIED");
    expect(cart.priceStatus).toBe("UNKNOWN");
    expect(cart.stockStatus).toBe("UNKNOWN");
    expect(cart.productEligibility).toBe("UNVERIFIED");
    expect(cart.purchasable).toBe(false);
    expect(cart.saleable).toBe(false);
    expect(cart.subtotal).toBeNull();
    expect(cart.shipping).toBeNull();
    expect(cart.vat).toBeNull();
    expect(cart.discount).toBeNull();
    expect(cart.total).toBeNull();
    expect(cart.reasons).toEqual(expect.arrayContaining([
      "PRICE_UNKNOWN",
      "STOCK_UNKNOWN",
      "PRODUCT_ELIGIBILITY_UNVERIFIED",
      "SHIPPING_UNKNOWN",
      "VAT_UNKNOWN",
      "DISCOUNT_UNKNOWN",
      "SALES_CLOSED",
    ]));
    expect(cart.callerFlagIgnored).toBe(true);
    expect(cart.productionReady).toBe(false);
  });

  it("keeps checkout apart from the cart and blocks repeats, synthetic lines, and failed retries", () => {
    const checkout = gate.planCart(line({ idempotencyKey: "order-1", cartId: "cart-2", action: "checkout" }));
    expect(checkout.separatedFromOrder).toBe(true);
    expect(checkout.checkoutStarted).toBe(false);
    expect(checkout.orderCreated).toBe(false);
    expect(checkout.reservationCreated).toBe(false);
    expect(checkout.paymentCreated).toBe(false);
    expect(checkout.purchased).toBe(false);
    expect(checkout.reasons).toContain("CART_NOT_AN_ORDER");

    const first = gate.planCart(line({ idempotencyKey: "dup-1", cartId: "cart-3", synthetic: true }));
    const second = gate.planCart(line({ idempotencyKey: "dup-2", cartId: "cart-3", synthetic: true, quantity: 9 }));
    expect(first.code).toBe("MOCK_NOT_COMMERCIAL");
    expect(first.commercial).toBe(false);
    expect(first.total).toBeNull();
    expect(second.code).toBe("DUPLICATE_CART_ITEM");
    expect(second.duplicate).toBe(true);
    expect(second.purchased).toBe(false);

    const failed = gate.planCart(line({ idempotencyKey: "fail-1", cartId: "cart-4", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.orderCreated).toBe(false);
    const again = gate.planCart(line({ idempotencyKey: "fail-1", cartId: "cart-4", timeout: true }));
    expect(again.code).toBe("DUPLICATE_CART_ITEM");
    const retried = gate.retryCart("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.total).toBeNull();
    expect(retried.orderCreated).toBe(false);
    expect(retried.reserved).toBe(false);
    expect(gate.retryCart("missing-cart").code).toBe("RETRY_UNKNOWN");
  });
});
