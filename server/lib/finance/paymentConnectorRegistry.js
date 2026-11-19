/**
 * Payment provider sandbox registry. No real money movement.
 */
const { paymentStatus, initiateTransfer } = require("./bankingAdapter");

const PROVIDERS = Object.freeze([
  { id: "stripe", env: "STRIPE_SECRET_KEY", display: "Stripe" },
  { id: "paypal", env: "PAYPAL_CLIENT_ID", display: "PayPal" },
  { id: "klarna", env: "KLARNA_API_KEY", display: "Klarna" },
  { id: "adyen", env: "ADYEN_API_KEY", display: "Adyen" },
]);

function configured(provider) {
  const v = process.env[provider.env];
  return Boolean(v && String(v).length > 8);
}

function createPaymentConnector(providerId) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return { ok: false, code: "PROVIDER_UNKNOWN" };
  return {
    id: provider.id,
    display: provider.display,
    configured: configured(provider),
    live: false,
    authorize(_payload) {
      if (process.env.BUZZARD_SALES_ENABLED === "1") return { ok: false, code: "SALES_MUST_STAY_LOCKED" };
      return { ...paymentStatus({ from: "CREATED", event: "authorize" }), provider: provider.id, moneyMoved: false };
    },
    capture(_payload) {
      return { ...paymentStatus({ from: "AUTHORIZED", event: "capture" }), provider: provider.id, moneyMoved: false };
    },
    refund(_payload) {
      return { ok: false, code: "REAL_REFUND_BLOCKED", provider: provider.id, live: false };
    },
    payout() {
      return { ...initiateTransfer(), provider: provider.id, sent: false, live: false };
    },
  };
}

function snapshot() {
  return {
    providers: PROVIDERS.map((p) => ({
      id: p.id,
      configured: configured(p),
      live: false,
    })),
    anyLive: false,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
  };
}

module.exports = { PROVIDERS, createPaymentConnector, snapshot };