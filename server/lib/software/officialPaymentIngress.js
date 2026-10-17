/**
 * Single official payment-event path. Unsigned legacy routes are audit sinks only.
 */

const OFFICIAL_PATH = "/api/commerce/webhooks/:provider";
const LEGACY_PATHS = Object.freeze(["/api/webhooks/payment", "/api/payments-finance/webhook"]);

function describeIngress() {
  const flags = require("../commerce/commerceFeatureFlags").getEffectiveFlags();
  return {
    officialPath: OFFICIAL_PATH,
    officialProviders: ["stripe", "paypal"],
    engine: "server/lib/commerce/providers/dualPaymentEngine.js",
    legacyUnsignedPaths: [...LEGACY_PATHS],
    unsignedCanMarkPaid: false,
    timeoutIsNotSuccess: true,
    refundDistinctFromChargeback: true,
    refundDistinctFromSupplierCredit: true,
    livePayments: flags.livePaymentsEnabled,
    salesEnabled: flags.salesEnabled,
    productSotActive: flags.productSotActive,
  };
}

function isOfficialProvider(provider) {
  return provider === "stripe" || provider === "paypal";
}

module.exports = {
  OFFICIAL_PATH,
  LEGACY_PATHS,
  describeIngress,
  isOfficialProvider,
};
