/**
 * Part 5 — Mock supplier adapter for pipeline testing.
 */
const { BaseSupplierAdapter } = require("./baseAdapter");
const { SUPPLIER_CAPABILITIES, DATA_FORMAT } = require("../../core/jobConstants");

class MockSupplierAdapter extends BaseSupplierAdapter {
  constructor() {
    super({
      id: "mock",
      name: "Mock Supplier",
      format: DATA_FORMAT.JSON,
      capabilities: [
        SUPPLIER_CAPABILITIES.AUTHENTICATE,
        SUPPLIER_CAPABILITIES.PRODUCTS,
        SUPPLIER_CAPABILITIES.PRICES,
        SUPPLIER_CAPABILITIES.STOCK,
        SUPPLIER_CAPABILITIES.AVAILABILITY,
        SUPPLIER_CAPABILITIES.CATEGORIES,
        SUPPLIER_CAPABILITIES.HEALTH_CHECK,
      ],
    });
  }

  async fetchProducts() {
    return [
      {
        sku: "MOCK-001",
        ean: "4006381333931",
        name: "Mock Oil Filter",
        brand: "MockBrand",
        category: "automotive",
        price: 19.99,
        stock: 42,
        images: ["https://example.com/mock.jpg"],
      },
    ];
  }

  async healthCheck() {
    return { ok: true, latencyMs: 5 };
  }

  normalizeProduct(raw) {
    return {
      sku: raw.sku,
      ean: raw.ean,
      gtin: raw.ean,
      name: raw.name,
      brand: raw.brand,
      categoryId: raw.category,
      price: raw.price,
      stock: raw.stock,
      images: raw.images || [],
      supplierId: this.id,
      availability: raw.stock > 0 ? "in_stock" : "out_of_stock",
      raw,
    };
  }
}

module.exports = { MockSupplierAdapter };
