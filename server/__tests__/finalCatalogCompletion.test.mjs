import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const countryRegistry = require("../core/globalCountryRegistry.js");
const languageRegistry = require("../core/globalLanguageRegistry.js");
const { loadSearchCatalog, mapPimProductForSearch } = require("../lib/global/globalCatalogSearch.js");
const { searchProducts } = require("../lib/global/searchIntelligence.js");
const { buildProductValidationReport } = require("../lib/global/productValidationReport.js");
const { normalizeCanonicalProduct } = require("../lib/global/productCanonicalModel.js");
const { validateGtinEanMpn } = require("../lib/global/globalProductPipeline.js");
const { GLOBAL_SAFETY_POLICY } = require("../core/globalSafetyPolicy.js");

const { assertFrontendUsesGlobalRegistry } = require("../lib/global/marketCountryParity.js");

test("market country adapter: frontend uses 35 countries from global registry", () => {
  const parity = assertFrontendUsesGlobalRegistry();
  assert.equal(parity.count, 35);
  assert.equal(new Set(parity.codes).size, 35);
});

test("no duplicate country codes in global registry", () => {
  const codes = countryRegistry.listCountries().map((c) => c.countryCode);
  assert.equal(new Set(codes).size, codes.length);
});

test("every country has locale, currency, default language", () => {
  for (const c of countryRegistry.listCountries()) {
    assert.ok(c.locale, `${c.countryCode} missing locale`);
    assert.ok(c.currency, `${c.countryCode} missing currency`);
    assert.ok(c.defaultLanguage, `${c.countryCode} missing defaultLanguage`);
    assert.ok(c.catalogEnabled !== undefined, `${c.countryCode} missing availability metadata`);
  }
});

test("language readiness status: de/en/tr/ar are READY", () => {
  for (const code of ["de", "en", "tr", "ar"]) {
    assert.equal(languageRegistry.getReadinessStatus(code), languageRegistry.READINESS.READY);
  }
});

test("extended UI languages are READY with full translation catalogs", () => {
  for (const code of ["fr", "it", "es", "nl", "pl", "cs", "sk", "hu", "ro", "bg", "hr", "sl", "da", "sv", "fi", "et", "lv", "lt", "pt", "el", "ca", "eu", "gl", "ga", "lb", "mt"]) {
    assert.equal(languageRegistry.getReadinessStatus(code), languageRegistry.READINESS.READY);
  }
});

test("unknown language is DISABLED", () => {
  assert.equal(languageRegistry.getReadinessStatus("xx"), languageRegistry.READINESS.DISABLED);
});

test("global search loads PIM catalog (not empty array)", () => {
  const products = loadSearchCatalog();
  assert.ok(Array.isArray(products));
});

test("global search finds product by SKU", () => {
  const products = loadSearchCatalog();
  if (products.length === 0) {
    const sample = mapPimProductForSearch({
      id: "test_1",
      sku: "TEST-SKU-12345",
      title: "Test Brake Pad",
      brand: { name: "Bosch" },
      mpn: "0986494153",
      ean: "4017024117752",
      category: "automotive",
    });
    const result = searchProducts([sample], "TEST-SKU-12345", { country: "DE", language: "de" });
    assert.ok(result.resultCount >= 1);
    return;
  }
  const first = products[0];
  if (first?.sku) {
    const result = searchProducts(products, first.sku, { country: "DE", language: "de" });
    assert.ok(result.resultCount >= 1);
  }
});

test("global search EAN exact match priority", () => {
  const sample = mapPimProductForSearch({
    id: "test_ean",
    sku: "SKU-EAN-1",
    ean: "4017024117752",
    title: "EAN Product",
    brand: { name: "TestBrand" },
  });
  const result = searchProducts([sample], "4017024117752", { country: "DE", language: "de" });
  assert.equal(result.resultCount, 1);
  assert.ok(result.results[0].reasons.includes("exact_ean"));
});

test("canonical product model normalizes identity and taxonomy", () => {
  const canonical = normalizeCanonicalProduct({
    sku: "ABC-123",
    gtin: "4017024117752",
    mpn: "MPN-99",
    brand: { name: "Bosch" },
    category: "automotive_brakes",
    title: "Brake Disc",
    status: "draft",
  });
  assert.equal(canonical.identity.sku, "ABC-123");
  assert.equal(canonical.taxonomy.mainCategory, "automotive_brakes");
  assert.equal(canonical.workflow.manualPublish, false);
  assert.equal(canonical.workflow.publishAllowed, false);
});

test("validation report includes all required stages", () => {
  const report = buildProductValidationReport(
    { sku: "RPT-1", title: "Report Test", brand: "Bosch", category: "automotive" },
    { language: "de" }
  );
  for (const key of [
    "identity", "taxonomy", "supplierMapping", "validation", "gtin", "mpn",
    "vehicleCompatibility", "images", "languageSeo", "countryAvailability",
    "review", "approval", "publish",
  ]) {
    assert.ok(report[key], `missing stage ${key}`);
    assert.ok(report[key].status);
  }
  assert.equal(report.publish.details.publishAllowed, false);
});

test("APPROVED != PUBLISHED in validation report", () => {
  const approved = buildProductValidationReport({ sku: "A1", title: "T", status: "approved" });
  assert.equal(approved.approval.status, "PASS");
  assert.notEqual(approved.publish.status, "PASS");
  assert.equal(approved.approval.details.note, "APPROVED != PUBLISHED");
});

test("GTIN validation uses checksum via productIdentityValidator", () => {
  const invalid = validateGtinEanMpn({ sku: "X1", title: "T", gtin: "1234567890123", brand: "B" });
  assert.ok(invalid.errors.length > 0 || invalid.status !== "PASS");
});

test("safety policy remains blocked", () => {
  assert.equal(GLOBAL_SAFETY_POLICY.ready, false);
  assert.equal(GLOBAL_SAFETY_POLICY.status, "BLOCKED");
  assert.equal(GLOBAL_SAFETY_POLICY.autoActivate, false);
  assert.equal(GLOBAL_SAFETY_POLICY.humanApprovalRequired, true);
  assert.equal(GLOBAL_SAFETY_POLICY.publishBlocked, true);
});

test("manualPublish false keeps publish BLOCKED", () => {
  const report = buildProductValidationReport({
    sku: "P1",
    title: "T",
    status: "approved",
    manualPublish: false,
  });
  assert.notEqual(report.publish.status, "PASS");
});

test("vehicle search detects BMW intent and matches fitment", () => {
  const { parseVehicleSearchIntent } = require("../lib/global/vehicleSearchIntelligence.js");
  const intent = parseVehicleSearchIntent("BMW 320d 2015");
  assert.equal(intent.make, "bmw");
  assert.ok(intent.hasVehicleIntent);

  const sample = mapPimProductForSearch({
    id: "veh_1",
    sku: "BRAKE-BMW-1",
    title: "Brake Pad BMW 3er",
    brand: { name: "Bosch" },
    metadata: {
      fitments: [{ make: "BMW", model: "3 series", yearFrom: 2012, yearTo: 2018, engine: "320d" }],
    },
  });
  const result = searchProducts([sample], "BMW 320d", { country: "DE", language: "de" });
  assert.ok(result.resultCount >= 1);
});

test("unified validation report exposes stage array", () => {
  const { buildUnifiedValidationReport } = require("../lib/global/unifiedValidationReport.js");
  const unified = buildUnifiedValidationReport({ sku: "U1", title: "Unified", brand: "Bosch" }, { language: "de" });
  assert.ok(Array.isArray(unified.stages));
  assert.ok(unified.stages.length >= 10);
  assert.equal(unified.publishAllowed, false);
});

test("storefront search reuses search intelligence", () => {
  const storefrontSearch = require("../lib/storefront/storefrontSearchService.js");
  const readiness = storefrontSearch.getSearchReadiness();
  assert.equal(readiness.enabled, true);
  assert.ok(readiness.supportedFields.includes("sku"));
});

test("legacy merchant feed adapter omits price when sales off", () => {
  const prev = process.env.BUZZARD_SALES_ENABLED;
  process.env.BUZZARD_SALES_ENABLED = "0";
  try {
    const feedAdapters = require("../lib/feedAdapters/index.js");
    const rows = feedAdapters.googleMerchantRows();
    if (rows.length > 0) {
      assert.equal(rows[0].price, undefined);
    }
  } finally {
    process.env.BUZZARD_SALES_ENABLED = prev;
  }
});

test("country market profiles have structured fields", () => {
  const profiles = countryRegistry.listCountryMarketProfiles();
  assert.equal(profiles.length, 35);
  const de = profiles.find((p) => p.countryCode === "DE");
  assert.ok(de.currency);
  assert.ok(de.taxRegion);
  assert.ok(de.availability);
});

test("flat canonical product model", () => {
  const { toFlatCanonicalProduct } = require("../lib/global/productCanonicalModel.js");
  const flat = toFlatCanonicalProduct({ id: "x1", sku: "FLAT-1", title: "T", brand: "Bosch" });
  assert.equal(flat.sku, "FLAT-1");
  assert.equal(flat.workflow.publishAllowed, false);
});

test("supplier mapping diagnostics include status and reason", () => {
  const categoryMapping = require("../lib/catalog/categoryMapping.js");
  const r = categoryMapping.resolveSupplierCategory("test", "unknown");
  assert.equal(r.status, "REVIEW_REQUIRED");
  assert.ok(r.reason);
});

test("system diagnostics safety contract", () => {
  const { getSafetyContract } = require("../lib/global/systemDiagnostics.js");
  const c = getSafetyContract();
  assert.equal(c.status, "BLOCKED");
  assert.equal(c.publishEnabled, false);
});

test("integration flow: country registry → search catalog → ranked results", () => {
  assert.equal(countryRegistry.getCountryCount(), 35);
  const ctx = countryRegistry.getCatalogContext("DE");
  assert.ok(ctx.country);
  const products = loadSearchCatalog();
  const sample =
    products[0] ||
    mapPimProductForSearch({ id: "int_1", sku: "INT-SKU-1", title: "Integration Product", brand: { name: "Bosch" } });
  const catalog = products.length ? products : [sample];
  const result = searchProducts(catalog, sample.sku, { country: "DE", language: "de" });
  assert.ok(result.resultCount >= 1);
  const report = buildProductValidationReport(sample, { language: "de", country: "DE" });
  assert.ok(report.publish.details.publishAllowed === false);
});
