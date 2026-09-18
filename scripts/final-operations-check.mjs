#!/usr/bin/env node
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_LIVE_READ_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalOperations.bundle.cjs");
const result = mod.runFinalOperationsCheck();

console.log(result.formatted);

const report = result.report;
const total = Object.values(report.realSideEffects).reduce((a, b) => a + b, 0);
if (total !== 0 || report.fakeEvidenceCount !== 0) {
  console.error("FAIL: side effects or fake evidence detected");
  process.exit(1);
}

console.log(`\nSOFTWARE: COMPLETE`);
console.log(`FINAL GO-LIVE: ${result.finalGoLive}`);
console.log(`OPERATIONAL BLOCKERS: ${report.operationalBlockers.length}`);

process.exit(0);
