/**
 * Price anomaly → Pusat / Price AI task (dry-run, no auto publish).
 */
const { createTask, CLASSIFICATION } = require("../pusat/council");
const { assessPriceChange } = require("./pricingAnomalyService");

function reportPricingAnomalyToPusat({ sku, oldAmount, newAmount, fromId = "pusat", assigneeId = "price_ai" } = {}) {
  const assess = assessPriceChange(oldAmount, newAmount);
  if (!assess.flagged) {
    return { reported: false, ok: true, assess, live: false };
  }
  const created = createTask({
    fromId,
    title: `Fiyat anomali incelemesi: ${sku || "SKU"}`,
    assigneeId,
    classification: CLASSIFICATION.SHARED,
  });
  return {
    reported: true,
    ok: true,
    assess,
    task: created.task,
    assigneeId,
    autoPublishBlocked: assess.blockAutoPublish,
    live: false,
    moneyMoved: false,
  };
}

module.exports = { reportPricingAnomalyToPusat };