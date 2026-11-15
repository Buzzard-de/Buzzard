/**
 * Part 10 — Server-authoritative coupon validation for Commerce Core
 */
const { validateCoupon, normalizeCouponCode } = require("../coupons");
const { decideCouponAuthority } = require("./couponAuthorityGate");
const { validateDiscount } = require("./commerceValidation");
const { logSecurityEvent } = require("../securityLog");

function commercialSeparation(input = {}) {
  return {
    commercialApplied: false,
    commercialAuthority: false,
    couponVerified: false,
    applied: false,
    callerFlagIgnored: true,
    discountedSubtotal: null,
    taxBase: null,
    commercialTotal: null,
    orderCreated: false,
    paymentCreated: false,
    callerFlagsSeen: ["valid", "verified", "active", "approved", "live"].filter((key) => input[key] !== undefined),
  };
}

function resolveCouponDiscount(couponCode, subtotal, input = {}) {
  const request = input && typeof input === "object" ? input : {};
  const normalized = normalizeCouponCode(couponCode);
  const legacyKey = `m21:${request.idempotencyKey || normalized || "empty"}`;
  const legacy = validateCoupon(couponCode, subtotal, {
    ...request,
    idempotencyKey: legacyKey,
  });
  const authority = decideCouponAuthority({
    ...request,
    code: normalized,
    authorityKey: `m22:${request.authorityKey || request.idempotencyKey || normalized || "empty"}`,
  });
  const gatesAuthorize = legacy.valid === true
    && legacy.ok === true
    && authority.ok === true
    && authority.authorized === true
    && authority.applied === true
    && authority.status !== "UNKNOWN"
    && authority.status !== "BLOCKED"
    && authority.status !== "FAILED"
    && authority.code !== "TIMEOUT"
    && authority.code !== "NETWORK_ERROR";
  const arithmetic = gatesAuthorize ? validateDiscount(legacy.discount, subtotal) : null;
  const arithmeticOk = arithmetic?.ok === true;
  return {
    ...commercialSeparation(request),
    ok: false,
    authorized: false,
    arithmeticOnly: false,
    arithmeticOk: false,
    commercialAuthority: false,
    couponVerified: false,
    applied: false,
    discount: null,
    arithmeticDiscount: arithmeticOk ? arithmetic.discount : null,
    total: null,
    commercialTotal: null,
    discountedSubtotal: null,
    taxBase: null,
    orderCreated: false,
    paymentCreated: false,
    code: authority.code,
    status: authority.status,
    couponStatus: authority.status,
    gateCode: authority.gateCode || legacy.code || null,
    authorityCode: authority.code,
    legacyCode: legacy.code || null,
    legacyStatus: legacy.status || null,
    error: legacy.errorKey || authority.code,
    reasons: Array.isArray(authority.reasons) ? authority.reasons.slice() : [authority.code],
    couponCode: normalized || null,
    normalizedCode: normalized || null,
    callerGateIgnored: request.gateResult != null || authority.callerGateIgnored === true,
    callerFlagIgnored: true,
    productionReady: false,
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

  const resolved = resolveCouponDiscount(requestedCode, subtotal, body);
  const serverDiscount = resolved.arithmeticOnly ? resolved.arithmeticDiscount : 0;
  const tamper = rejectClientCouponFields(body, serverDiscount);
  if (!tamper.ok) {
    logCouponTampering(ctx.req, {
      reason: tamper.code,
      fields: tamper.fields,
      serverDiscount,
      clientDiscount: body.discount ?? body.clientDiscount ?? body.couponDiscount,
    });
    return {
      ok: false,
      error: tamper.code,
      status: 400,
      message: tamper.message,
      discount: null,
      commercialApplied: false,
      applied: false,
      couponVerified: false,
      callerFlagIgnored: true,
    };
  }

  return {
    ok: false,
    error: resolved.code || "COUPON_UNVERIFIED",
    code: resolved.code || "COUPON_UNVERIFIED",
    status: resolved.code === "SALES_CLOSED" ? 403 : 409,
    couponStatus: resolved.couponStatus || "BLOCKED",
    discount: null,
    arithmeticDiscount: resolved.arithmeticOnly ? resolved.arithmeticDiscount : null,
    arithmeticOk: resolved.arithmeticOnly === true,
    commercialApplied: false,
    commercialAuthority: false,
    applied: false,
    couponVerified: false,
    callerFlagIgnored: true,
    discountedSubtotal: null,
    taxBase: null,
    commercialTotal: null,
    orderCreated: false,
    reasons: resolved.reasons,
  };
}

module.exports = {
  normalizeCouponCode,
  resolveCouponDiscount,
  rejectClientCouponFields,
  validateCouponRequest,
  logCouponTampering,
};
