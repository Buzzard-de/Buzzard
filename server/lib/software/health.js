/**
 * Software health: code readiness vs live connectivity.
 * A green code check must never imply live providers are working.
 */

const { getDatabaseHealth } = require("../db");
const { isSalesEnabled } = require("../salesMode");
const { MARKET_UNDERCUT_IMPLEMENTED } = require("../pusat/constants");
const { SOFTWARE_VERSION, CANONICAL_ENGINES } = require("./constants");
const marketplace = require("./marketplace");
const voice = require("./voice");
const { providerStatus } = require("../pusat/integrations");

function envFlag(name) {
  return Boolean(process.env[name]);
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
    !providers.configured || providers.stub ? "llm_live" : null,
    !envFlag("STRIPE_SECRET_KEY") ? "stripe" : null,
    !envFlag("TWILIO_ACCOUNT_SID") ? "twilio" : null,
    "marketplace_publish",
    "carrier_shipment_create",
    "supplier_purchase_order_send",
    "customer_message_send",
    "product_source_of_truth",
    "sales_unlock",
  ].filter(Boolean);

  const code = {
    database: !database.error,
    pusat: Boolean(pusatHealth?.ready ?? true),
    inventory: true,
    pricing: true,
    tracking: true,
    marketplace: market.codeReady,
    voice: voiceHealth.codeReady,
    salesLock: !isSalesEnabled(),
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
    ready: code.database && code.salesLock && !isSalesEnabled(),
    liveReady: false,
    note: "Code health is not live verification. Missing providers stay BLOCKED.",
  };
}

module.exports = { getSoftwareHealth };
