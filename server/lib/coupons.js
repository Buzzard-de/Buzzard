const { db } = require("./db");

/** Canonical coupon codes — kept in sync with SQLite seed data and storefront fallback. */
const FALLBACK_COUPONS = {
  WELCOME10: { type: "percent", value: 10, minSubtotal: 30 },
  BUZZARD5: { type: "fixed", value: 5, minSubtotal: 50 },
};

function normalizeCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .slice(0, 32);
}

function computeDiscount(coupon, subtotal) {
  const amount = Number(subtotal) || 0;
  if (coupon.minSubtotal != null && amount < coupon.minSubtotal) {
    return { valid: false, discount: 0, errorKey: "checkout.couponMinSubtotal" };
  }
  const discount =
    coupon.type === "percent"
      ? Math.round(amount * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, amount);
  return { valid: true, discount, normalizedCode: coupon.code };
}

function rowToCoupon(row) {
  if (!row) return null;
  return {
    code: row.code,
    type: row.type,
    value: row.value,
    minSubtotal: row.min_order ?? row.minSubtotal ?? 0,
  };
}

function lookupDbCoupon(code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  const primary = db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").get(normalized);
  if (primary) {
    if (primary.expires_at && new Date(primary.expires_at) < new Date()) return null;
    return rowToCoupon(primary);
  }

  const cartCoupon = db.prepare("SELECT * FROM cc_coupons WHERE code = ? AND active = 1").get(normalized);
  return rowToCoupon(cartCoupon);
}

function validateCoupon(code, subtotal) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return { valid: false, discount: 0, errorKey: "checkout.couponEmpty" };
  }

  const dbCoupon = lookupDbCoupon(normalized);
  if (dbCoupon) {
    const result = computeDiscount({ ...dbCoupon, code: normalized }, subtotal);
    if (!result.valid) return result;
    return { ...result, normalizedCode: normalized, source: "sqlite" };
  }

  const fallback = FALLBACK_COUPONS[normalized];
  if (!fallback) {
    return { valid: false, discount: 0, errorKey: "checkout.couponInvalid" };
  }

  const result = computeDiscount({ ...fallback, code: normalized }, subtotal);
  if (!result.valid) return result;
  return { ...result, normalizedCode: normalized, source: "fallback" };
}

function listCouponsAdmin() {
  return db.prepare("SELECT * FROM coupons ORDER BY code").all();
}

module.exports = {
  FALLBACK_COUPONS,
  normalizeCouponCode,
  validateCoupon,
  lookupDbCoupon,
  listCouponsAdmin,
};
