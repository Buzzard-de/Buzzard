import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cartService = require("../lib/commerce/cartService.js");
const { db } = require("../lib/db");
const orderService = require("../lib/commerce/orderService.js");
const checkoutService = require("../lib/commerce/checkoutService.js");
const commerceCouponService = require("../lib/commerce/commerceCouponService.js");
const { computeOrderTotals } = require("../lib/commerce/commerceValidation.js");

describe("coupon totals stay blocked while sales are closed", () => {
  it("does not discount a stored coupon that only looks valid", () => {
    const cart = cartService.createCart({ country: "DE", currency: "EUR" });
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("WELCOME10", cart.cart.id);
    const viewed = cartService.getCart(cart.cart.id);
    expect(viewed.discount).toBeNull();
    expect(viewed.discountedSubtotal).toBeNull();
    expect(viewed.couponValid).toBe(false);
    expect(viewed.couponApplied).toBe(false);
    expect(viewed.couponStatus).toBe("BLOCKED");
    expect(viewed.code).toBe("SALES_CLOSED");
    expect(viewed.reasons).toEqual(expect.arrayContaining(["SALES_CLOSED", "COUPON_UNVERIFIED"]));
    expect(viewed.taxBase).toBeNull();
    expect(viewed.orderCreated).toBe(false);
  });

  it("blocks expired, mock, and caller-flagged coupons without a discounted total", () => {
    const code = `OLD-${Date.now()}`;
    db.prepare("INSERT INTO coupons(code, type, value, min_order, active, expires_at) VALUES(?,?,?,?,?,?)").run(
      code,
      "fixed",
      5,
      0,
      1,
      "2000-01-01T00:00:00.000Z"
    );
    const cart = cartService.createCart({ country: "DE", currency: "EUR" });
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run(code, cart.cart.id);
    const expired = cartService.getCart(cart.cart.id);
    expect(expired.reasons).toContain("COUPON_EXPIRED");
    expect(expired.discountedSubtotal).toBeNull();

    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("MOCK-SAVE", cart.cart.id);
    const mock = cartService.getCart(cart.cart.id);
    expect(mock.reasons).toContain("MOCK_COUPON");
    expect(mock.discount).toBeNull();

    const flagged = cartService.validateCouponForCart(cart.cart.id, {
      couponCode: "WELCOME10",
      valid: true,
      verified: true,
      active: true,
      approved: true,
      live: true,
    });
    expect(flagged.ok).toBe(false);
    expect(flagged.code).toBe("SALES_CLOSED");
    expect(flagged.callerFlagIgnored).toBe(true);
    expect(flagged.discount).toBeNull();
    expect(flagged.discountedSubtotal).toBeNull();
  });

  it("does not apply a coupon twice or turn removal into an order", () => {
    const first = cartService.createCart({ country: "DE", currency: "EUR" });
    const second = cartService.createCart({ country: "DE", currency: "EUR" });
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("BUZZARD5", first.cart.id);
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("BUZZARD5", second.cart.id);
    const again = cartService.applyCoupon(first.cart.id);
    const repeat = cartService.applyCoupon(first.cart.id);
    expect(again.code).toBe("SALES_CLOSED");
    expect(again.stored).toBe(false);
    expect(repeat.code).toBe("SALES_CLOSED");
    expect(repeat.stored).toBe(false);
    expect(cartService.getCart(second.cart.id).discount).toBeNull();

    const ordersBefore = db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n;
    const removed = cartService.removeCoupon(first.cart.id);
    const removedAgain = cartService.removeCoupon(first.cart.id);
    expect(removed.localFieldCleared).toBe(true);
    expect(removed.commercialDiscountApplied).toBe(false);
    expect(removed.orderCreated).toBe(false);
    expect(removed.paymentCreated).toBe(false);
    expect(removed.refundCreated).toBe(false);
    expect(removed.cart.couponCode).toBeNull();
    expect(removed.discount).toBeNull();
    expect(removedAgain.idempotent).toBe(true);
    expect(removedAgain.cart.couponCode).toBeNull();
    expect(db.prepare("SELECT coupon_code FROM commerce_carts WHERE id = ?").get(first.cart.id).coupon_code).toBeNull();
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n).toBe(ordersBefore);

    const checkout = checkoutService.startCheckout({ cartId: first.cart.id });
    expect(checkout.code).toBe("SALES_CLOSED");
    expect(checkout.checkoutCreated).toBe(false);
    const order = orderService.createOrderFromCheckout({
      checkout: { id: `chk-coupon-${Date.now()}`, cartId: first.cart.id, totals: { subtotal: 40, currency: "EUR" } },
      payment: { status: "AUTHORIZED", captured: true, live: true },
      orderType: "DRY_RUN",
    });
    expect(order.orderCreated).toBe(false);
    expect(order.reasons).toEqual(expect.arrayContaining(["SALES_CLOSED", "PAYMENT_UNVERIFIED"]));

    const quote = require("../lib/customerCheckout.js").calculateCheckoutQuote({
      subtotal: 80,
      couponCode: "WELCOME10",
      countryCode: "DE",
      valid: true,
      verified: true,
    });
    expect(quote.ok).toBe(false);
    expect(quote.code).toBe("SALES_CLOSED");
    expect(quote.total).toBeNull();
    expect(quote.discount).toBeNull();
    expect(quote.couponApplied).toBe(false);
    const draft = require("../lib/customerCheckout.js").saveCheckoutDraft();
    expect(draft.ok).toBe(false);
    expect(draft.stored).toBe(false);
    expect(draft.orderCreated).toBe(false);
  });
});

describe("arithmetic coupon result is not a commercial discount", () => {
  it("keeps WELCOME10 and BUZZARD5 arithmetic without applying it", async () => {
    const welcome = commerceCouponService.resolveCouponDiscount("WELCOME10", 50, {
      valid: true,
      verified: true,
      active: true,
      approved: true,
      live: true,
    });
    expect(welcome.ok).toBe(true);
    expect(welcome.discount).toBe(5);
    expect(welcome.couponCode).toBe("WELCOME10");
    expect(welcome.arithmeticOnly).toBe(true);
    expect(welcome.commercialApplied).toBe(false);
    expect(welcome.couponVerified).toBe(false);
    expect(welcome.applied).toBe(false);
    expect(welcome.code).toBe("SALES_CLOSED");
    expect(welcome.discountedSubtotal).toBeNull();
    expect(welcome.taxBase).toBeNull();
    expect(welcome.commercialTotal).toBeNull();
    expect(welcome.callerFlagIgnored).toBe(true);

    const buzzard = commerceCouponService.resolveCouponDiscount("BUZZARD5", 60);
    expect(buzzard.ok).toBe(true);
    expect(buzzard.discount).toBe(5);
    expect(buzzard.commercialApplied).toBe(false);
    expect(buzzard.couponStatus).toBe("BLOCKED");

    const request = commerceCouponService.validateCouponRequest(
      { couponCode: "WELCOME10", valid: true, verified: true, live: true },
      50,
      {}
    );
    expect(request.ok).toBe(false);
    expect(request.discount).toBeNull();
    expect(request.arithmeticDiscount).toBe(5);
    expect(request.arithmeticOk).toBe(true);
    expect(request.commercialApplied).toBe(false);
    expect(request.code).toBe("SALES_CLOSED");

    const totals = computeOrderTotals({
      items: [{ priceSnapshot: 50, quantity: 1 }],
      discount: welcome.discount,
    });
    expect(totals.discount).toBeNull();
    expect(totals.discountApplied).toBe(false);
    expect(totals.taxBase).toBe(50);
    expect(totals.shipping).toBeNull();
    expect(totals.tax).toBeNull();
    expect(totals.taxRate).toBeNull();
    expect(totals.total).toBeNull();
    expect(totals.code).toBe("AMOUNT_UNKNOWN");

    const paid = await require("../lib/dbOrders.js").createOrderFromCartWithPayment("coupon-user", {
      countryCode: "DE",
    });
    expect(paid.payment).toBeNull();
    expect(paid.paymentCreated).toBe(false);
    expect(paid.orderCreated).toBe(false);
    expect(paid.customerNotified).toBe(false);

    const couponsBefore = db.prepare("SELECT COUNT(*) n FROM coupons").get().n;
    const created = require("../lib/customerCheckout.js").createCouponAdmin();
    expect(created.ok).toBe(false);
    expect(created.stored).toBe(false);
    expect(created.code).toBe("SALES_CLOSED");
    expect(db.prepare("SELECT COUNT(*) n FROM coupons").get().n).toBe(couponsBefore);

    const usesBefore = db.prepare("SELECT COUNT(*) n FROM mktloy_promotion_uses").get().n;
    const campaign = require("../lib/marketingLoyalty.js").applyCampaign("WELCOME10", {
      subtotal: 80,
      valid: true,
      verified: true,
      live: true,
    });
    expect(campaign.valid).toBe(false);
    expect(campaign.discount).toBeNull();
    expect(campaign.finalTotal).toBeNull();
    expect(campaign.commercialApplied).toBe(false);
    expect(campaign.code).toBe("SALES_CLOSED");
    const used = require("../lib/marketingLoyalty.js").useCampaign();
    expect(used.ok).toBe(false);
    expect(used.stored).toBe(false);
    expect(used.orderCreated).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM mktloy_promotion_uses").get().n).toBe(usesBefore);

    const accountsBefore = db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n;
    const ledgerBefore = db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n;
    const adjusted = require("../lib/marketingLoyalty.js").adjustPoints({
      customerId: `points-${Date.now()}`,
      points: 50,
      approved: true,
      live: true,
    });
    expect(adjusted.ok).toBe(false);
    expect(adjusted.stored).toBe(false);
    expect(adjusted.pointsApplied).toBe(false);
    expect(adjusted.balance).toBeNull();
    expect(adjusted.code).toBe("SALES_CLOSED");
    expect(db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_accounts").get().n).toBe(accountsBefore);
    expect(db.prepare("SELECT COUNT(*) n FROM mktloy_loyalty_ledger").get().n).toBe(ledgerBefore);
  });

  it("does not turn an unknown coupon into a zero discount", () => {
    const empty = commerceCouponService.resolveCouponDiscount("", 50);
    expect(empty.ok).toBe(false);
    expect(empty.couponStatus).toBe("UNKNOWN");
    expect(empty.discount).toBeNull();
    expect(empty.code).toBe("SALES_CLOSED");

    const missing = commerceCouponService.resolveCouponDiscount("NOTREAL", 50, { verified: true });
    expect(missing.ok).toBe(false);
    expect(missing.couponStatus).toBe("BLOCKED");
    expect(missing.discount).toBeNull();
    expect(missing.callerFlagIgnored).toBe(true);
  });
});

describe("clearCart only clears the local cart", () => {
  it("is idempotent and does not touch another cart or commercial records", () => {
    const target = cartService.createCart({ country: "DE", currency: "EUR" });
    const other = cartService.createCart({ country: "DE", currency: "EUR" });
    const targetItem = `item-${Date.now()}`;
    const otherItem = `item-other-${Date.now()}`;
    db.prepare(
      "INSERT INTO commerce_cart_items(id, cart_id, product_id, quantity, price_snapshot, currency) VALUES(?,?,?,?,?,?)"
    ).run(targetItem, target.cart.id, "fixture-product", 1, 20, "EUR");
    db.prepare(
      "INSERT INTO commerce_cart_items(id, cart_id, product_id, quantity, price_snapshot, currency) VALUES(?,?,?,?,?,?)"
    ).run(otherItem, other.cart.id, "fixture-product", 2, 30, "EUR");
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("WELCOME10", target.cart.id);
    db.prepare("UPDATE commerce_carts SET coupon_code = ? WHERE id = ?").run("BUZZARD5", other.cart.id);

    const ordersBefore = db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n;
    const checkoutsBefore = db.prepare("SELECT COUNT(*) n FROM commerce_checkouts").get().n;

    const first = cartService.clearCart(target.cart.id);
    const second = cartService.clearCart(target.cart.id);
    expect(first.localRowsCleared).toBe(true);
    expect(first.saleOpened).toBe(false);
    expect(first.purchased).toBe(false);
    expect(first.orderCreated).toBe(false);
    expect(first.paymentCreated).toBe(false);
    expect(first.reservationCreated).toBe(false);
    expect(first.refundCreated).toBe(false);
    expect(first.shipmentCreated).toBe(false);
    expect(first.checkoutCompleted).toBe(false);
    expect(first.discount).toBeNull();
    expect(first.cart.couponCode).toBeNull();
    expect(first.itemCount).toBe(0);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_cart_items WHERE cart_id = ?").get(target.cart.id).n).toBe(0);
    expect(second.idempotent).toBe(true);
    expect(second.itemCount).toBe(0);
    expect(second.orderCreated).toBe(false);

    const otherRow = db.prepare("SELECT id, quantity FROM commerce_cart_items WHERE id = ?").get(otherItem);
    expect(otherRow.quantity).toBe(2);
    expect(db.prepare("SELECT coupon_code FROM commerce_carts WHERE id = ?").get(other.cart.id).coupon_code).toBe("BUZZARD5");
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n).toBe(ordersBefore);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_checkouts").get().n).toBe(checkoutsBefore);

    const removed = cartService.removeItem(other.cart.id, otherItem);
    const removedAgain = cartService.removeItem(other.cart.id, otherItem);
    expect(removed.localRowCleared).toBe(true);
    expect(removed.orderCreated).toBe(false);
    expect(removed.paymentCreated).toBe(false);
    expect(removedAgain.idempotent).toBe(true);
    expect(removedAgain.localRowCleared).toBe(false);
    expect(db.prepare("SELECT COUNT(*) n FROM commerce_orders").get().n).toBe(ordersBefore);
    expect(db.prepare("SELECT id FROM commerce_cart_items WHERE cart_id = ?").get(target.cart.id)).toBeUndefined();
  });
});
