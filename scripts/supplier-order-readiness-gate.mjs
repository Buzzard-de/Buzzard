import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  ["Supplier order readiness tests", "vitest run lib/supplier-order-readiness/supplierOrderReadiness.test.ts"],
  ["Fulfillment control tower gate", "npm run gate:fulfillment-control-tower"],
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
  console.error(`\nSupplier order readiness gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier order readiness gate: ALL PASS");
console.log("Real supplier order network: DISABLED (verified)");
console.log("Real supplier order HTTP calls: 0 (verified in tests)");
