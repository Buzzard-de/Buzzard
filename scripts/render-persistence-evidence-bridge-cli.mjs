#!/usr/bin/env node
/**
 * Render Persistence Verification & Evidence Bridge CLI (read-only, no Render mutations).
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const mode = process.argv[2] || "status";
const jsonOutput = process.argv.includes("--json");

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

execSync("node scripts/build-render-persistence-evidence-bridge.mjs", { stdio: "pipe", cwd: root });
execSync("node scripts/build-external-access-control-center-bridge.mjs", { stdio: "pipe", cwd: root });

const bridge = require("../server/lib/renderPersistenceEvidenceBridge.bundle.cjs");
const control = require("../server/lib/externalAccessControlCenter.bundle.cjs");
const report = bridge.buildRenderPersistenceVerificationReport();
const center = control.buildExternalAccessControlCenterReport();

function writeHandoffDoc() {
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const md = `# BUZZARD Render Persistence Human Handoff

Generated: ${report.generatedAt}

**Status:** No step below is marked complete by Cursor. Operator must execute on Render.

## Steps

1. Open Render dashboard
2. Select **buzzard-api** service
3. Create Persistent Disk — mount path \`/var/data\`, size ≥ 1 GB
4. Set environment: \`BUZZARD_DB_PATH=/var/data/buzzard.db\`, \`BUZZARD_BACKUP_DIR=/var/data/backups\`
5. Deploy service
6. Verify \`GET /api/health/db\` → \`persistent=true\`, path \`/var/data/buzzard.db\`
7. Run \`npm run backup:db\` on the instance; retain artifact reference (not in git)
8. Register **RENDER_LIVE** evidence (operator workflow — not automated here)
9. Manual production restart (operator only)
10. Re-verify \`/api/health/db\` and register **RENDER_RESTART_PERSISTENCE** evidence

## Current bridge status

| Field | Value |
|-------|-------|
| BLUEPRINT_CONFIGURATION | ${report.live.BLUEPRINT_CONFIGURATION} |
| LIVE_RENDER_DISK | ${report.live.LIVE_RENDER_DISK} |
| LIVE_DB_PATH | ${report.live.LIVE_DB_PATH} |
| LIVE_DB_HEALTH | ${report.live.LIVE_DB_HEALTH} |
| LIVE_RESTART_PERSISTENCE | ${report.live.LIVE_RESTART_PERSISTENCE} |
| LIVE_BACKUP | ${report.live.LIVE_BACKUP} |
| LIVE_RESTORE | ${report.live.LIVE_RESTORE} |
| PERSISTENCE | ${report.live.PERSISTENCE} |

Next human action: ${report.nextHumanAction ?? "—"}
`;
  fs.writeFileSync(path.join(docsDir, "BUZZARD_RENDER_PERSISTENCE_HUMAN_HANDOFF.md"), md);
}

function printFinalReport() {
  console.log("BUZZARD #361 — RENDER PERSISTENCE VERIFICATION");
  console.log("==============================================");
  console.log(`BLUEPRINT_CONFIGURATION = ${report.live.BLUEPRINT_CONFIGURATION}`);
  console.log(`LIVE_RENDER_DISK = ${report.live.LIVE_RENDER_DISK}`);
  console.log(`LIVE_DB_PATH = ${report.live.LIVE_DB_PATH}`);
  console.log(`LIVE_DB_HEALTH = ${report.live.LIVE_DB_HEALTH}`);
  console.log(`LIVE_RESTART_PERSISTENCE = ${report.live.LIVE_RESTART_PERSISTENCE}`);
  console.log(`LIVE_BACKUP = ${report.live.LIVE_BACKUP}`);
  console.log(`LIVE_RESTORE = ${report.live.LIVE_RESTORE}`);
  console.log(`PERSISTENCE = ${report.live.PERSISTENCE}`);
  console.log(`EXTERNAL_ACCESS = ${center.masterStatus.EXTERNAL_ACCESS}`);
  console.log(`LIVE_VALIDATION = ${center.masterStatus.LIVE_VALIDATION}`);
  console.log(`PRODUCTION = ${center.masterStatus.PRODUCTION}`);
  console.log(`GO_LIVE = ${center.masterStatus.GO_LIVE}`);
  console.log(`SALES_ENABLED = ${center.masterStatus.SALES_ENABLED}`);
  console.log(`FAKE_PRODUCTION_EVIDENCE = ${report.rejectedEvidenceAttempts}`);
  console.log(`REAL_SIDE_EFFECTS = 0`);
  console.log(`HUMAN_REQUIRED = ${report.humanActionCount} action(s)`);
  console.log(`NEXT_HUMAN_ACTION = ${report.nextHumanAction ?? "—"}`);
}

if (jsonOutput) {
  console.log(JSON.stringify({ report, centerMaster: center.masterStatus }, null, 2));
  process.exit(0);
}

if (mode === "status") {
  printFinalReport();
  process.exit(0);
}

if (mode === "preflight") {
  writeHandoffDoc();
  printFinalReport();
  console.log("\nUpdated docs/BUZZARD_RENDER_PERSISTENCE_HUMAN_HANDOFF.md");
  process.exit(0);
}

if (mode === "gate") {
  const steps = [
    ["typecheck", "npm run typecheck"],
    ["test:render-persistence-evidence-bridge", "npm run test:render-persistence-evidence-bridge"],
    ["test:production-storage-preflight", "npm run test:production-storage-preflight"],
    ["test:external-access-control-center", "npm run test:external-access-control-center"],
  ];
  let failed = 0;
  for (const [label, cmd] of steps) {
    try {
      execSync(cmd, { stdio: "pipe", cwd: root, timeout: 300000 });
      console.log(`PASS: ${label}`);
    } catch {
      failed++;
      console.log(`FAIL: ${label}`);
    }
  }
  writeHandoffDoc();
  if (center.masterStatus.SALES_ENABLED === "1") {
    console.error("FAIL: SALES_ENABLED must remain 0");
    failed++;
  }
  printFinalReport();
  process.exit(failed ? 1 : 0);
}

console.error(`Unknown mode: ${mode}. Use status|preflight|gate`);
process.exit(1);
