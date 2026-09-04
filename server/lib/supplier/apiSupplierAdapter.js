/**
 * Part 23 — API supplier adapter (dry-run, network blocked).
 */
const { DryRunSupplierAdapter } = require("./dryRunSupplierAdapter");
const { SUPPLIER_ADAPTER_FORMAT, SUPPLIER_CAPABILITY } = require("../../core/supplierIntegrationConstants");

const API_CAPABILITIES = [
  SUPPLIER_CAPABILITY.CATALOG,
  SUPPLIER_CAPABILITY.PRICE,
  SUPPLIER_CAPABILITY.STOCK,
  SUPPLIER_CAPABILITY.GTIN,
  SUPPLIER_CAPABILITY.MPN,
  SUPPLIER_CAPABILITY.BRAND,
  SUPPLIER_CAPABILITY.IMAGES,
  SUPPLIER_CAPABILITY.CATEGORIES,
  SUPPLIER_CAPABILITY.API,
];

class ApiSupplierAdapter extends DryRunSupplierAdapter {
  constructor({ id = "api-supplier-dry", name = "API Supplier (Dry-Run)", credentialsConfigured = false } = {}) {
    super({
      id,
      name,
      format: SUPPLIER_ADAPTER_FORMAT.API,
      capabilities: API_CAPABILITIES,
      credentialsConfigured,
      config: { transport: "REST", networkBlocked: true },
    });
  }

  validateConfiguration() {
    const base = super.validateConfiguration();
    return {
      ...base,
      transport: "api",
      feedType: "REST",
    };
  }
}

module.exports = { ApiSupplierAdapter };
