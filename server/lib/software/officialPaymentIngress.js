/**
 * Single official payment-event path. Unsigned legacy routes are audit sinks only.
 */

const OFFICIAL_PATH = "/api/commerce/webhooks/:provider";
const LEGACY_PATHS = Object.freeze(["/api/webhooks/payment", "/api/payments-finance/webhook"]);

function describeIngress() {
  return {
    officialPath: OFFICIAL_PATH,
    officialProviders: ["stripe", "paypal"],
    engine: "server/lib/commerce/providers/dualPaymentEngine.js",
    legacyUnsignedPaths: [...LEGACY_PATHS],
    unsignedCanMarkPaid: false,
    timeoutIsNotSuccess: true,
    refundDistinctFromChargeback: true,
    refundDistinctFromSupplierCredit: true,
    livePayments: process.env.BUZZARD_LIVE_PAYMENTS === "1",
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
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
