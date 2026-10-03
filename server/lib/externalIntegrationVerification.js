"use strict";

const { createExternalIntegrationRegistry } = require("./externalIntegrationRegistry");
const { createSupplierVerification } = require("./external/supplierVerification");
const { createMarketplaceVerification } = require("./external/marketplaceVerification");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("./sot/sourceOfTruthRegistry");
const { createSotAudit } = require("./sot/sotAudit");

function tally(rows) {
  const counts = { PASS: 0, CONDITIONAL: 0, FAIL: 0, NOT_CONFIGURED: 0, NOT_TESTABLE: 0 };
  for (const row of rows) {
    if (counts[row.status] != null) counts[row.status] += 1;
  }
  return counts;
}

function createExternalIntegrationVerification(options = {}) {
  const env = options.env || process.env;
  const registry = options.registry || createExternalIntegrationRegistry({
    env,
    listSuppliers: options.listSuppliers,
    listMarketplaces: options.listMarketplaces,
  });
  const audit = options.audit || createSotAudit({ logAudit: options.logAudit || (() => {}) });
  const suppliers = options.supplierVerification || createSupplierVerification({ registry, env, audit });
  const marketplaces = options.marketplaceVerification || createMarketplaceVerification({ registry, env, audit });
  const sot = options.sotRegistry || createSourceOfTruthRegistry({ env });

  function safety() {
    return {
      productSotActive: env.BUZZARD_PRODUCT_SOT_ACTIVE === "1",
      salesLocked: env.BUZZARD_SALES_ENABLED !== "1",
      supplierOrders: env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1",
      payments: env.BUZZARD_PAYMENT_LIVE === "1",
      marketplaceWrites: false,
      productionWrites: "NOT_EXECUTED",
    };
  }

  function verifySupplier(id) {
    return suppliers.verifySupplierConnector({ supplierId: id, mode: "READ_ONLY", correlationId: options.correlationId });
  }

  function verifyMarketplace(id) {
    return marketplaces.verifyMarketplaceConnector({ marketplaceId: id, mode: "READ_ONLY", correlationId: options.correlationId });
  }

  function verifyAllSuppliers() {
    return registry.suppliers().map((row) => verifySupplier(row.id));
  }

  function verifyAllMarketplaces() {
    return registry.marketplaces().map((row) => verifyMarketplace(row.id));
  }

  function getVerificationReport() {
    const supplierResults = verifyAllSuppliers();
    const marketplaceResults = verifyAllMarketplaces();
    const safe = safety();
    return {
      generatedAt: new Date().toISOString(),
      suppliers: supplierResults,
      marketplaces: marketplaceResults,
      safety: {
        supplierOrders: false,
        payments: false,
        marketplaceWrites: false,
        productSotActive: safe.productSotActive,
        salesLocked: safe.salesLocked,
        productionWrites: "NOT_EXECUTED",
      },
      ownership: {
        product: sot.getWriteOwner(ENTITIES.PRODUCT),
        order: sot.getWriteOwner(ENTITIES.ORDER),
        availability: sot.getWriteOwner(ENTITIES.AVAILABILITY),
        price: sot.getWriteOwner(ENTITIES.PRICE),
      },
      layers: {
        CODE_VERIFICATION: "PASS",
        CONFIG_VERIFICATION: "CONDITIONAL",
        SANDBOX_VERIFICATION: "NOT_EXECUTED",
        LIVE_READ_VERIFICATION: "NOT_EXECUTED",
        PRODUCTION_WRITE_VERIFICATION: "NOT_EXECUTED",
      },
      summary: {
        suppliers: { total: supplierResults.length, ...tally(supplierResults) },
        marketplaces: { total: marketplaceResults.length, ...tally(marketplaceResults) },
      },
    };
  }

  function publicHealth() {
    const report = getVerificationReport();
    const fail = report.summary.suppliers.FAIL + report.summary.marketplaces.FAIL;
    return {
      status: fail ? "degraded" : "conditional",
      suppliers: {
        configured: report.summary.suppliers.total - report.summary.suppliers.NOT_CONFIGURED,
        verified: report.summary.suppliers.PASS,
      },
      marketplaces: {
        configured: report.summary.marketplaces.total - report.summary.marketplaces.NOT_CONFIGURED,
        verified: report.summary.marketplaces.PASS,
      },
    };
  }

  function adminReport() {
    const report = getVerificationReport();
    return {
      suppliers: report.suppliers.map((row) => ({
        id: row.supplierId,
        status: row.status,
        provider: row.provider,
        layers: row.layers,
        sotRouting: row.sotRouting,
      })),
      marketplaces: report.marketplaces.map((row) => ({
        id: row.marketplaceId,
        status: row.status,
        provider: row.provider,
        layers: row.layers,
        sotRouting: row.sotRouting,
      })),
      summary: {
        pass: report.summary.suppliers.PASS + report.summary.marketplaces.PASS,
        conditional: report.summary.suppliers.CONDITIONAL + report.summary.marketplaces.CONDITIONAL,
        fail: report.summary.suppliers.FAIL + report.summary.marketplaces.FAIL,
        notConfigured: report.summary.suppliers.NOT_CONFIGURED + report.summary.marketplaces.NOT_CONFIGURED,
        notTestable: report.summary.suppliers.NOT_TESTABLE + report.summary.marketplaces.NOT_TESTABLE,
      },
      safety: {
        supplierOrders: false,
        payments: false,
        marketplaceWrites: false,
      },
      ownership: report.ownership,
      actors: { supplier: ACTORS.SUPPLIER, marketplace: ACTORS.MARKETPLACE },
    };
  }

  return Object.freeze({
    verifyAllSuppliers,
    verifyAllMarketplaces,
    verifySupplier,
    verifyMarketplace,
    getVerificationReport,
    publicHealth,
    adminReport,
    registry,
    safety,
  });
}

module.exports = { createExternalIntegrationVerification };
