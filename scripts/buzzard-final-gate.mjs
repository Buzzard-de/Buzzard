#!/usr/bin/env node
/**
 * Buzzard Master Final Gate — software validation only, no production activation.
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const steps = [
  ["Typecheck", "npm run typecheck"],
  ["Trade route fulfillment", "npm run test:trade-route-fulfillment"],
  ["Order engine", "npm run test:order-engine"],
  ["Supplier international origin", "npx vitest run lib/supplier-engine/internationalOrigin.test.ts"],
  ["Production access", "npm run test:production-access"],
  ["Payment production", "npm run test:payment-production"],
  ["Country language", "npm run test:buzzard-i18n"],
  ["Final closure gate", "npm run gate:final-closure"],
  ["Final go-live check", "npm run final:go-live-check"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env }, timeout: 300000 });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
    process.stdout.write(`FAIL: ${label}\n`);
  }
}

if (failed) {
  console.error(`\nBuzzard final gate failed (${failed} step(s)).`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalClosure.bundle.cjs");
const report = mod.buildFinalClosureReport();
const totalFx = Object.values(report.realSideEffects || {}).reduce((a, b) => a + (Number(b) || 0), 0);
if (totalFx > 0 || (report.fakeEvidenceCount ?? 0) > 0) {
  console.error("FAIL: real side effects or fake evidence detected");
  process.exit(1);
}

console.log("\n========================================");
console.log("BUZZARD FINAL GATE: ALL PASS (software)");
console.log(`FINAL GO-LIVE: ${report.finalGoLive} (expected BLOCKED without credentials)`);
console.log("========================================");
process.exit(0);
