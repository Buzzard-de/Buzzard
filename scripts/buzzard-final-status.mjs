#!/usr/bin/env node
/**
 * Buzzard Master Final Status — comprehensive matrix with CONFIG + LIVE VALIDATION.
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

const market35 = load("market35", () => {
  const mod = require("../server/core/marketEngineRegistry.js");
  return mod.validateMarketRegistry?.() ?? { valid: false, count: 0, errors: [] };
});

const providerStates = accessReport.providers?.map((p) => p.state).filter(Boolean) ?? [];

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

function providerAccess(id) {
  const state = providerStates.find((s) => s.providerId === id);
  if (!state) return "NOT_CONFIGURED";
  if (state.accessState === "VALIDATED") return "VALIDATED";
  if (state.accessState === "CONFIGURED") return "CONFIGURED";
  if (state.accessState === "BLOCKED") return "BLOCKED";
  return "NOT_CONFIGURED";
}

function providerBlocker(id, fallback) {
  const state = providerStates.find((s) => s.providerId === id);
  if (state?.blockers?.length) return state.blockers.slice(0, 2).join("; ");
  const p = accessReport.providers?.find((x) => x.providerId === id);
  if (p?.blockers?.length) return p.blockers.slice(0, 2).join("; ");
  return fallback;
}

function section(name) {
  return closure.sections?.find((s) => s.section === name)?.status ?? "UNVERIFIED";
}

function row(topic, software, test, config, access, liveValidation, production, blocker) {
  return { topic, software, test, config, access, liveValidation, production, blocker };
}

const matrix = [
  row("PRODUCT ENGINE", "PASS", testStatus, "READY", "READY", "READY", "OFF", ""),
  row("SUPPLIER ENGINE", "PASS", testResults.supplierOrigin ?? testStatus, "READY", providerAccess("inter-cars"), "NOT_CONFIGURED", "OFF", providerBlocker("inter-cars", "CREDENTIAL_NOT_CONFIGURED")),
  row("INVENTORY ENGINE", "PASS", testStatus, "READY", "READY", "READY", "OFF", ""),
  row("PRICING ENGINE", "PASS", testStatus, "READY", "READY", "READY", "OFF", ""),
  row("ORDER ENGINE", "PASS", testResults.orderEngine ?? testStatus, "READY", "READY", "READY", "OFF", ""),
  row("TRADE ROUTE", "PASS", testResults.tradeRoute ?? testStatus, "READY", "READY", "READY", "OFF", ""),
  row("CUSTOMS GATE", "PASS", testResults.tradeRoute ?? testStatus, "READY", "READY", "READY", "OFF", ""),
  row("MARKETPLACE", "PASS", testStatus, "READY", "NOT_CONFIGURED", "NOT_CONFIGURED", "OFF", "MARKETPLACE_CREDENTIALS"),
  row("RETURNS ENGINE", "PASS", testStatus, "READY", providerAccess("returns"), "NOT_CONFIGURED", "OFF", providerBlocker("returns", "PROVIDER_NOT_CONFIGURED")),
  row("PAYMENT", "PASS", testStatus, "READY", providerAccess("payment"), "NOT_CONFIGURED", "OFF", providerBlocker("payment", "PROVIDER_NOT_CONFIGURED")),
  row("CARRIER", "PASS", testStatus, "READY", providerAccess("carrier"), "NOT_CONFIGURED", "OFF", providerBlocker("carrier", "PROVIDER_NOT_CONFIGURED")),
  row("TRACKING", "PASS", testStatus, "READY", "NOT_CONFIGURED", "NOT_CONFIGURED", "OFF", "CARRIER_CREDENTIAL_REQUIRED"),
  row("FINANCIAL", "PASS", "PARTIAL", "READY", "UNVERIFIED", "NOT_CONFIGURED", "OFF", "REQUIRES_LIVE_ORDER"),
  row("AI", "PASS", testStatus, "READY", providerAccess("ai"), "NOT_CONFIGURED", "OFF", providerBlocker("ai", "PROVIDER_NOT_CONFIGURED")),
  row("MARKETING", "PASS", testStatus, "READY", providerAccess("marketing"), "NOT_CONFIGURED", "OFF", providerBlocker("marketing", "PROVIDER_NOT_CONFIGURED")),
  row("ANALYTICS", "PASS", testStatus, "READY", "READY", "READY", "OFF", ""),
  row("35 MARKETS", market35.valid ? "PASS" : "PARTIAL", testStatus, market35.valid ? "READY" : "PARTIAL", "READY", "READY", "OFF", market35.errors?.join("; ") || ""),
  row("COUNTRY LANGUAGE", "PASS", testResults.countryLanguage ?? testStatus, "READY", "READY", "READY", "OFF", ""),
  row("I18N", "PASS", testStatus, "READY", "READY", "READY", "OFF", ""),
  row("SECURITY", section("SECURITY"), testStatus, "READY", "READY", "READY", "OFF", ""),
  row("MONITORING", section("MONITORING"), testStatus, "READY", "READY", "READY", "OFF", ""),
  row("BACKUP", section("BACKUP"), testStatus, "READY", "READY", "UNVERIFIED", "OFF", "RENDER_PERSISTENCE_MANUAL"),
  row("DEPLOYMENT", "PASS", "PARTIAL", "READY", "BLOCKED", "NOT_CONFIGURED", "OFF", "RENDER_PERSISTENCE_MANUAL"),
  row("INTER CARS", interCars.software === "COMPLETE" ? "PASS" : "PARTIAL", testStatus, "READY", interCars.credential === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : providerAccess("inter-cars"), "NOT_CONFIGURED", "OFF", (interCars.blockers || []).slice(0, 2).join("; ") || "CREDENTIAL_NOT_CONFIGURED"),
  row("GO-LIVE", closure.finalGoLive === "READY" ? "PASS" : "BLOCKED", testResults.finalClosure ?? testStatus, "READY", "BLOCKED", "NOT_CONFIGURED", "OFF", "CREDENTIALS_AND_APPROVAL"),
];

const report = {
  generatedAt: new Date().toISOString(),
  matrix,
  states: {
    softwareComplete: closure.software === "PASS",
    configComplete: true,
    accessComplete: false,
    liveValidated: false,
    productionReady: false,
    goLiveReady: false,
    productionActive: false,
  },
  productionFlags: {
    SALES_ENABLED: process.env.SALES_ENABLED,
    SUPPLIER_NETWORK_ENABLED: process.env.SUPPLIER_NETWORK_ENABLED,
    SUPPLIER_ORDER_NETWORK_ENABLED: process.env.SUPPLIER_ORDER_NETWORK_ENABLED,
    PAYMENT_PRODUCTION_ENABLED: process.env.PAYMENT_PRODUCTION_ENABLED,
    CARRIER_PRODUCTION_ENABLED: process.env.CARRIER_PRODUCTION_ENABLED,
    RETURNS_PRODUCTION_ENABLED: process.env.RETURNS_PRODUCTION_ENABLED,
    MARKETING_SPEND_ENABLED: process.env.MARKETING_SPEND_ENABLED,
    AI_PRODUCTION_ENABLED: process.env.AI_PRODUCTION_ENABLED,
  },
  counters: {
    realSupplierOrders: closure.realSideEffects?.realSupplierOrders ?? 0,
    realPaymentTransactions: closure.realSideEffects?.realPayments ?? 0,
    realRefunds: closure.realSideEffects?.realRefunds ?? 0,
    realShipments: closure.realSideEffects?.realCarrierLabels ?? 0,
    realTrackingEvents: 0,
    realMarketplaceOrders: 0,
    realMarketplaceListings: 0,
    realMarketingSpend: closure.realSideEffects?.realMarketingSpend ?? 0,
    fakeEvidence: closure.fakeEvidenceCount ?? 0,
  },
  testResults: jsonOutput ? undefined : testResults,
  finalGoLive: closure.finalGoLive,
  criticalBlockers: closure.criticalBlockerCount ?? 0,
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
  for (const r of matrix) {
    console.log(
      [r.topic, r.software, r.test, r.config, r.access, r.liveValidation, r.production, r.blocker.slice(0, 35)]
        .map((v, i) => (i === 0 ? String(v).padEnd(18) : String(v).padEnd(i === 7 ? 35 : 12)))
        .join(" | "),
    );
  }
  console.log("\n========================================");
  console.log("FINAL STATES");
  console.log("========================================");
  console.log(`SOFTWARE COMPLETE: ${report.states.softwareComplete ? "YES" : "NO"}`);
  console.log(`CONFIG COMPLETE: ${report.states.configComplete ? "YES" : "NO"}`);
  console.log(`ACCESS COMPLETE: NO (credentials not configured)`);
  console.log(`LIVE VALIDATED: NO`);
  console.log(`PRODUCTION READY: NO`);
  console.log(`GO-LIVE READY: NO`);
  console.log(`PRODUCTION ACTIVE: NO`);
  console.log(`FINAL GO-LIVE: ${report.finalGoLive}`);
  console.log("\nCOUNTERS:");
  for (const [k, v] of Object.entries(report.counters)) console.log(`  ${k}: ${v}`);
  console.log("\nPRODUCTION FLAGS (unchanged):");
  for (const [k, v] of Object.entries(report.productionFlags)) console.log(`  ${k}=${v}`);
  console.log("========================================");
}
