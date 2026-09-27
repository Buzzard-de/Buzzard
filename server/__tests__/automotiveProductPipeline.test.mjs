import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const {
  runAutomotiveProductPipeline,
  PIPELINE_STAGES,
  WORKFLOW_STATES,
} = require("../lib/catalog/automotiveProductPipeline.js");
const { validateSafetyPolicy } = require("../core/automotive/automotiveValidation.js");

function baseProduct(overrides = {}) {
  const suffix = crypto.randomBytes(4).toString("hex");
  return {
    sku: `AUTO-PIPE-${suffix}`,
    title: "Example Brake Pad Set",
    name: "Example Brake Pad Set",
    brand: "ExampleBrand",
    gtin: "5901234123457",
    mpn: `BP-${suffix}`,
    ean: "5901234123457",
    supplier: "mock",
    supplierCategory: "automotive/brakes",
    supplierSubcategory: "pads",
    categoryId: "automotive",
    subcategoryId: "auto-sub-04",
    subSubcategoryId: "auto-sub-04--brake-pads",
    images: ["https://cdn.buzzard24.de/placeholder/product.jpg"],
    compatibleVehicles: [{ vehicleType: "passenger-car", make: "VW", model: "Golf", yearFrom: 2015, yearTo: 2020 }],
    seo: { slug: `example-brake-pad-${suffix}`, metaTitle: "Example Brake Pad Set", metaDescription: "Test product" },
    price: 49.99,
    stock: 10,
    state: "DRAFT",
    ...overrides,
  };
}

test("pipeline defines all 11 stages in order", () => {
  assert.equal(PIPELINE_STAGES.length, 11);
  assert.equal(PIPELINE_STAGES[0], "automotive_taxonomy");
  assert.equal(PIPELINE_STAGES[PIPELINE_STAGES.length - 1], "manual_publish");
});

test("automotive taxonomy and supplier mapping pass for valid product", () => {
  const result = runAutomotiveProductPipeline(baseProduct());
  const taxonomy = result.stages.find((s) => s.stage === "automotive_taxonomy");
  const mapping = result.stages.find((s) => s.stage === "supplier_category_mapping");
  assert.equal(taxonomy.status, "PASS");
  assert.equal(mapping.status, "PASS");
});

test("GTIN EAN MPN stage validates identity", () => {
  const result = runAutomotiveProductPipeline(baseProduct());
  const identity = result.stages.find((s) => s.stage === "gtin_ean_mpn");
  assert.equal(identity.status, "PASS");
});

test("vehicle compatibility stage passes with fitment", () => {
  const result = runAutomotiveProductPipeline(baseProduct());
  const compat = result.stages.find((s) => s.stage === "vehicle_compatibility");
  assert.equal(compat.status, "PASS");
});

test("admin review pending for DRAFT state", () => {
  const result = runAutomotiveProductPipeline(baseProduct({ state: WORKFLOW_STATES.DRAFT }));
  const review = result.stages.find((s) => s.stage === "admin_review");
  const approved = result.stages.find((s) => s.stage === "approved");
  assert.equal(review.status, "PENDING");
  assert.equal(approved.status, "BLOCKED");
});

test("approved stage passes only when state is APPROVED", () => {
  const result = runAutomotiveProductPipeline(baseProduct({ state: WORKFLOW_STATES.APPROVED }));
  const approved = result.stages.find((s) => s.stage === "approved");
  assert.equal(approved.status, "PASS");
});

test("manual publish blocked without explicit request", () => {
  const result = runAutomotiveProductPipeline(baseProduct({ state: WORKFLOW_STATES.APPROVED }));
  const publish = result.stages.find((s) => s.stage === "manual_publish");
  assert.equal(publish.status, "BLOCKED");
  assert.equal(result.workflow.manualPublishOnly, true);
  assert.equal(result.workflow.publishAllowed, false);
});

test("manual publish ready when approved and all stages pass", () => {
  const result = runAutomotiveProductPipeline(
    baseProduct({ state: WORKFLOW_STATES.APPROVED }),
    { manualPublish: true, requireImage: false }
  );
  const publish = result.stages.find((s) => s.stage === "manual_publish");
  assert.equal(publish.status, "READY");
});

test("automatic PUBLISHED state is rejected", () => {
  const result = runAutomotiveProductPipeline(baseProduct({ state: WORKFLOW_STATES.PUBLISHED }));
  const publish = result.stages.find((s) => s.stage === "manual_publish");
  assert.equal(publish.status, "FAIL");
  assert.ok(publish.errors.some((e) => e.includes("automatic publish")));
});

test("recommended state is REVIEW when validation passes", () => {
  const result = runAutomotiveProductPipeline(baseProduct(), { requireImage: false });
  assert.equal(result.workflow.recommended, WORKFLOW_STATES.REVIEW);
  assert.equal(result.status, "READY_FOR_ADMIN_REVIEW");
});

test("safety remains fail-closed", () => {
  const safety = validateSafetyPolicy();
  assert.equal(safety.valid, true);
  assert.equal(safety.policy.autoActivate, false);
  assert.equal(safety.policy.publishEnabled, false);
});
