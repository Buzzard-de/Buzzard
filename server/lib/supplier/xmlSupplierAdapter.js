/**
 * Part 23 — XML feed supplier adapter (dry-run, network blocked).
 */
const { DryRunSupplierAdapter } = require("./dryRunSupplierAdapter");
const { SUPPLIER_ADAPTER_FORMAT, SUPPLIER_CAPABILITY } = require("../../core/supplierIntegrationConstants");

const XML_CAPABILITIES = [
  SUPPLIER_CAPABILITY.CATALOG,
  SUPPLIER_CAPABILITY.PRICE,
  SUPPLIER_CAPABILITY.STOCK,
  SUPPLIER_CAPABILITY.GTIN,
  SUPPLIER_CAPABILITY.MPN,
  SUPPLIER_CAPABILITY.BRAND,
  SUPPLIER_CAPABILITY.IMAGES,
  SUPPLIER_CAPABILITY.CATEGORIES,
  SUPPLIER_CAPABILITY.XML,
];

class XmlSupplierAdapter extends DryRunSupplierAdapter {
  constructor({ id = "xml-supplier-dry", name = "XML Feed Supplier (Dry-Run)", credentialsConfigured = false } = {}) {
    super({
      id,
      name,
      format: SUPPLIER_ADAPTER_FORMAT.XML,
      capabilities: XML_CAPABILITIES,
      credentialsConfigured,
      config: { transport: "XML", networkBlocked: true },
    });
  }

  validateConfiguration() {
    const base = super.validateConfiguration();
    return {
      ...base,
      transport: "xml",
      feedType: "XML",
    };
  }
}

module.exports = { XmlSupplierAdapter };
