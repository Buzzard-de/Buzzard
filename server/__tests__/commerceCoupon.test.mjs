import { describe, it, expect } from "vitest";

const commerceCouponService = require("../lib/commerce/commerceCouponService");
const { validateCoupon } = require("../lib/coupons");

describe("commerceCouponService", () => {
  it("resolves valid coupon discount server-side", () => {
    const result = commerceCouponService.resolveCouponDiscount("WELCOME10", 50);
    expect(result.ok).toBe(true);
    expect(result.discount).toBe(5);
    expect(result.couponCode).toBe("WELCOME10");
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
    expect(direct.valid).toBe(true);
    expect(via.ok).toBe(true);
    expect(via.discount).toBe(direct.discount);
  });
});
