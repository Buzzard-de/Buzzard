const crypto = require("crypto");

function phase3Identity(orderId, { amount = null, currency = "EUR" } = {}) {
  const id = String(orderId || "").trim();
  if (!id) return { ok: false, code: "ORDER_ID_REQUIRED", phase: 3, live: false, payable: false, qr: null };
  const identity = crypto.createHash("sha256").update(`buzzard-phase3:${id}`).digest("hex").slice(0, 24);
  const numericAmount = amount == null ? null : Number(amount);
  return {
    ok: true,
    phase: 3,
    orderId: id,
    identity,
    amount: Number.isFinite(numericAmount) ? numericAmount : null,
    currency,
    live: false,
    payable: false,
    qr: { payable: false, paymentUrl: null, payload: `buzzard-dry:${identity}` },
  };
}

module.exports = { phase3Identity };
