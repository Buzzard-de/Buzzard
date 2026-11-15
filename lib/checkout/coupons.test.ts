import { describe, expect, it } from "vitest";
import { validateCoupon } from "./coupons";

describe("client validateCoupon arithmetic is not a commercial discount", () => {
  it("keeps WELCOME10 and BUZZARD5 arithmetic without commercial authority", () => {
    const welcome = validateCoupon("WELCOME10", 50, {
      valid: true,
      verified: true,
      active: true,
      approved: true,
      live: true,
    });
    expect(welcome.valid).toBe(true);
    expect(welcome.discount).toBe(5);
    expect(welcome.arithmeticDiscount).toBe(5);
    expect(welcome.arithmeticOnly).toBe(true);
    expect(welcome.normalizedCode).toBe("WELCOME10");
    expect(welcome.commercialApplied).toBe(false);
    expect(welcome.couponVerified).toBe(false);
    expect(welcome.applied).toBe(false);
    expect(welcome.couponStatus).toBe("BLOCKED");
    expect(welcome.code).toBe("SALES_CLOSED");
    expect(welcome.discountedSubtotal).toBeNull();
    expect(welcome.taxBase).toBeNull();
    expect(welcome.commercialTotal).toBeNull();
    expect(welcome.callerFlagIgnored).toBe(true);

    const buzzard = validateCoupon("BUZZARD5", 60);
    expect(buzzard.valid).toBe(true);
    expect(buzzard.discount).toBe(5);
    expect(buzzard.arithmeticOnly).toBe(true);
    expect(buzzard.commercialApplied).toBe(false);
    expect(buzzard.commercialTotal).toBeNull();
  });

  it("blocks unknown, expired, mock, and empty coupons without a zero discount", () => {
    const unknown = validateCoupon("NOTREAL", 80, { verified: true });
    expect(unknown.valid).toBe(false);
    expect(unknown.discount).toBeNull();
    expect(unknown.couponStatus).toBe("BLOCKED");
    expect(unknown.reasons).toContain("COUPON_UNVERIFIED");

    const expired = validateCoupon("EXPIRED10", 80);
    expect(expired.valid).toBe(false);
    expect(expired.discount).toBeNull();
    expect(expired.reasons).toContain("COUPON_EXPIRED");
    expect(expired.commercialTotal).toBeNull();

    const callerExpired = validateCoupon("WELCOME10", 50, { expiresAt: "2000-01-01T00:00:00.000Z", live: true });
    expect(callerExpired.valid).toBe(false);
    expect(callerExpired.reasons).toContain("COUPON_EXPIRED");
    expect(callerExpired.discount).toBeNull();

    const mock = validateCoupon("MOCK-SAVE", 80, { valid: true });
    expect(mock.valid).toBe(false);
    expect(mock.discount).toBeNull();
    expect(mock.reasons).toContain("MOCK_COUPON");

    const empty = validateCoupon("  ", 80);
    expect(empty.valid).toBe(false);
    expect(empty.couponStatus).toBe("UNKNOWN");
    expect(empty.discount).toBeNull();
    expect(empty.code).toBe("SALES_CLOSED");
  });
});
