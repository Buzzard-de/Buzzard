import { execSync } from "node:child_process";

process.env.PAYMENT_PRODUCTION_ENABLED = "0";

const steps = [
  ["#350 payment tests", "vitest run lib/payment-production/paymentProduction.test.ts"],
  ["Upstream #349 gate", "npm run gate:tracking-fulfillment"],
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
console.log("\nPayment production gate (#350): ALL PASS");
