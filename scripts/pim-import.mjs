#!/usr/bin/env node
/**
 * Part 15 — PIM Core product import (dry-run default).
 *
 * Usage:
 *   npm run pim:import -- --dry-run
 *   npm run pim:import -- --dry-run --source=p1
 *   npm run pim:import            # live import (local only — requires safety gate)
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migration = require("../server/lib/pim/productCatalogMigration.js");
const { checkProductionSafety } = require("../server/lib/pim/productionSafetyGate.js");
const goLiveApproval = require("../server/lib/commerce/goLiveApproval.js");

function parseArgs(argv) {
  const args = { dryRun: true, sources: ["p1", "legacy", "pim_catalog"], json: false };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--import" || arg === "--live") args.dryRun = false;
    else if (arg.startsWith("--source=")) {
      args.sources = arg
        .slice("--source=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--json") args.json = true;
  }
  return args;
}

function printSafetyBanner() {
  const safety = checkProductionSafety();
  console.log("=== PRODUCTION SAFETY ===");
  console.log(`BUZZARD_SALES_ENABLED: ${process.env.BUZZARD_SALES_ENABLED === "1" ? "1" : "0"}`);
  console.log(`GO-LIVE LOCK:          ${goLiveApproval.PRODUCTION_SAFETY_LOCK ? "ACTIVE" : "INACTIVE"}`);
  console.log(`Safety gate:           ${safety.ok ? "PASS" : "FAIL — " + safety.issues.join("; ")}`);
  console.log("");
}

function printReport(result) {
  console.log(`=== PIM IMPORT ${result.dryRun ? "DRY RUN" : "LIVE"} ===\n`);
  console.log(`PRODUCTS FOUND:          ${result.summary.productsFound}`);
  console.log(`PRODUCTS ELIGIBLE:       ${result.summary.productsEligible}`);
  console.log(`PRODUCTS REJECTED:       ${result.summary.productsRejected}`);
  console.log(`DEMO PRODUCTS BLOCKED:   ${result.summary.demoProductsBlocked}`);
  console.log(`DUPLICATES:              ${result.summary.duplicates}`);
  console.log(`VALIDATION FAILURES:     ${result.summary.validationFailures}`);
  console.log(`CATEGORY MAP REQUIRED:   ${result.summary.categoryMappingRequired}`);
  console.log(`PUBLIC PRODUCTS CREATED: ${result.summary.publicProductsCreated}`);
  if (result.summary.imported != null) console.log(`IMPORTED:                ${result.summary.imported}`);
  console.log("");

  console.log("--- Items ---");
  for (const item of result.items) {
    console.log(
      [
        item.status.padEnd(24),
        item.source?.padEnd(11) || "".padEnd(11),
        item.sku?.padEnd(22) || "",
        (item.title || "").slice(0, 40),
        item.rejectionReason ? `→ ${item.rejectionReason}` : "",
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  printSafetyBanner();

  if (!args.dryRun) {
    console.log("⚠ Live import requested — production safety gate will be enforced.\n");
  } else {
    console.log("Dry run — no database modifications.\n");
  }

  const options = { sources: args.sources };
  const result = args.dryRun ? migration.runDryRun(options) : migration.runImport(options);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }

  const exitCode =
    result.summary.productsEligible > 0 || args.dryRun
      ? 0
      : result.summary.validationFailures > 0
        ? 1
        : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("pim:import failed:", err.message);
  process.exit(1);
});
