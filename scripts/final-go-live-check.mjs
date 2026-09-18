#!/usr/bin/env node
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalClosure.bundle.cjs");
const result = mod.runFinalGoLiveCheck();

console.log(`FINAL GO-LIVE: ${result.finalGoLive}`);
console.log(`Final state: ${result.finalState}`);
console.log(`Sales: ${result.sales}`);
console.log(`Critical blockers: ${result.criticalBlockers}`);

if (result.blockers.length) {
  console.log("\nCritical blocker codes:");
  for (const b of result.blockers) console.log(`  - ${b}`);
}

const report = mod.buildFinalClosureReport();
const total = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
if (total !== 0) {
  console.error("FAIL: real side effects detected");
  process.exit(1);
}

if (report.fakeEvidenceCount > 0) {
  console.error("FAIL: fake evidence detected");
  process.exit(1);
}

/** In prep (no credentials), BLOCKED is the correct outcome — exit 0 unless software fault. */
if (report.fakeEvidenceCount > 0 || total !== 0) {
  process.exit(1);
}
console.log(`\nNote: FINAL GO-LIVE ${result.finalGoLive} is expected without real provider credentials.`);
process.exit(0);
