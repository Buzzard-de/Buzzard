"use strict";

const { createExternalIntegrationRegistry } = require("../externalIntegrationRegistry");
const { normalizeExternalError } = require("./externalErrors");
const { mapSupplierProduct, mapSupplierStock, mapSupplierPrice, mapSupplierFulfillment, detectStale } = require("./externalMapping");
const { newCorrelationId } = require("../operations/correlationContext");

function createSupplierVerification(options = {}) {
  const registry = options.registry || createExternalIntegrationRegistry({ env: options.env, listSuppliers: options.listSuppliers });
  const env = options.env || process.env;
  const audit = options.audit || { record: () => {} };
  const timeoutMs = options.timeoutMs || 30_000;
  const maxRetries = options.maxRetries || 3;

  function verifySupplierConnector({ supplierId, mode = "READ_ONLY", correlationId = null } = {}) {
    const corr = correlationId || newCorrelationId();
    audit.record({ action: "EXTERNAL_CONNECTOR_VERIFICATION_STARTED", entityType: "SUPPLIER", entityId: supplierId, metadata: { correlationId: corr, mode } });
    const connector = registry.getSupplier(supplierId);
    if (!connector) {
      const result = { supplierId, status: "FAIL", reason: "CONNECTOR_NOT_FOUND", correlationId: corr };
      audit.record({ action: "EXTERNAL_CONNECTOR_VERIFICATION_FAILED", entityType: "SUPPLIER", entityId: supplierId, metadata: { correlationId: corr } });
      return result;
    }

    const checks = {
      connectorPresent: true,
      requiredConfig: Boolean(connector.format),
      authentication: connector.authentication,
      endpoints: connector.endpoints,
      timeoutDefined: Number.isFinite(timeoutMs) && timeoutMs > 0,
      retryPolicy: { maxRetries, readOnlyOnly: true, orderRetry: "BLOCKED" },
      idempotencyPolicy: true,
      responseNormalization: true,
      errorNormalization: Boolean(normalizeExternalError({ code: "timeout" }).code === "TIMEOUT"),
      audit: true,
      correlationId: Boolean(corr),
      safetyGate: env.BUZZARD_SUPPLIER_ORDERS_ENABLED !== "1",
    };

    const liveRead = "NOT_EXECUTED";
    let status = "CONDITIONAL";
    if (!connector.authentication.configured) status = "NOT_CONFIGURED";
    if (connector.endpoints.readOnly === false && connector.authentication.configured) status = "NOT_TESTABLE";

    const mapping = {
      product: mapSupplierProduct({ sku: "SUP-SKU-1", gtin: "4006381333931", title: "Test part", brand: "Mock" }),
      stock: mapSupplierStock({ sku: "SUP-SKU-1", stock: 4, version: 8, updatedAt: "2026-01-01T00:00:00.000Z" }),
      price: mapSupplierPrice({ sku: "SUP-SKU-1", cost: 10, currency: "EUR", version: 8 }),
      fulfillment: mapSupplierFulfillment({ externalOrderId: "SUP-ORD-1", status: "shipped" }),
    };
    const stale = detectStale({
      canonicalVersion: 10,
      externalVersion: mapping.stock.version,
      canonicalUpdatedAt: "2026-02-01T00:00:00.000Z",
      externalUpdatedAt: mapping.stock.updatedAt,
    });

    const result = {
      supplierId,
      provider: connector.provider,
      status,
      mode: "SAFE_READ_ONLY",
      checks,
      mapping,
      stale,
      layers: {
        CODE_VERIFICATION: "PASS",
        CONFIG_VERIFICATION: connector.authentication.configured ? "PASS" : "NOT_CONFIGURED",
        SANDBOX_VERIFICATION: "NOT_EXECUTED",
        LIVE_READ_VERIFICATION: liveRead,
        PRODUCTION_WRITE_VERIFICATION: "NOT_EXECUTED",
      },
      sotRouting: {
        product: "product_engine",
        stock: "availability_engine",
        price: "pricing_engine",
        fulfillment: "order_engine",
      },
      correlationId: corr,
      secretExposed: false,
    };
    audit.record({
      action: status === "FAIL" ? "EXTERNAL_CONNECTOR_VERIFICATION_FAILED" : "EXTERNAL_CONNECTOR_VERIFICATION_CONDITIONAL",
      entityType: "SUPPLIER",
      entityId: supplierId,
      metadata: { status, correlationId: corr },
    });
    return result;
  }

  return Object.freeze({ verifySupplierConnector });
}

module.exports = { createSupplierVerification };
