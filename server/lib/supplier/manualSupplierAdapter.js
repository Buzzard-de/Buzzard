/**
 * Manual supplier rows stay local. They are not an account, a price, or stock.
 */
const { DryRunSupplierAdapter } = require("./dryRunSupplierAdapter");
const { validateSupplierOffer } = require("./offerValidation");

class ManualSupplierAdapter extends DryRunSupplierAdapter {
  constructor({ id = "manual-supplier-dry", name = "Manual Supplier (Dry-Run)", credentialsConfigured = false } = {}) {
    super({
      id,
      name,
      format: "manual",
      capabilities: ["catalog", "price", "stock", "manual"],
      credentialsConfigured,
      config: { transport: "manual", networkBlocked: true },
    });
  }

  validateConfiguration() {
    const base = super.validateConfiguration();
    return { ...base, transport: "manual", feedType: "MANUAL" };
  }

  ingest(row = {}, destination) {
    const offer = validateSupplierOffer({ ...row, source: "manual", supplierId: this.id }, destination);
    return {
      ok: false,
      live: false,
      mock: true,
      dryRun: true,
      status: "BLOCKED_EXTERNAL",
      code: "MANUAL_NOT_COMMERCIAL",
      commercialEligibility: "BLOCKED",
      purchased: false,
      reserved: false,
      price: null,
      stock: null,
      supplierCost: null,
      offer,
    };
  }
}

module.exports = { ManualSupplierAdapter };
