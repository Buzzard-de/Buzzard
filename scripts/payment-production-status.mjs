import { createRequire } from "node:module";

process.env.PAYMENT_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);

try {
  const bundle = require("../server/lib/PaymentProduction.bundle.cjs");
  console.log(bundle.formatPaymentProductionReportText());
} catch (err) {
  console.error("Payment production bundle unavailable. Run: npm run build:payment-production-bridge");
  console.error(err.message);
  process.exit(1);
}
