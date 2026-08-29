/** Part 8 — Commerce Core constants (category-agnostic) */

const CHECKOUT_STATE = Object.freeze({
  DRAFT: "DRAFT",
  VALIDATING: "VALIDATING",
  READY: "READY",
  BLOCKED: "BLOCKED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_AUTHORIZED: "PAYMENT_AUTHORIZED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

const CHECKOUT_TRANSITIONS = Object.freeze({
  DRAFT: new Set(["VALIDATING", "CANCELLED"]),
  VALIDATING: new Set(["READY", "BLOCKED", "FAILED", "CANCELLED"]),
  READY: new Set(["PAYMENT_PENDING", "BLOCKED", "CANCELLED"]),
  BLOCKED: new Set(["DRAFT", "CANCELLED"]),
  PAYMENT_PENDING: new Set(["PAYMENT_AUTHORIZED", "FAILED", "CANCELLED"]),
  PAYMENT_AUTHORIZED: new Set(["COMPLETED", "FAILED"]),
  COMPLETED: new Set([]),
  FAILED: new Set(["DRAFT", "CANCELLED"]),
  CANCELLED: new Set([]),
});

const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  FULFILLING: "FULFILLING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
});

const ORDER_TRANSITIONS = Object.freeze({
  PENDING: new Set(["CONFIRMED", "PAYMENT_PENDING", "CANCELLED", "FAILED"]),
  CONFIRMED: new Set(["PROCESSING", "CANCELLED"]),
  PAYMENT_PENDING: new Set(["PAID", "FAILED", "CANCELLED"]),
  PAID: new Set(["PROCESSING", "REFUNDED"]),
  PROCESSING: new Set(["FULFILLING", "CANCELLED"]),
  FULFILLING: new Set(["SHIPPED", "CANCELLED"]),
  SHIPPED: new Set(["DELIVERED"]),
  DELIVERED: new Set(["REFUNDED"]),
  CANCELLED: new Set([]),
  REFUNDED: new Set([]),
  FAILED: new Set([]),
});

const ORDER_TYPE = Object.freeze({
  DRY_RUN: "DRY_RUN",
  TEST_ORDER: "TEST_ORDER",
  READINESS_TEST: "READINESS_TEST",
  COMMERCIAL: "COMMERCIAL",
});

const PAYMENT_STATUS = Object.freeze({
  NONE: "NONE",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
});

const READINESS_STATUS = Object.freeze({
  PASS: "PASS",
  WARNING: "WARNING",
  FAIL: "FAIL",
  UNKNOWN: "UNKNOWN",
});

const READINESS_OVERALL = Object.freeze({
  READY: "READY",
  NOT_READY: "NOT_READY",
  BLOCKED: "BLOCKED",
});

const APPROVAL_ACTION = Object.freeze({
  PAYMENT: "PAYMENT",
  ORDER: "ORDER",
  SUPPLIER_ORDER: "SUPPLIER_ORDER",
  REFUND: "REFUND",
  PRICE_OVERRIDE: "PRICE_OVERRIDE",
  GO_LIVE: "GO_LIVE",
});

const MAX_CART_QUANTITY = 99;
const MAX_CART_ITEMS = 50;

function canTransitionCheckout(from, to) {
  if (!from || !to) return false;
  return CHECKOUT_TRANSITIONS[from]?.has(to) === true;
}

function canTransitionOrder(from, to) {
  if (!from || !to) return false;
  return ORDER_TRANSITIONS[from]?.has(to) === true;
}

function isCommercialOrderType(type) {
  return type === ORDER_TYPE.COMMERCIAL;
}

function isCommerceCoreEnabled() {
  return process.env.BUZZARD_COMMERCE_CORE !== "0";
}

module.exports = {
  CHECKOUT_STATE,
  CHECKOUT_TRANSITIONS,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  ORDER_TYPE,
  PAYMENT_STATUS,
  READINESS_STATUS,
  READINESS_OVERALL,
  APPROVAL_ACTION,
  MAX_CART_QUANTITY,
  MAX_CART_ITEMS,
  canTransitionCheckout,
  canTransitionOrder,
  isCommercialOrderType,
  isCommerceCoreEnabled,
};
