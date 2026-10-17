/**
 * Software health: code readiness vs live connectivity.
 * A green code check must never imply live providers are working.
 */

const { getDatabaseHealth } = require("../db");
const { isSalesEnabled } = require("../salesMode");
const { MARKET_UNDERCUT_IMPLEMENTED } = require("../pusat/constants");
const { SOFTWARE_VERSION, CANONICAL_ENGINES, HEALTH_STATUS } = require("./constants");
const marketplace = require("./marketplace");
const voice = require("./voice");
const { providerStatus } = require("../pusat/integrations");
const { inventory } = require("./externalIntegrations");
const pusatExceptions = require("../pusat/exceptions");

function engineStatus({ pass, blocked, configured }) {
  if (blocked) return HEALTH_STATUS.BLOCKED;
  if (configured === false) return HEALTH_STATUS.NOT_CONFIGURED;
  if (pass) return HEALTH_STATUS.PASS;
  return HEALTH_STATUS.PARTIAL;
}

function getSoftwareHealth(pusatHealth) {
  const database = getDatabaseHealth();
  const providers = providerStatus();
  const market = marketplace.health();
  const voiceHealth = voice.health();

  const live = {
    llm: Boolean(providers.liveVerified),
    openai: false,
    anthropic: false,
    google: false,
    stripe: false,
    paypal: false,
    twilio: false,
    carrier: false,
    marketplace: false,
    supplierLive: false,
  };

  const blocked = [
    "llm_live",
    "stripe",
    "paypal",
    "twilio",
    "marketplace_publish",
    "carrier_shipment_create",
    "supplier_purchase_order_send",
    "customer_message_send",
    "product_source_of_truth",
    "sales_unlock",
  ];

  const code = {
    database: !database.error,
    pusat: Boolean(pusatHealth?.ready ?? true),
    inventory: true,
    pricing: true,
    tracking: true,
    marketplace: market.codeReady,
    voice: voiceHealth.codeReady,
    salesLock: !isSalesEnabled(),
    returns: true,
    reporting: true,
    search: true,
    supplierFeeds: true,
    communications: true,
    payments: true,
    carriers: true,
    externalIntegrations: true,
    providerDiagnostics: true,
  };

  const engines = {
    process: HEALTH_STATUS.PASS,
    database: code.database ? HEALTH_STATUS.PASS : HEALTH_STATUS.FAILED,
    pusat: code.pusat ? HEALTH_STATUS.PASS : HEALTH_STATUS.PARTIAL,
    guardian: HEALTH_STATUS.PASS,
    memory: HEALTH_STATUS.PASS,
    product: HEALTH_STATUS.PASS,
    pricing: HEALTH_STATUS.PASS,
    inventory: HEALTH_STATUS.PASS,
    order: HEALTH_STATUS.PASS,
    returns: HEALTH_STATUS.PARTIAL,
    supplier: engineStatus({ pass: false, blocked: true, configured: Boolean(process.env.INTERCARS_API_KEY || process.env.TECDOC_API_KEY) }),
    payment: engineStatus({ pass: false, blocked: true, configured: Boolean(process.env.STRIPE_SECRET_KEY) }),
    marketplace: HEALTH_STATUS.BLOCKED,
    tracking: HEALTH_STATUS.BLOCKED,
    voice: HEALTH_STATUS.NOT_CONFIGURED,
    localization: HEALTH_STATUS.PASS,
    software: code.database && code.salesLock ? HEALTH_STATUS.PASS : HEALTH_STATUS.PARTIAL,
    live: HEALTH_STATUS.BLOCKED,
    production: HEALTH_STATUS.NOT_TESTED,
  };

  return {
    service: "software",
    version: SOFTWARE_VERSION,
    generatedAt: new Date().toISOString(),
    code,
    live,
    blocked,
    salesEnabled: isSalesEnabled(),
    productSourceOfTruthActive: false,
    marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    canonical: CANONICAL_ENGINES,
    database: {
      ok: !database.error,
      persistent: database.persistence?.persistent ?? null,
      ephemeralRisk: database.persistence?.ephemeralRisk ?? null,
      error: database.error || null,
    },
    provider: providers,
    marketplace: market,
    voice: voiceHealth,
    exceptions: {
      ...pusatExceptions.summarize(),
      liveRecovery: false,
      sensitiveRetry: false,
      productionVerified: false,
    },
    engines,
    ready: code.database && code.salesLock && !isSalesEnabled(),
    liveReady: false,
    readiness: {
      processAlive: true,
      applicationReady: Boolean(code.database && code.salesLock && !isSalesEnabled()),
      databaseReady: Boolean(code.database),
      providerConfigured: inventory().items.some((item) => item.credentialsPresent),
      providerReachable: false,
      providerAuthenticated: false,
      providerEndToEndVerified: false,
      productionVerified: false,
    },
    note: "Code health is not live verification. Missing providers stay BLOCKED. Process alive is not database ready. Configured is not authenticated.",
  };
}

module.exports = { getSoftwareHealth };
