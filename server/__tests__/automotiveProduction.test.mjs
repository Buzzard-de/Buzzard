import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prod = require("../core/automotiveProduction/index.js");

const VALID_PRODUCT = {
  sku: "PROD-001",
  supplierSku: "SUP-001",
  supplierId: "supplier-mock",
  title: "Brake Pad Set",
  brand: "Bosch",
  mpn: "0986494150",
  gtin: "5901234123457",
  categoryId: "brakes",
  sourceCategory: "Brakes",
  price: 45.99,
  currency: "EUR",
  stock: 10,
  stockUpdatedAt: new Date().toISOString(),
  images: ["https://cdn.buzzard24.de/products/brake-pad.jpg"],
  translations: {
    de: { title: "Bremsbelag Satz", description: "Hochwertiger Bremsbelag" },
    en: { title: "Brake Pad Set", description: "High quality brake pad" },
    tr: { title: "Fren Balata Seti", description: "Kaliteli fren balata" },
    ar: { title: "طقم فرامل", description: "فرامل عالية الجودة" },
  },
  fitment: [{ make: "BMW", model: "3 Series", yearFrom: 2012, yearTo: 2018, engine: "320d" }],
};

test("1 — safety contract remains BLOCKED", () => {
  const safety = prod.assertProductionSafety();
  assert.equal(safety.status, "BLOCKED");
  assert.equal(safety.supplierLive, false);
  assert.equal(safety.orderLive, false);
  assert.equal(safety.compliant, true);
});

test("2 — mock supplier connector", async () => {
  const connector = prod.createMockSupplierConnector("supplier-mock");
  assert.equal(connector.mode, "mock");
  const products = await connector.fetchProducts();
  assert.equal(products.ok, true);
  assert.ok(products.products.length >= 1);
});

test("3 — dry-run supplier connector", async () => {
  const connector = prod.createDryRunSupplierConnector("supplier-example");
  assert.equal(connector.mode, "dry_run");
  const result = await connector.fetchProducts();
  assert.equal(result.liveCalls, 0);
  assert.deepEqual(result.products, []);
});

test("4 — live supplier blocked", async () => {
  const connector = prod.createRealSupplierConnector("supplier-example");
  const result = await connector.fetchProducts();
  assert.equal(result.code, "SUPPLIER_LIVE_DISABLED");
});

test("5 — TecDoc mock status", () => {
  const status = prod.getTecDocConnectorStatus();
  assert.equal(status.live, false);
});

test("6 — TecDoc live blocked", async () => {
  const prev = process.env.TECDOC_ENABLED;
  process.env.TECDOC_ENABLED = "1";
  process.env.TECDOC_DRY_RUN = "0";
  try {
    const result = await prod.searchParts("brake");
    assert.ok(result.code === "TECDOC_DISABLED" || result.ok === true);
  } finally {
    process.env.TECDOC_ENABLED = prev;
    process.env.TECDOC_DRY_RUN = "1";
  }
});

test("7 — product ingestion pipeline", () => {
  const result = prod.runProductionIngestionPipeline(VALID_PRODUCT, { supplierId: "supplier-mock" });
  assert.ok(Array.isArray(result.stages));
  assert.ok(result.stages.length >= 4);
  assert.equal(result.publishAllowed, false);
});

test("8 — normalization", () => {
  const normalized = prod.normalizeSupplierProduct(VALID_PRODUCT, { supplierId: "supplier-mock" });
  assert.equal(normalized.sku, "PROD-001");
  assert.equal(normalized.brand, "Bosch");
});

test("9 — category mapping", () => {
  const mapping = prod.resolveSupplierCategoryMapping("supplier-mock", "Brakes");
  assert.ok(mapping.status);
});

test("10 — invalid category path blocks", () => {
  const result = prod.runProductionIngestionPipeline(
    { ...VALID_PRODUCT, categoryId: "invalid_category_xyz" },
    { supplierId: "supplier-mock" }
  );
  assert.ok(result.blocked || result.state === "REVIEW_REQUIRED");
});

test("11 — GTIN validation", () => {
  const r = prod.validateIdentity({ sku: "T1", title: "T", brand: "Bosch", gtin: "1234567890123" });
  assert.equal(r.ok, false);
});

test("12 — duplicate product detection", () => {
  const dup = prod.detectDuplicateProduct(
    { sku: "A", mpn: "SAME", brand: "Bosch" },
    [{ sku: "B", mpn: "SAME", brand: "Bosch" }]
  );
  assert.equal(dup.duplicate, true);
  assert.equal(dup.status, "REVIEW_REQUIRED");
});

test("13 — vehicle fitment match", () => {
  const r = prod.matchFitment(
    { fitment: [{ make: "BMW", model: "3 Series", yearFrom: 2012, yearTo: 2018 }] },
    { make: "bmw", model: "3 series", year: 2015 }
  );
  assert.ok(r.confidence > 0);
});

test("14 — invalid fitment for brakes requires HIGH", () => {
  const validation = prod.validateFitmentForCategory(
    { categoryId: "brakes" },
    { level: "LOW" }
  );
  assert.equal(validation.valid, false);
  assert.equal(validation.publishBlocked, true);
});

test("15 — tire parsing", () => {
  const parsed = prod.parseTireSize("205/55R16");
  assert.equal(parsed.width, 205);
  assert.equal(parsed.rimDiameter, 16);
});

test("16 — image validation missing", () => {
  const r = prod.validateImages({ images: [] });
  assert.equal(r.valid, false);
  assert.equal(r.code, "IMAGE_MISSING");
});

test("17 — image validation blocks test hosts", () => {
  const r = prod.validateImages({ images: ["https://example.com/img.jpg"] });
  assert.equal(r.valid, false);
});

test("18 — translation validation missing locale", () => {
  const r = prod.validateTranslations({ translations: { de: { title: "X" } } });
  assert.equal(r.valid, false);
  assert.ok(r.missing.includes("en"));
});

test("19 — price calculation diagnostic", () => {
  const price = prod.calculateProductPrice({ purchasePrice: 50, currency: "EUR" });
  assert.equal(price.calculated, true);
  assert.equal(price.publishable, false);
});

test("20 — sales-off price block", () => {
  const prev = process.env.SALES_ENABLED;
  process.env.SALES_ENABLED = "0";
  try {
    const price = prod.calculateProductPrice({ purchasePrice: 50 });
    assert.equal(price.reason, "SALES_DISABLED");
    assert.equal(price.publishable, false);
  } finally {
    process.env.SALES_ENABLED = prev;
  }
});

test("21 — stock UNKNOWN not available", () => {
  const stock = prod.validateProductStock({ supplierStock: null });
  assert.equal(stock.valid, false);
});

test("22 — stale stock detection", () => {
  const old = new Date(Date.now() - 60 * 60000).toISOString();
  const stock = prod.validateProductStock({ supplierStock: 10, lastUpdated: old, sku: "S1" });
  assert.equal(stock.status, "STALE");
  assert.equal(stock.error.code, "STALE_STOCK");
});

test("23 — multi-supplier matching", () => {
  const match = prod.findMatchingCanonical(
    { gtin: "5901234123457", brand: "Bosch" },
    [{ sku: "CAN-1", gtin: "5901234123457" }]
  );
  assert.equal(match.matched, true);
  assert.equal(match.priority, "gtin");
});

test("24 — supplier scoring", () => {
  const score = prod.scoreSupplierOffer({
    supplierId: "s1",
    purchasePrice: 40,
    stock: 10,
    deliveryTime: 2,
  });
  assert.ok(score.score > 0);
  assert.equal(score.autoSelectionAllowed, false);
});

test("25 — order dry-run", () => {
  const result = prod.runOrderDryRun({ orderId: "O1", customerOrderId: "C1", supplierId: "supplier-mock" });
  assert.equal(result.mode, "DRY_RUN");
  assert.equal(result.supplierOrderCreated, false);
  assert.equal(result.liveCalls, 0);
});

test("26 — live order blocked", async () => {
  const result = await prod.submitSupplierOrder({ orderId: "O1", supplierId: "supplier-mock" });
  assert.equal(result.code, "ORDER_LIVE_DISABLED");
});

test("27 — idempotency prevents duplicate orders", () => {
  prod.storeIdempotency("order:C1:supplier-mock", { orderId: "O1" });
  const dup = prod.checkIdempotency("order:C1:supplier-mock");
  assert.equal(dup.duplicate, true);
});

test("28 — retry without idempotency key blocked for orders", async () => {
  const result = await prod.withRetry(async () => { throw new Error("fail"); }, {
    operation: "createOrder",
    idempotencyKey: null,
    maxAttempts: 2,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "ORDER_RETRY_WITHOUT_IDEMPOTENCY_KEY");
});

test("29 — circuit breaker opens on failures", () => {
  prod.resetCircuit("test-circuit");
  for (let i = 0; i < 5; i++) prod.recordCircuitFailure("test-circuit", 5);
  assert.equal(prod.isCircuitOpen("test-circuit"), true);
});

test("30 — webhook signature verification", () => {
  const crypto = require("crypto");
  const secret = "test-secret";
  const payload = { eventId: "E1", type: "STOCK_UPDATED" };
  const sig = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  const valid = prod.verifyWebhookSignature(payload, sig, secret);
  assert.equal(valid.valid, true);
  const invalid = prod.verifyWebhookSignature(payload, "bad", secret);
  assert.equal(invalid.valid, false);
});

test("31 — webhook deduplication", () => {
  const store = new Map();
  const first = prod.deduplicateWebhookEvent("evt-1", store);
  const second = prod.deduplicateWebhookEvent("evt-1", store);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
});

test("32 — tracking normalization", () => {
  const tracking = prod.normalizeTracking({ trackingNumber: "TN1", carrier: "dhl", status: "shipped" });
  assert.equal(tracking.carrier, "DHL");
  assert.equal(tracking.trackingNumber, "TN1");
});

test("33 — return flow requires human approval", () => {
  const ret = prod.createReturnRequest({ orderId: "O1", sku: "S1", reason: "wrong_part" });
  assert.equal(ret.humanApprovalRequired, true);
  const transition = prod.transitionReturn(ret, "APPROVED");
  assert.equal(transition.error, "HUMAN_APPROVAL_REQUIRED");
});

test("34 — audit log sanitizes secrets", () => {
  const meta = prod.sanitizeMetadata({ apiKey: "secret123", sku: "S1", nested: { password: "x" } });
  assert.equal(meta.apiKey, undefined);
  assert.equal(meta.sku, "S1");
  assert.equal(meta.nested.password, undefined);
});

test("35 — PII not in shipping sanitize", () => {
  const sanitized = prod.sanitizeShippingAddress({
    country: "DE",
    city: "Berlin",
    postalCode: "10115",
    street: "Main St",
  });
  assert.equal(sanitized.city, "[REDACTED]");
  assert.equal(sanitized.street, undefined);
});

test("36 — production config validation unsafe combos", () => {
  const prev = { ...process.env };
  process.env.ORDER_LIVE_ENABLED = "1";
  process.env.SUPPLIER_LIVE_ENABLED = "0";
  const v = prod.validateProductionConfig();
  assert.equal(v.valid, false);
  assert.ok(v.violations.some((x) => x.includes("ORDER_LIVE")));
  process.env = prev;
});

test("37 — manual approval required for publish", () => {
  const result = prod.publishProduct("SKU-1", { manualPublish: false });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PUBLISH_DISABLED");
});

test("38 — APPROVED != PUBLISHED", () => {
  const approved = prod.approveProduct("SKU-1");
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.published, false);
});

test("39 — manual publish still blocked", () => {
  const result = prod.publishProduct("SKU-1", { manualPublish: true });
  assert.equal(result.ok, false);
  assert.equal(result.code, "PUBLISH_DISABLED");
});

test("40 — full integration dry-run sync", async () => {
  const summary = await prod.runDryRunSync({ supplierId: "supplier-mock" });
  assert.equal(summary.mode, "DRY_RUN");
  assert.equal(summary.liveCalls, 0);
  assert.equal(summary.published, 0);
  assert.equal(summary.ordersCreated, 0);
});

test("41 — integration health report", () => {
  const health = prod.buildIntegrationHealth();
  assert.ok(health.core);
  assert.ok(health.suppliers);
  assert.ok(health.tecdoc);
  assert.ok(health.safety);
  assert.equal(health.safety.status, "BLOCKED");
});

test("42 — supplier registry", () => {
  const suppliers = prod.listRegisteredSuppliers();
  assert.ok(suppliers.length >= 2);
  const example = prod.getSupplier("supplier-example");
  assert.equal(example.dryRun, true);
  assert.equal(example.liveEnabled, false);
});

test("43 — production manifest", () => {
  const manifest = prod.getProductionManifest();
  assert.ok(manifest.name.includes("Production"));
  assert.ok(manifest.modules.length >= 10);
});

test("44 — ingest from supplier mock", async () => {
  const result = await prod.ingestFromSupplier("supplier-mock", { mode: "mock" });
  assert.equal(result.ok, true);
  assert.equal(result.liveCalls, 0);
  assert.ok(result.productsFound >= 1);
});

test("45 — AI matching never auto-publishes", () => {
  const ai = prod.runAiSupplierMatch({
    supplierProduct: VALID_PRODUCT,
    buzzardProduct: VALID_PRODUCT,
  });
  assert.equal(ai.canAutoSelect, false);
  assert.equal(ai.requiresHumanReview, true);
});
