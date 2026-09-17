import { execSync } from "node:child_process";

process.env.RETURNS_PRODUCTION_ENABLED = "0";

const steps = [
  ["#353 returns tests", "vitest run lib/returns-refunds-production/returnsRefundsProduction.test.ts"],
  ["Upstream #352 gate", "npm run gate:ai-production"],
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
console.log("\nReturns refunds production gate (#353): ALL PASS");
