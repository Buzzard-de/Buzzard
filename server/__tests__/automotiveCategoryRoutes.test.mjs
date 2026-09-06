import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const taxonomy = require("../core/automotive/automotiveTaxonomy.js");

test("automotive root route path", () => {
  assert.equal(taxonomy.getCategoryUrl(taxonomy.getAutomotiveRoot()), "/products/automotive/");
});

test("all subcategory routes under /products/automotive/", () => {
  for (const sub of taxonomy.getSubcategories()) {
    const url = taxonomy.getCategoryUrl(sub);
    assert.ok(url.startsWith("/products/automotive/"), url);
    assert.ok(url.endsWith("/"), url);
  }
});

test("all L3 routes have three path segments", () => {
  const tires = taxonomy.getCategoryBySlugPath("tires-wheels");
  for (const child of taxonomy.getChildren(tires.id)) {
    const url = taxonomy.getCategoryUrl(child);
    assert.match(url, /^\/products\/automotive\/tires-wheels\/[a-z0-9-]+\/$/);
  }
});

test("stable english slugs", () => {
  assert.ok(taxonomy.getCategoryBySlugPath("engine-engine-parts"));
  assert.ok(taxonomy.getCategoryBySlugPath("brakes"));
  assert.ok(taxonomy.getCategoryBySlugPath("motorcycle-atv-quad"));
});
