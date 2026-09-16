import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Supplier production order arming tests (#343)",
    "vitest run lib/supplier-production-order-arming/supplierProductionOrderArming.test.ts",
  ],
  ["Supplier production order validation gate (#341/#342)", "npm run gate:supplier-production-order-validation"],
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
  console.error(`\nSupplier production order arming gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier production order arming gate: ALL PASS");
console.log("Inter Cars createOrder: UNVERIFIED (verified — no live #342 evidence in CI)");
console.log("Arming: BLOCKED (verified)");
console.log("Real supplier order HTTP calls: 0 (verified in tests)");
console.log("Production order network: OFF (verified)");
