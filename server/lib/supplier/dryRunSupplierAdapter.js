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
    supplier_category: "automotive/brakes",
    supplier_price: { amount: 24.5, currency: "EUR" },
    stock: 12,
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
    return {
      ok: false,
      dryRun: true,
      live: false,
      mock: true,
      status: "BLOCKED_EXTERNAL",
      code: "MOCK_NOT_COMMERCIAL",
      commercialEligibility: "BLOCKED",
      supplierCost: null,
      price: null,
      stock: null,
      purchased: false,
      records: SAMPLE_PRODUCTS.slice(0, limit).map((row) => ({
        ...row,
        supplier_price: null,
        stock: null,
        fixturePrice: row.supplier_price,
        fixtureStock: row.stock,
        commercialUse: false,
        mock: true,
        live: false,
      })),
      total: SAMPLE_PRODUCTS.length,
      fetchedAt: null,
    };
  }

  async fetchStock() {
    const fetched = await this.fetchProductsDryRun();
    return {
      ...fetched,
      records: fetched.records.map((p) => ({
        sku: p.supplier_sku,
        stock: null,
        fixtureStock: p.fixtureStock,
        updatedAt: null,
        mock: true,
        live: false,
        commercialUse: false,
      })),
    };
  }

  async fetchPrices() {
    const fetched = await this.fetchProductsDryRun();
    return {
      ...fetched,
      records: fetched.records.map((p) => ({
        sku: p.supplier_sku,
        amount: null,
        fixturePrice: p.fixturePrice,
        currency: null,
        updatedAt: null,
        mock: true,
        live: false,
        commercialUse: false,
      })),
    };
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
      price: raw.commercialUse === false ? null : raw.supplier_price?.amount ?? raw.price ?? null,
      currency: raw.supplier_price?.currency || raw.currency || null,
      stock: raw.commercialUse === false || raw.stock == null || raw.stock === "" ? null : Number(raw.stock),
      images: raw.images || [],
      supplierId: this.id,
      raw,
    };
  }

  async healthCheck() {
    const config = this.validateConfiguration();
    return {
      ok: false,
      live: false,
      mock: false,
      status: "BLOCKED_EXTERNAL",
      code: config.credentialsConfigured ? "CREDENTIALS_NOT_A_CONNECTION" : "MISSING_CREDENTIALS",
      dryRun: true,
      latencyMs: null,
      credentialsConfigured: config.credentialsConfigured,
      networkBlocked: this.networkBlocked,
      adapterFormat: this.adapterFormat,
      commercialEligibility: "BLOCKED",
    };
  }
}

module.exports = { DryRunSupplierAdapter, SAMPLE_PRODUCTS };
