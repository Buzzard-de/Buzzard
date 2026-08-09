// Adapter boundary: connect Stripe/PayPal/Klarna on the server.
// Never accept or store raw card data in Buzzard's database.
async function createPaymentSession({ orderNumber, total, currency }) {
  return {
    provider: "MOCK",
    status: "requires_confirmation",
    orderNumber,
    total,
    currency,
    checkoutUrl: null,
  };
}

module.exports = {
  createPaymentSession,
};
