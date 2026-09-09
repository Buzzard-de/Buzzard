import { describe, it } from "node:test";
import assert from "node:assert/strict";
import inventoryEngine from "../core/inventoryEngineRegistry.js";

const {
  rejectClientInventoryModification,
  validateInventoryRequest,
  sanitizeClientInventoryPatch,
  validateSupplierQuantity,
  calculateSaleableQuantity,
} = inventoryEngine;

describe("Server Inventory Engine Registry", () => {
  it("rejects client saleable quantity modification", () => {
    const result = rejectClientInventoryModification({ saleableQuantity: 100 });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "INVENTORY_FIELDS_NOT_CLIENT_WRITABLE");
  });

  it("rejects client stock status modification", () => {
    const result = rejectClientInventoryModification({ stockStatus: "IN_STOCK" });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientInventoryModification({ apiKey: "secret" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "CREDENTIALS_NOT_ALLOWED_ON_CLIENT");
  });

  it("validates inventory request fields", () => {
    assert.equal(validateInventoryRequest({}).valid, false);
    assert.equal(
      validateInventoryRequest({
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        supplierOfferId: "TSA-TIRE-225-45-17",
      }).valid,
      true
    );
  });

  it("validates supplier quantity server-side", () => {
    assert.equal(validateSupplierQuantity(-1).valid, false);
    assert.equal(validateSupplierQuantity(null).valid, false);
    assert.equal(validateSupplierQuantity(10).valid, true);
    assert.equal(validateSupplierQuantity(10).normalizedQuantity, 10);
  });

  it("calculates saleable quantity with buffer and reservations", () => {
    assert.equal(calculateSaleableQuantity(100, 5, 10), 85);
  });

  it("sanitizes client inventory patches", () => {
    const existing = { note: "ok", saleableQuantity: 10 };
    const patch = { note: "updated", saleableQuantity: 999 };
    const sanitized = sanitizeClientInventoryPatch(existing, patch);
    assert.equal(sanitized.note, "updated");
    assert.equal(sanitized.saleableQuantity, 10);
  });
});
