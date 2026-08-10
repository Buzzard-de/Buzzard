export interface CouponDefinition {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal?: number;
}

/** Matches SQLite seed coupons — see server/lib/coupons.js */
const COUPONS: CouponDefinition[] = [
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 30 },
  { code: "BUZZARD5", type: "fixed", value: 5, minSubtotal: 50 },
];

export function normalizeCouponCode(code: string | undefined): string {
  return (code || "").trim().toUpperCase();
}

export function validateCoupon(code: string | undefined, subtotal: number): {
  valid: boolean;
  discount: number;
  normalizedCode?: string;
  errorKey?: string;
} {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { valid: false, discount: 0, errorKey: "checkout.couponEmpty" };

  const coupon = COUPONS.find((c) => c.code === normalized);
  if (!coupon) return { valid: false, discount: 0, errorKey: "checkout.couponInvalid" };

  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return { valid: false, discount: 0, errorKey: "checkout.couponMinSubtotal" };
  }

  const discount =
    coupon.type === "percent"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);

  return { valid: true, discount, normalizedCode: normalized };
}
