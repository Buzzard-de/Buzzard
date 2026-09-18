import { execSync } from "node:child_process";

process.env.AI_PRODUCTION_ENABLED = "0";

const steps = [
  ["#352 AI tests", "vitest run lib/ai-production/aiProduction.test.ts"],
  ["Upstream #351 gate", "npm run gate:carrier-production"],
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
console.log("\nAI production gate (#352): ALL PASS");
