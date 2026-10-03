"use strict";

const { createExternalIntegrationRegistry } = require("../externalIntegrationRegistry");
const { mapMarketplaceOrder, mapMarketplaceStock, mapMarketplacePrice } = require("./externalMapping");
const { newCorrelationId } = require("../operations/correlationContext");

function createMarketplaceVerification(options = {}) {
  const registry = options.registry || createExternalIntegrationRegistry({
    env: options.env,
    listMarketplaces: options.listMarketplaces,
  });
  const audit = options.audit || { record: () => {} };

  function verifyMarketplaceConnector({ marketplaceId, mode = "READ_ONLY", correlationId = null } = {}) {
    const corr = correlationId || newCorrelationId();
    audit.record({ action: "EXTERNAL_CONNECTOR_VERIFICATION_STARTED", entityType: "MARKETPLACE", entityId: marketplaceId, metadata: { correlationId: corr, mode } });
    const connector = registry.getMarketplace(marketplaceId);
    if (!connector) {
      audit.record({ action: "EXTERNAL_CONNECTOR_VERIFICATION_FAILED", entityType: "MARKETPLACE", entityId: marketplaceId, metadata: { correlationId: corr } });
      return { marketplaceId, status: "FAIL", reason: "CONNECTOR_NOT_FOUND", correlationId: corr };
    }

    const mapping = {
      order: mapMarketplaceOrder({
        externalOrderId: "EXT-100",
        externalLineId: "L-1",
        sku: "BZ-TEST-1",
        quantity: 1,
        price: 19.9,
        currency: "EUR",
        customerReference: "TEST-CUST",
        createdAt: "2026-10-01T00:00:00.000Z",
      }),
      stock: mapMarketplaceStock({ sku: "BZ-TEST-1", stock: 3 }),
      price: mapMarketplacePrice({ sku: "BZ-TEST-1", price: 99, currency: "EUR" }, 94),
    };

    const result = {
      marketplaceId,
      provider: connector.provider,
      status: "CONDITIONAL",
      mode: "READ_ONLY",
      capabilities: connector.capabilities,
      authentication: connector.authentication,
      mapping,
      writesExecuted: false,
      layers: {
        CODE_VERIFICATION: "PASS",
        CONFIG_VERIFICATION: "NOT_CONFIGURED",
        SANDBOX_VERIFICATION: "NOT_EXECUTED",
        LIVE_READ_VERIFICATION: "NOT_EXECUTED",
        PRODUCTION_WRITE_VERIFICATION: "NOT_EXECUTED",
      },
      sotRouting: {
        order: "order_engine",
        stock: "availability_engine",
        price: "pricing_engine",
      },
      correlationId: corr,
      secretExposed: false,
    };
    audit.record({
      action: "EXTERNAL_CONNECTOR_VERIFICATION_CONDITIONAL",
      entityType: "MARKETPLACE",
      entityId: marketplaceId,
      metadata: { status: result.status, correlationId: corr },
    });
    return result;
  }

  return Object.freeze({ verifyMarketplaceConnector });
}

module.exports = { createMarketplaceVerification };
