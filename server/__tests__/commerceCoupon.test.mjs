import { describe, it, expect } from "vitest";

const commerceCouponService = require("../lib/commerce/commerceCouponService");
const { validateCoupon } = require("../lib/coupons");

describe("commerceCouponService", () => {
  it("resolves valid coupon discount server-side", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 50);
    expect(result.ok).toBe(false);
    expect(result.discount).toBeNull();
    expect(result.commercialApplied).toBe(false);
    expect(result.commercialTotal).toBeNull();
  });

  it("rejects invalid coupon", () => {
    const result = commerceCouponService.resolveCouponDiscount("NOTREAL", 50);
    expect(result.ok).toBe(false);
  });

  it("rejects client discount tampering", () => {
    const tamper = commerceCouponService.rejectClientCouponFields({ clientDiscount: 99 }, 5);
    expect(tamper.ok).toBe(false);
    expect(tamper.code).toBe("coupon_tampering");
  });

  it("allows matching client discount within tolerance", () => {
    const tamper = commerceCouponService.rejectClientCouponFields({ discount: 5 }, 5);
    expect(tamper.ok).toBe(true);
  });

  it("validateCouponRequest rejects tampered payload", () => {
    const result = commerceCouponService.validateCouponRequest(
      { couponCode: "WELCOME10", subtotal: 50, clientDiscount: 100 },
      50,
      {}
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("coupon_tampering");
  });

  it("uses shared coupons module for eligibility", () => {
    const direct = validateCoupon("BUZZARD5", 60);
    const via = commerceCouponService.resolveCouponDiscount("BUZZARD5", 60);
    expect(direct.valid).toBe(false);
    expect(direct.discount).toBeNull();
    expect(via.ok).toBe(false);
    expect(via.discount).toBeNull();
    expect(via.commercialApplied).toBe(false);
  });
});

describe("FIN-M21 legacy validateCoupon stays closed", () => {
  function relation(extra = {}) {
    return {
      customerId: "cust-legacy",
      couponCustomerId: "cust-legacy",
      productId: "prod-1",
      campaignId: "camp-1",
      sku: "BZ-1",
      productSku: "BZ-1",
      ...extra,
    };
  }

  function expectClosed(result, code, status) {
    expect(result.valid).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.discount).toBeNull();
    expect(result.discountAmount).toBeNull();
    expect(result.total).toBeNull();
    expect(result.commercialTotal).toBeNull();
    expect(result.commercialApplied).toBe(false);
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.code).toBe(code);
    expect(result.status).toBe(status);
    expect(result.gateCode).toBe(code);
    expect(result.gateStatus).toBe(status);
    expect(result.code).not.toBe("COUPON_UNKNOWN");
  }

  it("does not calculate a discount unless the gate passes", () => {
    const result = validateCoupon("WELCOME10", 100, { idempotencyKey: "m21-no-pass", ok: true, valid: true });
    expectClosed(result, "COUPON_RELATION_MISMATCH", "BLOCKED");
    expect(result.discount).not.toBe(10);
  });

  it("keeps an unknown coupon window closed", () => {
    const result = validateCoupon("WELCOME10", 100, relation({
      idempotencyKey: "m21-unknown",
      usageLimit: 2,
      usageCount: 0,
      customerLimit: 1,
      customerUses: 0,
      currency: "EUR",
      couponCurrency: "EUR",
      country: "DE",
      couponCountry: "DE",
      discountRate: 10,
    }));
    expectClosed(result, "COUPON_WINDOW_UNKNOWN", "UNKNOWN");
  });

  it("keeps a blocked relation closed", () => {
    const result = validateCoupon("WELCOME10", 100, { idempotencyKey: "m21-blocked" });
    expectClosed(result, "COUPON_RELATION_MISMATCH", "BLOCKED");
  });

  it("keeps a timeout closed", () => {
    const result = validateCoupon("WELCOME10", 100, relation({
      idempotencyKey: "m21-timeout",
      timeout: true,
      status: 200,
      ok: true,
    }));
    expectClosed(result, "TIMEOUT", "FAILED");
    expect(result.status).not.toBe(200);
  });

  it("keeps a network failure closed", () => {
    const result = validateCoupon("WELCOME10", 100, relation({
      idempotencyKey: "m21-failed",
      networkError: true,
      ok: true,
    }));
    expectClosed(result, "NETWORK_ERROR", "FAILED");
  });

  it("does not treat HTTP 200 or ok true as coupon authority", () => {
    const result = validateCoupon("SAVE10", 80, {
      idempotencyKey: "m21-http",
      ok: true,
      valid: true,
      status: 200,
      discount: 20,
    });
    expectClosed(result, "COUPON_RELATION_MISMATCH", "BLOCKED");
    expect(result.callerFlagIgnored).toBe(true);
  });

  it("preserves the legacy empty-code key beside the gate code", () => {
    const result = validateCoupon("  ", 40, { idempotencyKey: "m21-empty" });
    expectClosed(result, "COUPON_RELATION_MISMATCH", "BLOCKED");
    expect(result.errorKey).toBe("checkout.couponEmpty");
    expect(result.valid).toBe(false);
  });
});

describe("FIN-M22 legacy resolveCouponDiscount stays closed", () => {
  function record(extra = {}) {
    return {
      customerId: "cust-m22",
      couponCustomerId: "cust-m22",
      productId: "prod-1",
      campaignId: "camp-1",
      couponCampaignId: "camp-1",
      campaignCode: "WELCOME10",
      sku: "BZ-1",
      productSku: "BZ-1",
      startsAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      usageLimit: 5,
      usageCount: 0,
      customerLimit: 1,
      customerUses: 0,
      currency: "EUR",
      couponCurrency: "EUR",
      campaignCurrency: "EUR",
      country: "DE",
      couponCountry: "DE",
      campaignCountry: "DE",
      discountRate: 10,
      authoritySource: "campaign-registry",
      ownerId: "owner-1",
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.arithmeticOnly).toBe(false);
    expect(result.arithmeticOk).toBe(false);
    expect(result.commercialAuthority).toBe(false);
    expect(result.couponVerified).toBe(false);
    expect(result.discount).toBeNull();
    expect(result.arithmeticDiscount).toBeNull();
    expect(result.total).toBeNull();
    expect(result.commercialTotal).toBeNull();
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.code).not.toBe("COUPON_UNKNOWN");
    expect(result.status).not.toBe(200);
  }

  it("does not let M22 authorize a coupon that M21 has not verified", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 100, record({
      idempotencyKey: "m22-no-m21",
      ok: true,
      valid: true,
      authorized: true,
    }));
    expectClosed(result);
    expect(result.legacyCode).toBe("COUPON_UNVERIFIED");
    expect(result.legacyStatus).toBe("UNKNOWN");
    expect(result.code).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(result.authorityCode).toBe("CAMPAIGN_OWNER_UNVERIFIED");
    expect(result.status).toBe("BLOCKED");
  });

  it("keeps an unknown authority source closed", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 100, record({
      idempotencyKey: "m22-unknown",
      authoritySource: "",
    }));
    expectClosed(result);
    expect(result.code).toBe("CAMPAIGN_SOURCE_UNKNOWN");
    expect(result.status).toBe("UNKNOWN");
  });

  it("keeps a blocked coupon relation closed", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 100, {
      idempotencyKey: "m22-blocked",
    });
    expectClosed(result);
    expect(result.legacyCode).toBe("COUPON_RELATION_MISMATCH");
    expect(result.code).toBe("COUPON_RELATION_MISMATCH");
    expect(result.status).toBe("BLOCKED");
  });

  it("keeps a network failure closed", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 100, record({
      idempotencyKey: "m22-failed",
      networkError: true,
      ok: true,
    }));
    expectClosed(result);
    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.status).toBe("FAILED");
  });

  it("keeps a timeout closed", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 100, record({
      idempotencyKey: "m22-timeout",
      timeout: true,
      status: 200,
      ok: true,
    }));
    expectClosed(result);
    expect(result.code).toBe("TIMEOUT");
    expect(result.status).toBe("FAILED");
  });

  it("ignores a forged gate result, HTTP 200, and ok true", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 80, {
      idempotencyKey: "m22-forged",
      ok: true,
      valid: true,
      status: 200,
      discount: 20,
      gateResult: { ok: true, authorized: true, code: "PASS", status: "PASS", discount: 20 },
    });
    expectClosed(result);
    expect(result.code).toBe("COUPON_RELATION_MISMATCH");
    expect(result.status).toBe("BLOCKED");
    expect(result.callerGateIgnored).toBe(true);
    expect(result.callerFlagIgnored).toBe(true);
    expect(result.discount).not.toBe(20);
  });
});
