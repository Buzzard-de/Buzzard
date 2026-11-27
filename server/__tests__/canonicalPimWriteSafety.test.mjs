import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const productCore = require("../lib/pim/productCore");
const pimCatalog = require("../lib/pimCatalog");
const { db } = require("../lib/db");

const actor = { actorId: "pim-writer@example.invalid", actorType: "HUMAN" };

function sku() {
  return `PIM25-${randomBytes(3).toString("hex")}`;
}

describe("canonical PIM writes", () => {
  it("rejects an actorless or AI write and invalid product data without inserting a row", () => {
    const before = db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n;
    expect(() => productCore.createProduct({ sku: sku(), title: "No actor" })).toThrow(/ACTOR_REQUIRED/);
    expect(() => productCore.createProduct({ sku: sku(), title: "AI" }, { actorId: "mira", actorType: "AI" })).toThrow(/AI_WRITE_DENIED/);
    expect(() => productCore.createProduct({ title: "Missing sku" }, actor)).toThrow(/SKU required/);
    for (const input of [{ price: -1 }, { stock: "nope" }, { status: "ACTIVE" }]) {
      try {
        productCore.createProduct({ sku: sku(), ...input }, actor);
        throw new Error("create should have failed");
      } catch (error) {
        expect(error.code || error.message).toMatch(/PRODUCT_INVALID|ACTIVE status not allowed/);
      }
    }
    expect(db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n).toBe(before);
  });

  it("keeps the previous row when a later identifier check would have failed", () => {
    const first = productCore.createProduct({ sku: sku(), title: "First", ean: `E${randomBytes(3).toString("hex")}`, price: 10 }, actor);
    const second = productCore.createProduct({ sku: sku(), title: "Second", price: 8, stock: 2 }, actor);
    try {
      productCore.updateProduct(second.id, { price: 15, ean: first.ean }, actor);
      throw new Error("update should have failed");
    } catch (error) {
      expect(error.code).toBe("duplicate_ean");
    }
    const stored = productCore.getProduct(second.id);
    expect(stored.price).toBe(8);
    expect(stored.stock).toBe(2);
    expect(stored.ean).toBeFalsy();
  });

  it("keeps both fields when two updates arrive one after another, and blocks a second writer during a transaction", () => {
    const created = productCore.createProduct({ sku: sku(), title: "Concurrent", price: 4, stock: 1 }, actor);
    productCore.updateProduct(created.id, { price: 6 }, actor);
    productCore.updateProduct(created.id, { stock: 3 }, actor);
    const stored = productCore.getProduct(created.id);
    expect(stored.price).toBe(6);
    expect(stored.stock).toBe(3);

    const side = new Database(db.name);
    side.pragma("busy_timeout = 200");
    db.exec("BEGIN IMMEDIATE");
    try {
      expect(() => side.prepare("UPDATE pim_core_products SET price = 99 WHERE id = ?").run(created.id)).toThrow(/busy|locked/i);
    } finally {
      db.exec("ROLLBACK");
      side.close();
    }
    expect(productCore.getProduct(created.id).price).toBe(6);
  });

  it("sends a projection price change through the canonical product before the legacy row changes", () => {
    const code = sku();
    const created = pimCatalog.createProduct({ sku: code, title: "Projection", price: 20, stock: 5 }, actor);
    expect(created.canonicalProductId).toMatch(/^pim_prod_/);
    const legacyId = created.product.id;
    const rejected = pimCatalog.updateProduct(legacyId, { price: -3 }, actor);
    expect(rejected.code).toBe("PRODUCT_INVALID");
    expect(productCore.getProduct(created.canonicalProductId).price).toBe(20);
    expect(db.prepare("SELECT price FROM pim_products WHERE id = ?").get(legacyId).price).toBe(20);

    const updated = pimCatalog.updateProduct(legacyId, { price: 22, stock: 6 }, actor);
    expect(updated.product.price).toBe(22);
    expect(productCore.getProduct(created.canonicalProductId).price).toBe(22);
    expect(productCore.getProduct(created.canonicalProductId).stock).toBe(6);
  });
});
