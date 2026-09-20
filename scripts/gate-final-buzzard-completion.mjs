#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  "npm run typecheck",
  "npm run test:master-final-completion",
  "npm run test:central-ai-memory",
  "npm run test:human-approval-center",
  "npm run test:exception-engine",
  "npm run test:ai-workers",
  "npm run test:marketplace-engine",
  "npm run test:supplier-order-rehearsal",
  "npm run test:e2e-order-harness",
  "npm run test:returns-engine",
  "npm run test:pricing-engine",
  "npm run test:external-access-control-center",
  "npm run test:master-external-provider-readiness",
  "node scripts/master-final-completion-cli.mjs gate",
  "node scripts/master-final-completion-cli.mjs handoff",
];

for (const cmd of steps) {
  const r = spawnSync(cmd, { shell: true, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("gate:final-buzzard-completion PASS");
