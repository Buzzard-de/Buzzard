const { payments } = require("./commercialIntegrations");

// Adapter boundary: connect Stripe/PayPal/Klarna on the server.
// Never accept or store raw card data in Buzzard's database.
async function createPaymentSession({
  orderNumber,
  total,
  currency,
  provider = "stripe",
}) {
  const adapter = payments[provider] || payments.stripe;
  const result = await adapter({ orderId: orderNumber, amount: total, currency });
  return {
    ...result,
    orderNumber,
    total,
    currency,
    checkoutUrl: null,
  };
}

module.exports = {
  createPaymentSession,
};
