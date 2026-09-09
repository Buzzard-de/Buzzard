import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../core/automotiveCore/index.js");

test("safety contract remains BLOCKED", () => {
  const safety = core.assertAutomotiveCoreSafety();
  assert.equal(safety.status, "BLOCKED");
  assert.equal(safety.salesEnabled, false);
  assert.equal(safety.publishEnabled, false);
  assert.equal(safety.compliant, true);
});

test("12 top-level categories loaded", () => {
  const cats = core.listTopCategories();
  assert.equal(cats.length, 12);
  const ids = cats.map((c) => c.id);
  for (const id of [
    "tires_wheels", "brakes", "oils_fluids", "engine_parts", "spare_parts",
    "batteries_electrical", "agricultural_vehicles", "trucks_commercial",
    "buses_minibuses", "construction_machinery", "motorcycles_scooters", "trailers",
  ]) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test("category tree stats", () => {
  const stats = core.getCategoryStats();
  assert.equal(stats.topLevel, 12);
  assert.ok(stats.subcategories >= 100);
  assert.ok(stats.productTypes >= 400);
});

test("category path validation", () => {
  const cat = core.listTopCategories()[0];
  const sub = cat.subcategories[0];
  const valid = core.validateCategoryPath(cat.id, sub.id);
  assert.equal(valid.valid, true);
  assert.equal(valid.status, "PASS");
});

test("tire size parser — 205/55 R16", () => {
  const parsed = core.parseTireSize("205/55 R16");
  assert.equal(parsed.width, 205);
  assert.equal(parsed.aspectRatio, 55);
  assert.equal(parsed.rimDiameter, 16);
  assert.equal(core.isValidTireSize("205/55 R16"), true);
});

test("tire size parser — commercial 315/80 R22.5", () => {
  const parsed = core.parseTireSize("315/80 R22.5");
  assert.ok(parsed);
  assert.equal(parsed.width, 315);
});

test("tire search tokens", () => {
  const tokens = core.buildTireSearchTokens("205/55R16");
  assert.ok(tokens.length >= 2);
});

test("vehicle search intent with tire", () => {
  const intent = core.parseAutomotiveSearchIntent("Mercedes C220 205/55 R16");
  assert.ok(intent.tire);
  assert.equal(intent.tire.width, 205);
});

test("identity GTIN checksum invalid rejected", () => {
  const r = core.validateIdentity({ sku: "T1", title: "T", brand: "Bosch", gtin: "1234567890123" });
  assert.equal(r.ok, false);
});

test("duplicate detection", () => {
  const dup = core.detectDuplicateProduct(
    { sku: "A", mpn: "SAME-MPN", brand: "Bosch" },
    [{ sku: "B", mpn: "SAME-MPN", brand: "Bosch" }]
  );
  assert.equal(dup.duplicate, true);
  assert.equal(dup.status, "REVIEW_REQUIRED");
});

test("fitment uncertain when missing", () => {
  const r = core.matchFitment({ sku: "X" }, { make: "bmw", model: "3 series" });
  assert.equal(r.level, "UNKNOWN");
  assert.equal(r.status, "REVIEW_REQUIRED");
});

test("fitment EXACT with matching data", () => {
  const r = core.matchFitment(
    { compatibleVehicles: [{ brand: "BMW", model: "3 series", yearFrom: 2012, yearTo: 2018, engine: "320d" }] },
    { make: "bmw", model: "3 series", year: 2015, engine: "320d" }
  );
  assert.ok(r.confidence > 0.8);
});

test("OEM cross-reference never auto-equivalent", () => {
  const xref = core.registerCrossReference({ oem: "123456", replacement: "654321", confidence: "MEDIUM" });
  assert.equal(xref.autoEquivalent, false);
});

test("supplier adapter blocked for live", () => {
  const adapter = core.createSupplierAdapter("mock");
  assert.equal(adapter.type, "mock");
  assert.equal(core.isSupplierLive(), false);
});

test("TecDoc adapter mock mode", () => {
  const status = core.getTecDocStatus();
  assert.equal(status.live, false);
  assert.ok(["mock", "dry_run"].includes(status.mode));
});

test("price engine blocks public price when sales off", () => {
  const prev = process.env.BUZZARD_SALES_ENABLED;
  process.env.BUZZARD_SALES_ENABLED = "0";
  try {
    const p = core.calculatePrice({ supplierCost: 50, desiredMargin: 0.2 });
    assert.equal(p.publicPriceAllowed, false);
    assert.equal(p.customerPrice, null);
  } finally {
    process.env.BUZZARD_SALES_ENABLED = prev;
  }
});

test("stock unknown not displayed as available", () => {
  const s = core.validateStock({});
  assert.equal(s.valid, false);
  assert.equal(s.stock.displayAllowed, false);
});

test("order live blocked", () => {
  const order = core.createOrder({ items: [] });
  assert.equal(order.blocked, true);
  assert.equal(core.isOrderLiveEnabled(), false);
});

test("AI matching never allows publish", () => {
  const m = core.matchProduct({
    supplierProduct: { sku: "S1", title: "T", brand: "B", category: "brakes" },
    buzzardProduct: { sku: "S1" },
  });
  assert.equal(m.publishAllowed, false);
  assert.equal(m.createOrderAllowed, false);
});

test("ingestion pipeline ends review or blocked publish", () => {
  const r = core.runIngestionPipeline({
    sku: "ING-1",
    title: "Test",
    brand: "Bosch",
    categoryId: "brakes",
    subCategoryId: "brakes__brake-pads",
  });
  assert.equal(r.publishAllowed, false);
  assert.ok(r.state === "REVIEW_REQUIRED" || r.state === "NORMALIZED" || r.state === "MAPPED");
});

test("merchant safety — no auto publish on APPROVED", () => {
  const r = core.runIngestionPipeline({ sku: "P1", title: "T", brand: "B", status: "APPROVED", categoryId: "brakes" });
  assert.notEqual(r.state, "PUBLISHED");
  assert.equal(r.publishAllowed, false);
});

test("workflow APPROVED != PUBLISHED", () => {
  const product = core.normalizeAutomotiveProduct({ sku: "W1", title: "T", brand: "B", status: "APPROVED" });
  assert.equal(product.workflow.approved, true);
  assert.equal(product.workflow.published, false);
  assert.equal(product.workflow.publishAllowed, false);
});

test("health metrics diagnostic", () => {
  const h = core.buildAutomotiveHealth();
  assert.equal(h.categoriesTotal, 12);
  assert.equal(h.supplierLive, false);
  assert.equal(h.publishEnabled, false);
});

test("search bridge oil viscosity", () => {
  const intent = core.parseAutomotiveSearchIntent("5W-30 VW 504 00");
  assert.ok(intent.oil);
  assert.equal(intent.oil.viscosity, "5W-30");
});

test("Arabic category names present", () => {
  const cat = core.getCategoryById("tires_wheels");
  assert.ok(cat.name.ar);
  assert.ok(cat.name.de);
  assert.ok(cat.name.tr);
});

test("legacy taxonomy preserved — 15 subcategories still available", () => {
  const legacy = require("../core/automotive/automotiveTaxonomy.js");
  assert.equal(legacy.getSubcategories().length, 15);
});

test("integration flow publish gate BLOCKED", () => {
  const safety = core.assertAutomotiveCoreSafety();
  assert.equal(safety.humanApprovalRequired, true);
  assert.equal(safety.publishBlocked, true);
  assert.equal(safety.liveImport, false);
});
