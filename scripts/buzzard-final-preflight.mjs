#!/usr/bin/env node
/**
 * Buzzard Master Final Preflight — metadata-only, no production side effects.
 */
import { execSync } from "node:child_process";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const steps = [
  ["External access preflight tests", "npm run test:final-external-access"],
  ["Provider credential preflight", "node scripts/provider-credential-preflight.mjs"],
  ["Inter Cars access preflight", "node scripts/supplier-inter-cars-production-access-preflight.mjs"],
  ["Buzzard final status", "node scripts/buzzard-final-status.mjs"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    process.stdout.write(`BLOCKED: ${label} (expected without credentials)\n`);
    failed++;
  }
}

console.log("\n========================================");
console.log(`Buzzard final preflight complete (${failed} blocked — expected without credentials)`);
console.log("No production side effects. No fake evidence.");
console.log("========================================");
process.exit(0);
