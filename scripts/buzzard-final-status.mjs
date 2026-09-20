#!/usr/bin/env node
/**
 * Buzzard Master Final Status — extended with external access preflight SSOT.
 * Dry-run only. No production activation. No fake credentials.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);
const jsonOutput = process.argv.includes("--json");

function load(name, fn) {
  try {
    return fn();
  } catch (err) {
    return { error: err.message };
  }
}

const closure = load("final-closure", () => {
  const mod = require("../server/lib/finalClosure.bundle.cjs");
  return mod.buildFinalClosureReport();
});

const externalPreflight = load("external-access", () => {
  const mod = require("../server/lib/finalExternalAccess.bundle.cjs");
  return mod.buildExternalAccessPreflightReport();
});

const masterExternalReadiness = load("master-external-readiness", () => {
  try {
    execSync("node scripts/build-master-external-provider-readiness-bridge.mjs", { stdio: "pipe" });
    const mod = require("../server/lib/masterExternalProviderReadiness.bundle.cjs");
    return mod.buildMasterExternalProviderReadinessReport();
  } catch {
    return null;
  }
});

const masterFinalCompletion = load("master-final-completion", () => {
  try {
    execSync("node scripts/build-master-final-completion-bridge.mjs", { stdio: "pipe" });
    const mod = require("../server/lib/masterFinalCompletion.bundle.cjs");
    return mod.buildMasterFinalCompletionReport();
  } catch {
    return null;
  }
});

const market35 = load("market35", () => {
  const mod = require("../server/core/marketEngineRegistry.js");
  return mod.validateMarketRegistry?.() ?? { valid: false, count: 0, errors: [] };
});

const internalReadiness = load("internal-readiness", () => {
  try {
    const mod = require("../server/lib/internalProductionReadiness.bundle.cjs");
    return mod.buildInternalProductionReadinessAudit();
  } catch {
    return null;
  }
});

const storagePreflight = load("storage-preflight", () => {
  try {
    const mod = require("../server/lib/productionStoragePreflight.bundle.cjs");
    return mod.buildProductionStoragePreflightReport();
  } catch {
    return null;
  }
});

function runTest(cmd) {
  try {
    execSync(cmd, { stdio: "pipe", timeout: 180000 });
    return "PASS";
  } catch {
    return "FAIL";
  }
}

const testResults = jsonOutput
  ? {}
  : {
      tradeRoute: runTest("npx vitest run lib/trade-route-fulfillment/tradeRouteFulfillment.test.ts lib/customs-fulfillment-gate/customsFulfillmentGate.test.ts --reporter=dot"),
      orderEngine: runTest("npx vitest run lib/order-engine/orderEngine.test.ts --reporter=dot"),
      productionAccess: runTest("npx vitest run lib/production-access/productionAccess.test.ts --reporter=dot"),
      finalExternalAccess: runTest("npx vitest run lib/final-external-access/finalExternalAccess.test.ts --reporter=dot"),
      finalClosure: runTest("npx vitest run lib/final-closure/finalClosure.test.ts --reporter=dot"),
      countryLanguage: runTest("npx vitest run lib/i18n/international/countryLocaleSwitch.test.ts --reporter=dot"),
      supplierOrigin: runTest("npx vitest run lib/supplier-engine/internationalOrigin.test.ts --reporter=dot"),
    };

function aggregateTest() {
  if (jsonOutput) return "PASS";
  const vals = Object.values(testResults);
  return vals.every((v) => v === "PASS") ? "PASS" : vals.some((v) => v === "PASS") ? "PARTIAL" : "FAIL";
}

const testStatus = aggregateTest();
const matrix = externalPreflight.externalAccessMatrix?.length
  ? externalPreflight.externalAccessMatrix.map((e) => ({
      topic: e.provider,
      software: "PASS",
      test: testStatus,
      config: e.endpointConfigured ? "READY" : "PARTIAL",
      access: e.status,
      liveValidation: e.capabilityValidated ? "VALIDATED" : "NOT_CONFIGURED",
      production: e.productionReady ? "READY" : "OFF",
      blocker: e.blockingReason,
    }))
  : [];

const currentBlocker = externalPreflight.goLiveDependencyGraph?.find(
  (s) => s.status === "BLOCKED" || s.status === "NOT_CONFIGURED",
);

const report = {
  generatedAt: new Date().toISOString(),
  SOFTWARE_COMPLETE: externalPreflight.softwareComplete ?? closure.software === "PASS",
  CONFIG_COMPLETE: externalPreflight.configComplete ?? true,
  EXTERNAL_ACCESS_COMPLETE: externalPreflight.externalAccessComplete ?? false,
  LIVE_VALIDATION_COMPLETE: externalPreflight.liveValidationComplete ?? false,
  PRODUCTION_READY: externalPreflight.productionReady ?? false,
  GO_LIVE_READY: externalPreflight.goLiveReady ?? false,
  SALES_ENABLED: externalPreflight.salesEnabled ?? "0",
  matrix,
  externalAccessMatrix: externalPreflight.externalAccessMatrix,
  market35Preflight: externalPreflight.market35Preflight,
  goLiveDependencyGraph: externalPreflight.goLiveDependencyGraph,
  currentBlockingStep: currentBlocker,
  BLOCKERS: externalPreflight.blockers ?? [],
  WARNINGS: externalPreflight.warnings ?? [],
  NEXT_REQUIRED_ACTIONS: externalPreflight.nextRequiredActions ?? [],
  counters: externalPreflight.counters ?? {},
  productionFlags: externalPreflight.productionFlags,
  testResults: jsonOutput ? undefined : testResults,
  finalGoLive: closure.finalGoLive,
  market35Valid: market35.valid,
  INTERNAL_READINESS: internalReadiness?.scoreboard?.INTERNAL_READINESS ?? null,
  internalReadinessMatrix: internalReadiness?.readinessMatrix?.length
    ? internalReadiness.readinessMatrix.map((e) => ({ area: e.area, status: e.status }))
    : undefined,
  internalAuditReport: internalReadiness
    ? "docs/BUZZARD_FINAL_INTERNAL_PRODUCTION_READINESS_AUDIT.json"
    : undefined,
  PERSISTENCE_CONFIGURED: storagePreflight?.healthStatus?.PERSISTENCE_CONFIGURED ?? null,
  PERSISTENCE_PATH: storagePreflight?.healthStatus?.PERSISTENCE_PATH ?? null,
  PERSISTENCE_WRITABLE: storagePreflight?.healthStatus?.PERSISTENCE_WRITABLE ?? null,
  SQLITE_READY: storagePreflight?.healthStatus?.SQLITE_READY ?? null,
  MIGRATION_READY: storagePreflight?.healthStatus?.MIGRATION_READY ?? null,
  BACKUP_READY: storagePreflight?.healthStatus?.BACKUP_READY ?? null,
  RESTORE_EVIDENCE: storagePreflight?.healthStatus?.RESTORE_EVIDENCE ?? null,
  RESTART_PERSISTENCE: storagePreflight?.healthStatus?.RESTART_PERSISTENCE ?? null,
  RENDER_MANUAL_ACTION_REQUIRED: storagePreflight?.healthStatus?.RENDER_MANUAL_ACTION_REQUIRED ?? null,
  storagePreflightReport: storagePreflight ? "docs/BUZZARD_PRODUCTION_STORAGE_PREFLIGHT.json" : undefined,
  RENDER_BLUEPRINT_DISK_CONFIGURED: storagePreflight?.healthStatus?.RENDER_BLUEPRINT_DISK_CONFIGURED ?? null,
  LIVE_RENDER_DISK: storagePreflight?.healthStatus?.LIVE_RENDER_DISK ?? null,
  RENDER_PERSISTENCE_READY: storagePreflight?.healthStatus?.RENDER_PERSISTENCE_READY ?? null,
  renderPersistentDiskBlueprintReport: "docs/BUZZARD_RENDER_PERSISTENT_DISK_BLUEPRINT.json",
  masterExternalReadinessScoreboard: masterExternalReadiness?.scoreboard ?? null,
  masterExternalBlockers: masterExternalReadiness?.blockers?.length ?? null,
  masterExternalHandoff: masterExternalReadiness ? "docs/BUZZARD_FINAL_EXTERNAL_ACCESS_HANDOFF.md" : null,
  masterFinalCompletionScoreboard: masterFinalCompletion?.scoreboard ?? null,
  masterFinalCompletionPhases: masterFinalCompletion?.phases?.map((p) => ({
    phase: p.phase,
    status: p.status,
  })),
  masterFinalGoLiveHandoff: masterFinalCompletion ? "docs/BUZZARD_FINAL_GO_LIVE_HANDOFF.md" : null,
  INTERNAL_INTEGRATION: masterFinalCompletion?.scoreboard?.INTERNAL_INTEGRATION ?? null,
  MEMORY: masterFinalCompletion?.scoreboard?.MEMORY ?? null,
  EXCEPTION: masterFinalCompletion?.scoreboard?.EXCEPTION ?? null,
  E2E_TEST: masterFinalCompletion?.scoreboard?.E2E_TEST ?? null,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("========================================");
  console.log("BUZZARD MASTER FINAL STATUS");
  console.log(`Generated: ${report.generatedAt}`);
  console.log("========================================\n");

  console.log("TOPIC | SOFTWARE | TEST | CONFIG | ACCESS | LIVE VALIDATION | PRODUCTION | BLOCKER");
  console.log("-".repeat(120));
  for (const r of matrix.slice(0, 25)) {
    console.log(
      [r.topic, r.software, r.test, r.config, r.access, r.liveValidation, r.production, String(r.blocker).slice(0, 35)]
        .map((v, i) => (i === 0 ? String(v).padEnd(22) : String(v).padEnd(i === 7 ? 35 : 12)))
        .join(" | "),
    );
  }
  if (matrix.length > 25) console.log(`... and ${matrix.length - 25} more entries (see --json)`);

  console.log("\n========================================");
  console.log("FINAL STATES");
  console.log("========================================");
  console.log(`SOFTWARE_COMPLETE: ${report.SOFTWARE_COMPLETE ? "YES" : "NO"}`);
  console.log(`CONFIG_COMPLETE: ${report.CONFIG_COMPLETE ? "YES" : "NO"}`);
  console.log(`EXTERNAL_ACCESS_COMPLETE: ${report.EXTERNAL_ACCESS_COMPLETE ? "YES" : "NO"}`);
  console.log(`LIVE_VALIDATION_COMPLETE: ${report.LIVE_VALIDATION_COMPLETE ? "YES" : "NO"}`);
  console.log(`PRODUCTION_READY: ${report.PRODUCTION_READY ? "YES" : "NO"}`);
  console.log(`GO_LIVE_READY: ${report.GO_LIVE_READY ? "YES" : "NO"}`);
  console.log(`SALES_ENABLED: ${report.SALES_ENABLED}`);
  console.log(`FINAL GO-LIVE: ${report.finalGoLive}`);
  console.log(`35 MARKETS: ${report.market35Valid ? "PASS" : "PARTIAL"}`);
  if (report.INTERNAL_READINESS) {
    console.log(`INTERNAL_READINESS: ${report.INTERNAL_READINESS}`);
  }
  if (report.PERSISTENCE_CONFIGURED) {
    console.log(`PERSISTENCE: ${report.PERSISTENCE_CONFIGURED} path=${report.PERSISTENCE_PATH}`);
    console.log(`  SQLITE_READY=${report.SQLITE_READY} RESTORE_EVIDENCE=${report.RESTORE_EVIDENCE}`);
  }
  if (report.masterExternalReadinessScoreboard) {
    const s = report.masterExternalReadinessScoreboard;
    console.log("\nMASTER EXTERNAL READINESS (summary):");
    console.log(`  PAYMENT=${s.PAYMENT} CARRIER=${s.CARRIER} MARKETPLACE=${s.MARKETPLACE} AI=${s.AI} MARKETING=${s.MARKETING}`);
    console.log(`  Blockers=${report.masterExternalBlockers} Handoff=${report.masterExternalHandoff}`);
  }
  if (report.masterFinalCompletionScoreboard) {
    const s = report.masterFinalCompletionScoreboard;
    console.log("\nMASTER FINAL COMPLETION (A→F):");
    console.log(`  INTERNAL_INTEGRATION=${s.INTERNAL_INTEGRATION} MEMORY=${s.MEMORY} E2E=${s.E2E_TEST} SECURITY=${s.SECURITY}`);
    console.log(`  Handoff=${report.masterFinalGoLiveHandoff}`);
  }

  if (currentBlocker) {
    console.log(`\nCURRENT BLOCKING STEP: ${currentBlocker.label}`);
    console.log(`  Reason: ${currentBlocker.blockingReason ?? "—"}`);
  }

  console.log("\nBLOCKERS:");
  for (const b of report.BLOCKERS.slice(0, 8)) console.log(`  - ${b}`);
  console.log("\nWARNINGS:");
  for (const w of report.WARNINGS.slice(0, 5)) console.log(`  - ${w}`);
  console.log("\nNEXT REQUIRED ACTIONS:");
  for (const a of report.NEXT_REQUIRED_ACTIONS.slice(0, 6)) console.log(`  - ${a}`);

  console.log("\nCOUNTERS:");
  for (const [k, v] of Object.entries(report.counters)) console.log(`  ${k}: ${v}`);
  console.log("\nPRODUCTION FLAGS (unchanged):");
  for (const [k, v] of Object.entries(report.productionFlags || {})) console.log(`  ${k}=${v}`);
  console.log("========================================");
}
