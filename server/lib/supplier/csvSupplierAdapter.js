/**
 * Part 23 — CSV feed supplier adapter (dry-run, network blocked).
 */
const { DryRunSupplierAdapter } = require("./dryRunSupplierAdapter");
const { SUPPLIER_ADAPTER_FORMAT, SUPPLIER_CAPABILITY } = require("../../core/supplierIntegrationConstants");

const CSV_CAPABILITIES = [
  SUPPLIER_CAPABILITY.CATALOG,
  SUPPLIER_CAPABILITY.PRICE,
  SUPPLIER_CAPABILITY.STOCK,
  SUPPLIER_CAPABILITY.GTIN,
  SUPPLIER_CAPABILITY.MPN,
  SUPPLIER_CAPABILITY.BRAND,
  SUPPLIER_CAPABILITY.CATEGORIES,
  SUPPLIER_CAPABILITY.CSV,
];

class CsvSupplierAdapter extends DryRunSupplierAdapter {
  constructor({ id = "csv-supplier-dry", name = "CSV Feed Supplier (Dry-Run)", credentialsConfigured = false } = {}) {
    super({
      id,
      name,
      format: SUPPLIER_ADAPTER_FORMAT.CSV,
      capabilities: CSV_CAPABILITIES,
      credentialsConfigured,
      config: { transport: "CSV", networkBlocked: true },
    });
  }

  validateConfiguration() {
    const base = super.validateConfiguration();
    return {
      ...base,
      transport: "csv",
      feedType: "CSV",
    };
  }
}

module.exports = { CsvSupplierAdapter };
