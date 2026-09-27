/** Server-side catalog mode — blocks orders/checkout until BUZZARD_SALES_ENABLED=1 */

function isSalesEnabled() {
  if (process.env.BUZZARD_SALES_ENABLED !== "1") return false;
  if (process.env.BUZZARD_SALES_GATE_BYPASS === "1") return true;
  try {
    const { evaluateSalesGate } = require("./salesSafetyGate");
    return evaluateSalesGate().allowed === true;
  } catch {
    return false;
  }
}

function salesDisabledResponse() {
  return {
    error: "Online ordering is currently disabled (catalog mode)",
    code: "sales_disabled",
    status: 403,
  };
}

function assertSalesEnabled() {
  if (!isSalesEnabled()) return salesDisabledResponse();
  return null;
}

function requireSalesEnabled(req, res) {
  const blocked = assertSalesEnabled();
  if (blocked) {
    res.status(blocked.status).json({ error: blocked.error, code: blocked.code });
    return false;
  }
  return true;
}

module.exports = {
  isSalesEnabled,
  salesDisabledResponse,
  assertSalesEnabled,
  requireSalesEnabled,
};
