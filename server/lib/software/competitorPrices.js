/**
 * Competitor price adapter boundary.
 * Does not invent competitor prices when no verified source exists.
 */

const FX_ENABLED = false;

function fetchCompetitorPrices(input = {}) {
  const sku = String(input.sku || "").trim();
  if (!sku) {
    return { ok: false, reason: "SKU_REQUIRED", invented: false, prices: [] };
  }
  if (!input.source || input.sourceVerified !== true) {
    return {
      ok: false,
      reason: "NO_VERIFIED_COMPETITOR_SOURCE",
      invented: false,
      prices: [],
      undercutApplied: false,
      note: "Missing competitor data is not replaced with synthetic prices.",
    };
  }
  if (!Array.isArray(input.prices) || !input.prices.length) {
    return {
      ok: false,
      reason: "NO_VERIFIED_COMPETITOR_PRICES",
      invented: false,
      prices: [],
      undercutApplied: false,
    };
  }
  return {
    ok: true,
    invented: false,
    undercutApplied: false,
    fxEnabled: FX_ENABLED,
    prices: input.prices.map((row) => ({
      channel: row.channel || null,
      amount: Number(row.amount),
      currency: String(row.currency || "EUR").toUpperCase(),
      capturedAt: row.capturedAt || null,
    })),
  };
}

function undercutPolicy() {
  return {
    implemented: false,
    amountEur: 0.1,
    applied: false,
    reason: "MARKET_UNDERCUT_NOT_AUTHORIZED",
  };
}

module.exports = {
  fetchCompetitorPrices,
  undercutPolicy,
  FX_ENABLED,
};
