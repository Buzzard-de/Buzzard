/**
 * Pusat runtime foundation — Buzzard-owned, flag-gated.
 * Default OFF. No domain invention. No money/supplier writes.
 */
const crypto = require("crypto");
const { MODE, label } = require("../integrationMode");
const productService = require("../productService");
const inventory = require("../commerce/inventoryIntegration");
const pricing = require("../commerce/pricingIntegration");
const { db } = require("../db");
const { isSotActive, getStatus: getProductSotStatus } = require("../productSot");

const ACTIONS = Object.freeze({
  GET_PRODUCT: "GET_PRODUCT",
  GET_INVENTORY: "GET_INVENTORY",
  GET_PRICE: "GET_PRICE",
  GET_ORDER_STATUS: "GET_ORDER_STATUS",
  GET_SOT_STATUS: "GET_SOT_STATUS",
  GET_SALES_GATE: "GET_SALES_GATE",
  GET_EXCEPTIONS: "GET_EXCEPTIONS",
  PING: "PING",
});

const WRITE_ACTIONS = Object.freeze([
  "SET_PRICE",
  "SET_STOCK",
  "CREATE_SUPPLIER_ORDER",
  "ISSUE_REFUND",
  "UPDATE_PRODUCT",
  "CREATE_ORDER",
  "CAPTURE_PAYMENT",
  "CREATE_SHIPMENT",
]);

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
    deniedWrites: WRITE_ACTIONS,
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

  if (WRITE_ACTIONS.includes(action)) {
    try {
      const exceptions = require("../exceptionBus");
      exceptions.emit({
        type: exceptions.TYPES.PERMISSION_DENIED,
        severity: "HIGH",
        source: "pusat",
        entity: "tool",
        correlationId: corr,
        message: `Pusat write denied: ${action}`,
        retryable: false,
      });
    } catch {
      /* audit best-effort */
    }
    return {
      ok: false,
      code: "PERMISSION_DENIED",
      sotCode: "SOT_WRITE_AUTHORITY_VIOLATION",
      action,
      actorId,
      correlationId: corr,
      ...label(MODE.DISABLED),
    };
  }

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
    const product = productService.getProduct(key) || productService.getProductBySku(key);
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

  if (action === ACTIONS.GET_INVENTORY) {
    const key = payload.id || payload.sku || payload.productId;
    const inv = inventory.getInventory(key);
    if (inv.error) {
      return { ok: false, code: "NOT_FOUND", action, correlationId: corr, ...label(MODE.DRY_RUN) };
    }
    return { ok: true, action, data: inv, source: "D", actorId, correlationId: corr, ...label(MODE.DRY_RUN) };
  }

  if (action === ACTIONS.GET_PRICE) {
    const key = payload.id || payload.sku || payload.productId;
    const quote = pricing.quotePrice({ productId: key, supplierCost: payload.supplierCost });
    if (!quote.productId) {
      return { ok: false, code: "NOT_FOUND", action, correlationId: corr, ...label(MODE.DRY_RUN) };
    }
    return { ok: true, action, data: quote, source: "D", actorId, correlationId: corr, ...label(MODE.DRY_RUN) };
  }

  if (action === ACTIONS.GET_ORDER_STATUS) {
    const key = payload.id || payload.orderId || payload.preparationId;
    if (!key) {
      return { ok: false, code: "INVALID_PAYLOAD", action, correlationId: corr, ...label(MODE.DRY_RUN) };
    }
    const prep = db.prepare("SELECT * FROM order_sot_preparations WHERE id = ?").get(key);
    if (prep) {
      return {
        ok: true,
        action,
        data: { id: prep.id, status: prep.status, mode: prep.mode, sku: prep.sku },
        correlationId: corr,
        ...label(MODE.DRY_RUN),
      };
    }
    const { createCanonicalOrderFacade } = require("../canonicalOrderFacade");
    const lookup = createCanonicalOrderFacade().getOrder(key);
    if (!lookup.ok) {
      return { ok: false, code: "NOT_FOUND", action, correlationId: corr, store: lookup.store, ...label(MODE.DRY_RUN) };
    }
    return {
      ok: true,
      action,
      data: { id: lookup.order.id, status: lookup.order.status, orderType: lookup.order.orderType || lookup.order.order_type },
      store: lookup.store,
      source: lookup.source,
      correlationId: corr,
      ...label(MODE.DRY_RUN),
    };
  }

  if (action === ACTIONS.GET_EXCEPTIONS) {
    const { list } = require("../exceptionBus");
    return {
      ok: true,
      action,
      data: list({ status: payload.status || "OPEN", limit: Number(payload.limit) || 20 }),
      correlationId: corr,
      ...label(MODE.DRY_RUN),
    };
  }

  return { ok: false, code: "NOT_IMPLEMENTED", action, correlationId: corr, ...label(MODE.DISABLED) };
}

module.exports = {
  ACTIONS,
  WRITE_ACTIONS,
  SPECIALISTS,
  isEnabled,
  isHealthy,
  health,
  executeReadOnly,
};
