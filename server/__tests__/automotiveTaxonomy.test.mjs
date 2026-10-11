import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const taxonomy = require("../core/automotive/automotiveTaxonomy.js");
const { validateTaxonomyIntegrity, validateSafetyPolicy, validateAutomotiveProduct } = require("../core/automotive/automotiveValidation.js");
const { getAllAttributeKeys, validateAttributeKey } = require("../core/automotive/automotiveAttributes.js");
const taxonomyResolver = require("../lib/catalog/taxonomyResolver.js");
const categoryMapping = require("../lib/catalog/categoryMapping.js");

test("automotive main category exists", () => {
  const root = taxonomy.getAutomotiveRoot();
  assert.equal(root.id, "automotive");
  assert.equal(root.slug, "automotive");
});

test("15 primary automotive subcategories exist", () => {
  const subs = taxonomy.getSubcategories();
  assert.equal(subs.length, 15);
});

test("every subcategory has sub-subcategories", () => {
  for (const sub of taxonomy.getSubcategories()) {
    const children = taxonomy.getChildren(sub.id);
    assert.ok(children.length > 0, `${sub.id} has no children`);
  }
});

test("taxonomy integrity validation passes", () => {
  const result = validateTaxonomyIntegrity();
  assert.equal(result.valid, true, result.errors?.join("; "));
  assert.ok(result.stats.total > 300);
});

test("all categories have DE EN TR AR names", () => {
  for (const node of taxonomy.flattenCategories()) {
    for (const locale of ["de", "en", "tr", "ar"]) {
      assert.ok(node.name?.[locale], `${node.id} missing name.${locale}`);
    }
  }
});

test("no duplicate full slug paths", () => {
  const seen = new Set();
  function walk(node, parts = []) {
    const next = node.id === "automotive" ? parts : [...parts, node.slug];
    const key = next.join("/");
    if (key) {
      assert.ok(!seen.has(key), `duplicate slug path ${key}`);
      seen.add(key);
    }
    for (const child of node.children || []) walk(child, next);
  }
  walk(taxonomy.getAutomotiveRoot(), []);
});

test("category URLs generated correctly", () => {
  const tires = taxonomy.getCategoryBySlugPath("tires-wheels");
  assert.ok(tires);
  assert.equal(taxonomy.getCategoryUrl(tires), "/products/automotive/tires-wheels/");
  const carTires = taxonomy.getCategoryBySlugPath("tires-wheels/car-tires");
  assert.ok(carTires);
  assert.equal(taxonomy.getCategoryUrl(carTires), "/products/automotive/tires-wheels/car-tires/");
});

test("breadcrumbs resolve correctly", () => {
  const carTires = taxonomy.getCategoryBySlugPath("tires-wheels/car-tires");
  const chain = taxonomyResolver.resolveBreadcrumb(carTires.id);
  assert.equal(chain.length, 3);
  assert.equal(chain[0].id, "automotive");
  assert.equal(chain[2].slug, "car-tires");
});

test("filters generated for tires category", () => {
  const filters = taxonomyResolver.resolveCategory("auto-sub-01");
  assert.ok(filters.filters.length >= 5);
});

test("automotive attributes valid", () => {
  assert.ok(validateAttributeKey("tireWidth"));
  assert.ok(validateAttributeKey("viscosity"));
  assert.equal(validateAttributeKey("notRealAttribute"), false);
  assert.ok(getAllAttributeKeys().length >= 20);
});

test("supplier mapping resolves mock category", () => {
  const mapped = categoryMapping.resolveSupplierCategory("mock", "automotive/tires", "passenger", "summer");
  assert.equal(mapped.mapped, true);
  assert.equal(mapped.buzzardSubcategoryId, "auto-sub-01");
});

test("automatic publish rejected", () => {
  const result = validateAutomotiveProduct({
    sku: "TEST-001",
    categoryId: "auto-sub-01",
    state: "PUBLISHED",
  });
  assert.equal(result.valid, false);
});

test("safety policy fail-closed", () => {
  const safety = validateSafetyPolicy();
  assert.equal(safety.valid, true);
  assert.equal(safety.policy.ready, false);
  assert.equal(safety.policy.status, "BLOCKED");
  assert.equal(safety.policy.diagnosticOnly, true);
  assert.equal(safety.policy.autoActivate, false);
  assert.equal(safety.policy.activationAllowed, false);
  assert.equal(safety.policy.supplierLive, false);
  assert.equal(safety.policy.salesEnabled, false);
  assert.equal(safety.policy.humanApprovalRequired, true);
});
