#!/usr/bin/env node
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";

const steps = [
  ["Final closure tests", "vitest run lib/final-closure/finalClosure.test.ts"],
  ["Production access tests", "vitest run lib/production-access/productionAccess.test.ts"],
  ["Upstream production-completion gate", "npm run gate:production-completion"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
  }
}

if (failed) {
  console.error(`\nFinal closure gate failed (${failed} step(s)).`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalClosure.bundle.cjs");
const check = mod.runFinalGoLiveCheck();
console.log(`\nFINAL GO-LIVE: ${check.finalGoLive}`);
console.log("Final closure gate: ALL PASS");
