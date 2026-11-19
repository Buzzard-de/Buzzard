/**
 * Pricing anomaly assessment (approval gate, no live repricing).
 */
const { detectPriceAnomaly } = require("../priceStockQueue");

const DEFAULT_THRESHOLD_PERCENT = 35;

function assessPriceChange(oldAmount, newAmount, { thresholdPercent = DEFAULT_THRESHOLD_PERCENT } = {}) {
  const base = detectPriceAnomaly(oldAmount, newAmount);
  const threshold = Number(thresholdPercent) || DEFAULT_THRESHOLD_PERCENT;
  const flagged = base.changePercent >= threshold;
  return {
    ...base,
    flagged,
    thresholdPercent: threshold,
    liveWrite: false,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    blockAutoPublish: flagged || base.requiresApproval,
  };
}

function batchAssess(rows = []) {
  const results = rows.map((row, index) => ({
    index,
    productId: row.productId || row.sku || null,
    ...assessPriceChange(row.oldAmount ?? row.previous, row.newAmount ?? row.next, row.options),
  }));
  const flagged = results.filter((row) => row.flagged);
  return {
    ok: true,
    reviewed: results.length,
    flagged: flagged.length,
    requiresHumanApproval: flagged.length > 0,
    live: false,
    items: results,
  };
}

function snapshot() {
  const sample = assessPriceChange(40, 90);
  const calm = assessPriceChange(40, 41);
  return {
    thresholdPercent: DEFAULT_THRESHOLD_PERCENT,
    sampleSpike: sample.flagged,
    sampleCalm: calm.flagged,
    engine: "priceStockQueue.detectPriceAnomaly",
    live: false,
  };
}

module.exports = { assessPriceChange, batchAssess, snapshot, DEFAULT_THRESHOLD_PERCENT };