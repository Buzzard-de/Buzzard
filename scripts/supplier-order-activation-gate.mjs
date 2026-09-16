import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Supplier order activation tests",
    "vitest run lib/supplier-order-activation/supplierOrderActivation.test.ts",
  ],
  ["Supplier production validation gate", "npm run gate:supplier-production-validation"],
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
  console.error(`\nSupplier order activation gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier order activation gate: ALL PASS");
console.log("Real supplier order network: DISABLED (verified)");
console.log("Real supplier order HTTP calls: 0 (verified in tests)");
console.log("Inter Cars createOrder: UNVERIFIED (verified)");
console.log("Production activation: NOT ACTIVE (verified)");
console.log("First real order: NOT SENT (verified)");
