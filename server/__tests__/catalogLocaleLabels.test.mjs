import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "vitest";

const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL("lib/categories/translations/catalog-locale.json", root), "utf8"));
const countries = JSON.parse(fs.readFileSync(new URL("lib/market/country-names.json", root), "utf8"));
const tree = JSON.parse(fs.readFileSync(new URL("data/buzzard_categories.json", root), "utf8"));
const locales = JSON.parse(fs.readFileSync(new URL("lib/i18n/supported-locales.json", root), "utf8"));

describe("catalog locale labels", () => {
it("every main category has a label in all 30 locales", () => {
  assert.equal(locales.length, 30);
  assert.equal(tree.categories.length, 53);
  for (const category of tree.categories) {
    for (const locale of locales) {
      const label = catalog.mains[category.id]?.[locale];
      assert.ok(label && label.trim(), `${category.id} ${locale}`);
    }
  }
});

it("every textile node has a single-language label", () => {
  const nodes = [];
  const walk = (items) => {
    for (const item of items) {
      if (String(item.id).startsWith("cat-01") && item.id !== "cat-01") nodes.push(item);
      walk(item.children || []);
    }
  };
  walk(tree.categories);
  assert.equal(nodes.length, 78);
  for (const node of nodes) {
    for (const locale of locales) {
      const label = catalog.textile[node.id]?.[locale];
      assert.ok(label && label.trim(), `${node.id} ${locale}`);
    }
    assert.equal(catalog.textile[node.id].de.includes("Elbise"), false);
    assert.equal(catalog.textile[node.id].tr.includes("Damenbekleidung"), false);
    assert.equal(catalog.textile[node.id].fr.includes("Elbise"), false);
    assert.equal(catalog.textile[node.id].fr.includes("Damenbekleidung"), false);
  }
  assert.equal(catalog.textile["cat-01-01-01"].de, "Kleid");
  assert.equal(catalog.textile["cat-01-01-01"].tr, "Elbise");
  assert.equal(catalog.textile["cat-01-01-01"].fr, "Robe");
  assert.equal(catalog.textile["cat-01-01"].tr, "Kadın Giyim");
  assert.equal(catalog.textile["cat-14-06-02"].de, "Trekkinghose");
  assert.equal(catalog.textile["cat-17-01-07"].de, "Babykleid");
  assert.equal(catalog.textile["cat-17-01-07"].fr.includes("Elbise"), false);
});

it("the 27 EU country names are localized in the selector", () => {
  assert.equal(countries.eu.length, 27);
  for (const code of countries.eu) {
    for (const locale of locales) {
      const name = countries.names[code]?.[locale];
      assert.ok(name && name.trim(), `${code} ${locale}`);
    }
  }
  assert.equal(countries.names.DE.fr, "Allemagne");
  assert.equal(countries.names.DE.de, "Deutschland");
  assert.equal(countries.names.IE.en, "Ireland");
  assert.equal(countries.names.IE.ar, "أيرلندا");
  assert.notEqual(countries.names.FR.ar, countries.names.FR.de);
});
});
