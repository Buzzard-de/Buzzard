/**
 * Part 5 — Base supplier adapter (orders DISABLED in Part 5).
 */
const { SUPPLIER_CAPABILITIES, DATA_FORMAT } = require("../../core/jobConstants");
const { emptyProduct } = require("./normalizedModels");

class BaseSupplierAdapter {
  constructor({ id, name, format = DATA_FORMAT.REST, capabilities = [] }) {
    this.id = id;
    this.name = name;
    this.format = format;
    this.capabilities = capabilities;
    this.ordersEnabled = false;
  }

  supports(cap) {
    return this.capabilities.includes(cap);
  }

  async authenticate() {
    return { ok: true, token: "foundation" };
  }

  async fetchProducts() {
    return [];
  }

  async fetchPrices() {
    return [];
  }

  async fetchStock() {
    return [];
  }

  async fetchAvailability() {
    return [];
  }

  async fetchCategories() {
    return [];
  }

  async submitOrder() {
    throw new Error("Supplier orders disabled — BUZZARD_SALES_ENABLED=0");
  }

  async healthCheck() {
    return { ok: true, latencyMs: 0 };
  }

  normalizeProduct(raw) {
    return emptyProduct({ raw, supplierId: this.id });
  }
}

module.exports = { BaseSupplierAdapter, SUPPLIER_CAPABILITIES };
