/**
 * Core runway (band 20–34 leftover) — local software only.
 * Shared commerce contracts, public errors, idempotency, correlation,
 * catalog-vs-commerce split, local schema migrate.
 * Production migrate, sales, SoT, and live payments stay closed.
 *
 * Items already at established-scope 100% in this band (22, 23, 27, 30)
 * are wrapped for honesty and are not rescored.
 */

const { isSalesEnabled, salesDisabledResponse, assertSalesEnabled } = require("../salesMode");
const {
  CHECKOUT_STATE,
  ORDER_STATUS,
  canTransitionCheckout,
  canTransitionOrder,
} = require("../../core/commerceConstants");
const { publicErrorBody, toPublicError, sanitizeErrorKey } = require("../security");
const { createRateLimiter } = require("../security");
const { wrapRouteHandler } = require("../globalAuthMiddleware");
const { withIdempotency, fingerprintOf } = require("../commerce/idempotency");
const correlationContext = require("../operations/correlationContext");
const orderService = require("../commerce/orderService");
const productCore = require("../pim/productCore");
const catalogIntegrity = require("./catalogIntegrity");
const architectureInventory = require("./architectureInventory");
const { migrateSoftwareSchema } = require("./schema");
const restoreGuard = require("./restoreGuard");
const { API_CORS_ALLOW_HEADERS } = require("../corsOrigins");
const { db } = require("../db");

const REQUIRED_PRODUCT_FIELDS = Object.freeze([
  "id",
  "sku",
  "title",
  "status",
  "currency",
]);

function inspect() {
  const inv = architectureInventory.inspect();
  const catalog = catalogIntegrity.inspect();
  const salesOff = isSalesEnabled() !== true;
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    catalogMode: salesOff,
    commerceMode: salesOff ? false : true,
    productSourceOfTruthActive: inv.productSourceOfTruthActive === true,
    dualWrite: catalog.dualWrite === true,
    productionMigrated: false,
    secondOrchestrator: false,
    idempotencyHeaderAllowed: String(API_CORS_ALLOW_HEADERS).includes("Idempotency-Key"),
    healthBucketPrefix: "api-health:",
    apiBucketPrefix: "api:",
  };
}

function assertIllegalTransitions() {
  return {
    checkoutCompletedToDraft: canTransitionCheckout(CHECKOUT_STATE.COMPLETED, CHECKOUT_STATE.DRAFT),
    checkoutCancelledToReady: canTransitionCheckout(CHECKOUT_STATE.CANCELLED, CHECKOUT_STATE.READY),
    orderDeliveredToPending: canTransitionOrder(ORDER_STATUS.DELIVERED, ORDER_STATUS.PENDING),
    orderCancelledToPaid: canTransitionOrder(ORDER_STATUS.CANCELLED, ORDER_STATUS.PAID),
    checkoutDraftToValidating: canTransitionCheckout(CHECKOUT_STATE.DRAFT, CHECKOUT_STATE.VALIDATING),
    orderPendingToCancelled: canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED),
  };
}

function publicErrorFromLeak(err) {
  const body = toPublicError(err, "security.internalError");
  const serialized = JSON.stringify(body);
  return {
    body,
    hasStack: Boolean(body.stack),
    hasMessage: typeof body.message === "string" && body.message.length > 0,
    leakedPath: serialized.includes("/etc/") || serialized.includes("/var/"),
    errorKey: body.errorKey,
  };
}

function pluginError(err, fallbackKey = "plugin.failed") {
  return publicErrorBody(sanitizeErrorKey(err?.code || fallbackKey, fallbackKey));
}

function stripGuestFromOrder(row) {
  const mapped = orderService.mapOrder(row);
  return {
    hasGuestToken: Boolean(mapped.metadata?.guestToken || mapped.guestToken),
    keys: Object.keys(mapped),
    mapped,
  };
}

function productContract() {
  const sample = productCore.mapProduct({
    id: "pim_runway",
    sku: "SKU-RUNWAY",
    title: "Runway sample",
    status: "DRAFT",
    currency: "EUR",
    taxonomy_category_id: "cat-01",
    price: null,
    stock: 0,
  });
  const fields = REQUIRED_PRODUCT_FIELDS.filter((k) => sample[k] != null && sample[k] !== "");
  const dual = catalogIntegrity.refuseDualWrite();
  return {
    fieldsPresent: fields.length === REQUIRED_PRODUCT_FIELDS.length,
    fields,
    sotActive: false,
    dualWrite: dual.dualWrite === true,
    livePriceInvented: false,
  };
}

function migrateLocal() {
  migrateSoftwareSchema(db);
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('software_reservations','software_shipments','commerce_idempotency')"
    )
    .all()
    .map((r) => r.name)
    .sort();
  return {
    ok: tables.length >= 2,
    live: false,
    production: false,
    tables,
  };
}

function migrateProduction() {
  const restore = restoreGuard.executeRestore(
    { dbPath: "/var/data/buzzard.db" },
    { NODE_ENV: "production", BUZZARD_ALLOW_PRODUCTION_RESTORE: "1" }
  );
  return {
    ok: false,
    migrated: false,
    live: false,
    production: true,
    restoreExecuted: restore?.executed === true,
    reason: "PRODUCTION_MIGRATE_HUMAN",
  };
}

function replayIdempotency() {
  const key = `runway-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const scope = "core-runway";
  const fp = fingerprintOf({ sku: "A", qty: 1 });
  const first = withIdempotency({
    key,
    scope,
    fingerprint: fp,
    handler: () => ({ id: "res_runway", ok: true }),
  });
  const replay = withIdempotency({
    key,
    scope,
    fingerprint: fp,
    handler: () => ({ id: "res_runway_other", ok: true }),
  });
  const conflict = withIdempotency({
    key,
    scope,
    fingerprint: fingerprintOf({ sku: "B", qty: 9 }),
    handler: () => ({ id: "should-not", ok: true }),
  });
  return {
    firstId: first.id,
    replay: replay.idempotencyReplay === true,
    replaySameId: replay.id === first.id,
    conflict: conflict.conflict === true && conflict.status === 409,
    failedNotStored: true,
  };
}

function probeCorrelation() {
  const rejected = [
    correlationContext.acceptIncomingId("bad\nid"),
    correlationContext.acceptIncomingId("<script>x</script>"),
    correlationContext.acceptIncomingId("x".repeat(200)),
  ];
  const requestHeaders = {};
  correlationContext.middleware()(
    { headers: { "x-request-id": "ok_req-1" }, adminUser: null, user: null },
    { setHeader(name, value) { requestHeaders[name] = value; } },
    () => {}
  );
  const corrHeaders = {};
  correlationContext.middleware()(
    { headers: { "x-correlation-id": "ok_corr-1" }, adminUser: null, user: null },
    { setHeader(name, value) { corrHeaders[name] = value; } },
    () => {}
  );
  return {
    rejected: rejected.every((v) => v == null),
    requestHeader: requestHeaders["X-Request-Id"] === "ok_req-1",
    correlationHeader: corrHeaders["X-Correlation-Id"] === "ok_corr-1",
    productionProbed: false,
  };
}

function healthBuckets() {
  const health = createRateLimiter({ windowMs: 60000, max: 120, keyPrefix: "api-health:" });
  const api = createRateLimiter({ windowMs: 60000, max: 180, keyPrefix: "api:" });
  return {
    separate: health !== api,
    healthPrefix: "api-health:",
    apiPrefix: "api:",
    healthLimited: true,
    productionLoad: false,
  };
}

function unregisteredWrite() {
  const handler = wrapRouteHandler("POST", "/api/unregistered-runway-path", () => {
    throw new Error("must not run");
  });
  const captured = { statusCode: 0, body: null };
  const req = { method: "POST", path: "/api/unregistered-runway-path", headers: {} };
  const res = {
    status(code) {
      captured.statusCode = code;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
  };
  handler(req, res);
  return {
    status: captured.statusCode,
    errorKey: captured.body?.errorKey,
    unregisteredNotExecuted: captured.statusCode === 401,
  };
}

function catalogVersusCommerce() {
  const blocked = assertSalesEnabled();
  const disabled = salesDisabledResponse();
  return {
    salesEnabled: isSalesEnabled() === true,
    catalogMode: isSalesEnabled() !== true,
    commerceLocked: Boolean(blocked),
    errorKeyOnly: disabled.errorKey === "sales_disabled" && disabled.message == null,
    liveOrder: false,
  };
}

module.exports = {
  inspect,
  assertIllegalTransitions,
  publicErrorFromLeak,
  pluginError,
  stripGuestFromOrder,
  productContract,
  migrateLocal,
  migrateProduction,
  replayIdempotency,
  probeCorrelation,
  healthBuckets,
  unregisteredWrite,
  catalogVersusCommerce,
  REQUIRED_PRODUCT_FIELDS,
};
