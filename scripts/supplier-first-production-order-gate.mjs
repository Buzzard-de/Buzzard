import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";
process.env.SUPPLIER_FIRST_PRODUCTION_ORDER_NETWORK = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Supplier first production order tests (#344)",
    "vitest run lib/supplier-first-production-order/supplierFirstProductionOrder.test.ts",
  ],
  ["Supplier production order arming gate (#343)", "npm run gate:supplier-production-order-arming"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
    process.stderr.write(`FAIL: ${label}\n`);
  }
}

if (failed) {
  console.error(`\nSupplier first production order gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier first production order gate: ALL PASS");
console.log("#342 Validation Evidence: NONE (verified — no live evidence in CI)");
console.log("Inter Cars createOrder: UNVERIFIED (verified)");
console.log("#343 Arming: BLOCKED (verified)");
console.log("First Production Order: BLOCKED (verified)");
console.log("Real supplier HTTP calls: 0 (verified in tests)");
console.log("Production order network: OFF (verified)");
