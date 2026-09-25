#!/usr/bin/env node
/**
 * PR #299 — Full automotive pipeline merge check scenarios.
 * Every unsafe operation must fail closed.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runAutomotiveProductPipeline, PIPELINE_STAGES } = require("../server/lib/catalog/automotiveProductPipeline.js");
const { validateSafetyPolicy } = require("../server/core/automotive/automotiveValidation.js");
const { AUTOMOTIVE_SAFETY_POLICY } = require("../server/core/automotive/automotiveTaxonomy.js");

function product(overrides = {}) {
  const suffix = crypto.randomBytes(4).toString("hex");
  return {
    sku: `MERGE-${suffix}`,
    title: "Merge Check Brake Pad",
    brand: "MergeBrand",
    gtin: "5901234123457",
    mpn: `MPN-${suffix}`,
    ean: "5901234123457",
    supplier: "mock",
    supplierCategory: "automotive/brakes",
    supplierSubcategory: "pads",
    categoryId: "automotive",
    subcategoryId: "auto-sub-04",
    subSubcategoryId: "auto-sub-04--brake-pads",
    images: ["https://cdn.buzzard24.de/placeholder/product.jpg"],
    compatibleVehicles: [{ vehicleType: "passenger-car", make: "VW", model: "Golf", yearFrom: 2015, yearTo: 2020 }],
    seo: { slug: `merge-check-${suffix}`, metaTitle: "Merge Check", metaDescription: "Pipeline merge check product" },
    i18n: { de: { title: "Merge Check DE" }, en: { title: "Merge Check EN" } },
    price: 49.99,
    stock: 10,
    state: "DRAFT",
    ...overrides,
  };
}

const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}

console.log("=== PIPELINE STAGE ORDER ===");
assert.deepEqual(PIPELINE_STAGES, [
  "automotive_taxonomy",
  "pim",
  "supplier_category_mapping",
  "product_validation",
  "gtin_ean_mpn",
  "vehicle_compatibility",
  "image_control",
  "language_seo",
  "admin_review",
  "approved",
  "manual_publish",
]);
console.log("PASS  all 11 pipeline stages defined in order\n");

console.log("=== SCENARIO TESTS ===");

check("1 valid product → READY_FOR_ADMIN_REVIEW", () => {
  const r = runAutomotiveProductPipeline(product(), { requireImage: false });
  assert.equal(r.status, "READY_FOR_ADMIN_REVIEW");
  assert.equal(r.stages.find((s) => s.stage === "automotive_taxonomy").status, "PASS");
  assert.equal(r.stages.find((s) => s.stage === "gtin_ean_mpn").status, "PASS");
});

check("2 missing GTIN/EAN → gtin stage FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ gtin: null, ean: null }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "gtin_ean_mpn").status, "FAIL");
});

check("3 invalid EAN checksum → gtin stage FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ gtin: "4006633001234", ean: "4006633001234" }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "gtin_ean_mpn").status, "FAIL");
});

check("4 missing MPN → gtin stage FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ mpn: null }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "gtin_ean_mpn").status, "FAIL");
});

check("5 invalid category → taxonomy FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ subcategoryId: "invalid-cat" }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "automotive_taxonomy").status, "FAIL");
});

check("6 invalid vehicle compatibility → compat FAIL", () => {
  const r = runAutomotiveProductPipeline(
    product({ compatibleVehicles: [{ vehicleType: "not-real-type" }] }),
    { requireImage: false }
  );
  assert.equal(r.stages.find((s) => s.stage === "vehicle_compatibility").status, "FAIL");
});

check("7 missing image → image_control FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ images: [] }), { requireImage: true });
  assert.equal(r.stages.find((s) => s.stage === "image_control").status, "FAIL");
});

check("8 demo image host → image_control FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ images: ["https://example.com/demo.jpg"] }), { requireImage: true });
  assert.equal(r.stages.find((s) => s.stage === "image_control").status, "FAIL");
});

check("9 missing translation → language_seo FAIL when i18n empty title", () => {
  const r = runAutomotiveProductPipeline(
    product({ i18n: { de: { title: "" }, en: { title: "OK" } } }),
    { requireImage: false }
  );
  assert.equal(r.stages.find((s) => s.stage === "language_seo").status, "FAIL");
});

check("10 invalid SEO slug → language_seo FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ seo: { slug: "Invalid Slug!" } }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "language_seo").status, "FAIL");
});

check("11 REVIEW state → admin_review PASS, approved BLOCKED", () => {
  const r = runAutomotiveProductPipeline(product({ state: "REVIEW" }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "admin_review").status, "PASS");
  assert.equal(r.stages.find((s) => s.stage === "approved").status, "BLOCKED");
});

check("12 APPROVED state → approved PASS", () => {
  const r = runAutomotiveProductPipeline(product({ state: "APPROVED" }), { requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "approved").status, "PASS");
});

check("13 attempted automatic publish (PUBLISHED state) → manual_publish FAIL", () => {
  const r = runAutomotiveProductPipeline(product({ state: "PUBLISHED" }), { requireImage: false });
  const pub = r.stages.find((s) => s.stage === "manual_publish");
  assert.equal(pub.status, "FAIL");
  assert.ok(pub.errors.some((e) => e.includes("automatic publish")));
});

check("14 publish without manualPublish=true → manual_publish BLOCKED", () => {
  const r = runAutomotiveProductPipeline(product({ state: "APPROVED" }), { manualPublish: false, requireImage: false });
  assert.equal(r.stages.find((s) => s.stage === "manual_publish").status, "BLOCKED");
  assert.equal(r.workflow.publishAllowed, false);
});

check("15 APPROVED does NOT auto-publish (manualPublish false)", () => {
  const r = runAutomotiveProductPipeline(product({ state: "APPROVED" }), { requireImage: false });
  assert.notEqual(r.stages.find((s) => s.stage === "manual_publish").status, "PASS");
  assert.equal(r.workflow.manualPublishOnly, true);
});

console.log("\n=== SAFETY POLICY ===");
const safety = validateSafetyPolicy();
check("safety policy valid", () => assert.equal(safety.valid, true));
check("autoActivate=false", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.autoActivate, false));
check("activationAllowed=false", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.activationAllowed, false));
check("humanApprovalRequired=true", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.humanApprovalRequired, true));
check("diagnosticOnly=true", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.diagnosticOnly, true));
check("salesEnabled=false", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.salesEnabled, false));
check("publishEnabled=false", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.publishEnabled, false));
check("supplierLive=false", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.supplierLive, false));
check("status=BLOCKED", () => assert.equal(AUTOMOTIVE_SAFETY_POLICY.status, "BLOCKED"));

const failed = results.filter((r) => !r.pass);
console.log(`\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  console.error("FAILED:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
