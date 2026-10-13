/**
 * Sales / profit reporting models that do not invent revenue.
 */

function dailySales(db, { date = null } = {}) {
  const day = date || new Date().toISOString().slice(0, 10);
  let captured = [];
  try {
    captured = db
      .prepare(
        `SELECT id, amount_cents, currency, state
         FROM software_payments
         WHERE state = 'PAYMENT_CAPTURED' AND substr(created_at, 1, 10) = ?`
      )
      .all(day);
  } catch {
    captured = [];
  }
  const totalCents = captured.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  return {
    date: day,
    source: "software_payments.PAYMENT_CAPTURED",
    invented: false,
    liveVerified: false,
    orderCount: captured.length,
    netProfit: null,
    grossCents: totalCents,
    currency: "EUR",
    note: "Captured local payment records only. Not production GMV.",
  };
}

function marketPerformance() {
  return {
    invented: false,
    liveVerified: false,
    markets: [],
    reason: "NO_LIVE_MARKET_METRICS",
  };
}

function supplierPerformance(db) {
  let decisions = [];
  try {
    decisions = db.prepare("SELECT status, COUNT(*) AS n FROM software_supplier_decisions GROUP BY status").all();
  } catch {
    decisions = [];
  }
  return {
    invented: false,
    liveVerified: false,
    purchaseOrdersSent: 0,
    decisions,
    note: "Selection audit counts only. Not supplier scorecards from live orders.",
  };
}

module.exports = {
  dailySales,
  marketPerformance,
  supplierPerformance,
};
