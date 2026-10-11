/**
 * Pusat Orchestrator — shared constants.
 * Additive only; does not replace TASK_STATUS from core/constants.
 */

const { TASK_STATUS, TASK_PRIORITY, RISK_LEVEL } = require("../../core/constants");

const PUSAT_VERSION = "1.0.0";

const AGENT_CODES = Object.freeze({
  PRICE: "price_assistant",
  STOCK: "stock_assistant",
  SEO: "seo_assistant",
  CUSTOMER: "customer_assistant",
  SALES: "sales_assistant",
  CATEGORY: "category_assistant",
  PRODUCT: "product_assistant",
  ORDER: "order_assistant",
  DOGU_BEY: "dogu_bey",
  ESAT_BEY: "esat_bey",
  ASLAN_BEY: "aslan_bey",
  SUPPLIER: "supplier_assistant",
  CUSTOMS: "customs_assistant",
  RETURNS: "returns_assistant",
  SHIPPING: "shipping_assistant",
  MARKETPLACE: "marketplace_assistant",
  LOCALIZATION: "localization_assistant",
  SOFTWARE_HEALTH: "software_health_assistant",
});

const MEMORY_KIND = Object.freeze({
  VERIFIED_FACT: "verified_fact",
  UNVERIFIED_OBSERVATION: "unverified_observation",
  TEMPORARY_TASK_STATE: "temporary_task_state",
  DERIVED_ANALYSIS: "derived_analysis",
  HISTORICAL_RECORD: "historical_record",
});

const APPROVAL_STATUS = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
  EXECUTION_FAILED: "EXECUTION_FAILED",
});

const EXCEPTION_STATUS = Object.freeze({
  OPEN: "OPEN",
  RETRYING: "RETRYING",
  RECOVERED: "RECOVERED",
  ESCALATED: "ESCALATED",
  DEAD_LETTER: "DEAD_LETTER",
});

const EXCEPTION_CODES = Object.freeze({
  TASK_NOT_FOUND: "PUSAT_TASK_NOT_FOUND",
  TASK_TIMEOUT: "PUSAT_TASK_TIMEOUT",
  AGENT_UNAVAILABLE: "PUSAT_AGENT_UNAVAILABLE",
  PERMISSION_DENIED: "PUSAT_PERMISSION_DENIED",
  GUARDIAN_BLOCKED: "PUSAT_GUARDIAN_BLOCKED",
  APPROVAL_REQUIRED: "PUSAT_APPROVAL_REQUIRED",
  APPROVAL_INVALID: "PUSAT_APPROVAL_INVALID",
  INPUT_CHANGED: "PUSAT_INPUT_CHANGED",
  VALIDATION_FAILED: "PUSAT_VALIDATION_FAILED",
  MISSING_COST: "PUSAT_MISSING_COST",
  STOCK_UNCONFIRMED: "PUSAT_STOCK_UNCONFIRMED",
  SALES_LOCKED: "PUSAT_SALES_LOCKED",
  IDEMPOTENT_REPLAY: "PUSAT_IDEMPOTENT_REPLAY",
  PROVIDER_UNAVAILABLE: "PUSAT_PROVIDER_UNAVAILABLE",
  SENSITIVE_NO_RETRY: "PUSAT_SENSITIVE_NO_RETRY",
  DATABASE_FAILURE: "PUSAT_DATABASE_FAILURE",
  UNKNOWN: "PUSAT_UNKNOWN",
});

const SENSITIVE_ACTIONS = Object.freeze([
  "payment.charge",
  "payment.capture",
  "payment.refund",
  "purchase.supplier",
  "order.create",
  "order.cancel",
  "refund.issue",
  "supplier.order.submit",
  "marketplace.publish",
  "customer.message.send",
  "product.activate",
  "prices.update",
  "orders.write",
]);

const BLOCKED_MEMORY_KEYS = Object.freeze([
  "password",
  "secret",
  "token",
  "api_key",
  "apikey",
  "authorization",
  "credit_card",
  "card_number",
  "cvv",
  "iban",
  "private_key",
]);

const DEFAULT_TASK_TIMEOUT_MS = 30_000;
const DEFAULT_APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MEMORY_TTL_MS = {
  [MEMORY_KIND.TEMPORARY_TASK_STATE]: 7 * 24 * 60 * 60 * 1000,
  [MEMORY_KIND.UNVERIFIED_OBSERVATION]: 30 * 24 * 60 * 60 * 1000,
  [MEMORY_KIND.DERIVED_ANALYSIS]: 90 * 24 * 60 * 60 * 1000,
};

const MIN_NET_PROFIT_EUR = 0.5;
const MARKET_UNDERCUT_EUR = 0.1;
const MARKET_UNDERCUT_IMPLEMENTED = false;

const RETRY_BACKOFF_MS = Object.freeze([1_000, 5_000, 15_000]);

module.exports = {
  PUSAT_VERSION,
  AGENT_CODES,
  MEMORY_KIND,
  APPROVAL_STATUS,
  EXCEPTION_STATUS,
  EXCEPTION_CODES,
  SENSITIVE_ACTIONS,
  BLOCKED_MEMORY_KEYS,
  DEFAULT_TASK_TIMEOUT_MS,
  DEFAULT_APPROVAL_TTL_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_MEMORY_TTL_MS,
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
  MARKET_UNDERCUT_IMPLEMENTED,
  RETRY_BACKOFF_MS,
  TASK_STATUS,
  TASK_PRIORITY,
  RISK_LEVEL,
};
