/**
 * Marketplace connector sandbox. Live OAuth/publish stays BLOCKED_EXTERNAL.
 */
const { validateMarketplaceListing } = require("../storefront/merchantFeedService");

const CHANNELS = Object.freeze([
  { id: "amazon", display: "Amazon", oauthEnv: "AMAZON_SP_API_CLIENT_ID", publishEnv: "AMAZON_PUBLISH_ALLOWED" },
  { id: "ebay", display: "eBay", oauthEnv: "EBAY_OAUTH_TOKEN", publishEnv: "EBAY_PUBLISH_ALLOWED" },
  { id: "kaufland", display: "Kaufland", oauthEnv: "KAUFLAND_API_KEY", publishEnv: "KAUFLAND_PUBLISH_ALLOWED" },
  { id: "allegro", display: "Allegro", oauthEnv: "ALLEGRO_CLIENT_ID", publishEnv: "ALLEGRO_PUBLISH_ALLOWED" },
  { id: "bol", display: "bol.com", oauthEnv: "BOL_CLIENT_ID", publishEnv: "BOL_PUBLISH_ALLOWED" },
  { id: "cdiscount", display: "Cdiscount", oauthEnv: "CDISCOUNT_API_KEY", publishEnv: "CDISCOUNT_PUBLISH_ALLOWED" },
  { id: "otto", display: "OTTO", oauthEnv: "OTTO_API_KEY", publishEnv: "OTTO_PUBLISH_ALLOWED" },
  { id: "emag", display: "eMAG", oauthEnv: "EMAG_API_KEY", publishEnv: "EMAG_PUBLISH_ALLOWED" },
  { id: "skroutz", display: "Skroutz", oauthEnv: "SKROUTZ_API_KEY", publishEnv: "SKROUTZ_PUBLISH_ALLOWED" },
  { id: "google_shopping", display: "Google Shopping", oauthEnv: "GOOGLE_MERCHANT_CENTER_ID", publishEnv: "GOOGLE_SHOPPING_PUBLISH_ALLOWED" },
]);

function credentialsConfigured(channel) {
  const key = process.env[channel.oauthEnv];
  return Boolean(key && String(key).trim().length > 8);
}

function publishAllowed(channel) {
  return process.env[channel.publishEnv] === "1" && credentialsConfigured(channel);
}

function createConnector(channelId) {
  const channel = CHANNELS.find((row) => row.id === channelId);
  if (!channel) return { ok: false, code: "CHANNEL_UNKNOWN" };

  return {
    id: channel.id,
    display: channel.display,
    live: false,
    sandbox: true,
    credentialsConfigured: credentialsConfigured(channel),
    publishAllowed: publishAllowed(channel),
    async publishListing(listing) {
      const valid = validateMarketplaceListing(listing);
      if (!valid.ok) return { ...valid, channel: channel.id, live: false };
      if (!publishAllowed(channel)) {
        return {
          ok: false,
          code: "LIVE_CONNECTION_BLOCKED",
          channel: channel.id,
          live: false,
          oauth: credentialsConfigured(channel),
          note: "Explicit publish flag and credentials required.",
        };
      }
      return { ok: false, code: "HUMAN_APPROVAL_REQUIRED", channel: channel.id, live: false };
    },
    async syncStock(_payload) {
      return { ok: true, dryRun: true, live: false, channel: channel.id, updated: 0 };
    },
    async syncPrice(_payload) {
      return { ok: true, dryRun: true, live: false, channel: channel.id, updated: 0 };
    },
    async importOrders(_payload) {
      return { ok: true, dryRun: true, live: false, channel: channel.id, orders: [] };
    },
    async syncReturns(_payload) {
      return { ok: true, dryRun: true, live: false, channel: channel.id, returns: [] };
    },
    feeEstimate({ gross = 0 } = {}) {
      const rate = channel.id === "amazon" ? 0.15 : 0.12;
      return { ok: true, fee: Math.round(gross * rate * 100) / 100, currency: "EUR", live: false };
    },
  };
}

function listConnectors() {
  return CHANNELS.map((channel) => {
    const connector = createConnector(channel.id);
    return {
      id: channel.id,
      display: channel.display,
      credentialsConfigured: connector.credentialsConfigured,
      publishAllowed: connector.publishAllowed,
      live: false,
    };
  });
}

function snapshot() {
  const connectors = listConnectors();
  return {
    channelCount: connectors.length,
    channels: connectors.length,
    connectors,
    anyLive: false,
    allBlocked: connectors.every((row) => !row.publishAllowed),
    salesEnabled: false,
    productionReady: false,
  };
}

module.exports = { CHANNELS, createConnector, listConnectors, snapshot };