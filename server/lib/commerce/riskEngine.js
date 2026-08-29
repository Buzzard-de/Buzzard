/**
 * Part 8 — Simple fraud/risk foundation (no external provider)
 */
const { MAX_CART_QUANTITY } = require("../../core/commerceConstants");

const velocityStore = new Map();

function recordVelocity(key) {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = velocityStore.get(key) || { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  velocityStore.set(key, entry);
  return entry.count;
}

function assessCheckoutRisk({ items = [], clientIp, sessionId, clientTotals }) {
  const signals = [];
  let score = 0;

  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  if (totalQty > MAX_CART_QUANTITY * 2) {
    signals.push({ type: "quantity_anomaly", detail: `Total quantity ${totalQty}` });
    score += 40;
  }

  for (const item of items) {
    if (Number(item.quantity) > MAX_CART_QUANTITY) {
      signals.push({ type: "quantity_anomaly", productId: item.productId, quantity: item.quantity });
      score += 30;
    }
    if (Number(item.priceSnapshot) < 0) {
      signals.push({ type: "price_anomaly", productId: item.productId });
      score += 50;
    }
  }

  if (clientTotals && Object.keys(clientTotals).length) {
    signals.push({ type: "client_totals_submitted" });
    score += 10;
  }

  const velocityKey = clientIp || sessionId || "unknown";
  const hits = recordVelocity(velocityKey);
  if (hits > 20) {
    signals.push({ type: "velocity", hits });
    score += 25;
  }

  const level = score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : score > 0 ? "LOW" : "NONE";
  return {
    score,
    level,
    signals,
    blocked: score >= 90,
    dryRun: true,
  };
}

module.exports = {
  assessCheckoutRisk,
  recordVelocity,
};
