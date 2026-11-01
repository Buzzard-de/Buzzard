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
const { createIdempotencyService } = require("./idempotencyService");
const { roster } = require("./council");
const { createDurable } = require("./durable");
const { TOPICS } = require("./doguResearch");

let pusatIdempotency = null;

function getIdempotencyService() {
  if (!pusatIdempotency) {
    pusatIdempotency = createIdempotencyService(db);
  }
  return pusatIdempotency;
}

const ACTIONS = Object.freeze({
  GET_PRODUCT: "GET_PRODUCT",
  GET_INVENTORY: "GET_INVENTORY",
  GET_PRICE: "GET_PRICE",
  GET_ORDER_STATUS: "GET_ORDER_STATUS",
  GET_SOT_STATUS: "GET_SOT_STATUS",
  GET_SALES_GATE: "GET_SALES_GATE",
  GET_EXCEPTIONS: "GET_EXCEPTIONS",
  PING: "PING",
  GET_COUNCIL: "GET_COUNCIL",
  OPEN_MEETING: "OPEN_MEETING",
  REPORT_MEETING: "REPORT_MEETING",
  CLOSE_MEETING: "CLOSE_MEETING",
  MEMORY_PUT: "MEMORY_PUT",
  MEMORY_GET: "MEMORY_GET",
  RESEARCH_REQUEST: "RESEARCH_REQUEST",
  RESEARCH_COMPLETE: "RESEARCH_COMPLETE",
  LIST_TRADE_HOLDS: "LIST_TRADE_HOLDS",
});

const CONTROL_ACTIONS = Object.freeze([
  ACTIONS.GET_COUNCIL,
  ACTIONS.OPEN_MEETING,
  ACTIONS.REPORT_MEETING,
  ACTIONS.CLOSE_MEETING,
  ACTIONS.MEMORY_PUT,
  ACTIONS.MEMORY_GET,
  ACTIONS.RESEARCH_REQUEST,
  ACTIONS.RESEARCH_COMPLETE,
  ACTIONS.LIST_TRADE_HOLDS,
]);

let durable = null;
function getDurable() {
  if (!durable) durable = createDurable(db);
  return durable;
}

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
    councilMembers: roster().length,
    controlActions: CONTROL_ACTIONS,
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
    const order = db.prepare("SELECT id, status, order_type FROM commerce_orders WHERE id = ?").get(key);
    if (!order) {
      return { ok: false, code: "NOT_FOUND", action, correlationId: corr, ...label(MODE.DRY_RUN) };
    }
    return { ok: true, action, data: order, correlationId: corr, ...label(MODE.DRY_RUN) };
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

  if (CONTROL_ACTIONS.includes(action)) {
    return executeControl(action, payload, { actorId, correlationId: corr });
  }

  return { ok: false, code: "NOT_IMPLEMENTED", action, correlationId: corr, ...label(MODE.DISABLED) };
}

function executeControl(action, payload, { actorId, correlationId }) {
  const store = getDurable();
  if (action === ACTIONS.GET_COUNCIL) {
    return { ok: true, action, data: roster(), actorId, correlationId, ...label(MODE.DRY_RUN) };
  }
  if (action === ACTIONS.OPEN_MEETING) {
    return { ok: true, action, data: store.openMeeting(payload), actorId, correlationId, ...label(MODE.DRY_RUN) };
  }
  if (action === ACTIONS.REPORT_MEETING) {
    return {
      ok: true,
      action,
      data: store.addMeetingEvent({
        meetingId: payload.meetingId,
        kind: "report",
        speakerId: payload.speakerId || actorId,
        payload,
      }),
      correlationId,
      ...label(MODE.DRY_RUN),
    };
  }
  if (action === ACTIONS.CLOSE_MEETING) {
    return { ok: true, action, data: store.closeMeeting(payload.meetingId), correlationId, ...label(MODE.DRY_RUN) };
  }
  if (action === ACTIONS.MEMORY_PUT) {
    return {
      ok: true,
      action,
      data: store.putMemory({
        ownerId: payload.ownerId || actorId,
        key: payload.key,
        value: payload.value,
      }),
      correlationId,
      ...label(MODE.DRY_RUN),
    };
  }
  if (action === ACTIONS.MEMORY_GET) {
    return {
      ok: true,
      action,
      data: store.getMemory({
        ownerId: payload.ownerId,
        requesterId: payload.requesterId || actorId,
      }),
      correlationId,
      ...label(MODE.DRY_RUN),
    };
  }
  if (action === ACTIONS.RESEARCH_REQUEST) {
    if (!TOPICS.includes(payload.topic)) {
      return { ok: false, code: "UNKNOWN_TOPIC", action, correlationId, ...label(MODE.DRY_RUN) };
    }
    return {
      ok: true,
      action,
      data: store.requestResearch({
        fromId: payload.fromId || actorId,
        topic: payload.topic,
        question: payload.question,
      }),
      correlationId,
      ...label(MODE.DRY_RUN),
    };
  }
  if (action === ACTIONS.RESEARCH_COMPLETE) {
    return {
      ok: true,
      action,
      data: store.completeResearch({
        requestId: payload.requestId,
        findings: payload.findings,
        sources: payload.sources,
      }),
      correlationId,
      ...label(MODE.DRY_RUN),
    };
  }
  if (action === ACTIONS.LIST_TRADE_HOLDS) {
    return { ok: true, action, data: store.listHolds(), correlationId, ...label(MODE.DRY_RUN) };
  }
  return { ok: false, code: "NOT_IMPLEMENTED", action, correlationId, ...label(MODE.DISABLED) };
}

/**
 * Optional idempotent wrapper around read-only dispatch.
 * Does not enable writes, sales, or exclusive SoT.
 */
async function dispatch({
  action,
  payload = {},
  actorId = null,
  correlationId = null,
  idempotencyKey = null,
} = {}) {
  const run = () => executeReadOnly(action, payload, { actorId, correlationId });
  if (!idempotencyKey) {
    const result = run();
    return { replayed: false, result };
  }
  const outcome = await getIdempotencyService().execute({
    operation: "PUSAT_DISPATCH",
    idempotencyKey,
    payload: { action, payload },
    correlationId,
    actorId,
    execute: async () => run(),
  });
  return {
    replayed: Boolean(outcome.replayed),
    result: outcome.result,
    idempotency: {
      status: outcome.status,
      operation: outcome.operation,
      idempotencyKey: outcome.idempotencyKey,
    },
  };
}

module.exports = {
  ACTIONS,
  WRITE_ACTIONS,
  CONTROL_ACTIONS,
  SPECIALISTS,
  getDurable,
  isEnabled,
  isHealthy,
  health,
  executeReadOnly,
  dispatch,
  getIdempotencyService,
};
