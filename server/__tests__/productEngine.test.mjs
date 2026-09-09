import { describe, it } from "node:test";
import assert from "node:assert/strict";
import productEngine from "../core/productEngineRegistry.js";

describe("Server Product Engine Registry", () => {
  it("validates required product fields", () => {
    const result = productEngine.validateServerProduct({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes("SKU_MISSING"));
  });

  it("sanitizes untrusted client patches", () => {
    const existing = {
      productId: "p1",
      sku: "SKU-1",
      pricing: { customerPrice: 100 },
      stock: { quantity: 10 },
      supplierOffers: [{ supplierId: "S1" }],
      status: "ACTIVE",
    };
    const sanitized = productEngine.sanitizeClientPatch(existing, {
      pricing: { customerPrice: 0.01 },
      stock: { quantity: 999 },
    });
    assert.equal(sanitized.pricing.customerPrice, 100);
    assert.equal(sanitized.stock.quantity, 10);
  });

  it("normalizes supplier product via PIM normalizer", () => {
    const normalized = productEngine.normalizeSupplierProduct({
      supplierId: "SUP-TEST",
      raw: {
        supplier_sku: "X-001",
        title: "Test Product",
        brand: "Brand",
        purchase_price: 10,
        currency: "EUR",
        stock: 5,
      },
    });
    assert.equal(normalized.supplierSku, "X-001");
  });

  it("creates product snapshot with tax context", () => {
    const snap = productEngine.createProductSnapshot(
      {
        productId: "test",
        sku: "SKU",
        name: "Test",
        supplierOffers: [{ supplierId: "S1", supplierSku: "SS1", supplierPrice: 10, currency: "EUR" }],
        pricing: { customerPrice: 25, currency: "EUR", supplierCost: 10 },
      },
      { countryCode: "DE" }
    );
    assert.ok(snap.taxContext);
    assert.equal(snap.customerPrice, 25);
  });

  it("blocks discontinued products in market", () => {
    const result = productEngine.isProductAvailableInMarket(
      { status: "DISCONTINUED", availability: [{ countryCode: "DE", status: "ACTIVE" }] },
      "DE"
    );
    assert.equal(result.available, false);
  });
});
