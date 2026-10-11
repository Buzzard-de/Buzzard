/**
 * External integration inventory. Presence-only env checks. Never prints secrets.
 * Wraps existing adapters — not a second orchestrator.
 */

const { providerStatus } = require("../pusat/integrations");
const marketplace = require("./marketplace");
const voice = require("./voice");
const payments = require("./payments");
const carriers = require("./carriers");
const { adapterStatus: supplierAdapterStatus } = require("./supplierFeeds");

function present(name) {
  return Boolean(process.env[name]);
}

function row({
  id,
  name,
  category,
  adapterExists,
  adapterPath,
  envVars,
  liveWriteConfigured = false,
  humanAction,
  extra = {},
}) {
  const vars = (envVars || []).map((envName) => ({ name: envName, present: present(envName) }));
  const credentialsPresent = vars.length ? vars.some((v) => v.present) : false;
  return {
    id,
    name,
    category,
    adapterExists,
    adapterPath,
    requiredEnv: vars,
    credentialsPresent,
    authTested: false,
    networkTested: false,
    liveReadTested: false,
    liveWriteConfigured,
    operationallyVerified: false,
    productionVerified: false,
    status: credentialsPresent ? "NOT_VERIFIED" : "NOT_CONFIGURED",
    live: false,
    blocked: true,
    humanAction,
    ...extra,
  };
}

function inventory() {
  const llm = providerStatus();
  const items = [
    row({
      id: "openai",
      name: "OpenAI",
      category: "ai",
      adapterExists: true,
      adapterPath: "server/lib/aiProviders.js",
      envVars: ["OPENAI_API_KEY"],
      humanAction: "Provide OPENAI_API_KEY in a non-production environment and run a guarded live probe. Do not enable BUZZARD_AI_LIVE_PROBE in production from this task.",
      extra: { stubActive: llm.stub, liveVerified: false },
    }),
    row({
      id: "anthropic",
      name: "Anthropic",
      category: "ai",
      adapterExists: true,
      adapterPath: "server/lib/aiProviders.js",
      envVars: ["ANTHROPIC_API_KEY"],
      humanAction: "Provide ANTHROPIC_API_KEY and select the Anthropic provider in a non-production environment.",
    }),
    row({
      id: "google_ai",
      name: "Google AI",
      category: "ai",
      adapterExists: true,
      adapterPath: "server/lib/aiProviders.js",
      envVars: ["GOOGLE_AI_API_KEY"],
      humanAction: "Provide GOOGLE_AI_API_KEY and select the Google provider in a non-production environment.",
    }),
    row({
      id: "stripe",
      name: "Stripe",
      category: "payments",
      adapterExists: true,
      adapterPath: "server/lib/commerce/paymentService.js",
      envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      humanAction: "Provide Stripe secret + webhook secret. Do not capture live charges from this task. Webhooks must fail closed without a signature.",
    }),
    row({
      id: "paypal",
      name: "PayPal",
      category: "payments",
      adapterExists: true,
      adapterPath: "server/lib/commerce/paymentService.js",
      envVars: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
      humanAction: "Provide PayPal client credentials. Live capture remains disabled while sales are locked.",
    }),
    row({
      id: "smtp_email",
      name: "SMTP email",
      category: "communications",
      adapterExists: true,
      adapterPath: "server/lib/notificationEngine.js",
      envVars: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
      humanAction: "Provide SMTP host/user/password. Customer send remains BLOCKED without approval and a dedicated send flag.",
    }),
    row({
      id: "twilio",
      name: "Twilio",
      category: "communications",
      adapterExists: true,
      adapterPath: "server/lib/software/voice.js",
      envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
      humanAction: "Provide Twilio SID/token. Do not place paid calls from this task.",
    }),
    row({
      id: "supplier_api",
      name: "Supplier API",
      category: "supplier",
      adapterExists: true,
      adapterPath: "server/lib/supplier/realSupplierConnector.js",
      envVars: ["REAL_SUPPLIER_API_URL", "REAL_SUPPLIER_API_KEY", "SUPPLIER_API_KEY"],
      humanAction: "Provide supplier API URL and key. Keep REAL_SUPPLIER_LIVE_IMPORT unset. PO send stays blocked.",
      extra: { feedPreview: supplierAdapterStatus("csv") },
    }),
    row({
      id: "tecdoc",
      name: "TecDoc",
      category: "supplier",
      adapterExists: true,
      adapterPath: "server/lib/supplierHub.js",
      envVars: ["TECDOC_API_KEY"],
      humanAction: "Provide TECDOC_API_KEY for catalog mapping only. Not a purchase-order channel.",
    }),
    ...carriers.listCarriers().map((c) =>
      row({
        id: `carrier_${c.id}`,
        name: c.name,
        category: "shipping",
        adapterExists: true,
        adapterPath: "server/lib/software/carriers.js",
        envVars: c.requiredEnv,
        humanAction: `Provide ${c.name} API credentials. Tracking stays scan-based. Do not create live shipments.`,
      })
    ),
    ...marketplace.classifyConnectors().map((c) =>
      row({
        id: `marketplace_${c.id}`,
        name: c.name,
        category: "marketplace",
        adapterExists: Boolean(c.existingModule),
        adapterPath: c.existingModule || "server/lib/software/marketplace.js",
        envVars: [],
        humanAction: `Provide ${c.name} account credentials and a non-production app. Publish remains BLOCKED. APPROVED ≠ PUBLISHED.`,
        extra: { connectorStatus: c.status, published: false, classificationOnly: !c.existingModule },
      })
    ),
    ...voice.listAdapters().map((a) =>
      row({
        id: `voice_${a.id}`,
        name: `Voice ${a.id}`,
        category: "voice",
        adapterExists: true,
        adapterPath: "server/lib/software/voice.js",
        envVars: voice.requiredEnv(a.id),
        humanAction: `Configure ${a.id} credentials. Signaling success is not media proof. Paid calls stay disabled.`,
        extra: { configured: a.configured, callStarted: false },
      })
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    liveReady: false,
    productionVerified: false,
    inventedConnections: false,
    secretsIncluded: false,
    items,
    counts: {
      total: items.length,
      configured: items.filter((i) => i.credentialsPresent).length,
      notConfigured: items.filter((i) => i.status === "NOT_CONFIGURED").length,
      notVerified: items.filter((i) => i.status === "NOT_VERIFIED").length,
      live: 0,
    },
    payments: payments.health(),
    carriers: carriers.health(),
    marketplace: marketplace.health(),
    voice: voice.health(),
  };
}

function checklist() {
  const data = inventory();
  return data.items.map((item) => ({
    integration: item.name,
    id: item.id,
    category: item.category,
    environmentVariables: item.requiredEnv.map((v) => v.name),
    credentialsPresent: item.credentialsPresent,
    accountRequired: true,
    permissionsRequired: item.category === "payments" ? "read + webhook verify; no live capture in this task" : "non-production read first",
    webhookRequired: item.id === "stripe" || item.id === "paypal",
    networkRequired: item.credentialsPresent,
    testMethod: "presence + fail-closed adapter tests; no live write",
    status: item.status,
    humanAction: item.humanAction,
  }));
}

function redact(value) {
  const blob = JSON.stringify(value);
  if (/sk-|rk_|whsec_|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/.test(blob)) {
    throw new Error("secret_leaked_into_integration_inventory");
  }
  return value;
}

module.exports = {
  inventory: () => redact(inventory()),
  checklist: () => redact(checklist()),
};
