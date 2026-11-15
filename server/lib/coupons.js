const { db } = require("./db");
const { planCoupon } = require("./commerce/couponGate");

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

  let primary;
  try {
    primary = db.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").get(normalized);
  } catch (err) {
    if (err && err.code === "DATABASE_NOT_INITIALIZED") return null;
    throw err;
  }
  if (primary) {
    if (primary.expires_at && new Date(primary.expires_at) < new Date()) return null;
    return rowToCoupon(primary);
  }

  const cartCoupon = db.prepare("SELECT * FROM cc_coupons WHERE code = ? AND active = 1").get(normalized);
  return rowToCoupon(cartCoupon);
}

function closedCoupon(gate, normalized, errorKey) {
  return {
    valid: false,
    ok: false,
    discount: null,
    discountAmount: null,
    total: null,
    commercialTotal: null,
    applied: false,
    commercialApplied: false,
    orderCreated: false,
    paymentCreated: false,
    reservationCreated: false,
    purchased: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    code: gate.code,
    status: gate.status,
    gateCode: gate.code,
    gateStatus: gate.status,
    errorKey: errorKey || null,
    normalizedCode: normalized || null,
    reasons: Array.isArray(gate.reasons) ? gate.reasons.slice() : [gate.code],
  };
}

function validateCoupon(code, _subtotal, input) {
  const extra = input && typeof input === "object" ? input : {};
  const normalized = normalizeCouponCode(code);
  const errorKey = normalized ? null : "checkout.couponEmpty";
  const gate = planCoupon({
    ...extra,
    code: normalized,
    idempotencyKey: extra.idempotencyKey || `legacy-coupon:${normalized}:${extra.customerId || ""}:${extra.cartId || ""}`,
  });
  const gateClosed = gate.ok !== true
    || gate.applied !== true
    || gate.status === "UNKNOWN"
    || gate.status === "BLOCKED"
    || gate.status === "FAILED"
    || gate.code === "TIMEOUT"
    || gate.code === "NETWORK_ERROR";
  if (gateClosed) return closedCoupon(gate, normalized, errorKey);
  return closedCoupon(gate, normalized, errorKey);
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
