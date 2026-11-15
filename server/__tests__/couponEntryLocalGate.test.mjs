import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const entries = require("../lib/commerce/couponEntryGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");

const future = "2099-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const started = "2020-06-01T00:00:00.000Z";
const later = "2099-06-01T00:00:00.000Z";

function entry(extra = {}) {
  return {
    customerId: "cust-1",
    productId: "prod-1",
    sku: "BZ-CPN-1",
    productSku: "BZ-CPN-1",
    campaignId: "camp-1",
    couponCampaignId: "camp-1",
    campaignCode: "SAVE10",
    country: "DE",
    couponCountry: "DE",
    campaignCountry: "DE",
    currency: "EUR",
    couponCurrency: "EUR",
    campaignCurrency: "EUR",
    startsAt: started,
    expiresAt: future,
    usageLimit: 10,
    usageCount: 1,
    customerLimit: 1,
    customerUses: 0,
    discountRate: 10,
    authoritySource: "campaign-registry",
    ownerId: "owner-1",
    valid: true,
    approved: true,
    active: true,
    verified: true,
    cartId: "cart-1",
    ...extra,
  };
}

describe("coupon entry does not create a discount", () => {
  it("rejects an empty, malformed, or unrelated code", () => {
    const empty = entries.submitCouponEntry(entry({ idempotencyKey: "empty-1", code: "  " }));
    expect(empty.code).toBe("COUPON_CODE_EMPTY");
    expect(empty.status).toBe("UNKNOWN");
    expect(empty.discount).toBeNull();
    expect(empty.commercialTotal).toBeNull();

    const bad = entries.submitCouponEntry(entry({ idempotencyKey: "bad-1", code: "bad code" }));
    expect(bad.code).toBe("COUPON_CODE_INVALID");
    expect(bad.status).toBe("BLOCKED");
    expect(bad.accepted).toBe(false);

    const mismatch = entries.submitCouponEntry(entry({ idempotencyKey: "rel-1", code: "SAVE10", productSku: "OTHER" }));
    expect(mismatch.code).toBe("COUPON_RELATION_MISMATCH");
    expect(mismatch.gateCode).toBe("COUPON_RELATION_MISMATCH");
    expect(mismatch.applied).toBe(false);
    expect(mismatch.discount).toBeNull();
  });

  it("rejects a closed window, a currency or country mismatch, and a cancelled campaign", () => {
    const waiting = entries.submitCouponEntry(entry({ idempotencyKey: "wait-1", code: "SAVE10", startsAt: later }));
    expect(waiting.code).toBe("COUPON_NOT_STARTED");
    expect(waiting.discount).toBeNull();

    const expired = entries.submitCouponEntry(entry({ idempotencyKey: "exp-1", code: "SAVE10", expiresAt: past }));
    expect(expired.code).toBe("COUPON_EXPIRED");
    expect(expired.commercialTotal).toBeNull();

    const cancelled = entries.submitCouponEntry(entry({ idempotencyKey: "cancel-1", code: "SAVE10", campaignStatus: "cancelled" }));
    expect(cancelled.code).toBe("CAMPAIGN_CANCELLED");
    expect(cancelled.authorityCode).toBe("CAMPAIGN_CANCELLED");
    expect(cancelled.authorized).toBe(false);

    const currency = entries.submitCouponEntry(entry({ idempotencyKey: "fx-1", code: "SAVE10", couponCurrency: "PLN", campaignCurrency: "PLN" }));
    expect(currency.code).toBe("CURRENCY_MISMATCH");
    expect(currency.discount).toBeNull();

    const france = entries.submitCouponEntry(entry({ idempotencyKey: "fr-1", code: "SAVE10", country: "FR", couponCountry: "DE", campaignCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_MISMATCH");
    expect(france.orderCreated).toBe(false);
    expect(france.paymentCreated).toBe(false);
    expect(france.reservationCreated).toBe(false);
  });

  it("keeps an unverified entry unknown and blocks repeats, synthetic codes, and failed retries", () => {
    const unknown = entries.submitCouponEntry(entry({
      idempotencyKey: "unknown-1",
      code: "NOTREAL",
      campaignCode: "NOTREAL",
      authoritySource: "",
    }));
    expect(unknown.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(unknown.gateCode).toBe("COUPON_UNVERIFIED");
    expect(unknown.authorityCode).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");
    expect(unknown.callerFlagIgnored).toBe(true);
    expect(unknown.authorized).toBe(false);
    expect(unknown.discount).toBeNull();
    expect(unknown.commercialTotal).toBeNull();
    expect(unknown.reasons).toContain("SALES_CLOSED");
    expect(unknown.productionReady).toBe(false);

    const synthetic = entries.submitCouponEntry(entry({ idempotencyKey: "mock-1", code: "SAVE10", synthetic: true }));
    expect(synthetic.code).toBe("MOCK_NOT_CAMPAIGN");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.discount).toBeNull();

    const first = entries.submitCouponEntry(entry({ idempotencyKey: "dup-1", code: "SAVE10" }));
    const second = entries.submitCouponEntry(entry({ idempotencyKey: "dup-1", code: "SAVE10", valid: true }));
    expect(first.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(first.gateCode).toBe("COUPON_UNVERIFIED");
    expect(first.authorityCode).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(first.authorized).toBe(false);
    expect(first.applied).toBe(false);
    expect(first.total).toBeNull();
    expect(second.code).toBe("DUPLICATE_COUPON_ENTRY");
    expect(second.duplicate).toBe(true);
    expect(second.discount).toBeNull();
    expect(second.purchased).toBe(false);

    const failed = entries.submitCouponEntry(entry({ idempotencyKey: "fail-1", code: "SAVE10", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    const again = entries.submitCouponEntry(entry({ idempotencyKey: "fail-1", code: "SAVE10", timeout: true }));
    expect(again.code).toBe("DUPLICATE_COUPON_ENTRY");
    const retried = entries.retryCouponEntry("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.discount).toBeNull();
    expect(retried.orderCreated).toBe(false);
    expect(retried.paymentCreated).toBe(false);
    expect(retried.reservationCreated).toBe(false);
    expect(entries.retryCouponEntry("missing-entry").code).toBe("RETRY_UNKNOWN");
  });

  it("keeps the real gate and authority codes on a closed entry", () => {
    const unverified = entries.submitCouponEntry(entry({ idempotencyKey: "keep-unverified", code: "SAVE10" }));
    expect(unverified.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(unverified.gateCode).toBe("COUPON_UNVERIFIED");
    expect(unverified.authorityCode).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(unverified.authorized).toBe(false);
    expect(unverified.applied).toBe(false);
    expect(unverified.discount).toBeNull();
    expect(unverified.total).toBeNull();
    expect(unverified.commercialTotal).toBeNull();

    const limited = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-limit",
      code: "SAVE10",
      usageCount: 10,
      usageLimit: 10,
    }));
    expect(limited.code).toBe("COUPON_USAGE_EXCEEDED");
    expect(limited.gateCode).toBe("COUPON_USAGE_EXCEEDED");
    expect(limited.authorityCode).toBe("COUPON_USAGE_EXCEEDED");
    expect(limited.authorized).toBe(false);
    expect(limited.discount).toBeNull();
    expect(limited.total).toBeNull();

    const conflict = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-conflict",
      code: "SAVE10",
      discountRate: 10,
      discountAmount: 5,
    }));
    expect(conflict.code).toBe("DISCOUNT_CONFLICT");
    expect(conflict.gateCode).toBe("DISCOUNT_CONFLICT");
    expect(conflict.authorityCode).toBe("DISCOUNT_CONFLICT");
    expect(conflict.applied).toBe(false);
    expect(conflict.discount).toBeNull();
    expect(conflict.total).toBeNull();

    const expired = entries.submitCouponEntry(entry({ idempotencyKey: "keep-expired", code: "SAVE10", expiresAt: past }));
    expect(expired.code).toBe("COUPON_EXPIRED");
    expect(expired.gateCode).toBe("COUPON_EXPIRED");
    expect(expired.authorityCode).toBe("COUPON_EXPIRED");
    expect(expired.discount).toBeNull();
    expect(expired.total).toBeNull();

    const country = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-country",
      code: "SAVE10",
      country: "FR",
      couponCountry: "DE",
    }));
    expect(country.code).toBe("COUNTRY_MISMATCH");
    expect(country.gateCode).toBe("COUNTRY_MISMATCH");
    expect(country.authorityCode).toBe("COUNTRY_MISMATCH");
    expect(country.total).toBeNull();

    const currency = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-currency",
      code: "SAVE10",
      currency: "EUR",
      couponCurrency: "PLN",
    }));
    expect(currency.code).toBe("CURRENCY_MISMATCH");
    expect(currency.gateCode).toBe("CURRENCY_MISMATCH");
    expect(currency.authorityCode).toBe("CURRENCY_MISMATCH");
    expect(currency.discount).toBeNull();
    expect(currency.commercialTotal).toBeNull();

    const window = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-window",
      code: "SAVE10",
      startsAt: "",
      expiresAt: "",
    }));
    expect(window.code).toBe("COUPON_WINDOW_UNKNOWN");
    expect(window.gateCode).toBe("COUPON_WINDOW_UNKNOWN");
    expect(window.status).toBe("UNKNOWN");
    expect(window.authorized).toBe(false);
    expect(window.discount).toBeNull();
    expect(window.total).toBeNull();

    const limit = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-limit-unknown",
      code: "SAVE10",
      usageLimit: undefined,
      usageCount: undefined,
      customerLimit: undefined,
      customerUses: undefined,
    }));
    expect(limit.code).toBe("COUPON_LIMIT_UNKNOWN");
    expect(limit.gateCode).toBe("COUPON_LIMIT_UNKNOWN");
    expect(limit.authorityCode).toBe("COUPON_LIMIT_UNKNOWN");
    expect(limit.discount).toBeNull();
    expect(limit.total).toBeNull();

    const discount = entries.submitCouponEntry(entry({
      idempotencyKey: "keep-discount-unknown",
      code: "SAVE10",
      discountRate: undefined,
      discountAmount: undefined,
    }));
    expect(discount.code).toBe("DISCOUNT_UNKNOWN");
    expect(discount.gateCode).toBe("DISCOUNT_UNKNOWN");
    expect(discount.authorityCode).toBe("DISCOUNT_UNKNOWN");
    expect(discount.status).toBe("UNKNOWN");
    expect(discount.applied).toBe(false);
    expect(discount.discount).toBeNull();
    expect(discount.total).toBeNull();

    const timedOut = entries.submitCouponEntry(entry({ idempotencyKey: "keep-timeout", code: "SAVE10", timeout: true }));
    expect(timedOut.code).toBe("TIMEOUT");
    expect(timedOut.status).toBe("FAILED");
    expect(timedOut.ok).toBe(false);
    expect(timedOut.authorized).toBe(false);
    expect(timedOut.applied).toBe(false);
    expect(timedOut.discount).toBeNull();
    expect(timedOut.total).toBeNull();
  });

  it("leaves the existing arithmetic helpers commercially blocked", () => {
    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50, { valid: true, approved: true });
    expect(arithmetic.ok).toBe(true);
    expect(arithmetic.arithmeticOnly).toBe(true);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();

    const entered = entries.submitCouponEntry(entry({
      idempotencyKey: "welcome-entry",
      code: "WELCOME10",
      campaignCode: "WELCOME10",
    }));
    expect(entered.discount).toBeNull();
    expect(entered.commercialTotal).toBeNull();
    expect(entered.applied).toBe(false);
    expect(entered.authorized).toBe(false);
    expect(entered.paymentCreated).toBe(false);
  });
});
