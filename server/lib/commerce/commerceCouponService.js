/**
 * Part 10 — Server-authoritative coupon validation for Commerce Core
 */
const { validateCoupon, normalizeCouponCode } = require("../coupons");
const { validateDiscount } = require("./commerceValidation");
const { logSecurityEvent } = require("../securityLog");
const { isSalesEnabled } = require("../salesMode");

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
  const salesClosed = !isSalesEnabled();
  if (!couponCode || !String(couponCode).trim()) {
    return {
      ok: false,
      status: "UNKNOWN",
      couponStatus: "UNKNOWN",
      code: salesClosed ? "SALES_CLOSED" : "UNKNOWN",
      discount: null,
      arithmeticDiscount: null,
      arithmeticOnly: false,
      couponCode: null,
      normalizedCode: null,
      reasons: salesClosed ? ["SALES_CLOSED", "UNKNOWN"] : ["UNKNOWN"],
      ...commercialSeparation(input),
    };
  }

  const result = validateCoupon(couponCode, subtotal);
  if (!result.valid) {
    const code = salesClosed ? "SALES_CLOSED" : "COUPON_UNVERIFIED";
    return {
      ok: false,
      status: "BLOCKED",
      couponStatus: "BLOCKED",
      code,
      error: result.errorKey || "checkout.couponInvalid",
      statusCode: salesClosed ? 403 : 400,
      discount: null,
      arithmeticDiscount: null,
      arithmeticOnly: false,
      reasons: salesClosed ? ["SALES_CLOSED", "COUPON_UNVERIFIED"] : ["COUPON_UNVERIFIED"],
      ...commercialSeparation(input),
    };
  }

  const discountCheck = validateDiscount(result.discount, subtotal);
  if (!discountCheck.ok) {
    const code = salesClosed ? "SALES_CLOSED" : discountCheck.code;
    return {
      ok: false,
      status: "BLOCKED",
      couponStatus: "BLOCKED",
      code,
      error: discountCheck.code,
      statusCode: salesClosed ? 403 : 400,
      discount: null,
      arithmeticDiscount: null,
      arithmeticOnly: false,
      reasons: salesClosed ? ["SALES_CLOSED", discountCheck.code] : [discountCheck.code],
      ...commercialSeparation(input),
    };
  }

  return {
    ok: true,
    arithmeticOnly: true,
    discount: discountCheck.discount,
    arithmeticDiscount: discountCheck.discount,
    couponCode: result.normalizedCode,
    normalizedCode: result.normalizedCode,
    source: result.source || "server",
    status: "BLOCKED",
    couponStatus: "BLOCKED",
    code: salesClosed ? "SALES_CLOSED" : "COUPON_UNVERIFIED",
    reasons: salesClosed ? ["SALES_CLOSED", "COUPON_UNVERIFIED"] : ["COUPON_UNVERIFIED"],
    ...commercialSeparation(input),
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
