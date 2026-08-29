/**
 * Part 10 — Server-authoritative coupon validation for Commerce Core
 */
const { validateCoupon, normalizeCouponCode } = require("../coupons");
const { validateDiscount } = require("./commerceValidation");
const { logSecurityEvent } = require("../securityLog");

function resolveCouponDiscount(couponCode, subtotal) {
  if (!couponCode || !String(couponCode).trim()) {
    return { ok: true, discount: 0, couponCode: null, normalizedCode: null };
  }

  const result = validateCoupon(couponCode, subtotal);
  if (!result.valid) {
    return {
      ok: false,
      error: result.errorKey || "checkout.couponInvalid",
      status: 400,
      discount: 0,
    };
  }

  const discountCheck = validateDiscount(result.discount, subtotal);
  if (!discountCheck.ok) {
    return { ok: false, error: discountCheck.code, status: 400, discount: 0 };
  }

  return {
    ok: true,
    discount: discountCheck.discount,
    couponCode: result.normalizedCode,
    normalizedCode: result.normalizedCode,
    source: result.source || "server",
  };
}

function rejectClientCouponFields(body = {}, serverDiscount = 0) {
  const tamperedFields = [];

  if (body.discount !== undefined && Math.abs(Number(body.discount) - serverDiscount) > 0.01) {
    tamperedFields.push("discount");
  }
  if (body.clientDiscount !== undefined && Math.abs(Number(body.clientDiscount) - serverDiscount) > 0.01) {
    tamperedFields.push("clientDiscount");
  }
  if (body.couponDiscount !== undefined && Math.abs(Number(body.couponDiscount) - serverDiscount) > 0.01) {
    tamperedFields.push("couponDiscount");
  }

  if (tamperedFields.length) {
    return {
      ok: false,
      code: "coupon_tampering",
      message: "Client-provided coupon discount rejected; server recalculates",
      fields: tamperedFields,
    };
  }

  return { ok: true };
}

function logCouponTampering(req, detail = {}) {
  logSecurityEvent({
    type: "coupon_tampering",
    success: false,
    path: req?.url,
    detail,
  });
}

function validateCouponRequest(body = {}, subtotal, ctx = {}) {
  const requestedCode = body.couponCode ?? body.code;
  if (body.clientDiscount !== undefined && !requestedCode) {
    logCouponTampering(ctx.req, { reason: "client_discount_without_code", subtotal });
    return { ok: false, error: "coupon_tampering", status: 400 };
  }

  const resolved = resolveCouponDiscount(requestedCode, subtotal);
  if (!resolved.ok) return resolved;

  const tamper = rejectClientCouponFields(body, resolved.discount);
  if (!tamper.ok) {
    logCouponTampering(ctx.req, {
      reason: tamper.code,
      fields: tamper.fields,
      serverDiscount: resolved.discount,
      clientDiscount: body.discount ?? body.clientDiscount ?? body.couponDiscount,
    });
    return { ok: false, error: tamper.code, status: 400, message: tamper.message };
  }

  return resolved;
}

module.exports = {
  normalizeCouponCode,
  resolveCouponDiscount,
  rejectClientCouponFields,
  validateCouponRequest,
  logCouponTampering,
};
