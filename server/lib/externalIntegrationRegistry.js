"use strict";

const { CHANNELS } = require("./marketplaceHub");

const TYPES = Object.freeze({
  SUPPLIER: "SUPPLIER",
  MARKETPLACE: "MARKETPLACE",
});

const CAPABILITY = Object.freeze({
  PRODUCT_READ: "PRODUCT_READ",
  PRODUCT_WRITE: "PRODUCT_WRITE",
  PRICE_READ: "PRICE_READ",
  PRICE_WRITE: "PRICE_WRITE",
  STOCK_READ: "STOCK_READ",
  STOCK_WRITE: "STOCK_WRITE",
  ORDER_READ: "ORDER_READ",
  ORDER_WRITE: "ORDER_WRITE",
  FULFILLMENT_READ: "FULFILLMENT_READ",
  LISTING_READ: "LISTING_READ",
  LISTING_WRITE: "LISTING_WRITE",
  CANCEL: "CANCEL",
  RETURN: "RETURN",
});

function supplierCapabilities(row) {
  const format = String(row.format || "").toLowerCase();
  const caps = {
    [CAPABILITY.PRODUCT_READ]: true,
    [CAPABILITY.PRICE_READ]: true,
    [CAPABILITY.STOCK_READ]: true,
    [CAPABILITY.ORDER_READ]: false,
    [CAPABILITY.ORDER_WRITE]: false,
    [CAPABILITY.FULFILLMENT_READ]: false,
    [CAPABILITY.PRODUCT_WRITE]: false,
    [CAPABILITY.PRICE_WRITE]: false,
    [CAPABILITY.STOCK_WRITE]: false,
    [CAPABILITY.LISTING_READ]: false,
    [CAPABILITY.LISTING_WRITE]: false,
    [CAPABILITY.CANCEL]: false,
    [CAPABILITY.RETURN]: false,
  };
  if (format === "mock") {
    caps[CAPABILITY.PRODUCT_READ] = true;
  }
  return caps;
}

function marketplaceCapabilities() {
  return {
    [CAPABILITY.PRODUCT_READ]: true,
    [CAPABILITY.LISTING_READ]: true,
    [CAPABILITY.PRICE_READ]: true,
    [CAPABILITY.STOCK_READ]: true,
    [CAPABILITY.ORDER_READ]: true,
    [CAPABILITY.ORDER_WRITE]: false,
    [CAPABILITY.PRODUCT_WRITE]: false,
    [CAPABILITY.PRICE_WRITE]: false,
    [CAPABILITY.STOCK_WRITE]: false,
    [CAPABILITY.LISTING_WRITE]: true,
    [CAPABILITY.FULFILLMENT_READ]: false,
    [CAPABILITY.CANCEL]: false,
    [CAPABILITY.RETURN]: false,
  };
}

function createExternalIntegrationRegistry(options = {}) {
  const env = options.env || process.env;
  const listSuppliersFn =
    options.listSuppliers ||
    (() => {
      const { listSuppliers } = require("./supplier/supplierRegistry");
      return listSuppliers();
    });
  const listMarketplacesFn =
    options.listMarketplaces ||
    (() => CHANNELS.map(([code, name]) => ({ code, name })));

  function suppliers() {
    return listSuppliersFn().map((row) => {
      const configured = Boolean(row.credentialsConfigured);
      return {
        id: row.id,
        type: TYPES.SUPPLIER,
        provider: row.name || row.id,
        environment: configured ? "configured" : "dry_run",
        capabilities: supplierCapabilities(row),
        authentication: {
          configured,
          method: row.format === "api" ? "api_key" : "none",
          secretExposed: false,
        },
        endpoints: {
          readOnly: row.format === "api" || row.format === "json",
          writeBlocked: true,
        },
        health: configured ? "NOT_TESTABLE" : "NOT_CONFIGURED",
        safety: {
          supplierOrders: false,
          liveImport: env.REAL_SUPPLIER_LIVE_IMPORT === "1",
        },
        status: configured ? "CONDITIONAL" : "NOT_CONFIGURED",
        format: row.format,
      };
    });
  }

  function marketplaces() {
    return listMarketplacesFn().map((row) => ({
      id: row.code || row.id,
      type: TYPES.MARKETPLACE,
      provider: row.name || row.code,
      environment: "hub_seed",
      capabilities: marketplaceCapabilities(),
      authentication: {
        configured: false,
        method: "unknown",
        secretExposed: false,
      },
      endpoints: {
        readOnly: true,
        writeBlocked: true,
      },
      health: "NOT_TESTABLE",
      safety: { marketplaceWrites: false },
      status: "CONDITIONAL",
    }));
  }

  function list() {
    return { suppliers: suppliers(), marketplaces: marketplaces() };
  }

  function getSupplier(id) {
    return suppliers().find((s) => s.id === id) || null;
  }

  function getMarketplace(id) {
    return marketplaces().find((m) => m.id === id) || null;
  }

  return Object.freeze({
    TYPES,
    CAPABILITY,
    list,
    suppliers,
    marketplaces,
    getSupplier,
    getMarketplace,
  });
}

module.exports = {
  createExternalIntegrationRegistry,
  TYPES,
  CAPABILITY,
};
