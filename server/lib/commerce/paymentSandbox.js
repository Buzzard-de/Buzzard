/**
 * Payment rehearsal. Cannot capture or enable sales.
 */
const crypto = require("crypto");
const { evaluateSalesGate } = require("../salesSafetyGate");

function sandboxAuthorize({ amount = 0, currency = "EUR" } = {}) {
  const gate = evaluateSalesGate();
  return {
    ok: true,
    id: `pay_${crypto.randomBytes(6).toString("hex")}`,
    amount: Number(amount) || 0,
    currency,
    status: "SANDBOX_HOLD",
    captured: false,
    live: false,
    salesLocked: gate.locked,
  };
}

function capture(id) {
  const { watchPaymentCapture } = require("../security/esatBey");
  const esat = watchPaymentCapture(id);
  return {
    ok: false,
    id: id || null,
    code: "SALES_LOCKED",
    captured: false,
    live: false,
    esat,
    message: "Capture refused. Sales and live payments stay off.",
  };
}

module.exports = { sandboxAuthorize, capture };
