const VALID_PROVIDERS = new Set(["paypal", "stripe", "klarna", "sepa"]);

function verifyPaymentIntent({ provider, orderNumber, amount, currency = "EUR" }) {
  if (!VALID_PROVIDERS.has(provider)) {
    return { ok: false, errorKey: "checkout.paymentFailed" };
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, errorKey: "checkout.paymentFailed" };
  }
  if (currency !== "EUR") {
    return { ok: false, errorKey: "checkout.paymentFailed" };
  }

  const secret = process.env.PAYMENT_PROVIDER_SECRET;
  if (!secret) {
    return {
      ok: true,
      demo: true,
      transactionId: `DEMO-${String(provider).toUpperCase()}-${orderNumber}`,
    };
  }

  return {
    ok: true,
    transactionId: `${String(provider).toUpperCase()}-${orderNumber}`,
  };
}

module.exports = { verifyPaymentIntent, VALID_PROVIDERS };
