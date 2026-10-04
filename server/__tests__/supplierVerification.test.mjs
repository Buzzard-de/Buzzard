import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createExternalIntegrationRegistry } = require("../lib/externalIntegrationRegistry.js");
const { createSupplierVerification } = require("../lib/external/supplierVerification.js");
const { sanitize } = require("../lib/external/externalErrors.js");

describe("supplier verification", () => {
  const registry = createExternalIntegrationRegistry({
    listSuppliers: () => [
      { id: "mock", name: "Mock Supplier", format: "mock", credentialsConfigured: false },
      { id: "REAL-WHOLESALER-001", name: "Real", format: "api", credentialsConfigured: true },
    ],
    listMarketplaces: () => [],
  });

  it("checks config, auth redaction, mapping, stale data, timeout and retry policy", () => {
    const audits = [];
    const verify = createSupplierVerification({
      registry,
      env: { BUZZARD_SUPPLIER_ORDERS_ENABLED: "0" },
      audit: { record: (row) => audits.push(row) },
    });
    const missing = verify.verifySupplierConnector({ supplierId: "nope", correlationId: "corr_s" });
    expect(missing.status).toBe("FAIL");
    const unconfigured = verify.verifySupplierConnector({ supplierId: "mock", correlationId: "corr_s" });
    expect(unconfigured.status).toBe("NOT_CONFIGURED");
    expect(unconfigured.checks.authentication.secretExposed).toBe(false);
    expect(unconfigured.checks.timeoutDefined).toBe(true);
    expect(unconfigured.checks.retryPolicy.orderRetry).toBe("BLOCKED");
    expect(unconfigured.mapping.product.owner).toBe("product_engine");
    expect(unconfigured.mapping.stock.owner).toBe("availability_engine");
    expect(unconfigured.mapping.price.owner).toBe("pricing_engine");
    expect(unconfigured.mapping.fulfillment.owner).toBe("order_engine");
    expect(unconfigured.stale.stale).toBe(true);
    expect(unconfigured.layers.PRODUCTION_WRITE_VERIFICATION).toBe("NOT_EXECUTED");
    expect(unconfigured.secretExposed).toBe(false);
    expect(sanitize({ apiKey: "secret-value", sku: "A" })).toEqual({ apiKey: "[REDACTED]", sku: "A" });
    const configured = verify.verifySupplierConnector({ supplierId: "REAL-WHOLESALER-001" });
    expect(configured.checks.authentication.configured).toBe(true);
    expect(JSON.stringify(configured)).not.toMatch(/secret-value|Bearer /);
    expect(audits.some((a) => a.action === "EXTERNAL_CONNECTOR_VERIFICATION_STARTED")).toBe(true);
  });
});
