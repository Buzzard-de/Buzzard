/**
 * Synthetic supplier fixture. The rows are not commercial stock or a supplier price.
 */
const { BaseSupplierAdapter } = require("./baseAdapter");
const { SUPPLIER_CAPABILITIES, DATA_FORMAT } = require("../../core/jobConstants");

const FIXTURE = Object.freeze({
  sku: "MOCK-001",
  ean: "4006381333931",
  name: "Mock Oil Filter",
  brand: "MockBrand",
  category: "automotive",
  fixturePrice: 19.99,
  fixtureStock: 42,
  price: null,
  stock: null,
  supplierCost: null,
  images: ["https://example.com/mock.jpg"],
  mock: true,
  live: false,
  commercialUse: false,
});

class MockSupplierAdapter extends BaseSupplierAdapter {
  constructor() {
    super({
      id: "mock",
      name: "Mock Supplier",
      format: DATA_FORMAT.JSON,
      mock: true,
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

  async fetchProducts(req = {}) {
    const blocked = this.blocked(req, { records: [{ ...FIXTURE }] });
    return blocked;
  }

  async fetchPrices(req = {}) {
    return this.blocked(req, { records: [{ sku: FIXTURE.sku, price: null, fixturePrice: FIXTURE.fixturePrice, mock: true }] });
  }

  async healthCheck(req = {}) {
    return this.blocked(req);
  }

  normalizeProduct(raw = {}) {
    if (!raw.sku || typeof raw.sku !== "string") {
      return super.normalizeProduct(raw);
    }
    return {
      sku: raw.sku,
      ean: raw.ean || null,
      gtin: raw.ean || null,
      name: raw.name || null,
      brand: raw.brand || null,
      categoryId: raw.category || null,
      images: raw.images || [],
      supplierId: this.id,
      availability: "UNKNOWN",
      ok: false,
      live: false,
      mock: true,
      status: "BLOCKED_EXTERNAL",
      commercialEligibility: "BLOCKED",
      price: null,
      stock: null,
      supplierCost: null,
      fixturePrice: raw.fixturePrice ?? null,
      fixtureStock: raw.fixtureStock ?? null,
      commercialUse: false,
      raw,
    };
  }
}

module.exports = { MockSupplierAdapter, FIXTURE };
