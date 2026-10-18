/**
 * Pricing and profitability integrity — local software only.
 * Missing cost is not invented. Net profit floor is €0.50.
 * €0.10 undercut stays unimplemented. Client totals are not trusted.
 * UNCERTAIN payments and missing competitor prices are not revenue or live prices.
 */

const { isSalesEnabled } = require("../salesMode");
const { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_IMPLEMENTED, MARKET_UNDERCUT_EUR } = require("../pusat/constants");
const { rejectClientTotals, detectPriceTampering } = require("../commerce/commerceValidation");
const { clientCannotMarkPaid } = require("../commerce/providers/dualPaymentEngine");
const pricing = require("./pricing");
const competitorPrices = require("./competitorPrices");
const reporting = require("./reporting");
const payments = require("./payments");
const signaturePolicy = require("./signaturePolicy");

function inspect() {
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    marketUndercutEur: MARKET_UNDERCUT_EUR,
    inventedRevenue: false,
    pythonPolicyMerged: false,
  };
}

function quote(input = {}) {
  const quoted = pricing.quote(input);
  return {
    ...quoted,
    live: false,
    published: false,
    undercutApplied: false,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
  };
}

function evaluateGivenSale(input = {}) {
  return {
    ...pricing.evaluateGivenSale(input, input.salePrice),
    live: false,
    published: false,
    undercutApplied: false,
  };
}

function publishLivePrice() {
  return {
    ok: false,
    published: false,
    live: false,
    mutated: false,
    reason: "LIVE_PRICE_PUBLISH_BLOCKED",
  };
}

function applyUndercut() {
  return competitorPrices.undercutPolicy();
}

function competitorQuote(input = {}) {
  return competitorPrices.fetchCompetitorPrices(input);
}

function rejectClientMoney(input = {}) {
  const totals = rejectClientTotals(input.totals || input);
  const tamper = detectPriceTampering(input.clientPrice, input.serverPrice);
  const markPaid = clientCannotMarkPaid(input.clientStatus || input.status);
  return {
    clientTotalsRejected: totals.ok === false,
    totalsCode: totals.code || null,
    priceTampered: tamper.tampered === true,
    clientCannotMarkPaid: markPaid?.accepted === false,
    clientPaidReason: markPaid?.reason || null,
    invented: false,
    live: false,
  };
}

function inventRevenue() {
  return {
    ok: false,
    invented: false,
    inventedRevenue: false,
    capturedAsRevenue: 0,
    reason: "INVENTED_REVENUE_BLOCKED",
  };
}

function uncertainAsRevenue(input = {}) {
  const interpreted = payments.interpretProviderResult({
    timeout: input.timeout === true || input.uncertain === true,
    uncertain: input.uncertain === true,
  });
  return {
    ...interpreted,
    inventedRevenue: false,
    capturedAsRevenue: 0,
    countedAsProfit: false,
    reason: interpreted.requiresReconciliation ? "UNCERTAIN_NOT_REVENUE" : interpreted.outcome,
  };
}

function operationalHonesty(db) {
  const report = reporting.getOperationalReport(db);
  const ledger = reporting.getLifecycleLedger(db);
  return {
    inventedRevenue: false,
    reportInventedRevenue: report.inventedRevenue === true,
    ledgerInventedRevenue: ledger.inventedRevenue === true,
    capturedAsRevenue: report.payments?.capturedAsRevenue ?? 0,
    productionVerified: false,
  };
}

function belowFloorRequiresReview(input = {}) {
  const policy = signaturePolicy.evaluate({
    salePrice: input.salePrice,
    acquisitionCost: input.acquisitionCost,
    expectedNetProfit: input.expectedNetProfit,
  });
  return {
    ...policy,
    belowMinNetProfit: Array.isArray(policy.reasons) && policy.reasons.includes("BELOW_MIN_NET_PROFIT"),
    live: false,
  };
}

function convertFx(input = {}) {
  const from = String(input.from || "EUR").trim().toUpperCase();
  const to = String(input.to || "").trim().toUpperCase();
  if (!to || from === to) {
    return { ok: from === "EUR", converted: false, invented: false, live: false, from, to: to || from };
  }
  return { ok: false, converted: false, invented: false, live: false, from, to, reason: "FX_RATE_NOT_INVENTED" };
}

module.exports = {
  inspect,
  quote,
  evaluateGivenSale,
  publishLivePrice,
  applyUndercut,
  competitorQuote,
  rejectClientMoney,
  inventRevenue,
  uncertainAsRevenue,
  operationalHonesty,
  belowFloorRequiresReview,
  convertFx,
};
