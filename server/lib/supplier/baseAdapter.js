/**
 * Supplier adapter base. A stored key or a synthetic payload is not a live account.
 */
const { SUPPLIER_CAPABILITIES, DATA_FORMAT } = require("../../core/jobConstants");
const { emptyProduct } = require("./normalizedModels");

const STOCK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function blockedResult(code, extra = {}) {
  const transport = code === "TIMEOUT" || code === "NETWORK_ERROR" || code === "SUPPLIER_UNKNOWN";
  return {
    ...extra,
    ok: false,
    live: false,
    mock: extra.mock === true,
    status: transport ? code : "BLOCKED_EXTERNAL",
    code,
    commercialEligibility: "BLOCKED",
    supplierCost: null,
    price: null,
    stock: null,
    purchased: false,
    orderCreated: false,
    records: Array.isArray(extra.records) ? extra.records : [],
  };
}

class BaseSupplierAdapter {
  constructor({ id, name, format = DATA_FORMAT.REST, capabilities = [], mock = false, unknown = false } = {}) {
    this.id = id || null;
    this.name = name || null;
    this.format = format;
    this.capabilities = capabilities;
    this.ordersEnabled = false;
    this.mock = mock === true;
    this.unknown = unknown === true;
    this.seen = new Set();
  }

  supports(cap) {
    return this.capabilities.includes(cap);
  }

  classify(req = {}) {
    if (req.timeout === true || this.forceTimeout === true) return "TIMEOUT";
    if (req.networkError === true || this.networkError === true) return "NETWORK_ERROR";
    if (this.unknown || !this.id) return "SUPPLIER_UNKNOWN";
    if (req.requestId && this.seen.has(String(req.requestId))) return "DUPLICATE_REQUEST";
    if (req.requestId) this.seen.add(String(req.requestId));
    if (this.mock) return "MOCK_NOT_COMMERCIAL";
    if (req.apiKey || process.env.SUPPLIER_API_KEY || process.env.REAL_SUPPLIER_API_KEY) {
      return "CREDENTIALS_NOT_A_CONNECTION";
    }
    return "MISSING_CREDENTIALS";
  }

  blocked(req, extra) {
    return blockedResult(this.classify(req), { mock: this.mock === true, supplierId: this.id, ...extra });
  }

  async authenticate(req = {}) {
    return this.blocked(req);
  }

  async fetchProducts(req = {}) {
    return this.blocked(req);
  }

  async fetchPrices(req = {}) {
    return this.blocked(req);
  }

  async fetchStock(req = {}) {
    const transport = this.classify(req);
    if (transport === "TIMEOUT" || transport === "NETWORK_ERROR" || transport === "SUPPLIER_UNKNOWN" || transport === "DUPLICATE_REQUEST") {
      return blockedResult(transport, { mock: this.mock === true, supplierId: this.id });
    }
    return this.assessStock(req);
  }

  async fetchAvailability(req = {}) {
    return this.fetchStock(req);
  }

  async fetchCategories(req = {}) {
    return this.blocked(req);
  }

  async submitOrder(req = {}) {
    return blockedResult("PURCHASE_BLOCKED", {
      mock: this.mock === true,
      supplierId: this.id,
      actorId: req.actorId || null,
      customerOrderVerified: req.customerOrderVerified === true,
    });
  }

  async healthCheck(req = {}) {
    return this.blocked(req);
  }

  assessStock(req = {}) {
    const sku = req.sku || req.supplierSku;
    if (req.productInvalid === true || (Object.prototype.hasOwnProperty.call(req, "sku") && !sku)) {
      return blockedResult("INVALID_PRODUCT", { mock: this.mock === true, supplierId: this.id });
    }
    const qty = req.stock ?? req.qty;
    if (qty == null || qty === "") {
      return blockedResult("MISSING_STOCK", { mock: this.mock === true, supplierId: this.id, sku: sku || null });
    }
    const observed = Number(req.updatedAt);
    if (!Number.isFinite(observed) || Date.now() - observed > STOCK_MAX_AGE_MS) {
      return blockedResult("STALE_STOCK", { mock: this.mock === true, supplierId: this.id, sku: sku || null });
    }
    if (this.mock || req.mock === true || req.fixturePrice != null) {
      return blockedResult("MOCK_NOT_COMMERCIAL", { mock: true, supplierId: this.id, sku });
    }
    return blockedResult(this.classify(req), { supplierId: this.id, sku });
  }

  normalizeProduct(raw) {
    if (!raw || !raw.sku || typeof raw.sku !== "string") {
      return blockedResult("INVALID_PRODUCT", { mock: this.mock === true, supplierId: this.id });
    }
    return {
      ...emptyProduct({ raw, supplierId: this.id }),
      sku: raw.sku,
      ok: false,
      live: false,
      mock: this.mock === true,
      status: "BLOCKED_EXTERNAL",
      commercialEligibility: "BLOCKED",
      price: null,
      stock: null,
      supplierCost: null,
      commercialUse: false,
    };
  }
}

class UnknownSupplierAdapter extends BaseSupplierAdapter {
  constructor(id) {
    super({ id, name: "Unknown supplier", unknown: true });
  }
}

module.exports = { BaseSupplierAdapter, UnknownSupplierAdapter, blockedResult, SUPPLIER_CAPABILITIES, STOCK_MAX_AGE_MS };
