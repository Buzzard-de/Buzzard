import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PHASE_EVALUATORS = [
  [6, "../lib/platform/phase6OrderManagement.js", "evaluatePhase6OrderManagement"],
  [7, "../lib/platform/phase7PaymentFinance.js", "evaluatePhase7PaymentFinance"],
  [8, "../lib/platform/phase8Logistics.js", "evaluatePhase8Logistics"],
  [9, "../lib/platform/phase9TextileAi.js", "evaluatePhase9TextileAi"],
  [10, "../lib/platform/phase10Marketplace.js", "evaluatePhase10Marketplace"],
  [11, "../lib/platform/phase11PimSot.js", "evaluatePhase11PimSot"],
  [12, "../lib/platform/phase12CustomerSupport.js", "evaluatePhase12CustomerSupport"],
  [13, "../lib/platform/phase13Pusat.js", "evaluatePhase13Pusat"],
  [14, "../lib/platform/phase14AiSpecialists.js", "evaluatePhase14AiSpecialists"],
  [15, "../lib/platform/phase15Storefront.js", "evaluatePhase15Storefront"],
  [16, "../lib/platform/phase16TaxCompliance.js", "evaluatePhase16TaxCompliance"],
  [17, "../lib/platform/phase17Security.js", "evaluatePhase17Security"],
  [18, "../lib/platform/phase18Marketing.js", "evaluatePhase18Marketing"],
  [19, "../lib/platform/phase19AdminReporting.js", "evaluatePhase19AdminReporting"],
  [20, "../lib/platform/phase20Performance.js", "evaluatePhase20Performance"],
  [21, "../lib/platform/phase21E2eAutomation.js", "evaluatePhase21E2eAutomation"],
];

beforeEach(() => {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.BUZZARD_STRIPE_ENABLED = "0";
  process.env.BUZZARD_PAYPAL_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
});

describe("Buzzard ordered master phases 6–21", () => {
  for (const [n, modPath, exportName] of PHASE_EVALUATORS) {
    it(`phase ${n} software scope is 100%`, () => {
      const mod = require(modPath);
      const result = mod[exportName]();
      if (result.percentComplete !== 100) {
        const failed = result.checks.filter((c) => c.ok !== true && c.status !== "BLOCKED_EXTERNAL");
        console.error(`phase ${n} failed`, failed);
      }
      expect(result.percentComplete).toBe(100);
      expect(result.ok).toBe(true);
    });
  }
});