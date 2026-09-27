import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getFiltersForCategory, productMatchesFilters } = require("../core/automotive/automotiveFilters.js");

test("tires category has dynamic filters", () => {
  const filters = getFiltersForCategory("auto-sub-01");
  assert.ok(filters.some((f) => f.key === "tireWidth"));
  assert.ok(filters.some((f) => f.key === "season"));
});

test("oils category has viscosity filter", () => {
  const filters = getFiltersForCategory("auto-sub-03");
  assert.ok(filters.some((f) => f.key === "viscosity"));
});

test("product filter matching", () => {
  assert.equal(
    productMatchesFilters({ attributes: { brand: "Example", tireWidth: "205" } }, { brand: "Example" }),
    true
  );
  assert.equal(
    productMatchesFilters({ attributes: { brand: "Example" } }, { brand: "Other" }),
    false
  );
});
