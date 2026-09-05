#!/usr/bin/env node
/**
 * Safe PIM dry-run — mock/test supplier data only, no live import, no publish.
 *
 * Usage:
 *   npm run pim:dry-run
 *   npm run pim:dry-run -- --json
 *   npm run pim:dry-run -- --source=p1
 *   npm run pim:dry-run -- --supplier=SUP-DEMO-001
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migration = require("../server/lib/pim/productCatalogMigration.js");
const { buildStructuredValidationResult } = require("../server/lib/pim/productValidationReport.js");
const { runValidationPipeline } = require("../server/lib/pim/productValidationPipeline.js");
const { checkProductionSafety } = require("../server/lib/pim/productionSafetyGate.js");
const { createConnectorFromEnv } = require("../server/lib/supplier/realSupplierConnector.js");

const DEMO_FEED = path.join(
  __dirname,
  "../intelligence/buzzard_ai_complete/supplier_import_enrichment_engine/data/demo_supplier_feed.json"
);

function parseArgs(argv) {
  const args = {
    json: false,
    sources: ["p1", "legacy", "pim_catalog"],
    supplier: null,
  };
  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--source=")) {
      args.sources = arg
        .slice("--source=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--supplier=")) {
      args.supplier = arg.slice("--supplier=".length);
    }
  }
  return args;
}

function loadDemoSupplierRecords() {
  if (!fs.existsSync(DEMO_FEED)) return [];
  const doc = JSON.parse(fs.readFileSync(DEMO_FEED, "utf8"));
  const products = doc.products || doc.items || [];
  return products.map((p) => ({
    ...p,
    supplier_code: p.supplier_code || "SUP-DEMO-001",
    supplierCode: p.supplier_code || "SUP-DEMO-001",
  }));
}

function runSupplierDryRun(supplierCode) {
  const connector = createConnectorFromEnv();
  const status = connector.getStatus();
  if (status.credentialsConfigured && process.env.REAL_SUPPLIER_LIVE_IMPORT === "1") {
    throw new Error("Live supplier import is disabled for pim:dry-run");
  }

  const records = loadDemoSupplierRecords().filter(
    (r) => !supplierCode || r.supplier_code === supplierCode || r.supplierCode === supplierCode
  );

  const items = [];
  let valid = 0;
  let invalid = 0;
  let reviewRequired = 0;

  for (const record of records) {
    const pipeline = runValidationPipeline(record, {
      supplierCode: record.supplierCode || supplierCode || "SUP-DEMO-001",
      feedFormat: "mock",
    });
    const report = buildStructuredValidationResult(record, {
      supplierCode: record.supplierCode || supplierCode || "SUP-DEMO-001",
    });

    if (report.valid) valid += 1;
    else if (report.status === "REVIEW_REQUIRED") reviewRequired += 1;
    else invalid += 1;

    items.push({
      sku: pipeline.normalized?.supplierSku || record.supplier_sku || record.sku,
      title: pipeline.normalized?.title || record.name || record.title,
      status: report.status,
      valid: report.valid,
      lifecycleStatus: pipeline.lifecycleStatus,
      errors: report.errors,
      warnings: report.warnings,
      category: pipeline.normalized?.buzzardCategory || null,
      categoryResolution: pipeline.normalized?.categoryResolution || null,
    });
  }

  return {
    mode: "supplier_dry_run",
    liveSupplierContacted: false,
    publishPerformed: false,
    salesActivation: false,
    supplierCode: supplierCode || "SUP-DEMO-001",
    recordsProcessed: records.length,
    summary: { valid, invalid, reviewRequired },
    items,
  };
}

function printReport(result) {
  console.log("=== PIM DRY RUN ===\n");
  console.log(`Mode:                 ${result.mode}`);
  console.log(`Live supplier used:   ${result.liveSupplierContacted ? "YES" : "NO"}`);
  console.log(`Publish performed:    ${result.publishPerformed ? "YES" : "NO"}`);
  console.log(`Sales activation:     ${result.salesActivation ? "YES" : "NO"}`);
  if (result.summary.productsFound != null) {
    console.log(`Products found:       ${result.summary.productsFound}`);
    console.log(`Eligible:             ${result.summary.productsEligible}`);
    console.log(`Rejected:             ${result.summary.productsRejected}`);
    console.log(`Demo blocked:         ${result.summary.demoProductsBlocked}`);
    console.log(`Validation failures:  ${result.summary.validationFailures}`);
  } else {
    console.log(`Records processed:    ${result.recordsProcessed}`);
    console.log(`Valid:                ${result.summary.valid}`);
    console.log(`Review required:      ${result.summary.reviewRequired}`);
    console.log(`Invalid:              ${result.summary.invalid}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const safety = checkProductionSafety();
  if (!safety.ok) {
    console.error("Production safety check failed:", safety.issues.join("; "));
    process.exit(1);
  }

  let result;
  if (args.supplier) {
    result = runSupplierDryRun(args.supplier);
  } else {
    const migrationResult = migration.runDryRun({ sources: args.sources });
    result = {
      mode: "catalog_migration_dry_run",
      liveSupplierContacted: false,
      publishPerformed: false,
      salesActivation: false,
      dryRun: true,
      sources: args.sources,
      summary: migrationResult.summary,
      items: migrationResult.items,
    };
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("pim:dry-run failed:", err.message);
  process.exit(1);
});
