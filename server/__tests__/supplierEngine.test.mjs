import { describe, it } from "node:test";
import assert from "node:assert/strict";
import supplierEngine from "../core/supplierEngineRegistry.js";

describe("Server Supplier Engine Registry", () => {
  it("rejects client credential payloads", () => {
    const result = supplierEngine.validateSyncRequest({ api_key: "secret" }, "client");
    assert.equal(result.allowed, false);
  });

  it("rejects client price/stock modification", () => {
    const result = supplierEngine.validateSyncRequest({ supplierPrice: 1 }, "client");
    assert.equal(result.allowed, false);
  });

  it("allows server sync requests", () => {
    const result = supplierEngine.validateSyncRequest({ supplierId: "TEST" }, "server");
    assert.equal(result.allowed, true);
  });

  it("validates supplier id", () => {
    const valid = supplierEngine.validateSupplierId("TEST_SUPPLIER_A", ["TEST_SUPPLIER_A"]);
    assert.equal(valid.valid, true);
    const invalid = supplierEngine.validateSupplierId("UNKNOWN", ["TEST_SUPPLIER_A"]);
    assert.equal(invalid.valid, false);
  });

  it("normalizes via PIM normalizer", () => {
    const normalized = supplierEngine.normalizeSupplierFeedRecord(
      { supplier_sku: "X1", title: "Test", brand: "B", purchase_price: 10, stock: 5 },
      { supplierId: "TEST" }
    );
    assert.equal(normalized.supplierSku, "X1");
  });

  it("redacts secrets", () => {
    const redacted = supplierEngine.redactSecrets({ api_key: "abc", name: "test" });
    assert.equal(redacted.api_key, "[REDACTED]");
  });
});
