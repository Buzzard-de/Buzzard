import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateOffer, landedCost, MIN_NET_PROFIT_EUR } = require("../lib/commerce/pricingPolicy.js");
const {
  buyStockBeforeOrder,
  paySupplier,
  separateRefundAndCredit,
  aiAction,
  salesLock,
} = require("../lib/commerce/commerceRiskGates.js");
const { assessWorm, putImmutable } = require("../lib/survival/wormProvider.js");
const { planCopy } = require("../lib/survival/offsiteAdapter.js");
const { healthPayload } = require("../lib/special16/acceptance.js");
const { inventory } = require("../lib/integrations/sandboxReadiness.js");
const { classify } = require("../lib/security/toolchainRisk.js");
const { runIsolatedDisasterDrill } = require("../lib/survival/isolatedDisasterDrill.js");
const { quotePrice, applyPriceChange } = require("../lib/commerce/pricingIntegration.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const master = require("../../data/taxonomy/buzzard_master_50_main_categories.json");
const locales = require("../../lib/i18n/supported-locales.json");

describe("master completion gates", () => {
  it("enforces profit, cost stack, and undercut target without writing live price", () => {
    const cost = landedCost({
      supplierCost: 10,
      shippingCost: 2,
      marketplaceFee: 1,
      paymentFee: 0.3,
      returnReserve: 0.5,
    });
    expect(cost).toBe(13.8);
    const poor = evaluateOffer({
      offerPrice: 14,
      comparableMarketPrice: 20,
      supplierCost: 10,
      shippingCost: 2,
      marketplaceFee: 1,
      paymentFee: 0.3,
      returnReserve: 0.5,
      categoryMargin: 0.12,
      vatAmount: 0,
      vatVerified: true,
    });
    expect(poor.ok).toBe(false);
    expect(poor.reasons).toContain("MIN_NET_PROFIT");
    const ok = evaluateOffer({
      offerPrice: 19.8,
      comparableMarketPrice: 20,
      supplierCost: 10,
      shippingCost: 2,
      marketplaceFee: 1,
      paymentFee: 0.3,
      returnReserve: 0.5,
      categoryMargin: 0.12,
      vatAmount: 0,
      vatVerified: true,
    });
    expect(ok.profit).toBeGreaterThanOrEqual(MIN_NET_PROFIT_EUR);
    expect(ok.marginOverrideIgnored).toBe(true);
    expect(ok.livePriceWrite).toBe(false);
    expect(applyPriceChange({ productId: "x", amount: 1, actorType: "AI" }).code).toBe("AI_PRICE_WRITE_DENIED");
    expect(quotePrice({ supplierCost: 10 }).recommendationOnly).toBe(true);
  });

  it("blocks stock buy before order, supplier pay, mixed refund, and sales", () => {
    expect(buyStockBeforeOrder({}).code).toBe("STOCK_BUY_BEFORE_ORDER_DENIED");
    expect(paySupplier({}).paid).toBe(false);
    expect(separateRefundAndCredit({ customerRefund: 10, supplierCredit: 4 }).assumeSupplierRepaysCustomer).toBe(
      false
    );
    expect(aiAction({ actorId: "dogu_bey", permission: "task.create" }).code).toBe("AI_PERMISSION_DENIED");
    expect(isSalesEnabled()).toBe(false);
    expect(salesLock().salesEnabled).toBe(false);
  });

  it("does not treat chmod 444 as WORM or copy offsite without config", () => {
    expect(assessWorm({ chmod444: true }).code).toBe("CHMOD_IS_NOT_WORM");
    expect(putImmutable().stored).toBe(false);
    expect(planCopy({ sourcePath: "/no/such" }).code).toBe("SOURCE_MISSING");
  });

  it("keeps 50 categories, 30 locales, and no live special-16 success", () => {
    expect(master.categories).toHaveLength(50);
    expect(locales).toHaveLength(30);
    const health = healthPayload();
    expect(health.success).toBe(false);
    expect(health.liveVerifiedCount).toBe(0);
    expect(health.sandbox.every((row) => row.sandboxVerified === false && row.reachedNetwork === false)).toBe(true);
    expect(classify().next16Applied).toBe(false);
    expect(classify().vitestMajorUpgrade.applied).toBe(false);
    const drill = runIsolatedDisasterDrill();
    expect(drill.productionRtoMeasured).toBe(false);
    expect(drill.rtoIsolatedMs).toBeGreaterThan(0);
    expect(inventory().some((row) => row.status === "SANDBOX_VERIFIED")).toBe(false);
  });
});
