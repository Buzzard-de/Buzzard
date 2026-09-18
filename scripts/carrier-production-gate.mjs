import { execSync } from "node:child_process";

process.env.CARRIER_PRODUCTION_ENABLED = "0";

const steps = [
  ["#351 carrier tests", "vitest run lib/carrier-production/carrierProduction.test.ts"],
  ["Upstream #350 gate", "npm run gate:payment-production"],
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
console.log("\nCarrier production gate (#351): ALL PASS");
