import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase5PricingProfit } = require("../lib/platform/phase5PricingProfit.js");
const { autoQuoteFromSupplierRecord, assertProfitableSale } = require("../lib/pricing/pricingAutomationService.js");
const { reportPricingAnomalyToPusat } = require("../lib/pricing/pricingAnomalyPusatReporter.js");

describe("phase 5 — pricing and profit", () => {
  it("reaches 100% on pricing rule scope", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const report = evaluatePhase5PricingProfit();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    const blocked = report.checks.find((c) => c.id === "PRICE_LIVE_WRITE");
    expect(blocked.status).toBe("BLOCKED_EXTERNAL");
    expect(blocked.ok).toBe(false);
    expect(report.checks.find((c) => c.id === "PRICE_MARGIN_AUTO_11").ok).toBe(true);
    expect(report.checks.find((c) => c.id === "PRICE_MARGIN_OTHER_07").ok).toBe(true);
    expect(report.checks.find((c) => c.id === "PRICE_MARGIN_DRINKS_15").ok).toBe(true);
    expect(report.checks.find((c) => c.id === "PRICE_MIN_NET_050").ok).toBe(true);
    expect(report.checks.find((c) => c.id === "PRICE_UNDERCUT_010").ok).toBe(true);
    expect(report.checks.find((c) => c.id === "PRICE_LOSS_BLOCKED").ok).toBe(true);
    expect(report.completeClaim).toBe(false);
  });

  it("auto-quotes with shipping and marketplace fees", () => {
    const auto = autoQuoteFromSupplierRecord(
      { supplier_price: { amount: 40 }, comparable_market_price: 90, return_reserve: 1 },
      { category: { activeCategoryId: "cat-05", slug: "automotive" } }
    );
    expect(auto.quote.ok).toBe(true);
    expect(auto.components.marketplaceFee).toBeGreaterThan(0);
    expect(assertProfitableSale(auto.quote).allowed).toBe(true);
  });

  it("opens a Pusat task on anomaly", () => {
    const row = reportPricingAnomalyToPusat({ sku: "X", oldAmount: 10, newAmount: 40 });
    expect(row.reported).toBe(true);
    expect(row.task?.status).toBe("OPEN");
  });
});