import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.SALES_ENABLED = "0";

const steps = [
  ["Network safety", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  ["#348 fulfillment tests", "vitest run lib/first-order-fulfillment/firstOrderFulfillment.test.ts"],
  ["Upstream #347 gate", "npm run gate:supplier-inter-cars-production-access"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
    process.stderr.write(`FAIL: ${label}\n`);
  }
}

if (failed) {
  console.error(`\nFirst order fulfillment gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nFirst order fulfillment gate (#348): ALL PASS");
console.log("LIVE: UNVERIFIED | PRODUCTION: DISABLED | REAL ORDERS: 0");
