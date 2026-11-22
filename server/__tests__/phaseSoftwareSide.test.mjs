import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { auditL2ReviewedCopy, buildL2SeoMeta } = require("../lib/storefront/hubSeoLocaleService.js");
const { listActiveL2 } = require("../lib/pim/subcategoryCatalogProfile.js");
const { evaluatePhase1CoreIntegrity } = require("../lib/platform/phase1CoreIntegrity.js");
const { evaluatePhase17Security } = require("../lib/platform/phase17Security.js");
const { evaluatePhase21E2eAutomation } = require("../lib/platform/phase21E2eAutomation.js");

const LOCKS = [
  [3, "../lib/platform/phase3ProductPim.js", "evaluatePhase3ProductPim", "PIM_LIVE_PUBLISH"],
  [4, "../lib/platform/phase4SupplierAutomation.js", "evaluatePhase4SupplierAutomation", "SUP_LIVE_API"],
  [5, "../lib/platform/phase5PricingProfit.js", "evaluatePhase5PricingProfit", "PRICE_LIVE_WRITE"],
  [6, "../lib/platform/phase6OrderManagement.js", "evaluatePhase6OrderManagement", "ORD_LIVE_SUBMIT"],
  [7, "../lib/platform/phase7PaymentFinance.js", "evaluatePhase7PaymentFinance", "PAY_LIVE_CAPTURE"],
  [8, "../lib/platform/phase8Logistics.js", "evaluatePhase8Logistics", "LOG_LIVE_RATES"],
  [9, "../lib/platform/phase9TextileAi.js", "evaluatePhase9TextileAi", "TEX_LIVE_TRYON"],
  [10, "../lib/platform/phase10Marketplace.js", "evaluatePhase10Marketplace", "MKT_LIVE_PUBLISH"],
  [12, "../lib/platform/phase12CustomerSupport.js", "evaluatePhase12CustomerSupport", "CS_LIVE_INBOX"],
  [13, "../lib/platform/phase13Pusat.js", "evaluatePhase13Pusat", "PUSAT_LIVE_VOICE"],
  [14, "../lib/platform/phase14AiSpecialists.js", "evaluatePhase14AiSpecialists", "SPEC_LIVE_COUNCIL"],
  [15, "../lib/platform/phase15Storefront.js", "evaluatePhase15Storefront", "SF_LIVE_CDN"],
  [16, "../lib/platform/phase16TaxCompliance.js", "evaluatePhase16TaxCompliance", "TAX_CONNECT_LIVE"],
  [18, "../lib/platform/phase18Marketing.js", "evaluatePhase18Marketing", "MKT_LIVE_ADS"],
  [19, "../lib/platform/phase19AdminReporting.js", "evaluatePhase19AdminReporting", "ADM_LIVE_BI"],
  [20, "../lib/platform/phase20Performance.js", "evaluatePhase20Performance", "PERF_LOAD_TEST"],
];

function blocked(report, id) {
  return (report.checks || report.liveBlockers || []).find((check) => check.id === id);
}

describe("phase software side that does not use outside accounts", () => {
  it("keeps unreviewed subcategory names unreviewed", () => {
    const audit = auditL2ReviewedCopy();
    expect(audit.l2Count).toBe(330);
    expect(audit.reviewedAllLocales).toBeLessThan(330);
    expect(audit.missingReviewedLocales).toBeGreaterThan(0);
    expect(audit.completeClaim).toBe(false);
    const uncovered = listActiveL2().find((row) => !buildL2SeoMeta(row.id, "fr").reviewed);
    expect(uncovered).toBeTruthy();
    const page = buildL2SeoMeta(uncovered.id, "fr");
    expect(page.reviewed).toBe(false);
    expect(page.fallbackFrom).toBe("source");
    expect(page.professionalCopy).toBe(false);
  });

  it("keeps every live account lock blocked and the phase unclaimed", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    for (const [phase, file, fn, id] of LOCKS) {
      const report = require(file)[fn]();
      const check = blocked(report, id);
      expect(check, `phase ${phase} ${id}`).toBeTruthy();
      expect(check.ok, id).toBe(false);
      expect(check.status, id).toBe("BLOCKED_EXTERNAL");
      expect(report.completeClaim, `phase ${phase}`).toBe(false);
      expect(report.live === false || report.live === undefined, `phase ${phase} live`).toBe(true);
    }
  });

  it("does not treat the running API as reloaded", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const phase1 = evaluatePhase1CoreIntegrity();
    const live = phase1.liveBlockers.find((item) => item.id === "LIVE_API_3001_SECURITY");
    expect(live.status).toBe("BLOCKED_EXTERNAL");
    expect(phase1.completeClaim).toBe(false);
    expect(phase1.live).toBe(false);
    expect(phase1.invariants.salesLocked).toBe(true);

    const phase17 = evaluatePhase17Security();
    const restart = blocked(phase17, "SEC_LIVE_RESTART");
    expect(restart.ok).toBe(false);
    expect(restart.status).toBe("BLOCKED_EXTERNAL");
    expect(phase17.completeClaim).toBe(false);
    expect(phase17.live).toBe(false);
  });

  it("keeps the production rehearsal blocked after the dry workflow", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const report = evaluatePhase21E2eAutomation();
    const production = blocked(report, "E2E_PRODUCTION_RUN");
    expect(production.ok).toBe(false);
    expect(production.status).toBe("BLOCKED_EXTERNAL");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
    expect(report.ok).toBe(true);
  });
});
