#!/usr/bin/env node
/**
 * External Access & Go-Live Control Center CLI (read-only, no external mutations).
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

execSync("node scripts/build-external-access-control-center-bridge.mjs", { stdio: "pipe", cwd: root });
const mod = require("../server/lib/externalAccessControlCenter.bundle.cjs");
const report = mod.buildExternalAccessControlCenterReport();
let masterBanner = "";
try {
  execSync("node scripts/build-master-external-provider-readiness-bridge.mjs", { stdio: "pipe", cwd: root });
  const master = require("../server/lib/masterExternalProviderReadiness.bundle.cjs");
  masterBanner = master.formatMasterExternalReadinessBanner(master.buildMasterExternalProviderReadinessReport());
} catch {
  masterBanner = "";
}

function writeDocs() {
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_EXTERNAL_ACCESS_CONTROL_CENTER.md"),
    `# BUZZARD External Access & Go-Live Control Center

Generated: ${report.generatedAt}

## Master Status

| Field | Value |
|-------|-------|
| SOFTWARE_COMPLETE | ${report.masterStatus.SOFTWARE_COMPLETE} |
| CONFIGURATION_COMPLETE | ${report.masterStatus.CONFIGURATION_COMPLETE} |
| EXTERNAL_ACCESS | ${report.masterStatus.EXTERNAL_ACCESS} |
| LIVE_VALIDATION | ${report.masterStatus.LIVE_VALIDATION} |
| PRODUCTION | ${report.masterStatus.PRODUCTION} |
| GO_LIVE | ${report.masterStatus.GO_LIVE} |
| SALES_ENABLED | ${report.masterStatus.SALES_ENABLED} |

Providers in registry: ${report.providerRegistry.length}
Blockers: ${report.blockers.length}
`,
  );

  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_HUMAN_EXTERNAL_ACTIONS.md"),
    `# BUZZARD Human External Actions

${report.nextHumanActions.map((a) => `${a.priority}. **${a.provider}** — ${a.action}\n   - Why: ${a.why}\n   - Verify: ${a.verificationMethod}`).join("\n\n")}
`,
  );

  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_PRODUCTION_EVIDENCE_RULE.md"),
    `# BUZZARD Production Evidence Rule

- LOCAL_TEST, UNIT_TEST, SANDBOX, BLUEPRINT, CONFIGURATION ≠ production evidence
- Only PRODUCTION and CONTROLLED_VALIDATION environments count
- CONFIGURED ≠ VALIDATED
- READY never from mock tests alone

Fake evidence rejections this run: ${report.fakeProductionEvidence}
`,
  );

  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_GO_LIVE_DEPENDENCY_GRAPH.md"),
    `# BUZZARD Go-Live Dependency Graph

${report.goLiveDependencyGraph.map((s) => `- ${s.label}: **${s.status}**${s.blockingReason ? ` (${s.blockingReason})` : ""}`).join("\n")}
`,
  );

  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_EXTERNAL_ACCESS_CONTROL_CENTER.json"),
    JSON.stringify(report, null, 2),
  );
}

function printFinalReport() {
  console.log("BUZZARD EXTERNAL ACCESS CONTROL CENTER");
  console.log("=======================================");
  console.log(`SOFTWARE                = ${report.scoreboard.SOFTWARE}`);
  console.log(`CONFIGURATION           = ${report.scoreboard.CONFIGURATION}`);
  console.log(`PERSISTENCE             = ${report.scoreboard.PERSISTENCE}`);
  console.log(`EXTERNAL_ACCESS         = ${report.masterStatus.EXTERNAL_ACCESS}`);
  console.log(`LIVE_VALIDATION         = ${report.masterStatus.LIVE_VALIDATION}`);
  console.log(`PRODUCTION              = ${report.masterStatus.PRODUCTION}`);
  console.log(`GO_LIVE                 = ${report.masterStatus.GO_LIVE}`);
  console.log(`SALES_ENABLED           = ${report.masterStatus.SALES_ENABLED}`);
  console.log(`SUPPLIER                = ${report.scoreboard.SUPPLIER}`);
  console.log(`PAYMENT                 = ${report.scoreboard.PAYMENT}`);
  console.log(`CARRIER                 = ${report.scoreboard.CARRIER}`);
  console.log(`RETURNS                 = ${report.scoreboard.RETURNS}`);
  console.log(`AI                      = ${report.scoreboard.AI}`);
  console.log(`MARKETPLACE             = ${report.scoreboard.MARKETPLACE}`);
  console.log(`MARKETING               = ${report.scoreboard.MARKETING}`);
  console.log(`RENDER (blueprint)      = ${report.renderControl.BLUEPRINT_CONFIGURATION}`);
  console.log(`RENDER (live disk)      = ${report.renderControl.LIVE_PERSISTENT_DISK}`);
  console.log(`35_MARKETS              = ${report.scoreboard.MARKETS_35}`);
  console.log(`HUMAN_REQUIRED          = ${report.nextHumanActions.length} action(s)`);
  console.log(`BLOCKERS                = ${report.blockers.length}`);
  console.log(`NEXT_HUMAN_ACTION       = ${report.nextHumanActions[0]?.action ?? "—"}`);
  console.log(`FAKE_PRODUCTION_EVIDENCE = ${report.fakeProductionEvidence}`);
  console.log(`REAL_SIDE_EFFECTS        = ${Object.values(report.sideEffectCounters).reduce((a, b) => a + (Number(b) || 0), 0)}`);
}

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (mode === "status" || mode === "go-live") {
  printFinalReport();
  if (masterBanner) console.log("\n" + masterBanner);
  if (mode === "go-live") {
    console.log("\nGo-Live Graph (first 8 steps):");
    for (const s of report.goLiveDependencyGraph.slice(0, 8)) {
      console.log(`  ${s.label}: ${s.status}`);
    }
  }
  process.exit(0);
}

if (mode === "preflight") {
  writeDocs();
  printFinalReport();
  if (masterBanner) console.log("\n" + masterBanner);
  console.log("\nDocs updated under docs/BUZZARD_*");
  process.exit(0);
}

if (mode === "gate") {
  const steps = [
    ["typecheck", "npm run typecheck"],
    ["test:external-access-control-center", "npm run test:external-access-control-center"],
    ["test:final-external-access", "npm run test:final-external-access"],
    ["test:master-external-provider-readiness", "npm run test:master-external-provider-readiness"],
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
  writeDocs();
  if (report.masterStatus.SALES_ENABLED === "1") {
    console.error("FAIL: SALES_ENABLED must remain 0");
    failed++;
  }
  const fx = Object.values(report.sideEffectCounters).reduce((a, b) => a + (Number(b) || 0), 0);
  if (fx > 0) {
    console.error("FAIL: real side effects detected");
    failed++;
  }
  printFinalReport();
  if (masterBanner) console.log("\n" + masterBanner);
  process.exit(failed ? 1 : 0);
}

console.error(`Unknown mode: ${mode}. Use status|preflight|gate|go-live`);
process.exit(1);
