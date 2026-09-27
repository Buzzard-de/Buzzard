/**
 * Pusat runtime foundation — Buzzard-owned, flag-gated.
 * Default OFF. No domain invention. No money/supplier writes.
 */
const crypto = require("crypto");
const { MODE, label } = require("../integrationMode");
const productCore = require("../pim/productCore");
const { isSotActive, getStatus: getProductSotStatus } = require("../productSot");

const ACTIONS = Object.freeze({
  GET_PRODUCT: "GET_PRODUCT",
  GET_SOT_STATUS: "GET_SOT_STATUS",
  GET_SALES_GATE: "GET_SALES_GATE",
  PING: "PING",
});

const SPECIALISTS = Object.freeze([
  "price",
  "stock",
  "seo",
  "customer",
  "sales",
  "category",
  "supplier",
  "marketplace",
  "product",
  "returns",
  "customs",
  "security",
]);

function isEnabled() {
  return process.env.PUSAT_RUNTIME_ENABLED === "1";
}

function isHealthy() {
  return isEnabled();
}

function health() {
  return {
    name: "pusat",
    enabled: isEnabled(),
    healthy: isHealthy(),
    envHealthyFlag: process.env.PUSAT_RUNTIME_HEALTHY === "1",
    ...label(isEnabled() ? MODE.DRY_RUN : MODE.DISABLED),
    specialists: SPECIALISTS,
    writeActions: [],
    productSot: getProductSotStatus(),
  };
}

function executeReadOnly(action, payload = {}, { actorId = null, correlationId = null } = {}) {
  if (!isEnabled()) {
    return {
      ok: false,
      code: "PUSAT_DISABLED",
      action,
      ...label(MODE.DISABLED),
    };
  }

  const corr = correlationId || `pusat_${crypto.randomBytes(6).toString("hex")}`;

  if (action === ACTIONS.PING) {
    return { ok: true, action, correlationId: corr, ...label(MODE.DRY_RUN) };
  }

  if (action === ACTIONS.GET_SOT_STATUS) {
    return { ok: true, action, data: getProductSotStatus(), correlationId: corr, ...label(MODE.DRY_RUN) };
  }

  if (action === ACTIONS.GET_SALES_GATE) {
    const { evaluateSalesGate } = require("../salesSafetyGate");
    return { ok: true, action, data: evaluateSalesGate(), correlationId: corr, ...label(MODE.DRY_RUN) };
  }

  if (action === ACTIONS.GET_PRODUCT) {
    const key = payload.id || payload.sku;
    if (!key) {
      return { ok: false, code: "INVALID_PAYLOAD", action, correlationId: corr, ...label(MODE.DRY_RUN) };
    }
    const product = productCore.getProduct(key);
    if (!product) {
      return {
        ok: false,
        code: "NOT_FOUND",
        action,
        correlationId: corr,
        mappingStatus: "UNMAPPED",
        sotActive: isSotActive(),
        ...label(MODE.DRY_RUN),
      };
    }
    return {
      ok: true,
      action,
      data: {
        id: product.id,
        sku: product.sku,
        title: product.title,
        status: product.status,
        visibility: product.visibility,
        stock: product.stock,
        price: product.price,
      },
      source: "D",
      mappingStatus: "CANDIDATE",
      sotActive: isSotActive(),
      actorId,
      correlationId: corr,
      ...label(MODE.DRY_RUN),
    };
  }

  return { ok: false, code: "NOT_IMPLEMENTED", action, correlationId: corr, ...label(MODE.DISABLED) };
}

module.exports = {
  ACTIONS,
  SPECIALISTS,
  isEnabled,
  isHealthy,
  health,
  executeReadOnly,
};
