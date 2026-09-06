#!/usr/bin/env node
/**
 * Automotive Core Engine — full integration verification (no live side effects).
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../server/core/automotiveCore/index.js");

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

console.log("=== AUTOMOTIVE CORE INTEGRATION TEST ===\n");

check("35-country registry accessible", () => {
  const registry = require("../server/core/globalCountryRegistry.js");
  if (registry.getCountryCount() !== 35) throw new Error("expected 35 countries");
});

check("12 automotive core categories", () => {
  if (core.listTopCategories().length !== 12) throw new Error("expected 12 categories");
});

check("Product engine normalizes", () => {
  const p = core.normalizeAutomotiveProduct({ sku: "INT-1", title: "Brake Pad", brand: "Bosch", categoryId: "brakes" });
  if (!p.sku) throw new Error("missing sku");
  if (p.workflow.publishAllowed !== false) throw new Error("publish must be blocked");
});

check("Supplier mapping diagnostics", () => {
  const m = core.resolveSupplierCategoryMapping("test", "unknown");
  if (!m.status) throw new Error("missing status");
});

check("GTIN validation", () => {
  const r = core.validateGTIN("1234567890123");
  if (r.ok) throw new Error("invalid gtin should fail");
});

check("Vehicle fitment scoring", () => {
  const r = core.scoreFitment(
    { compatibleVehicles: [{ make: "VW", model: "Golf", yearFrom: 2015, yearTo: 2020 }] },
    { make: "vw", model: "golf", year: 2018 }
  );
  if (r.confidence <= 0) throw new Error("expected fitment match");
});

check("Image validation pipeline available", () => {
  const img = require("../server/lib/pim/imagePipeline.js");
  if (typeof img.validateImageSet !== "function") throw new Error("image pipeline missing");
});

check("Localization languages DE/EN/TR/AR", () => {
  const lang = require("../server/core/globalLanguageRegistry.js");
  for (const code of ["de", "en", "tr", "ar"]) {
    if (lang.getReadinessStatus(code) !== "READY") throw new Error(`${code} not READY`);
  }
});

check("SEO — no public price when sales off", () => {
  const prev = process.env.BUZZARD_SALES_ENABLED;
  process.env.BUZZARD_SALES_ENABLED = "0";
  try {
    const price = core.calculatePrice({ supplierCost: 10 });
    if (price.publicPriceAllowed) throw new Error("price should be blocked");
  } finally {
    process.env.BUZZARD_SALES_ENABLED = prev;
  }
});

check("Admin review workflow — publish BLOCKED", () => {
  const safety = core.assertAutomotiveCoreSafety();
  if (safety.publishEnabled !== false) throw new Error("publishEnabled must be false");
  if (safety.ready !== false) throw new Error("ready must be false");
});

check("Safety flags", () => {
  if (process.env.REAL_SUPPLIER_LIVE_IMPORT === "1") throw new Error("live import must be off");
  if (core.isSupplierLive()) throw new Error("supplier live must be off");
  if (core.isOrderLiveEnabled()) throw new Error("order live must be off");
});

console.log("\n--- Running test:automotive-core ---");
execSync("npm run test:automotive-core", { stdio: "inherit" });

console.log("\n--- Summary ---");
console.log(`Integration checks: ${passed}/${passed + failed}`);
console.log(failed === 0 ? "AUTOMOTIVE CORE INTEGRATION: PASS" : "AUTOMOTIVE CORE INTEGRATION: FAIL");
console.log("PUBLISH=BLOCKED SALES=OFF SUPPLIER LIVE=OFF");
process.exit(failed > 0 ? 1 : 0);
