/**
 * Part 8 — Payment provider abstraction (Mock default; Stripe/PayPal OFF)
 */
const { assertCanProcessPayment } = require("./commerceGuards");
const { getEffectiveFlags } = require("./commerceFeatureFlags");
const { decideAsset } = require("../banking/eu27/fiatPolicy");

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
      ok: false,
      status: "BLOCKED_EXTERNAL",
      code: "PAYMENT_UNVERIFIED",
      reference: null,
      amount,
      currency: currency || null,
      realMoneyMovement: false,
      paymentAuthorized: false,
      captured: false,
      live: false,
      mock: true,
      metadata,
    };
  }

  capture(intent) {
    return {
      ...intent,
      ok: false,
      status: "BLOCKED_EXTERNAL",
      code: "PAYMENT_NOT_LIVE",
      captured: false,
      live: false,
      mock: true,
      realMoneyMovement: false,
    };
  }

  refund(intent) {
    return {
      ...intent,
      ok: false,
      status: "BLOCKED_EXTERNAL",
      code: "REFUND_UNVERIFIED",
      refunded: false,
      live: false,
      mock: true,
      realMoneyMovement: false,
    };
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

function createPaymentIntent({ amount, currency, customerId, idempotencyKey, req, metadata = {}, dryRun = false, assetType, instrument } = {}) {
  const asset = decideAsset({ currency, assetType: assetType || metadata.assetType, instrument: instrument || metadata.instrument });
  if (!asset.ok) {
    return {
      ok: false,
      error: asset.code,
      code: asset.code,
      status: 409,
      captured: false,
      paymentAuthorized: false,
      live: false,
      realMoneyMovement: false,
      mockOnly: true,
      dryRun: Boolean(dryRun),
    };
  }
  if (!dryRun) {
    const block = assertCanProcessPayment({ req });
    if (block) return { ...block, captured: false, paymentAuthorized: false, live: false, realMoneyMovement: false };
  }

  const provider = dryRun ? new MockPaymentProvider() : resolveProvider();
  const result = provider.authorize({ amount, currency, customerId, idempotencyKey, metadata });

  return {
    ...result,
    ok: false,
    status: "BLOCKED_EXTERNAL",
    code: "PAYMENT_UNVERIFIED",
    paymentAuthorized: false,
    captured: false,
    live: false,
    reference: null,
    paymentEnabled: getEffectiveFlags().paymentEnabled,
    mockOnly: true,
    dryRun: true,
  };
}

function getProviderHealth() {
  const flags = getEffectiveFlags();
  const { MODE, label } = require("../integrationMode");
  const live = process.env.BUZZARD_PAYMENT_LIVE === "1" && flags.paymentEnabled;
  return {
    activeProvider: flags.stripeEnabled ? "stripe" : flags.paypalEnabled ? "paypal" : "mock",
    stripeEnabled: flags.stripeEnabled,
    paypalEnabled: flags.paypalEnabled,
    mockPaymentOnly: flags.mockPaymentOnly,
    realMoneyMovement: false,
    credentialsStored: false,
    ...label(live ? MODE.LIVE : MODE.MOCK),
  };
}

function authorizePayment(input = {}) {
  const intent = createPaymentIntent({ ...input, dryRun: true });
  const live = process.env.BUZZARD_PAYMENT_LIVE === "1" && require("../salesMode").isSalesEnabled();
  if (!live || intent.dryRun === true || intent.mockOnly === true) {
    return {
      ...intent,
      ok: false,
      error: "PAYMENT_UNVERIFIED",
      code: "PAYMENT_UNVERIFIED",
      status: 409,
      captured: false,
      paymentAuthorized: false,
      live: false,
      realMoneyMovement: false,
      mode: "DRY_RUN",
    };
  }
  return {
    ...intent,
    captured: false,
    paymentAuthorized: false,
    live: false,
    mode: "DRY_RUN",
  };
}

function capturePayment() {
  const { MODE, label } = require("../integrationMode");
  const exceptions = require("../exceptionBus");
  exceptions.emit({
    type: exceptions.TYPES.PAYMENT_NOT_LIVE,
    source: "paymentService",
    entity: "payment",
    message: "capturePayment is fail-closed while payment is not LIVE",
    retryable: false,
  });
  return {
    ok: false,
    error: "PAYMENT_NOT_LIVE",
    code: "PAYMENT_NOT_LIVE",
    status: 403,
    captured: false,
    realMoneyMovement: false,
    paymentStatus: null,
    live: false,
    ...label(MODE.DISABLED),
  };
}

function refundPayment() {
  return {
    ok: false,
    error: "REFUND_UNVERIFIED",
    code: "REFUND_UNVERIFIED",
    status: 409,
    refunded: false,
    captured: false,
    live: false,
    realMoneyMovement: false,
    mock: false,
  };
}

function cancelPayment(intent = {}) {
  return {
    ...intent,
    status: "FAILED",
    cancelled: true,
    realMoneyMovement: false,
    captured: false,
    mode: "DRY_RUN",
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
  authorizePayment,
  capturePayment,
  refundPayment,
  cancelPayment,
  getProviderHealth,
  sanitizePaymentPayload,
};
