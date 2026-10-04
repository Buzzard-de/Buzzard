"use strict";

const GROUPS = Object.freeze([
  "CORE",
  "COMMERCE",
  "PRODUCT",
  "ORDER",
  "AVAILABILITY",
  "PRICE",
  "SOT",
  "SUPPLIER",
  "MARKETPLACE",
  "PAYMENT",
  "TAX",
  "SHIPPING",
  "FULFILLMENT",
  "RETURNS",
  "SECURITY",
  "AUTH",
  "RBAC",
  "AUDIT",
  "CORRELATION",
  "IDEMPOTENCY",
  "CONCURRENCY",
  "AI",
  "PUSAT",
  "CONTROL_CENTER",
  "I18N",
  "MARKET",
  "CATEGORY",
  "SEARCH",
  "CART",
  "CHECKOUT",
  "CUSTOMER",
  "ADMIN",
  "HEALTH",
  "DATABASE",
  "DEPLOYMENT",
  "GO_LIVE",
  "PRODUCTION_SAFETY",
]);

const SCRIPTS = Object.freeze({
  typecheck: "typecheck",
  lint: "lint",
  build: "build",
  unitCi: "test:unit:ci",
  sot: "test:sot",
  external: "test:external-integrations",
  goLive: "test:go-live",
  productionSafety: "test:production-safety",
  security: "test:part3",
  smoke: "test:smoke",
  rbac: "test:rbac-audit",
  productionDb: "test:production-db",
  e2e: "test:e2e",
});

const INVARIANTS = Object.freeze([
  "Product SoT owner = product_engine",
  "Order SoT owner = order_engine",
  "Availability SoT owner = availability_engine",
  "Price SoT owner = pricing_engine",
  "No external system directly owns a SoT",
  "Pusat cannot bypass domain owners",
  "AI cannot directly mutate SoT",
  "Supplier cannot directly overwrite Product/Availability/Price SoT",
  "Marketplace cannot directly overwrite Product/Price/Availability SoT",
  "No duplicate payment",
  "No duplicate supplier order",
  "No oversell",
  "No blind retry of non-idempotent writes",
  "No production write during regression",
  "Sales remain locked when Go-Live requirements are incomplete",
  "Production activation requires human approval",
  "Kill switch can lock production",
  "No secret/PII leakage",
]);

function safetyFromEnv(env = process.env) {
  return {
    PRODUCT_SOT_ACTIVE: env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" ? "ON" : "OFF",
    SALES_LOCKED: env.BUZZARD_SALES_ENABLED !== "1" ? "YES" : "NO",
    SUPPLIER_ORDER_EXECUTION: env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1" ? "ON" : "OFF",
    PAYMENT_EXECUTION: env.BUZZARD_PAYMENT_LIVE === "1" ? "ON" : "OFF",
    MARKETPLACE_WRITE: "OFF",
    PRODUCTION_WRITES: "NOT_EXECUTED",
  };
}

function assertLockedSafety(env = process.env) {
  const safety = safetyFromEnv(env);
  if (safety.PRODUCT_SOT_ACTIVE !== "OFF") throw new Error("PRODUCT_SOT_ACTIVE_MUST_STAY_OFF");
  if (safety.SALES_LOCKED !== "YES") throw new Error("SALES_MUST_STAY_LOCKED");
  if (safety.SUPPLIER_ORDER_EXECUTION !== "OFF") throw new Error("SUPPLIER_ORDERS_MUST_STAY_OFF");
  if (safety.PAYMENT_EXECUTION !== "OFF") throw new Error("PAYMENT_MUST_STAY_OFF");
  if (safety.MARKETPLACE_WRITE !== "OFF") throw new Error("MARKETPLACE_WRITE_MUST_STAY_OFF");
  if (safety.PRODUCTION_WRITES !== "NOT_EXECUTED") throw new Error("PRODUCTION_WRITES_EXECUTED");
  return safety;
}

function createFinalRegressionManifest(options = {}) {
  const env = options.env || process.env;
  return Object.freeze({
    groups: GROUPS,
    scripts: SCRIPTS,
    invariants: INVARIANTS,
    safety: safetyFromEnv(env),
    expectedGoLive: "BLOCKED",
    expectedActivation: "NOT_EXECUTED",
  });
}

module.exports = {
  GROUPS,
  SCRIPTS,
  INVARIANTS,
  safetyFromEnv,
  assertLockedSafety,
  createFinalRegressionManifest,
};
