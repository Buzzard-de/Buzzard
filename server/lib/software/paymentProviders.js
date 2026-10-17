/**
 * Provider-neutral payment/bank interface. No live money movement.
 * Mock adapters are never LIVE_VERIFIED.
 */

const { PROVIDER_CLASS } = require("./secureCommerceConstants");

function envOn(name) {
  return Boolean(process.env[name]);
}

function capabilityMatrix() {
  return [
    {
      id: "stripe",
      name: "Stripe",
      class: envOn("STRIPE_SECRET_KEY") ? PROVIDER_CLASS.CONFIGURED : PROVIDER_CLASS.CODE_READY,
      live: PROVIDER_CLASS.NOT_IMPLEMENTED,
      liveVerified: false,
      serverVerifiableStatus: envOn("STRIPE_SECRET_KEY") ? "CONFIGURED" : "IMPLEMENTED",
      operationalNote: "Official webhook algorithm implemented. Sandbox/live not verified.",
      payerNameVerification: "RESEARCH_REQUIRED",
      addressVerification: "PARTIAL",
      transferInitiation: "CODE_READY",
      reserve: "RESEARCH_REQUIRED",
      disputeWebhooks: "CODE_READY",
      missing: envOn("STRIPE_SECRET_KEY") ? ["live verification"] : ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "contract"],
    },
    {
      id: "paypal",
      name: "PayPal",
      class: envOn("PAYPAL_CLIENT_ID") ? PROVIDER_CLASS.CONFIGURED : PROVIDER_CLASS.CODE_READY,
      liveVerified: false,
      serverVerifiableStatus: envOn("PAYPAL_CLIENT_ID") ? "CONFIGURED" : "IMPLEMENTED",
      operationalNote: "Official verify API used only via injected verifyFn. Live verify blocked.",
      payerNameVerification: "RESEARCH_REQUIRED",
      addressVerification: "RESEARCH_REQUIRED",
      transferInitiation: "CODE_READY",
      reserve: "RESEARCH_REQUIRED",
      disputeWebhooks: "CODE_READY",
      missing: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "webhook verification", "contract"],
    },
    {
      id: "sepa",
      name: "SEPA credit transfer",
      class: PROVIDER_CLASS.STUB,
      liveVerified: false,
      serverVerifiableStatus: "RESEARCH_REQUIRED",
      payerNameVerification: "RESEARCH_REQUIRED",
      addressVerification: "NOT_IMPLEMENTED",
      transferInitiation: "STUB",
      reserve: "NOT_IMPLEMENTED",
      disputeWebhooks: "RESEARCH_REQUIRED",
      missing: ["PSP or bank API contract", "incoming payment notification"],
    },
    {
      id: "commercial_bank",
      name: "Customer commercial bank",
      class: PROVIDER_CLASS.NOT_IMPLEMENTED,
      liveVerified: false,
      note: "A customer's bank is not automatically API-accessible to Buzzard.",
      payerNameVerification: "RESEARCH_REQUIRED",
      addressVerification: "NOT_IMPLEMENTED",
      transferInitiation: "RESEARCH_REQUIRED",
      missing: ["bank-specific AIS/PIS contract", "customer consent"],
    },
    {
      id: "deutsche_bundesbank",
      name: "Deutsche Bundesbank",
      class: PROVIDER_CLASS.NOT_IMPLEMENTED,
      liveVerified: false,
      note: "No generic API is assumed for private account holder, home address, or fraud history queries.",
      payerNameVerification: "NOT_IMPLEMENTED",
      addressVerification: "NOT_IMPLEMENTED",
      transferInitiation: "NOT_IMPLEMENTED",
      reserve: "NOT_IMPLEMENTED",
      disputeWebhooks: "NOT_IMPLEMENTED",
      officialCapability: "RESEARCH_REQUIRED",
    },
    {
      id: "iban_name_check",
      name: "IBAN/name verification service",
      class: PROVIDER_CLASS.NOT_IMPLEMENTED,
      liveVerified: false,
      payerNameVerification: "RESEARCH_REQUIRED",
      missing: ["licensed verification provider", "lawful basis"],
    },
    {
      id: "mock",
      name: "Mock payment provider",
      class: PROVIDER_CLASS.CODE_READY,
      liveVerified: false,
      note: "Isolated tests only. Never a live bank.",
      serverVerifiableStatus: "CODE_READY",
    },
  ].map((row) => ({
    ...row,
    configured: row.class === PROVIDER_CLASS.CONFIGURED,
    liveVerified: false,
    realMoneyMovement: false,
  }));
}

function verifyPayment(input = {}) {
  if (input.timeout) {
    return {
      ok: true,
      authoritative: false,
      success: false,
      stateHint: "PAYMENT_RECONCILIATION_REQUIRED",
      reason: "PROVIDER_TIMEOUT_NOT_SUCCESS",
      live: false,
    };
  }
  const provider = String(input.provider || "mock");
  const row = capabilityMatrix().find((item) => item.id === provider);
  if (!row) {
    return { ok: false, authoritative: false, reason: "PROVIDER_UNKNOWN", live: false };
  }
  if (provider !== "mock" && !row.configured) {
    return {
      ok: false,
      authoritative: false,
      reason: "NOT_CONFIGURED",
      class: row.class,
      live: false,
    };
  }
  return {
    ok: true,
    authoritative: provider === "mock" && input.authoritative === true,
    live: false,
    realMoneyMovement: false,
    provider,
    class: row.class,
    note: "Server-side verification interface only. No provider HTTP in this slice.",
  };
}

function initiateTransferDryRun() {
  return {
    ok: true,
    executed: false,
    live: false,
    dryRun: true,
    irreversible: false,
    reason: "TRANSFER_EXECUTION_DISABLED",
  };
}

module.exports = {
  capabilityMatrix,
  verifyPayment,
  initiateTransferDryRun,
};
