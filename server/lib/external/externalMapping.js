"use strict";

function mapSupplierProduct(raw = {}) {
  return {
    target: "product_engine",
    sot: "PRODUCT",
    externalProductId: raw.externalId || raw.id || null,
    sku: raw.sku || raw.supplierSku || raw.supplier_sku || null,
    gtin: raw.gtin || raw.ean || null,
    brand: raw.brand || null,
    title: raw.title || raw.name || null,
    category: raw.category || null,
    attributes: raw.attributes || {},
    owner: "product_engine",
  };
}

function mapSupplierStock(raw = {}) {
  return {
    target: "availability_engine",
    sot: "AVAILABILITY",
    sku: raw.sku || raw.supplierSku || null,
    available: Number(raw.stock ?? raw.qty ?? raw.available ?? 0),
    updatedAt: raw.updatedAt || raw.updated_at || null,
    version: raw.version != null ? Number(raw.version) : null,
    owner: "availability_engine",
  };
}

function mapSupplierPrice(raw = {}) {
  return {
    target: "pricing_engine",
    sot: "PRICE",
    sku: raw.sku || null,
    supplierCost: Number(raw.cost ?? raw.price ?? raw.supplierCost ?? 0),
    currency: raw.currency || "EUR",
    updatedAt: raw.updatedAt || null,
    version: raw.version != null ? Number(raw.version) : null,
    owner: "pricing_engine",
  };
}

function mapSupplierFulfillment(raw = {}) {
  return {
    target: "order_engine",
    sot: "ORDER",
    externalOrderId: raw.externalOrderId || raw.orderId || null,
    status: raw.status || "unknown",
    tracking: raw.tracking || null,
    owner: "order_engine",
    projection: true,
  };
}

function mapMarketplaceOrder(raw = {}) {
  return {
    target: "order_engine",
    sot: "ORDER",
    externalOrderId: raw.externalOrderId || raw.id || null,
    externalLineId: raw.externalLineId || raw.lineId || null,
    sku: raw.sku || null,
    quantity: Number(raw.quantity || 0),
    price: Number(raw.price || 0),
    currency: raw.currency || "EUR",
    customerReference: raw.customerReference || "TEST-REF",
    timestamps: { createdAt: raw.createdAt || null },
    owner: "order_engine",
    source: "marketplace_ingestion",
  };
}

function mapMarketplaceStock(raw = {}) {
  return {
    target: "availability_engine",
    sot: "AVAILABILITY",
    sku: raw.sku || null,
    observedStock: Number(raw.stock ?? 0),
    owner: "availability_engine",
    projection: true,
  };
}

function mapMarketplacePrice(raw = {}, canonicalPrice) {
  return {
    target: "pricing_engine",
    sot: "PRICE",
    sku: raw.sku || null,
    observedPrice: Number(raw.price ?? 0),
    currency: raw.currency || "EUR",
    canonicalPrice: canonicalPrice != null ? Number(canonicalPrice) : null,
    overwritesCanonical: false,
    owner: "pricing_engine",
    role: "market_intelligence",
  };
}

function detectStale({ canonicalUpdatedAt, externalUpdatedAt, canonicalVersion, externalVersion }) {
  if (canonicalVersion != null && externalVersion != null && Number(externalVersion) < Number(canonicalVersion)) {
    return { stale: true, reason: "STALE_EXTERNAL_DATA" };
  }
  if (canonicalUpdatedAt && externalUpdatedAt) {
    const a = Date.parse(canonicalUpdatedAt);
    const b = Date.parse(externalUpdatedAt);
    if (!Number.isNaN(a) && !Number.isNaN(b) && b < a) {
      return { stale: true, reason: "STALE_EXTERNAL_DATA" };
    }
  }
  return { stale: false, reason: null };
}

module.exports = {
  mapSupplierProduct,
  mapSupplierStock,
  mapSupplierPrice,
  mapSupplierFulfillment,
  mapMarketplaceOrder,
  mapMarketplaceStock,
  mapMarketplacePrice,
  detectStale,
};
