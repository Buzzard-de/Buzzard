const crypto = require("crypto");
const { encodeQrSvg } = require("./dryQr");

function paymentAddressFor(identity, amount, currency) {
  const base = `buzzard://dry-pay/${identity}`;
  if (!Number.isFinite(amount)) return base;
  return `${base}?amount=${amount}&currency=${currency}`;
}

function phase3Identity(orderId, { amount = null, currency = "EUR" } = {}) {
  const id = String(orderId || "").trim();
  if (!id) return { ok: false, code: "ORDER_ID_REQUIRED", phase: 3, live: false, payable: false, qr: null };
  const identity = crypto.createHash("sha256").update(`buzzard-phase3:${id}`).digest("hex").slice(0, 24);
  const numericAmount = amount == null ? null : Number(amount);
  const paymentAddress = paymentAddressFor(identity, Number.isFinite(numericAmount) ? numericAmount : null, currency);
  const mark = encodeQrSvg(paymentAddress);
  return {
    ok: true,
    phase: 3,
    orderId: id,
    identity,
    amount: Number.isFinite(numericAmount) ? numericAmount : null,
    currency,
    paymentStatus: "UNPAID",
    provider: null,
    paymentAddress,
    live: false,
    payable: false,
    qr: {
      payable: false,
      paymentUrl: null,
      payload: paymentAddress,
      svg: mark.svg || null,
      version: mark.version || null,
      roundTrip: mark.roundTrip === true,
      verified: false,
      providerConfigured: false,
    },
  };
}

function verifyPayment() {
  return { ok: false, code: "PAYMENT_NOT_LIVE", paid: false, paymentStatus: "UNPAID", realMoneyMovement: false, provider: null };
}

function cancelDryPayment() {
  return { ok: true, code: "DRY_CANCEL", cancelled: true, refunded: false, realMoneyMovement: false };
}

function refundDryPayment() {
  return { ok: false, code: "REFUND_NOT_LIVE", customerRefundIssued: false, realMoneyMovement: false };
}

function paymentTimeout() {
  return { ok: false, code: "PAYMENT_TIMEOUT", paid: false, realMoneyMovement: false };
}

module.exports = { phase3Identity, verifyPayment, cancelDryPayment, refundDryPayment, paymentTimeout };
