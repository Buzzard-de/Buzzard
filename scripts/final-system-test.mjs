#!/usr/bin/env node
/**
 * Final system verification — production preparation, all safety gates must remain OFF.
 * Usage: npm run test:final-system
 */
import { strict as assertStrict } from "node:assert";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "..");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`✗ ${name} — ${err.message}`);
    failed += 1;
    failures.push({ name, error: err.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runSuite(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "pipe", env: process.env });
}

console.log("=== BUZZARD FINAL SYSTEM VERIFICATION ===\n");

// --- Safety gates (must fail if any activated) ---
check("SAFETY: BUZZARD_SALES_ENABLED=0", () => {
  assert(process.env.BUZZARD_SALES_ENABLED !== "1", "BUZZARD_SALES_ENABLED must not be 1");
});
check("SAFETY: NEXT_PUBLIC_SALES_ENABLED=0", () => {
  assert(process.env.NEXT_PUBLIC_SALES_ENABLED !== "1", "NEXT_PUBLIC_SALES_ENABLED must not be 1");
});
check("SAFETY: REAL_SUPPLIER_LIVE_IMPORT=0", () => {
  assert(process.env.REAL_SUPPLIER_LIVE_IMPORT !== "1", "REAL_SUPPLIER_LIVE_IMPORT must not be 1");
});
check("SAFETY: REAL_SUPPLIER_DRY_RUN=1", () => {
  assert(process.env.REAL_SUPPLIER_DRY_RUN !== "0", "REAL_SUPPLIER_DRY_RUN must not be 0");
});

const { GLOBAL_SAFETY_POLICY, assertGlobalSafetyPolicy } = require("../server/core/globalSafetyPolicy.js");
const safetyCheck = assertGlobalSafetyPolicy();

check("SAFETY: global policy BLOCKED", () => {
  assert(GLOBAL_SAFETY_POLICY.status === "BLOCKED", "status must be BLOCKED");
  assert(GLOBAL_SAFETY_POLICY.ready === false, "ready must be false");
  assert(GLOBAL_SAFETY_POLICY.autoActivate === false, "autoActivate must be false");
  assert(GLOBAL_SAFETY_POLICY.humanApprovalRequired === true, "humanApprovalRequired must be true");
  assert(GLOBAL_SAFETY_POLICY.publishBlocked === true, "publishBlocked must be true");
  assert(GLOBAL_SAFETY_POLICY.paymentsEnabled === false, "paymentsEnabled must be false");
  assert(GLOBAL_SAFETY_POLICY.publishEnabled === false, "publishEnabled must be false");
  assert(safetyCheck.compliant === true, "safety check must be compliant");
});

// --- Country registry ---
const countryRegistry = require("../server/core/globalCountryRegistry.js");
check("Country registry: exactly 35 countries", () => {
  assertStrict.equal(countryRegistry.getCountryCount(), 35);
});
check("Country market profiles: 35 structured entries", () => {
  const profiles = countryRegistry.listCountryMarketProfiles();
  assertStrict.equal(profiles.length, 35);
  for (const p of profiles) {
    assert(p.countryCode, "missing countryCode");
    assert(p.currency, "missing currency");
    assert(p.defaultLanguage, "missing defaultLanguage");
    assert(p.availability, "missing availability");
  }
});
check("Country registry: no legacy 41-country active source", () => {
  const { assertFrontendUsesGlobalRegistry } = require("../server/lib/global/marketCountryParity.js");
  assertFrontendUsesGlobalRegistry();
});

// --- Language registry ---
const languageRegistry = require("../server/core/globalLanguageRegistry.js");
check("Languages: de/en/tr/ar READY", () => {
  for (const code of ["de", "en", "tr", "ar"]) {
    assertStrict.equal(languageRegistry.getReadinessStatus(code), "READY");
  }
});
check("Languages: Arabic RTL", () => {
  assertStrict.equal(languageRegistry.getLanguage("ar").direction, "rtl");
});

// --- Currency registry ---
const currencyRegistry = require("../server/core/globalCurrencyRegistry.js");
check("Currency registry available", () => {
  assertStrict.ok(currencyRegistry.getCurrency("EUR"));
  assertStrict.ok(currencyRegistry.getCurrency("USD"));
});

// --- PIM & canonical model ---
const { toFlatCanonicalProduct, getLanguageReadiness } = require("../server/lib/global/productCanonicalModel.js");
check("PIM: flat canonical product model", () => {
  const flat = toFlatCanonicalProduct({ id: "p1", sku: "SKU-1", title: "Test", brand: { name: "Bosch" } });
  assertStrict.equal(flat.sku, "SKU-1");
  assertStrict.equal(flat.workflow.publishAllowed, false);
});
check("PIM: language readiness without invented translations", () => {
  const readiness = getLanguageReadiness({ title: "DE Title" }, "en");
  assertStrict.equal(readiness.translated, false);
  assert(readiness.completeness === "MISSING" || readiness.completeness === "MINIMAL");
});

// --- Automotive taxonomy ---
const automotiveTaxonomy = require("../server/core/automotive/automotiveTaxonomy.js");
check("Automotive: 15 subcategories", () => {
  const subs = automotiveTaxonomy.getSubcategories?.() || automotiveTaxonomy.listSubcategories?.();
  if (subs) assertStrict.equal(subs.length, 15);
  else {
    const tree = require("../data/automotive/automotive_category_tree.json");
    assertStrict.equal(tree.stats?.subcategories, 15);
  }
});

// --- Supplier mapping diagnostics ---
const categoryMapping = require("../server/lib/catalog/categoryMapping.js");
check("Supplier mapping: returns diagnostics", () => {
  const result = categoryMapping.resolveSupplierCategory("mock", "unknown_category");
  assertStrict.equal(result.status, "REVIEW_REQUIRED");
  assert(result.reason);
  assert(result.timestamp);
});

// --- Identity validation ---
const { validateProductIdentity } = require("../server/lib/pim/productIdentityValidator.js");
check("Identity: invalid GTIN checksum rejected", () => {
  const r = validateProductIdentity({ sku: "X", title: "T", gtin: "1234567890123", brand: "B" }, { requireGtin: false });
  assert(r.findings?.length > 0 || r.status !== "PASS");
});

// --- Vehicle compatibility ---
const { normalizeFitmentEntry } = require("../server/lib/pim/fitmentSchema.js");
check("Fitment: normalized model includes engine fields", () => {
  const fit = normalizeFitmentEntry({
    brand: "BMW",
    model: "3 Series",
    generation: "F30",
    engine: "320d",
    engineCode: "N47",
    fuel: "diesel",
    kw: 135,
    ps: 184,
    yearFrom: 2012,
    yearTo: 2018,
  });
  assertStrict.equal(fit.make, "BMW");
  assertStrict.equal(fit.engineCode, "N47");
  assertStrict.equal(fit.kw, 135);
});

// --- Search ---
const { loadSearchCatalog } = require("../server/lib/global/globalCatalogSearch.js");
const { searchProducts } = require("../server/lib/global/searchIntelligence.js");
check("Search: connected to PIM catalog", () => {
  const products = loadSearchCatalog();
  assertStrict.ok(Array.isArray(products));
});
check("Search: SKU exact match works", () => {
  const sample = { sku: "FINAL-SYS-SKU", title: "Test Product", brand: "Bosch" };
  const result = searchProducts([sample], "FINAL-SYS-SKU", { country: "DE", language: "de" });
  assertStrict.ok(result.resultCount >= 1);
});

// --- Merchant feed safety ---
check("Merchant: no price when sales OFF", () => {
  const prev = process.env.BUZZARD_SALES_ENABLED;
  process.env.BUZZARD_SALES_ENABLED = "0";
  try {
    const feedAdapters = require("../server/lib/feedAdapters/index.js");
    const rows = feedAdapters.googleMerchantRows();
    if (rows.length > 0) assertStrict.equal(rows[0].price, undefined);
  } finally {
    process.env.BUZZARD_SALES_ENABLED = prev;
  }
});

// --- System diagnostics ---
const {
  getSmtpDiagnostics,
  getMonitoringDiagnostics,
  getLegalDiagnostics,
  getSafetyContract,
} = require("../server/lib/global/systemDiagnostics.js");
check("Diagnostics: SMTP not faked when missing", () => {
  const smtp = getSmtpDiagnostics();
  if (!process.env.SMTP_HOST) assertStrict.equal(smtp.configured, false);
});
check("Diagnostics: monitoring DSN not exposed", () => {
  const mon = getMonitoringDiagnostics();
  assertStrict.equal(mon.dsnExposed, false);
  assertStrict.ok(!JSON.stringify(mon).includes("https://"));
});
check("Diagnostics: legal missing fields reported", () => {
  const legal = getLegalDiagnostics();
  assertStrict.ok(Array.isArray(legal.missingFields));
});
check("Diagnostics: safety contract BLOCKED", () => {
  const contract = getSafetyContract();
  assertStrict.equal(contract.status, "BLOCKED");
  assertStrict.equal(contract.publishEnabled, false);
});

// --- Workflow ---
const { buildProductValidationReport } = require("../server/lib/global/productValidationReport.js");
check("Workflow: APPROVED != PUBLISHED", () => {
  const report = buildProductValidationReport({ sku: "W1", title: "T", status: "approved" });
  assertStrict.equal(report.approval.status, "PASS");
  assertStrict.notEqual(report.publish.status, "PASS");
});

// --- Security scan (branch diff vs main, no live secrets) ---
check("Security: no live Stripe keys in tracked source", () => {
  const patterns = [/sk_live_[0-9a-zA-Z]{10,}/, /pk_live_[0-9a-zA-Z]{10,}/];
  const scanDirs = ["server", "lib", "scripts", "components", "app"];
  for (const dir of scanDirs) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, (file) => {
      if (file.includes("node_modules") || file.endsWith(".md")) return;
      if (!/\.(js|ts|tsx|mjs|json)$/.test(file)) return;
      const content = fs.readFileSync(file, "utf8");
      for (const re of patterns) {
        assert(!re.test(content), `found live key pattern in ${file}`);
      }
    });
  }
});

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(p, fn);
    } else fn(p);
  }
}

// --- Run existing test suites ---
const suites = [
  "npm run test:final-catalog-completion",
  "npm run test:global-localization",
  "npm run test:pim-catalog",
  "npm run test:automotive",
];

for (const suite of suites) {
  check(`Suite: ${suite}`, () => runSuite(suite));
}

for (const part of [28, 29, 30, 31, 32, 33, 34, 35]) {
  check(`Suite: test:part${part}`, () => runSuite(`npm run test:part${part}`));
}

console.log("\n--- Summary ---");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  process.exit(1);
}

console.log("\nFINAL SYSTEM VERIFICATION: PASS");
console.log("Safety: SALES=OFF PAYMENTS=OFF SUPPLIER LIVE=OFF PUBLISH=OFF GO-LIVE=BLOCKED");
process.exit(0);
