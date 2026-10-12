/**
 * Safe wrappers over existing commerce connectors.
 * Live payments, shipments, marketplace publish, and customer send stay blocked.
 */

const { isSalesEnabled } = require("../salesMode");
const { classify } = require("./exceptions");

function paymentSafety(input = {}) {
  const paymentService = require("../commerce/paymentService");
  const jobIdempotency = require("../operations/jobIdempotency");
  const key = input.idempotencyKey;
  if (key) {
    const begin = jobIdempotency.beginOperation({
      operation: "payment_or_refund",
      scope: "pusat",
      idempotencyKey: `${input.kind || "payment"}:${key}`,
    });
    if (!begin.ok && begin.duplicate) {
      return {
        ok: false,
        duplicate: true,
        retried: false,
        live: false,
        kind: input.kind || "payment",
        note: "Duplicate payment/refund blocked.",
      };
    }
  }

  const classified = classify(new Error("financial_operation"), {
    action: input.kind === "refund" ? "payment.refund" : "payment.charge",
  });

  const intent = paymentService.createPaymentIntent({
    amount: input.amount || 0,
    currency: input.currency || "EUR",
    idempotencyKey: key,
    dryRun: true,
    metadata: { pusat: true, kind: input.kind || "payment" },
  });

  return {
    ok: true,
    live: false,
    blocked: !isSalesEnabled(),
    realMoneyMovement: false,
    retryable: false,
    classified,
    intent,
    customerRefundTrackedSeparately: true,
    supplierReceivableTrackedSeparately: true,
    figureType: "estimated_until_captured",
  };
}

function shippingLookup(input = {}) {
  const shipping = require("../commerce/shippingProvider");
  const health = shipping.getProviderHealth();
  return {
    ok: true,
    live: false,
    shipmentCreated: false,
    carrier: input.carrier || null,
    trackingNumber: input.trackingNumber || null,
    status: input.trackingNumber ? "unknown_until_carrier_event" : null,
    lastUpdate: null,
    source: "adapter_stub",
    estimatedDelivery: shipping.calculateShipping({
      methodId: input.methodId,
      country: input.country || "DE",
    }).estimatedDelivery,
    location: { type: "not_available", gpsInvented: false },
    health,
    note: "No live carrier API. Estimate is not a real location.",
  };
}

function marketplaceDraft(input = {}) {
  const channel = input.channel || "amazon";
  return {
    ok: true,
    live: false,
    published: false,
    channel,
    listing: {
      status: "DRAFT",
      sku: input.sku || null,
      mappedCategory: input.category || null,
      price: input.price || null,
      stock: input.stock == null ? null : input.stock,
    },
    credentialsConfigured: false,
    note: "Mock connector only. Live marketplace publish is BLOCKED.",
  };
}

function customerSend(input = {}) {
  return {
    ok: false,
    sent: false,
    live: false,
    blocked: true,
    reason: "customer_message_send_requires_provider_and_approval",
    draft: input.message || null,
    channel: input.channel || "email",
  };
}

function providerStatus() {
  const { getActiveProvider, isProviderConfigured, PROVIDERS } = require("../aiProviders");
  const active = getActiveProvider();
  return {
    active,
    stub: active === PROVIDERS.STUB,
    configured: isProviderConfigured(active),
    liveVerified: false,
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    google: Boolean(process.env.GOOGLE_AI_API_KEY),
  };
}

module.exports = {
  paymentSafety,
  shippingLookup,
  marketplaceDraft,
  customerSend,
  providerStatus,
};
