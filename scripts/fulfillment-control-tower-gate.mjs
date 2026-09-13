import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_LIVE_READ_ENABLED = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  ["Fulfillment control tower tests", "vitest run lib/fulfillment-control-tower/fulfillmentControlTower.test.ts"],
  ["Supplier order sandbox gate", "npm run gate:supplier-order-sandbox"],
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
  console.error(`\nFulfillment control tower gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nFulfillment control tower gate: ALL PASS");
console.log("Real supplier order network: DISABLED (verified)");
