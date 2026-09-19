#!/usr/bin/env node
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
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";

execSync("node scripts/build-inter-cars-production-access-evidence-bridge.mjs", { stdio: "pipe", cwd: root });
execSync("node scripts/build-external-access-control-center-bridge.mjs", { stdio: "pipe", cwd: root });

const bridge = require("../server/lib/interCarsProductionAccessEvidenceBridge.bundle.cjs");
const center = require("../server/lib/externalAccessControlCenter.bundle.cjs");
const report = bridge.buildInterCarsProductionAccessBridgeReport();
const centerReport = center.buildExternalAccessControlCenterReport();

function cap(name) {
  return report.capabilities.find((c) => c.capability === name)?.status ?? "UNVERIFIED";
}

function writeDocs() {
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_INTER_CARS_PRODUCTION_ACCESS.md"),
    `# BUZZARD Inter Cars Production Access\n\nGenerated: ${report.generatedAt}\n\nCredential reference: ${report.credentialReference}\nCreate order (#342): ${report.stage342Gate}\n`,
  );
  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_INTER_CARS_EVIDENCE_RULE.md"),
    `# Inter Cars Evidence Rule\n\n- source must be INTER_CARS_LIVE\n- environment PRODUCTION or CONTROLLED_VALIDATION\n- read-only capabilities only in #362 bridge\n- createOrder only via existing #342\n- LOCAL/SANDBOX/MOCK ≠ production\n`,
  );
  fs.writeFileSync(
    path.join(docsDir, "BUZZARD_INTER_CARS_HUMAN_HANDOFF.md"),
    `# Inter Cars Human Handoff\n\n1. Inter Cars production account + contract\n2. OAuth2 credentials in secret store\n3. Configure SUPPLIER_LIVE_CREDENTIALS_SECRET_REF\n4. Read-only live validation\n5. #342 controlled createOrder validation\n\nNext: ${report.nextHumanAction ?? "—"}\n`,
  );
}

function printReport() {
  console.log("BUZZARD #362 — INTER CARS PRODUCTION ACCESS");
  console.log(`SOFTWARE = COMPLETE`);
  console.log(`CONFIGURATION = ${centerReport.scoreboard.CONFIGURATION}`);
  console.log(`CREDENTIAL_REFERENCE = ${report.credentialReference}`);
  console.log(`CREDENTIAL_VALIDATION = ${report.credentialValidation}`);
  console.log(`READ_ONLY_ACCESS = ${report.readOnlyAccess}`);
  console.log(`CATALOG = ${cap("catalog")}`);
  console.log(`PRODUCTS = ${cap("products")}`);
  console.log(`STOCK = ${cap("stock")}`);
  console.log(`PRICING = ${cap("pricing")}`);
  console.log(`CREATE_ORDER = ${report.createOrder}`);
  console.log(`CANCEL_ORDER = ${cap("cancelOrder")}`);
  console.log(`ORDER_STATUS = ${cap("orderStatus")}`);
  console.log(`TRACKING = ${cap("tracking")}`);
  console.log(`RETURNS = ${cap("returns")}`);
  console.log(`REFUND = ${cap("refund")}`);
  console.log(`LIVE_VALIDATION = ${centerReport.masterStatus.LIVE_VALIDATION}`);
  console.log(`PRODUCTION = ${centerReport.masterStatus.PRODUCTION}`);
  console.log(`GO_LIVE = ${centerReport.masterStatus.GO_LIVE}`);
  console.log(`SALES_ENABLED = ${centerReport.masterStatus.SALES_ENABLED}`);
  console.log(`HUMAN_REQUIRED = ${report.humanActionCount} action(s)`);
  console.log(`BLOCKERS = ${report.blockers.length}`);
  console.log(`FAKE_PRODUCTION_EVIDENCE = ${report.fakeProductionEvidence}`);
  console.log(`REAL_SIDE_EFFECTS = ${report.realSideEffects}`);
  console.log(`NEXT_HUMAN_ACTION = ${report.nextHumanAction ?? "—"}`);
}

if (jsonOutput) {
  console.log(JSON.stringify({ report, center: centerReport.masterStatus }, null, 2));
  process.exit(0);
}

if (mode === "status") {
  printReport();
  process.exit(0);
}

if (mode === "preflight") {
  writeDocs();
  printReport();
  console.log("\nDocs updated under docs/BUZZARD_INTER_CARS_*");
  process.exit(0);
}

if (mode === "gate") {
  const steps = [
    ["typecheck", "npm run typecheck"],
    ["test:inter-cars-production-access-evidence-bridge", "npm run test:inter-cars-production-access-evidence-bridge"],
    ["test:supplier-inter-cars-production-access", "npm run test:supplier-inter-cars-production-access"],
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
  writeDocs();
  if (centerReport.masterStatus.SALES_ENABLED === "1") failed++;
  if (report.realSideEffects > 0) failed++;
  printReport();
  process.exit(failed ? 1 : 0);
}

console.error("Unknown mode. Use status|preflight|gate");
process.exit(1);
