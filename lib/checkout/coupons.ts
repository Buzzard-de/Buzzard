export interface CouponDefinition {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal?: number;
  expiresAt?: string;
}

export interface CouponCallerInput {
  valid?: boolean;
  verified?: boolean;
  active?: boolean;
  approved?: boolean;
  live?: boolean;
  mock?: boolean;
  demo?: boolean;
  test?: boolean;
  source?: string;
  expiresAt?: string;
}

export interface CouponCheckResult {
  valid: boolean;
  arithmeticOnly: boolean;
  discount: number | null;
  arithmeticDiscount: number | null;
  normalizedCode?: string;
  errorKey?: string;
  commercialApplied: false;
  couponVerified: false;
  applied: false;
  couponStatus: "BLOCKED" | "UNKNOWN";
  code: string;
  discountedSubtotal: null;
  taxBase: null;
  commercialTotal: null;
  callerFlagIgnored: true;
  reasons: string[];
}

/** Matches SQLite seed coupons — see server/lib/coupons.js. Arithmetic only. */
const COUPONS: CouponDefinition[] = [
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 30 },
  { code: "BUZZARD5", type: "fixed", value: 5, minSubtotal: 50 },
  { code: "EXPIRED10", type: "percent", value: 10, minSubtotal: 0, expiresAt: "2000-01-01T00:00:00.000Z" },
];

const COMMERCIAL = {
  commercialApplied: false as const,
  couponVerified: false as const,
  applied: false as const,
  discountedSubtotal: null,
  taxBase: null,
  commercialTotal: null,
  callerFlagIgnored: true as const,
};

export function normalizeCouponCode(code: string | undefined): string {
  return (code || "").trim().toUpperCase();
}

function blocked(code: string, reasons: string[], extra: Partial<CouponCheckResult> = {}): CouponCheckResult {
  return {
    valid: false,
    arithmeticOnly: false,
    discount: null,
    arithmeticDiscount: null,
    couponStatus: "BLOCKED",
    code,
    reasons,
    ...COMMERCIAL,
    ...extra,
  };
}

function isMockCode(code: string, input: CouponCallerInput): boolean {
  return (
    input.mock === true ||
    input.demo === true ||
    input.test === true ||
    input.source === "mock" ||
    input.source === "DEMO" ||
    /MOCK|DEMO|TEST|FAKE/i.test(code)
  );
}

function isExpired(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) === false && new Date(parsed) < new Date();
}

export function validateCoupon(
  code: string | undefined,
  subtotal: number,
  input: CouponCallerInput = {}
): CouponCheckResult {
  const normalized = normalizeCouponCode(code);
  const salesReasons = ["SALES_CLOSED"];
  if (!normalized) {
    return {
      valid: false,
      arithmeticOnly: false,
      discount: null,
      arithmeticDiscount: null,
      errorKey: "checkout.couponEmpty",
      couponStatus: "UNKNOWN",
      code: "SALES_CLOSED",
      reasons: salesReasons.concat("UNKNOWN"),
      ...COMMERCIAL,
    };
  }

  if (isMockCode(normalized, input)) {
    return blocked("SALES_CLOSED", salesReasons.concat("MOCK_COUPON", "COUPON_UNVERIFIED"), {
      normalizedCode: normalized,
      errorKey: "checkout.couponInvalid",
    });
  }

  const coupon = COUPONS.find((item) => item.code === normalized);
  if (!coupon) {
    return blocked("SALES_CLOSED", salesReasons.concat("COUPON_UNVERIFIED"), {
      normalizedCode: normalized,
      errorKey: "checkout.couponInvalid",
    });
  }

  if (isExpired(coupon.expiresAt) || isExpired(input.expiresAt)) {
    return blocked("SALES_CLOSED", salesReasons.concat("COUPON_EXPIRED", "COUPON_UNVERIFIED"), {
      normalizedCode: normalized,
      errorKey: "checkout.couponInvalid",
    });
  }

  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return blocked("SALES_CLOSED", salesReasons.concat("COUPON_UNVERIFIED"), {
      normalizedCode: normalized,
      errorKey: "checkout.couponMinSubtotal",
    });
  }

  const arithmeticDiscount =
    coupon.type === "percent"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);

  return {
    valid: true,
    arithmeticOnly: true,
    discount: arithmeticDiscount,
    arithmeticDiscount,
    normalizedCode: normalized,
    couponStatus: "BLOCKED",
    code: "SALES_CLOSED",
    reasons: salesReasons.concat("COUPON_UNVERIFIED"),
    ...COMMERCIAL,
  };
}
