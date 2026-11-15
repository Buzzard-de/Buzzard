import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/commerce/couponGate.js");

const past = "2020-01-01T00:00:00.000Z";
const future = "2099-01-01T00:00:00.000Z";
const started = "2020-06-01T00:00:00.000Z";

function coupon(extra = {}) {
  return {
    code: "SAVE10",
    customerId: "cust-1",
    couponCustomerId: "cust-1",
    productId: "prod-1",
    sku: "BZ-CPN-1",
    productSku: "BZ-CPN-1",
    campaignId: "camp-1",
    country: "DE",
    couponCountry: "DE",
    currency: "EUR",
    couponCurrency: "EUR",
    startsAt: started,
    expiresAt: future,
    usageLimit: 10,
    usageCount: 1,
    customerLimit: 1,
    customerUses: 0,
    discountRate: 10,
    valid: true,
    approved: true,
    active: true,
    cartId: "cart-1",
    ...extra,
  };
}

describe("a coupon check is not a discount", () => {
  it("rejects a broken relation, a closed window, and a spent limit", () => {
    const mismatch = gate.planCoupon(coupon({ idempotencyKey: "rel-1", productSku: "OTHER", couponCustomerId: "cust-2" }));
    expect(mismatch.code).toBe("COUPON_RELATION_MISMATCH");
    expect(mismatch.customerId).toBeNull();
    expect(mismatch.sku).toBeNull();
    expect(mismatch.applied).toBe(false);
    expect(mismatch.discount).toBeNull();

    const expired = gate.planCoupon(coupon({ idempotencyKey: "exp-1", expiresAt: past, valid: true, active: true }));
    expect(expired.code).toBe("COUPON_EXPIRED");
    expect(expired.discount).toBeNull();
    expect(expired.total).toBeNull();

    const waiting = gate.planCoupon(coupon({ idempotencyKey: "wait-1", startsAt: future, expiresAt: future }));
    expect(waiting.code).toBe("COUPON_NOT_STARTED");

    const spent = gate.planCoupon(coupon({ idempotencyKey: "use-1", usageCount: 10, usageLimit: 10 }));
    expect(spent.code).toBe("COUPON_USAGE_EXCEEDED");
    const repeatCustomer = gate.planCoupon(coupon({ idempotencyKey: "cust-use-1", customerUses: 1, customerLimit: 1 }));
    expect(repeatCustomer.code).toBe("COUPON_CUSTOMER_LIMIT");
  });

  it("does not invent a discount or cross currency and country", () => {
    const unknown = gate.planCoupon(coupon({ idempotencyKey: "rate-1", discountRate: undefined }));
    expect(unknown.code).toBe("DISCOUNT_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");
    expect(unknown.discount).toBeNull();
    expect(unknown.discountRate).toBeNull();
    expect(unknown.discountAmount).toBeNull();
    expect(unknown.total).toBeNull();

    const currency = gate.planCoupon(coupon({ idempotencyKey: "fx-1", couponCurrency: "PLN" }));
    expect(currency.code).toBe("CURRENCY_MISMATCH");
    expect(currency.currency).toBeNull();
    expect(currency.applied).toBe(false);

    const france = gate.planCoupon(coupon({ idempotencyKey: "fr-1", country: "FR", couponCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.couponCountry).toBe("DE");
    expect(france.discount).toBeNull();

    const greece = gate.planCoupon(coupon({ idempotencyKey: "gr-1", country: "GR", couponCountry: "EL" }));
    expect(greece.country).toBe("EL");
    expect(greece.couponCountry).toBe("EL");
    expect(greece.code).toBe("COUPON_UNVERIFIED");
    expect(greece.callerFlagIgnored).toBe(true);
    expect(greece.applied).toBe(false);
    expect(greece.discount).toBeNull();
    expect(greece.commercialTotal).toBeNull();
    expect(greece.reasons).toContain("SALES_CLOSED");
    expect(greece.productionReady).toBe(false);
  });

  it("blocks a repeat, a synthetic campaign, and a failed retry without payment", () => {
    const checkout = gate.planCoupon(coupon({ idempotencyKey: "pay-1", action: "checkout" }));
    expect(checkout.orderCreated).toBe(false);
    expect(checkout.paymentCreated).toBe(false);
    expect(checkout.reservationCreated).toBe(false);
    expect(checkout.purchased).toBe(false);
    expect(checkout.applied).toBe(false);

    const synthetic = gate.planCoupon(coupon({ idempotencyKey: "mock-1", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_CAMPAIGN");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.discount).toBeNull();

    const first = gate.planCoupon(coupon({ idempotencyKey: "dup-1", code: "ONCE" }));
    const second = gate.planCoupon(coupon({ idempotencyKey: "dup-1", code: "ONCE", valid: true }));
    expect(first.code).toBe("COUPON_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_COUPON");
    expect(second.duplicate).toBe(true);
    expect(second.discount).toBeNull();
    expect(second.paymentCreated).toBe(false);

    const failed = gate.planCoupon(coupon({ idempotencyKey: "fail-1", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    const again = gate.planCoupon(coupon({ idempotencyKey: "fail-1", timeout: true }));
    expect(again.code).toBe("DUPLICATE_COUPON");
    const retried = gate.retryCoupon("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.discount).toBeNull();
    expect(retried.orderCreated).toBe(false);
    expect(retried.paymentCreated).toBe(false);
    expect(retried.reservationCreated).toBe(false);
    expect(gate.retryCoupon("missing-coupon").code).toBe("RETRY_UNKNOWN");
  });
});
