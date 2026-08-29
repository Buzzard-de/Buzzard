/**
 * Part 8 — Payment provider abstraction (Mock default; Stripe/PayPal OFF)
 */
const crypto = require("crypto");
const { assertCanProcessPayment } = require("./commerceGuards");
const { getEffectiveFlags } = require("./commerceFeatureFlags");
const { PAYMENT_STATUS } = require("../../core/commerceConstants");

class PaymentProvider {
  constructor(code) {
    this.code = code;
  }
  async authorize() {
    throw new Error("Not implemented");
  }
  async capture() {
    throw new Error("Not implemented");
  }
  async refund() {
    throw new Error("Not implemented");
  }
}

class MockPaymentProvider extends PaymentProvider {
  constructor() {
    super("mock");
  }

  authorize({ amount, currency, metadata = {} }) {
    return {
      provider: "mock",
      status: PAYMENT_STATUS.AUTHORIZED,
      reference: `mock_${crypto.randomBytes(6).toString("hex")}`,
      amount,
      currency,
      realMoneyMovement: false,
      metadata,
    };
  }

  capture(intent) {
    return { ...intent, status: PAYMENT_STATUS.CAPTURED, realMoneyMovement: false };
  }

  refund(intent) {
    return { ...intent, status: PAYMENT_STATUS.REFUNDED, realMoneyMovement: false };
  }
}

class StripeProvider extends PaymentProvider {
  constructor() {
    super("stripe");
  }
  async authorize() {
    return { error: "stripe_disabled", status: 403, realMoneyMovement: false };
  }
}

class PayPalProvider extends PaymentProvider {
  constructor() {
    super("paypal");
  }
  async authorize() {
    return { error: "paypal_disabled", status: 403, realMoneyMovement: false };
  }
}

function resolveProvider() {
  const flags = getEffectiveFlags();
  if (flags.stripeEnabled) return new StripeProvider();
  if (flags.paypalEnabled) return new PayPalProvider();
  return new MockPaymentProvider();
}

function createPaymentIntent({ amount, currency = "EUR", customerId, idempotencyKey, req, metadata = {}, dryRun = false } = {}) {
  if (!dryRun) {
    const block = assertCanProcessPayment({ req });
    if (block) return block;
  }

  const provider = dryRun ? new MockPaymentProvider() : resolveProvider();
  const result = provider.authorize({ amount, currency, customerId, idempotencyKey, metadata });

  return {
    ...result,
    paymentEnabled: getEffectiveFlags().paymentEnabled,
    mockOnly: dryRun || getEffectiveFlags().mockPaymentOnly,
    dryRun: Boolean(dryRun),
  };
}

function getProviderHealth() {
  const flags = getEffectiveFlags();
  return {
    activeProvider: flags.stripeEnabled ? "stripe" : flags.paypalEnabled ? "paypal" : "mock",
    stripeEnabled: flags.stripeEnabled,
    paypalEnabled: flags.paypalEnabled,
    mockPaymentOnly: flags.mockPaymentOnly,
    realMoneyMovement: false,
    credentialsStored: false,
  };
}

function sanitizePaymentPayload(body = {}) {
  const forbidden = ["cardNumber", "cvv", "cvc", "pan", "card_number"];
  const keys = Object.keys(body);
  for (const key of keys) {
    if (forbidden.some((f) => key.toLowerCase().includes(f.replace("_", "")))) {
      return { rejected: true, code: "payment_credentials_forbidden" };
    }
  }
  return { rejected: false };
}

module.exports = {
  PaymentProvider,
  MockPaymentProvider,
  StripeProvider,
  PayPalProvider,
  resolveProvider,
  createPaymentIntent,
  getProviderHealth,
  sanitizePaymentPayload,
};
