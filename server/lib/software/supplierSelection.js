/**
 * Fail-closed supplier selection. Missing metrics are not estimated.
 * Does not send a purchase order.
 */

const crypto = require("crypto");

const REQUIRED_METRICS = Object.freeze(["price", "stock", "deliveryDays", "reliability", "dataQuality"]);

function newId() {
  return `ssd_${crypto.randomBytes(8).toString("hex")}`;
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreOffer(offer = {}) {
  const missing = REQUIRED_METRICS.filter((key) => numberOrNull(offer[key]) == null);
  if (missing.length) {
    return { ok: false, missing, estimated: false };
  }
  const price = numberOrNull(offer.price);
  const stock = numberOrNull(offer.stock);
  const deliveryDays = numberOrNull(offer.deliveryDays);
  const reliability = numberOrNull(offer.reliability);
  const dataQuality = numberOrNull(offer.dataQuality);
  if (stock <= 0 || price <= 0 || deliveryDays < 0) {
    return { ok: false, missing: [], reason: "OFFER_UNUSABLE", estimated: false };
  }
  const score =
    reliability * 0.3 +
    dataQuality * 0.2 +
    (1 / (1 + price)) * 40 +
    (1 / (1 + deliveryDays)) * 20 +
    Math.min(stock, 10);
  return {
    ok: true,
    score,
    estimated: false,
    metrics: { price, stock, deliveryDays, reliability, dataQuality },
  };
}

function selectSupplier(db, input = {}) {
  const sku = String(input.sku || "").trim();
  const offers = Array.isArray(input.offers) ? input.offers : [];
  if (!sku) {
    return persist(db, { sku: "", status: "STOPPED", reason: "SKU_REQUIRED", selected: null, offers: [] });
  }
  if (!offers.length) {
    return persist(db, { sku, status: "STOPPED", reason: "NO_OFFERS", selected: null, offers: [] });
  }

  const scored = offers.map((offer, index) => ({ index, offer, result: scoreOffer(offer) }));
  const usable = scored.filter((row) => row.result.ok);
  if (!usable.length) {
    return persist(db, {
      sku,
      status: "STOPPED",
      reason: "INCOMPLETE_METRICS",
      selected: null,
      offers: scored,
    });
  }

  usable.sort((a, b) => b.result.score - a.result.score);
  const winner = usable[0];
  return persist(db, {
    sku,
    status: "SELECTED",
    reason: "HIGHEST_COMPLETE_SCORE",
    selected: {
      supplier: winner.offer.supplier || winner.offer.id || `offer-${winner.index}`,
      score: winner.result.score,
      metrics: winner.result.metrics,
    },
    offers: scored,
  });
}

function persist(db, decision) {
  const payload = {
    ok: decision.status === "SELECTED",
    failClosed: decision.status !== "SELECTED",
    purchaseOrderSent: false,
    estimated: false,
    ...decision,
  };
  if (!db) return payload;
  const id = newId();
  db.prepare(
    `INSERT INTO software_supplier_decisions(id, sku, selected_supplier, status, reason, scores_json, details_json)
     VALUES(?,?,?,?,?,?,?)`
  ).run(
    id,
    decision.sku || "unknown",
    decision.selected?.supplier || null,
    decision.status,
    decision.reason,
    JSON.stringify(decision.selected || {}),
    JSON.stringify({
      offerCount: decision.offers?.length || 0,
      purchaseOrderSent: false,
    })
  );
  return { ...payload, id };
}

module.exports = {
  REQUIRED_METRICS,
  scoreOffer,
  selectSupplier,
};
