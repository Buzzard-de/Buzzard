#!/usr/bin/env node
/**
 * Automotive Production Integration — full flow verification (no live side effects).
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prod = require("../server/core/automotiveProduction/index.js");

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`✗ ${name} — ${err.message}`);
    failed += 1;
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`✗ ${name} — ${err.message}`);
    failed += 1;
  }
}

console.log("=== AUTOMOTIVE PRODUCTION INTEGRATION TEST ===\n");

check("Safety contract BLOCKED", () => {
  const s = prod.assertProductionSafety();
  if (s.status !== "BLOCKED") throw new Error("safety not blocked");
  if (s.supplierLive) throw new Error("supplier live must be off");
});

check("35-country registry", () => {
  const registry = require("../server/core/globalCountryRegistry.js");
  if (registry.getCountryCount() !== 35) throw new Error("expected 35 countries");
});

check("12 automotive categories via core", () => {
  if (prod.listTopCategories().length !== 12) throw new Error("expected 12 categories");
});

const SAMPLE = {
  sku: "INT-PROD-1",
  supplierSku: "SUP-INT-1",
  supplierId: "supplier-mock",
  title: "Oil Filter",
  brand: "Mann",
  mpn: "HU816x",
  gtin: "5901234123457",
  categoryId: "oils_fluids",
  sourceCategory: "Filters",
  price: 12.5,
  stock: 25,
  stockUpdatedAt: new Date().toISOString(),
  images: ["https://cdn.buzzard24.de/products/oil-filter.jpg"],
  translations: {
    de: { title: "Ölfilter", description: "Ölfilter Mann" },
    en: { title: "Oil Filter", description: "Mann oil filter" },
    tr: { title: "Yağ Filtresi", description: "Mann yağ filtresi" },
    ar: { title: "فلتر زيت", description: "فلتر زيت Mann" },
  },
  fitment: [{ make: "VW", model: "Golf", yearFrom: 2015, yearTo: 2020 }],
};

check("Supplier mock ingestion", () => {
  // verified in async block below
});

await checkAsync("Supplier mock ingestion async", async () => {
  const r = await prod.ingestFromSupplier("supplier-mock", { mode: "mock" });
  if (!r.ok || r.liveCalls !== 0) throw new Error("mock ingestion failed");
});

check("Normalization stage", () => {
  const n = prod.normalizeSupplierProduct(SAMPLE, { supplierId: "supplier-mock" });
  if (!n.sku) throw new Error("missing sku");
});

check("Identity validation", () => {
  const id = prod.validateIdentity(SAMPLE);
  if (!id.ok) throw new Error("valid identity should pass");
});

check("Category mapping", () => {
  const m = prod.resolveSupplierCategoryMapping("supplier-mock", "Filters");
  if (!m.status) throw new Error("missing mapping status");
});

check("Fitment scoring", () => {
  const f = prod.scoreFitment(SAMPLE, { make: "vw", model: "golf", year: 2018 });
  if (f.confidence <= 0) throw new Error("expected fitment score");
});

check("Image pipeline", () => {
  const img = prod.validateImages(SAMPLE);
  if (!img.valid) throw new Error("valid image should pass");
});

check("Localization required locales", () => {
  const t = prod.validateTranslations(SAMPLE);
  if (!t.valid) throw new Error("all locales present");
});

check("SEO / price diagnostic", () => {
  const p = prod.calculateProductPrice({ purchasePrice: 12.5 });
  if (!p.calculated) throw new Error("price should calculate");
  if (p.publishable) throw new Error("price must not be publishable when sales off");
});

check("Stock validation", () => {
  const s = prod.validateProductStock({ supplierStock: 25, lastUpdated: new Date().toISOString() });
  if (!s.valid) throw new Error("fresh stock should pass");
});

await checkAsync("Full ingestion pipeline", async () => {
  const pipeline = prod.runProductionIngestionPipeline(SAMPLE, { supplierId: "supplier-mock" });
  if (pipeline.publishAllowed) throw new Error("publish must be blocked");
});

check("REVIEW state reachable", () => {
  const pipeline = prod.runProductionIngestionPipeline(
    { ...SAMPLE, images: [] },
    { supplierId: "supplier-mock" }
  );
  if (!pipeline.blocked) throw new Error("missing images should block");
});

check("APPROVED != PUBLISHED", () => {
  const a = prod.approveProduct("INT-PROD-1");
  if (a.published) throw new Error("approve must not publish");
});

check("Publish blocked without manualPublish", () => {
  const p = prod.publishProduct("INT-PROD-1", { manualPublish: false });
  if (p.ok) throw new Error("publish must fail");
});

check("Publish blocked even with manualPublish", () => {
  const p = prod.publishProduct("INT-PROD-1", { manualPublish: true });
  if (p.ok) throw new Error("publish must remain blocked");
});

check("Order dry-run blocked", () => {
  const o = prod.runOrderDryRun({ orderId: "O-INT-1", customerOrderId: "C-1", supplierId: "supplier-mock" });
  if (o.supplierOrderCreated) throw new Error("no supplier orders in dry-run");
});

await checkAsync("Dry-run sync summary", async () => {
  const sync = await prod.runDryRunSync({ supplierId: "supplier-mock" });
  if (sync.mode !== "DRY_RUN") throw new Error("expected DRY_RUN");
  if (sync.liveCalls !== 0) throw new Error("no live calls");
  if (sync.published !== 0) throw new Error("no publish");
});

check("Integration health", () => {
  const h = prod.buildIntegrationHealth();
  if (h.safety.status !== "BLOCKED") throw new Error("health safety blocked");
});

console.log("\n--- Unit test suite ---");
try {
  execSync("npm run test:automotive-production", { stdio: "inherit", cwd: process.cwd() });
} catch {
  failed += 1;
  console.log("✗ test:automotive-production failed");
}

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
