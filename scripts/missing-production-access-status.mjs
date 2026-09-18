#!/usr/bin/env node
/**
 * Missing production access status — metadata only, no side effects.
 */
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/productionAccess.bundle.cjs");
const report = mod.buildMissingProductionAccessReport();

console.log(JSON.stringify(report, null, 2));

const totals = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
if (totals !== 0) {
  console.error("FAIL: real side effects detected");
  process.exit(1);
}

console.log("\n--- MISSING ACCESS SUMMARY ---");
for (const p of report.providers) {
  console.log(`${p.providerId}: secret=${p.secretRef.credentialStatus} live=${p.liveValidation} prod=${p.productionEnabled}`);
}
console.log(`Phase1 Access: ${report.liveSequence.phase1Access}`);
console.log(`Phase2 Supplier: ${report.liveSequence.phase2Supplier}`);
console.log(`Sales: ${report.sales}`);
console.log(`Blockers: ${report.blockers.length}`);

try {
  const ic = require("../server/lib/supplierInterCarsProductionAccess.bundle.cjs");
  console.log("\n--- INTER CARS ACCESS PACK ---");
  console.log(ic.formatInterCarsAccessStatusReport());
} catch {
  console.log("\n--- INTER CARS ACCESS PACK --- (bundle unavailable)");
}
