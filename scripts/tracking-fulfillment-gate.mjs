import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";

const steps = [
  ["#349 tracking tests", "vitest run lib/tracking-fulfillment/trackingFulfillment.test.ts"],
  ["Upstream #348 gate", "npm run gate:first-order-fulfillment"],
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

if (failed) process.exit(1);
console.log("\nTracking fulfillment gate (#349): ALL PASS");
