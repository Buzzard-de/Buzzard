import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const FULL_COST = {
  supplierCost: 10,
  shippingCost: 1,
  extraCosts: 0,
  returnReserve: 0,
  marketplaceCommissionRate: 0,
  taxRate: 0.19,
};

describe("pricing and profitability — established fail-closed", () => {
  it("keeps the €0.50 floor, refuses missing cost, and does not apply a €0.10 undercut", () => {
    const { pricingProfitIntegrity } = require("../lib/software");
    const inspect = pricingProfitIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.minNetProfitEur).toBe(0.5);
    expect(inspect.marketUndercutImplemented).toBe(false);
    expect(inspect.inventedRevenue).toBe(false);
    expect(inspect.pythonPolicyMerged).toBe(false);
    expect(pricingProfitIntegrity.quote({}).reason).toBe("MISSING_SUPPLIER_COST");
    const quoted = pricingProfitIntegrity.quote(FULL_COST);
    expect(quoted.ok).toBe(true);
    expect(quoted.undercutApplied).toBe(false);
    expect(quoted.published).toBe(false);
    expect(quoted.netProfit + 1e-9).toBeGreaterThanOrEqual(0.5);
    expect(pricingProfitIntegrity.applyUndercut().applied).toBe(false);
    expect(pricingProfitIntegrity.applyUndercut().implemented).toBe(false);
    expect(pricingProfitIntegrity.publishLivePrice().reason).toBe("LIVE_PRICE_PUBLISH_BLOCKED");
  });

  it("rejects client totals, price tampering, and client-paid as profit proof", () => {
    const { pricingProfitIntegrity } = require("../lib/software");
    const rejected = pricingProfitIntegrity.rejectClientMoney({ totals: { total: 1 }, clientPrice: 1, serverPrice: 9, clientStatus: "paid" });
    expect(rejected.clientTotalsRejected).toBe(true);
    expect(rejected.totalsCode).toBe("client_totals_rejected");
    expect(rejected.priceTampered).toBe(true);
    expect(rejected.clientCannotMarkPaid).toBe(true);
    expect(rejected.invented).toBe(false);
  });

  it("does not invent competitor prices, FX, or revenue from UNCERTAIN payments", () => {
    const { pricingProfitIntegrity } = require("../lib/software");
    const competitor = pricingProfitIntegrity.competitorQuote({ sku: "P-1" });
    expect(competitor.invented).toBe(false);
    expect(competitor.reason).toBe("NO_VERIFIED_COMPETITOR_SOURCE");
    expect(pricingProfitIntegrity.convertFx({ from: "EUR", to: "USD" }).reason).toBe("FX_RATE_NOT_INVENTED");
    expect(pricingProfitIntegrity.inventRevenue().reason).toBe("INVENTED_REVENUE_BLOCKED");
    const uncertain = pricingProfitIntegrity.uncertainAsRevenue({ timeout: true });
    expect(uncertain.capturedAsRevenue).toBe(0);
    expect(uncertain.countedAsProfit).toBe(false);
    expect(uncertain.reason).toBe("UNCERTAIN_NOT_REVENUE");
    const db = require("../lib/db").db;
    const honesty = pricingProfitIntegrity.operationalHonesty(db);
    expect(honesty.inventedRevenue).toBe(false);
    expect(honesty.reportInventedRevenue).toBe(false);
    expect(honesty.capturedAsRevenue).toBe(0);
  });

  it("does not approve a given sale below the floor", () => {
    const { pricingProfitIntegrity } = require("../lib/software");
    const given = pricingProfitIntegrity.evaluateGivenSale({ ...FULL_COST, salePrice: 10.1 });
    expect(given.saleApproved).toBe(false);
    expect(given.belowMinProfit).toBe(true);
    const review = pricingProfitIntegrity.belowFloorRequiresReview({
      salePrice: 10,
      acquisitionCost: 10,
      expectedNetProfit: 0.1,
    });
    expect(review.belowMinNetProfit).toBe(true);
  });
});
