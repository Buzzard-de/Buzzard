#!/usr/bin/env node
/**
 * PIM health report — diagnostic only, no mutations.
 *
 * Usage:
 *   npm run pim:health
 *   npm run pim:health -- --json
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildPimHealthReport } = require("../server/lib/pim/pimHealthReport.js");
const { checkProductionSafety } = require("../server/lib/pim/productionSafetyGate.js");

function parseArgs(argv) {
  return { json: argv.includes("--json") };
}

function printHuman(report) {
  console.log("=== BUZZARD PIM HEALTH ===\n");
  console.log(`Timestamp:           ${report.timestamp}`);
  console.log(`Diagnostic only:     ${report.diagnosticOnly}`);
  console.log(`Publish blocked:     ${report.publishBlocked}`);
  console.log(`Live supplier used:  ${report.liveSupplierContacted}`);
  console.log("");
  console.log("--- Safety ---");
  console.log(`Sales enabled:       ${report.salesEnabled ? "YES (UNSAFE)" : "OFF"}`);
  console.log(`Safety gate:         ${report.safety.ok ? "PASS" : "FAIL"}`);
  console.log(`Go-live lock:        ${report.safety.goLiveLock ? "ACTIVE" : "INACTIVE"}`);
  console.log(`Supplier live import:${report.safety.supplierLiveImport ? "ON (UNSAFE)" : "OFF"}`);
  console.log(`Supplier dry-run:    ${report.safety.supplierDryRun ? "ON" : "OFF"}`);
  console.log("");
  console.log("--- Catalog ---");
  console.log(`Total PIM products:  ${report.summary.totalProducts}`);
  console.log(`Valid (approx):      ${report.summary.validProducts}`);
  console.log(`Invalid/blocked:     ${report.summary.invalidProducts}`);
  console.log(`Review required:     ${report.summary.reviewRequired}`);
  console.log(`Missing images:      ${report.summary.missingImages}`);
  console.log(`Missing categories:  ${report.summary.missingCategories}`);
  console.log(`Duplicate SKUs:      ${report.summary.duplicateSkus}`);
  console.log(`Duplicate EAN/GTIN:  ${report.summary.duplicateEans}`);
  console.log(`Demo products:       ${report.summary.demoProducts}`);
  console.log(`Public catalog:      ${report.summary.publicCatalogProducts}`);
  console.log(`Staging records:     ${report.summary.stagingRecords}`);
  console.log("");
  console.log("--- Workflow ---");
  for (const [key, value] of Object.entries(report.workflow)) {
    if (value > 0) console.log(`  ${key.padEnd(20)} ${value}`);
  }
  console.log("");
  console.log("--- Supplier distribution ---");
  for (const [supplier, count] of Object.entries(report.supplierDistribution)) {
    console.log(`  ${supplier.padEnd(24)} ${count}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const safety = checkProductionSafety();
  if (!safety.ok) {
    console.error("Production safety check failed:", safety.issues.join("; "));
    process.exit(1);
  }

  const report = buildPimHealthReport();

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("pim:health failed:", err.message);
  process.exit(1);
});
