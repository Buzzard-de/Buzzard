/**
 * Automotive Production Integration — supplier connector manager.
 */
const { getSupplier } = require("./integrationRegistry");
const { canCallRealSupplier } = require("./productionSafety");
const { PRODUCTION_CONFIG } = require("./productionConfig");
const { productionError } = require("./productionErrors");
const {
  checkRateLimit,
  isCircuitOpen,
  recordCircuitSuccess,
  recordCircuitFailure,
  withRetry,
} = require("./integrationUtils");
const { recordIntegrationAudit } = require("./integrationAudit");

const MOCK_PRODUCTS = Object.freeze([
  {
    externalProductId: "MOCK-001",
    supplierSku: "MOCK-001",
    title: "Mock Brake Pad Set",
    brand: "Bosch",
    mpn: "0986494150",
    gtin: "5901234123457",
    category: "Brakes",
    price: 45.99,
    currency: "EUR",
    stock: 12,
  },
]);

function buildConnectorInterface(base) {
  return {
    id: base.id,
    name: base.name,
    country: base.country,
    type: base.type,
    capabilities: base.capabilities,
    status: base.status || "READY",
    mode: base.mode,
    connect: base.connect,
    healthCheck: base.healthCheck,
    fetchProducts: base.fetchProducts,
    fetchProductById: base.fetchProductById,
    fetchStock: base.fetchStock,
    fetchPrice: base.fetchPrice,
    createOrder: base.createOrder,
    cancelOrder: base.cancelOrder,
    getOrderStatus: base.getOrderStatus,
    getTracking: base.getTracking,
  };
}

function createMockSupplierConnector(supplierId = "supplier-mock") {
  const supplier = getSupplier(supplierId) || { id: supplierId, name: "Mock", country: "DE", type: "REST" };
  return buildConnectorInterface({
    ...supplier,
    mode: "mock",
    status: "MOCK",
    connect: async () => ({ ok: true, mode: "mock" }),
    healthCheck: async () => ({ ok: true, mode: "mock", live: false }),
    fetchProducts: async (opts = {}) => ({
      ok: true,
      mode: "mock",
      liveCalls: 0,
      products: MOCK_PRODUCTS,
      updatedSince: opts.updatedSince || null,
    }),
    fetchProductById: async (id) => ({
      ok: true,
      mode: "mock",
      product: MOCK_PRODUCTS.find((p) => p.supplierSku === id) || null,
    }),
    fetchStock: async (id) => ({
      ok: true,
      mode: "mock",
      stock: { supplierSku: id, supplierStock: 12, availableStock: 10, status: "IN_STOCK" },
    }),
    fetchPrice: async (id) => ({
      ok: true,
      mode: "mock",
      price: { supplierSku: id, purchasePrice: 45.99, currency: "EUR" },
    }),
    createOrder: async () => productionError("ORDER_LIVE_DISABLED", "Mock connector cannot create live orders"),
    cancelOrder: async () => ({ ok: false, code: "ORDER_LIVE_DISABLED" }),
    getOrderStatus: async () => ({ ok: true, mode: "mock", status: "DRY_RUN" }),
    getTracking: async () => ({ ok: true, mode: "mock", tracking: null }),
  });
}

function createDryRunSupplierConnector(supplierId = "supplier-example") {
  const supplier = getSupplier(supplierId) || { id: supplierId, name: "DryRun", country: "DE", type: "API" };
  return buildConnectorInterface({
    ...supplier,
    mode: "dry_run",
    status: "DRY_RUN",
    connect: async () => ({ ok: true, mode: "dry_run", liveCalls: 0 }),
    healthCheck: async () => ({ ok: true, mode: "dry_run", live: false }),
    fetchProducts: async () => ({ ok: true, mode: "dry_run", liveCalls: 0, products: [], source: "DRY_RUN" }),
    fetchProductById: async (id) => ({ ok: true, mode: "dry_run", id, product: null, liveCalls: 0 }),
    fetchStock: async () => ({ ok: true, mode: "dry_run", stock: { status: "UNKNOWN" }, liveCalls: 0 }),
    fetchPrice: async () => ({ ok: true, mode: "dry_run", price: null, liveCalls: 0 }),
    createOrder: async () => productionError("ORDER_LIVE_DISABLED", "Dry-run connector — no live orders"),
    cancelOrder: async () => ({ ok: false, code: "ORDER_LIVE_DISABLED" }),
    getOrderStatus: async () => ({ ok: false, code: "ORDER_LIVE_DISABLED" }),
    getTracking: async () => ({ ok: false, code: "ORDER_LIVE_DISABLED" }),
  });
}

function createRealSupplierConnector(supplierId) {
  const supplier = getSupplier(supplierId);
  const blocked = () => productionError("SUPPLIER_LIVE_DISABLED", "Real supplier calls blocked by safety gate");
  return buildConnectorInterface({
    id: supplierId,
    name: supplier?.name || supplierId,
    country: supplier?.country || "DE",
    type: supplier?.type || "API",
    capabilities: supplier?.capabilities || {},
    mode: "real",
    status: "BLOCKED",
    connect: async () => (canCallRealSupplier() ? blocked() : blocked()),
    healthCheck: async () => blocked(),
    fetchProducts: async () => blocked(),
    fetchProductById: async () => blocked(),
    fetchStock: async () => blocked(),
    fetchPrice: async () => blocked(),
    createOrder: async () => blocked(),
    cancelOrder: async () => blocked(),
    getOrderStatus: async () => blocked(),
    getTracking: async () => blocked(),
  });
}

function createSupplierConnector(supplierId, options = {}) {
  const supplier = getSupplier(supplierId);
  const mode = options.mode || (supplier?.mock ? "mock" : supplier?.dryRun !== false ? "dry_run" : "mock");

  if (mode === "real") return createRealSupplierConnector(supplierId);
  if (mode === "dry_run") return createDryRunSupplierConnector(supplierId);
  return createMockSupplierConnector(supplierId);
}

async function executeSupplierOperation(supplierId, operation, fn, context = {}) {
  const circuitName = `supplier:${supplierId}`;
  if (isCircuitOpen(circuitName)) {
    return productionError("CIRCUIT_OPEN", "Supplier circuit breaker open", { stage: operation });
  }

  const rate = checkRateLimit(`supplier:${supplierId}`, PRODUCTION_CONFIG.supplierRateLimit());
  if (!rate.allowed) {
    return productionError("SUPPLIER_RATE_LIMIT", "Supplier rate limit exceeded", {
      stage: operation,
      retryable: true,
      details: { retryAfterMs: rate.retryAfterMs },
    });
  }

  const start = Date.now();
  try {
    const result = await fn();
    recordCircuitSuccess(circuitName);
    recordIntegrationAudit({
      action: context.auditAction || "SUPPLIER_SYNC_STARTED",
      supplierId,
      operation,
      result: result.ok === false ? "FAIL" : "OK",
      requestId: context.requestId,
      metadata: { durationMs: Date.now() - start, mode: result.mode },
    });
    return result;
  } catch (err) {
    recordCircuitFailure(circuitName);
    return productionError("SUPPLIER_TIMEOUT", err.message, { stage: operation, retryable: true });
  }
}

const _idempotencyStore = new Map();

function checkIdempotency(key) {
  if (_idempotencyStore.has(key)) return { duplicate: true, result: _idempotencyStore.get(key) };
  return { duplicate: false };
}

function storeIdempotency(key, result) {
  _idempotencyStore.set(key, result);
  if (_idempotencyStore.size > 50000) {
    const first = _idempotencyStore.keys().next().value;
    _idempotencyStore.delete(first);
  }
}

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) return { valid: false, code: "WEBHOOK_SIGNATURE_INVALID" };
  const crypto = require("crypto");
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return { valid: expected === signature, code: expected === signature ? null : "WEBHOOK_SIGNATURE_INVALID" };
}

function parseWebhookEvent(payload = {}) {
  return {
    eventId: payload.eventId || payload.id,
    type: payload.type || payload.event,
    data: payload.data || payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };
}

function deduplicateWebhookEvent(eventId, seen = _idempotencyStore) {
  const key = `webhook:${eventId}`;
  if (seen.has(key)) return { duplicate: true };
  seen.set(key, { processedAt: new Date().toISOString() });
  return { duplicate: false };
}

module.exports = {
  createMockSupplierConnector,
  createDryRunSupplierConnector,
  createRealSupplierConnector,
  createSupplierConnector,
  executeSupplierOperation,
  checkIdempotency,
  storeIdempotency,
  verifyWebhookSignature,
  parseWebhookEvent,
  deduplicateWebhookEvent,
  withRetry,
};
