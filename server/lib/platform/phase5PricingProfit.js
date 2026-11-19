/**
 * Phase 5 — Pricing & profit engine (software-complete scope).
 */
const { quoteCommercialPrice, targetMarginForCategory } = require("../commerce/commercialCore");
const {
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
  CATEGORY_TARGET_MARGIN,
  landedCost,
} = require("../commerce/pricingPolicy");
const {
  autoQuoteFromSupplierRecord,
  assertProfitableSale,
  marginPolicySnapshot,
} = require("../pricing/pricingAutomationService");
const { reportPricingAnomalyToPusat } = require("../pricing/pricingAnomalyPusatReporter");
const { assessPriceChange } = require("../pricing/pricingAnomalyService");
const { estimateVat } = require("../commerce/ab27Tax");

const SAMPLE = {
  supplier_price: { amount: 40, currency: "EUR" },
  comparable_market_price: 90,
  return_reserve: 1,
  country: "DE",
};

function evaluatePhase5PricingProfit() {
  const auto = autoQuoteFromSupplierRecord(SAMPLE, { category: { activeCategoryId: "cat-05", slug: "automotive" } });
  const quote = auto.quote;
  const profitable = assertProfitableSale(quote);
  const lossAttempt = assertProfitableSale(
    quoteCommercialPrice({
      supplierCost: 80,
      shippingCost: 6,
      marketplaceFee: 4,
      paymentFee: 1.2,
      returnReserve: 1,
      otherCost: 0,
      comparableMarketPrice: 82,
      country: "DE",
      category: { slug: "textil" },
    })
  );
  const vat = estimateVat({ country: "DE", netAmount: quote.sellNet || 50 });
  const landed = landedCost({
    supplierCost: 40,
    shippingCost: auto.components.shippingCost,
    marketplaceFee: auto.components.marketplaceFee,
    paymentFee: auto.components.paymentFee,
    returnReserve: auto.components.returnReserve,
    otherCost: 0,
  });
  const anomaly = assessPriceChange(40, 100);
  const pusatReport = reportPricingAnomalyToPusat({ sku: "DRY-SKU-001", oldAmount: 40, newAmount: 100 });
  const policy = marginPolicySnapshot();

  const checks = [
    { id: "PRICE_SUPPLIER_COST", ok: auto.components.supplierCost === 40 },
    { id: "PRICE_SHIPPING_LINKED", ok: auto.components.shippingCost >= 0 && auto.quote.shippingCost != null },
    { id: "PRICE_MARKETPLACE_FEE", ok: auto.components.marketplaceFee > 0 },
    { id: "PRICE_VAT_INTEGRATION", ok: vat.ok && auto.components.vatIntegrated === true },
    { id: "PRICE_RETURN_RESERVE", ok: auto.components.returnReserve === 1 },
    { id: "PRICE_MIN_NET_050", ok: quote.ok && quote.netProfit + 1e-9 >= MIN_NET_PROFIT_EUR },
    {
      id: "PRICE_UNDERCUT_010",
      ok: quote.ok && quote.finalRecommendedPrice != null && quote.finalRecommendedPrice <= 90 - MARKET_UNDERCUT_EUR + 0.01,
    },
    { id: "PRICE_MARGIN_AUTO_11", ok: policy.sample.automotive === 0.11 },
    { id: "PRICE_MARGIN_OTHER_07", ok: policy.sample.other === 0.07 },
    { id: "PRICE_MARGIN_DRINKS_15", ok: policy.sample.drinks === 0.15 },
    { id: "PRICE_LOSS_BLOCKED", ok: lossAttempt.lossBlocked === true && profitable.allowed === true },
    {
      id: "PRICE_ANOMALY_PUSAT",
      ok: anomaly.flagged === true && pusatReport.reported === true && pusatReport.task?.id,
    },
    { id: "PRICE_LANDED_COST", ok: landed > 40 && quote.costBasis >= landed - 0.01 },
    {
      id: "PRICE_LIVE_WRITE",
      ok: false,
      status: "BLOCKED_EXTERNAL",
      note: "Live price publish requires sales gate + human approval",
    },
  ];

  const softwareChecks = checks.filter((c) => c.id !== "PRICE_LIVE_WRITE");
  const passed = softwareChecks.filter((c) => c.ok).length;
  const total = softwareChecks.length;

  return {
    phase: 5,
    title: "Fiyatlandırma ve kâr motoru",
    ok: passed === total,
    percentComplete: Math.round((passed / total) * 1000) / 10,
    passed,
    total,
    checks,
    policy: CATEGORY_TARGET_MARGIN,
    sampleQuote: { netProfit: quote.netProfit, finalRecommendedPrice: quote.finalRecommendedPrice },
    live: false,
    completeClaim: passed === total,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase5PricingProfit, SAMPLE };