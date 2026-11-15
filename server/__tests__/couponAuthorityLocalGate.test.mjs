import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const gate = require("../lib/commerce/couponGate.js");
const authority = require("../lib/commerce/couponAuthorityGate.js");
const commerceCoupon = require("../lib/commerce/commerceCouponService.js");

const future = "2099-01-01T00:00:00.000Z";
const past = "2020-01-01T00:00:00.000Z";
const started = "2020-06-01T00:00:00.000Z";

function campaign(extra = {}) {
  return {
    code: "SAVE10",
    campaignCode: "SAVE10",
    campaignId: "camp-1",
    couponCampaignId: "camp-1",
    customerId: "cust-1",
    productId: "prod-1",
    sku: "BZ-CPN-1",
    productSku: "BZ-CPN-1",
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
    verified: true,
    authorized: true,
    approved: true,
    active: true,
    ...extra,
  };
}

describe("coupon authority is not a discount", () => {
  it("keeps an unknown source unknown and rejects a broken campaign link", () => {
    const unknown = authority.decideCouponAuthority(campaign({ authorityKey: "src-1", authoritySource: "" }));
    expect(unknown.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");
    expect(unknown.sourceStatus).toBe("UNKNOWN");
    expect(unknown.authorized).toBe(false);
    expect(unknown.discount).toBeNull();

    const mismatch = authority.decideCouponAuthority(campaign({ authorityKey: "link-1", couponCampaignId: "camp-2" }));
    expect(mismatch.code).toBe("COUPON_CAMPAIGN_MISMATCH");
    expect(mismatch.authorized).toBe(false);
    expect(mismatch.discount).toBeNull();
  });

  it("rejects expired, cancelled, foreign, and conflicting authority", () => {
    const expired = authority.decideCouponAuthority(campaign({ authorityKey: "exp-1", expiresAt: past }));
    expect(expired.code).toBe("COUPON_EXPIRED");
    expect(expired.gateCode).toBe("COUPON_EXPIRED");
    expect(expired.authorized).toBe(false);
    expect(expired.discount).toBeNull();
    expect(expired.discountAmount).toBeNull();
    expect(expired.commercialTotal).toBeNull();

    const cancelled = authority.decideCouponAuthority(campaign({ authorityKey: "cancel-1", campaignStatus: "cancelled" }));
    expect(cancelled.code).toBe("CAMPAIGN_CANCELLED");

    const currency = authority.decideCouponAuthority(campaign({ authorityKey: "fx-1", campaignCurrency: "PLN" }));
    expect(currency.code).toBe("CURRENCY_SCOPE_MISMATCH");
    expect(currency.currency).toBeNull();

    const france = authority.decideCouponAuthority(campaign({ authorityKey: "fr-1", country: "FR", couponCountry: "DE", campaignCountry: "DE" }));
    expect(france.code).toBe("COUNTRY_MISMATCH");
    expect(france.gateCode).toBe("COUNTRY_MISMATCH");
    expect(france.country).toBe("FR");
    expect(france.campaignCountry).toBe("DE");

    const conflict = authority.decideCouponAuthority(campaign({ authorityKey: "conflict-1", conflictingAuthority: "other-registry" }));
    expect(conflict.code).toBe("COUPON_AUTHORITY_CONFLICT");
    expect(conflict.selectedAuthority).toBeNull();
    expect(conflict.discount).toBeNull();
  });

  it("does not authorize a flagged campaign, a synthetic campaign, or a repeated decision", () => {
    const flagged = authority.decideCouponAuthority(campaign({ authorityKey: "flag-1", country: "GR", couponCountry: "EL", campaignCountry: "EL" }));
    expect(flagged.country).toBe("EL");
    expect(flagged.campaignCountry).toBe("EL");
    expect(flagged.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(flagged.callerFlagIgnored).toBe(true);
    expect(flagged.authorized).toBe(false);
    expect(flagged.sourceReliability).toBe("UNVERIFIED");
    expect(flagged.discount).toBeNull();
    expect(flagged.orderCreated).toBe(false);
    expect(flagged.paymentCreated).toBe(false);
    expect(flagged.reservationCreated).toBe(false);
    expect(flagged.reasons).toContain("SALES_CLOSED");
    expect(flagged.productionReady).toBe(false);

    const synthetic = authority.decideCouponAuthority(campaign({ authorityKey: "mock-1", synthetic: true, authoritySource: "mock" }));
    expect(synthetic.code).toBe("MOCK_NOT_CAMPAIGN");
    expect(synthetic.commercial).toBe(false);
    expect(synthetic.discount).toBeNull();

    const first = authority.decideCouponAuthority(campaign({ authorityKey: "dup-1" }));
    const second = authority.decideCouponAuthority(campaign({ authorityKey: "dup-1", authorized: true }));
    expect(first.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(second.code).toBe("DUPLICATE_AUTHORITY");
    expect(second.duplicate).toBe(true);
    expect(second.discount).toBeNull();
    expect(second.paymentCreated).toBe(false);
  });

  it("retries a timeout and keeps the FIN-M21 gate and arithmetic helper unchanged", () => {
    const failed = authority.decideCouponAuthority(campaign({ authorityKey: "fail-1", timeout: true }));
    expect(failed.code).toBe("TIMEOUT");
    expect(failed.status).toBe("FAILED");
    expect(failed.attempts).toBe(1);
    expect(failed.discount).toBeNull();
    const again = authority.decideCouponAuthority(campaign({ authorityKey: "fail-1", timeout: true }));
    expect(again.code).toBe("DUPLICATE_AUTHORITY");
    const retried = authority.retryCouponAuthority("fail-1");
    expect(retried.code).toBe("TIMEOUT");
    expect(retried.status).toBe("FAILED");
    expect(retried.attempts).toBe(2);
    expect(retried.authorized).toBe(false);
    expect(retried.discount).toBeNull();
    expect(retried.orderCreated).toBe(false);
    expect(retried.paymentCreated).toBe(false);
    expect(retried.reservationCreated).toBe(false);
    expect(authority.retryCouponAuthority("missing-authority").code).toBe("RETRY_UNKNOWN");

    const checked = gate.planCoupon({
      idempotencyKey: "m21-still",
      code: "SAVE10",
      customerId: "cust-1",
      productId: "prod-1",
      sku: "BZ-CPN-1",
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
    });
    const decided = authority.decideCouponAuthority({ ...campaign({ authorityKey: "after-gate" }), gateResult: checked });
    expect(checked.code).toBe("COUPON_UNVERIFIED");
    expect(checked.discount).toBeNull();
    expect(checked.applied).toBe(false);
    expect(decided.gateCode).toBe("COUPON_UNVERIFIED");
    expect(decided.gateApplied).toBe(false);
    expect(decided.authorized).toBe(false);
    expect(decided.discount).toBeNull();

    const forged = authority.decideCouponAuthority(campaign({
      authorityKey: "forged-1",
      usageCount: 10,
      usageLimit: 10,
      gateResult: { code: "OK", applied: true, authorized: true, discount: 25, commercialTotal: 10 },
    }));
    expect(forged.callerGateIgnored).toBe(true);
    expect(forged.code).toBe("COUPON_USAGE_EXCEEDED");
    expect(forged.gateCode).toBe("COUPON_USAGE_EXCEEDED");
    expect(forged.gateApplied).toBe(false);
    expect(forged.authorized).toBe(false);
    expect(forged.discount).toBeNull();
    expect(forged.commercialTotal).toBeNull();
    expect(forged.orderCreated).toBe(false);
    expect(forged.paymentCreated).toBe(false);

    const conflicted = authority.decideCouponAuthority(campaign({
      authorityKey: "discount-conflict",
      discountRate: 10,
      discountAmount: 5,
      gateResult: { code: "OK", applied: true, discount: 5, total: 45 },
    }));
    expect(conflicted.code).toBe("DISCOUNT_CONFLICT");
    expect(conflicted.gateCode).toBe("DISCOUNT_CONFLICT");
    expect(conflicted.authorized).toBe(false);
    expect(conflicted.discount).toBeNull();
    expect(conflicted.total).toBeNull();
    expect(conflicted.commercialTotal).toBeNull();

    const currencyMismatch = authority.decideCouponAuthority(campaign({
      authorityKey: "currency-mismatch",
      currency: "EUR",
      couponCurrency: "PLN",
    }));
    expect(currencyMismatch.code).toBe("CURRENCY_MISMATCH");
    expect(currencyMismatch.gateCode).toBe("CURRENCY_MISMATCH");
    expect(currencyMismatch.discount).toBeNull();
    expect(currencyMismatch.commercialTotal).toBeNull();

    const unverified = authority.decideCouponAuthority(campaign({
      authorityKey: "still-unverified",
      verified: true,
      authorized: true,
      gateResult: { code: "COUPON_VERIFIED", applied: true, authorized: true },
    }));
    expect(unverified.gateCode).toBe("COUPON_UNVERIFIED");
    expect(unverified.authorized).toBe(false);
    expect(unverified.applied).toBe(false);
    expect(unverified.discount).toBeNull();
    expect(unverified.commercialTotal).toBeNull();
    expect(unverified.orderCreated).toBe(false);
    expect(unverified.paymentCreated).toBe(false);

    const unknown = authority.decideCouponAuthority(campaign({ authorityKey: "unknown-closed", authoritySource: "" }));
    expect(unknown.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(unknown.status).toBe("UNKNOWN");
    expect(unknown.authorized).toBe(false);
    expect(unknown.discount).toBeNull();
    expect(unknown.commercialTotal).toBeNull();
    expect(unknown.orderCreated).toBe(false);

    const arithmetic = commerceCoupon.resolveCouponDiscount("WELCOME10", 50);
    expect(arithmetic.ok).toBe(true);
    expect(arithmetic.arithmeticOnly).toBe(true);
    expect(arithmetic.discount).toBe(5);
    expect(arithmetic.commercialApplied).toBe(false);
    expect(arithmetic.commercialTotal).toBeNull();
  });
});
