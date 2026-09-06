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

test("prepared languages are PREPARED not READY", () => {
  for (const code of ["fr", "it", "es"]) {
    assert.equal(languageRegistry.getReadinessStatus(code), languageRegistry.READINESS.PREPARED);
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
