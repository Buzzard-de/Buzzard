#!/usr/bin/env node
/**
 * Operational status report — dry-run, no side effects.
 * Output follows BUZZARD_FINAL_ALL_TO_GO_LIVE/11_FINAL_REPORT/STATUS_TEMPLATE.md
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
const mod = require("../server/lib/FinalProductionGoLive.bundle.cjs");
const report = mod.buildFinalProductionStatusReport?.() || { error: "buildFinalProductionStatusReport unavailable — run build:final-production-go-live-bridge" };

console.log(JSON.stringify(report, null, 2));

if (report.realSideEffects) {
  const totals = Object.values(report.realSideEffects).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
  if (totals !== 0) {
    console.error("FAIL: real side effects detected");
    process.exit(1);
  }
}

console.log("\n--- STATUS SUMMARY ---");
for (const row of report.workstreams || []) {
  console.log(`${row.workstream}: impl=${row.implementation} sandbox=${row.sandbox} live=${row.live} prod=${row.production}`);
}
console.log(`FINAL PHASE: ${report.finalPhase}`);
console.log(`SALES: ${report.sales}`);
console.log(`GO-LIVE GATE: ${report.goLiveGate}`);
