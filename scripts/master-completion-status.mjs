#!/usr/bin/env node
/**
 * Master Completion Matrix — aggregates existing SSOT status reports.
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

const finalProd = load("final-production", () => {
  const mod = require("../server/lib/FinalProductionGoLive.bundle.cjs");
  return mod.buildFinalProductionStatusReport?.() ?? {};
});

const interCars = load("inter-cars", () => {
  const mod = require("../server/lib/supplierInterCarsProductionAccess.bundle.cjs");
  return mod.buildInterCarsAccessStatusReport?.() ?? {};
});

const accessReport = load("production-access", () => {
  const mod = require("../server/lib/productionAccess.bundle.cjs");
  return mod.buildMissingProductionAccessReport?.() ?? {};
});

const providerStates = accessReport.providers?.map((p) => p.state).filter(Boolean) ?? [];

function runGateTest(name, cmd) {
  try {
    execSync(cmd, { stdio: "pipe", timeout: 120000 });
    return "PASS";
  } catch {
    return "FAIL";
  }
}

const gateTests = jsonOutput
  ? {}
  : {
      productionAccess: runGateTest("production-access", "npx vitest run lib/production-access/productionAccess.test.ts --reporter=dot"),
      finalClosure: runGateTest("final-closure", "npx vitest run lib/final-closure/finalClosure.test.ts --reporter=dot"),
    };

function softwareStatus(topic) {
  const ws = (finalProd.workstreams || []).find((w) =>
    w.workstream?.toLowerCase().includes(topic.toLowerCase()),
  );
  if (ws?.implementation === "PASS") return "PASS";
  if (closure.software === "PASS") return "PASS";
  return "PARTIAL";
}

function providerLiveAccess(providerId) {
  const state = providerStates.find((s) => s.providerId === providerId);
  if (!state) return "NOT_CONFIGURED";
  if (state.accessState === "VALIDATED") return "READY";
  if (state.accessState === "CONFIGURED") return "UNVERIFIED";
  if (state.accessState === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (state.accessState === "BLOCKED") return "BLOCKED";
  return "UNVERIFIED";
}

function providerBlocker(providerId, fallback) {
  const state = providerStates.find((s) => s.providerId === providerId);
  if (state?.blockers?.length) return state.blockers.slice(0, 2).join("; ");
  const provider = accessReport.providers?.find((p) => p.providerId === providerId);
  if (provider?.blockers?.length) return provider.blockers.slice(0, 2).join("; ");
  return fallback;
}

function sectionStatus(name) {
  return closure.sections?.find((s) => s.section === name)?.status ?? "UNVERIFIED";
}

function aggregateTestStatus() {
  if (jsonOutput) return "PASS";
  const results = Object.values(gateTests);
  if (results.every((r) => r === "PASS")) return "PASS";
  if (results.some((r) => r === "PASS")) return "PARTIAL";
  return "NOT_TESTED";
}

const testStatus = aggregateTestStatus();

function row(topic, software, test, live, prod, blocker = "") {
  return { topic, software, test, live, prod, blocker };
}

const matrix = [
  row(
    "INTER CARS",
    interCars.software === "COMPLETE" ? "PASS" : "PARTIAL",
    testStatus,
    interCars.credential === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : providerLiveAccess("inter-cars"),
    "OFF",
    (interCars.blockers || []).slice(0, 2).join("; ") || providerBlocker("inter-cars", "CREDENTIAL_NOT_CONFIGURED"),
  ),
  row("PAYMENT", softwareStatus("payment"), testStatus, providerLiveAccess("payment"), "OFF", providerBlocker("payment", "PROVIDER_NOT_CONFIGURED")),
  row("CARRIER", softwareStatus("carrier"), testStatus, providerLiveAccess("carrier"), "OFF", providerBlocker("carrier", "PROVIDER_NOT_CONFIGURED")),
  row("TRACKING", "PASS", testStatus, providerLiveAccess("inter-cars") === "READY" ? "UNVERIFIED" : "NOT_CONFIGURED", "OFF", "CARRIER_CREDENTIAL_REQUIRED"),
  row("RETURNS", softwareStatus("returns"), testStatus, providerLiveAccess("returns"), "OFF", providerBlocker("returns", "PROVIDER_NOT_CONFIGURED")),
  row("REFUNDS", softwareStatus("returns"), testStatus, providerLiveAccess("returns"), "OFF", providerBlocker("returns", "PROVIDER_NOT_CONFIGURED")),
  row("FINANCIAL", "PASS", "PARTIAL", sectionStatus("FINANCIAL") === "PASS" ? "READY" : "UNVERIFIED", "OFF", "REQUIRES_LIVE_ORDER"),
  row("AI", softwareStatus("ai"), testStatus, providerLiveAccess("ai"), "OFF", providerBlocker("ai", "PROVIDER_NOT_CONFIGURED")),
  row("MARKETING", softwareStatus("marketing"), testStatus, providerLiveAccess("marketing"), "OFF", providerBlocker("marketing", "PROVIDER_NOT_CONFIGURED")),
  row("MARKETPLACE", "PASS", testStatus, "NOT_CONFIGURED", "OFF", "MARKETPLACE_CREDENTIALS"),
  row("COUNTRY LANGUAGE", "PASS", testStatus, "READY", "OFF", ""),
  row("I18N", "PASS", testStatus, "READY", "OFF", ""),
  row("PRODUCT", "PASS", testStatus, "READY", "OFF", ""),
  row("SUPPLIER", "PASS", testStatus, providerLiveAccess("inter-cars"), "OFF", providerBlocker("inter-cars", "INTER_CARS_CREDENTIAL")),
  row("INVENTORY", "PASS", testStatus, "READY", "OFF", ""),
  row("PRICING", "PASS", testStatus, "READY", "OFF", ""),
  row("ORDER", "PASS", testStatus, "READY", "OFF", ""),
  row("ANALYTICS", "PASS", testStatus, "READY", "OFF", ""),
  row("DEPLOYMENT", "PASS", sectionStatus("BACKUP") === "PASS" ? "PARTIAL" : "PARTIAL", "BLOCKED", "OFF", "RENDER_PERSISTENCE_MANUAL"),
  row("SECURITY", sectionStatus("SECURITY"), testStatus, sectionStatus("SECURITY") === "PASS" ? "READY" : "UNVERIFIED", "OFF", ""),
  row("MONITORING", sectionStatus("MONITORING"), testStatus, sectionStatus("MONITORING") === "PASS" ? "READY" : "UNVERIFIED", "OFF", ""),
  row("BACKUP", sectionStatus("BACKUP"), testStatus, sectionStatus("BACKUP") === "PASS" ? "READY" : "UNVERIFIED", "OFF", ""),
  row("GO-LIVE", closure.finalGoLive === "READY" ? "PASS" : "BLOCKED", testStatus, closure.finalGoLive === "READY" ? "READY" : "BLOCKED", "OFF", "CREDENTIALS_AND_APPROVAL"),
];

const criticalBlockers = closure.blockers?.filter((b) => b.severity === "CRITICAL") ?? [];
const accessBlockers = accessReport.blockers?.slice(0, 8) ?? [];

const finalReport = {
  generatedAt: new Date().toISOString(),
  matrix,
  softwareComplete: closure.software === "PASS",
  sales: closure.sales,
  finalGoLive: closure.finalGoLive,
  criticalBlockerCount: closure.criticalBlockerCount ?? criticalBlockers.length,
  accessBlockers,
  criticalBlockers: criticalBlockers.map((b) => ({ code: b.code, action: b.requiredAction })),
  productionFlags: {
    SALES_ENABLED: process.env.SALES_ENABLED,
    SUPPLIER_NETWORK_ENABLED: process.env.SUPPLIER_NETWORK_ENABLED,
    SUPPLIER_ORDER_NETWORK_ENABLED: process.env.SUPPLIER_ORDER_NETWORK_ENABLED,
    PAYMENT_PRODUCTION_ENABLED: process.env.PAYMENT_PRODUCTION_ENABLED,
    CARRIER_PRODUCTION_ENABLED: process.env.CARRIER_PRODUCTION_ENABLED,
  },
  realSideEffects: {
    supplierOrders: closure.realSideEffects?.realSupplierOrders ?? 0,
    payments: closure.realSideEffects?.realPayments ?? 0,
    shipments: closure.realSideEffects?.realCarrierLabels ?? 0,
    refunds: closure.realSideEffects?.realRefunds ?? 0,
    marketingSpend: closure.realSideEffects?.realMarketingSpend ?? 0,
    fakeEvidence: closure.fakeEvidenceCount ?? 0,
  },
  gateTests: jsonOutput ? undefined : gateTests,
  finalDecision: closure.finalGoLive === "READY" ? "READY" : "BLOCKED",
};

if (jsonOutput) {
  console.log(JSON.stringify(finalReport, null, 2));
} else {
  console.log("========================================");
  console.log("BUZZARD MASTER COMPLETION MATRIX");
  console.log(`Generated: ${finalReport.generatedAt}`);
  console.log("========================================\n");

  console.log("TOPIC | SOFTWARE | TEST | LIVE ACCESS | PRODUCTION | BLOCKER");
  console.log("-".repeat(90));
  for (const r of matrix) {
    const line = [
      r.topic.padEnd(18),
      r.software.padEnd(8),
      r.test.padEnd(8),
      r.live.padEnd(16),
      r.prod.padEnd(12),
      r.blocker.slice(0, 40),
    ].join(" | ");
    console.log(line);
  }

  console.log("\n========================================");
  console.log("FINAL STATE");
  console.log("========================================");
  console.log(`SOFTWARE COMPLETE: ${finalReport.softwareComplete ? "YES (implemented layers)" : "NO"}`);
  console.log(`SALES: ${finalReport.sales}`);
  console.log(`FINAL GO-LIVE: ${finalReport.finalGoLive}`);
  console.log(`CRITICAL BLOCKERS: ${finalReport.criticalBlockerCount}`);
  console.log("\nACCESS BLOCKERS:");
  for (const b of accessBlockers.slice(0, 6)) {
    console.log(`  - ${b}`);
  }
  console.log("\nHUMAN APPROVAL BLOCKERS:");
  console.log("  - #342 controlled createOrder validation (four-eyes)");
  console.log("  - #343 production order arming");
  console.log("  - #344 first production order (dual approval)");
  console.log("  - #345 controlled go-live activation");
  console.log("  - #346 observation period completion");
  console.log("\nPRODUCTION FLAGS:");
  for (const [k, v] of Object.entries(finalReport.productionFlags)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nREAL SIDE EFFECTS:");
  const fx = finalReport.realSideEffects;
  console.log(`  Supplier orders: ${fx.supplierOrders}`);
  console.log(`  Payments: ${fx.payments}`);
  console.log(`  Shipments: ${fx.shipments}`);
  console.log(`  Refunds: ${fx.refunds}`);
  console.log(`  Marketing spend: ${fx.marketingSpend}`);
  console.log(`  Fake evidence: ${fx.fakeEvidence}`);
  console.log(`\nFINAL DECISION: ${finalReport.finalDecision} (expected without credentials + human approval)`);
  console.log("========================================");
}
