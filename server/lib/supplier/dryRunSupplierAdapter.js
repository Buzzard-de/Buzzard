/**
 * Part 23 — Dry-run supplier adapter base (no outbound network).
 */
const { BaseSupplierAdapter } = require("./baseAdapter");
const { DATA_FORMAT } = require("../../core/jobConstants");
const { SUPPLIER_ADAPTER_FORMAT } = require("../../core/supplierIntegrationConstants");
const { createSupplierError } = require("./supplierErrors");
const { SUPPLIER_ERROR_CODE } = require("../../core/supplierIntegrationConstants");

const SAMPLE_PRODUCTS = [
  {
    supplier_sku: "DRY-SKU-001",
    sku: "DRY-SKU-001",
    ean_gtin: "5901234123457",
    mpn: "P85073",
    brand: "ATE",
    name: "Bremsbelag Set Vorderachse",
    description: "Synthetic dry-run brake pad set for catalog review.",
    supplier_category: "automotive/bremssystem",
    supplier_price: { amount: 40, currency: "EUR" },
    shipping_cost: 6,
    marketplace_fee: 4,
    payment_fee: 1.2,
    return_reserve: 1,
    other_cost: 0,
    comparable_market_price: 90,
    stock: 12,
    reserved_stock: 2,
    stock_updated_at: new Date().toISOString(),
    country: "DE",
    images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  },
];

class DryRunSupplierAdapter extends BaseSupplierAdapter {
  constructor({
    id,
    name,
    format = SUPPLIER_ADAPTER_FORMAT.API,
    capabilities = [],
    credentialsConfigured = false,
    config = {},
  }) {
    super({ id, name, format: format.toUpperCase(), capabilities });
    this.adapterFormat = format;
    this.credentialsConfigured = credentialsConfigured;
    this.config = config;
    this.networkBlocked = true;
  }

  assertNetworkBlocked() {
    const err = createSupplierError(SUPPLIER_ERROR_CODE.NETWORK_BLOCKED, {
      message: "Outbound supplier network calls are blocked in production safety mode",
      supplierId: this.id,
    });
    throw err;
  }

  validateConfiguration() {
    const issues = [];
    if (!this.id) issues.push("missing_supplier_id");
    if (!this.name) issues.push("missing_supplier_name");
    if (!this.credentialsConfigured) {
      issues.push("credentials_not_configured");
    }
    return {
      ok: issues.length === 0,
      credentialsConfigured: this.credentialsConfigured,
      canGoLive: false,
      issues,
      dryRun: true,
      networkBlocked: this.networkBlocked,
    };
  }

  async fetchProducts() {
    this.assertNetworkBlocked();
    return [];
  }

  async fetchProductsDryRun(options = {}) {
    const limit = Math.min(Number(options.limit) || 10, 100);
    const fetchedAt = new Date().toISOString();
    return {
      ok: true,
      dryRun: true,
      live: false,
      records: SAMPLE_PRODUCTS.slice(0, limit).map((product) => ({
        ...product,
        stock_updated_at: fetchedAt,
      })),
      total: SAMPLE_PRODUCTS.length,
      fetchedAt,
    };
  }

  async fetchStock() {
    return this.fetchProductsDryRun().then((r) =>
      r.records.map((p) => ({
        sku: p.supplier_sku,
        stock: p.stock,
        updatedAt: new Date().toISOString(),
      }))
    );
  }

  async fetchPrices() {
    return this.fetchProductsDryRun().then((r) =>
      r.records.map((p) => ({
        sku: p.supplier_sku,
        amount: p.supplier_price?.amount,
        currency: p.supplier_price?.currency || "EUR",
        updatedAt: new Date().toISOString(),
      }))
    );
  }

  mapProduct(raw) {
    return this.normalizeProduct(raw);
  }

  normalizeProduct(raw) {
    return {
      supplierSku: raw.supplier_sku || raw.sku || "",
      sku: raw.supplier_sku || raw.sku || "",
      ean: raw.ean_gtin || raw.gtin || raw.ean || null,
      gtin: raw.ean_gtin || raw.gtin || raw.ean || null,
      mpn: raw.mpn || null,
      brand: raw.brand || null,
      title: raw.name || raw.title || "",
      category: raw.supplier_category || raw.category || null,
      price: raw.supplier_price?.amount ?? raw.price ?? null,
      currency: raw.supplier_price?.currency || raw.currency || "EUR",
      stock: Number(raw.stock ?? 0),
      images: raw.images || [],
      supplierId: this.id,
      raw,
    };
  }

  async healthCheck() {
    const config = this.validateConfiguration();
    return {
      ok: true,
      dryRun: true,
      latencyMs: 0,
      credentialsConfigured: config.credentialsConfigured,
      networkBlocked: this.networkBlocked,
      adapterFormat: this.adapterFormat,
    };
  }
}

module.exports = { DryRunSupplierAdapter, SAMPLE_PRODUCTS };
