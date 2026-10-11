/**
 * Marketplace connector classification. Draft listings only. No live publish.
 */

const { CONNECTOR_STATUS } = require("./constants");
const { marketplaceDraft } = require("../pusat/integrations");

const CONNECTORS = Object.freeze([
  { id: "amazon", name: "Amazon", status: CONNECTOR_STATUS.MOCK, existingModule: "marketplaceHub + pusat.integrations" },
  { id: "ebay", name: "eBay", status: CONNECTOR_STATUS.MOCK, existingModule: "marketplaceHub" },
  { id: "google_shopping", name: "Google Shopping", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceHub" },
  { id: "tiktok_shop", name: "TikTok Shop", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceHub" },
  { id: "kaufland", name: "Kaufland", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceV35" },
  { id: "allegro", name: "Allegro", status: CONNECTOR_STATUS.DRAFT, existingModule: "marketplaceV35" },
  { id: "bol", name: "bol.com", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "cdiscount", name: "Cdiscount", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "otto", name: "OTTO", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "emag", name: "eMAG", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
  { id: "skroutz", name: "Skroutz", status: CONNECTOR_STATUS.DRAFT, existingModule: null },
]);

function classifyConnectors() {
  return CONNECTORS.map((c) => ({
    ...c,
    live: false,
    published: false,
    credentialsConfigured: false,
    liveVerified: false,
    blocked: true,
    note: "No live marketplace credentials in this environment. Publish remains BLOCKED.",
  }));
}

function classify(id) {
  return classifyConnectors().find((c) => c.id === id) || {
    id,
    status: CONNECTOR_STATUS.NONE,
    live: false,
    blocked: true,
    published: false,
  };
}

function draftListing(input = {}) {
  const channel = classify(input.channel || input.marketplace || "amazon");
  if (input.forceError) {
    return {
      ok: false,
      live: false,
      published: false,
      error: input.forceError,
      retryable: input.retryable === true,
      channel: channel.id,
    };
  }
  const draft = marketplaceDraft({
    channel: channel.id,
    sku: input.sku,
    category: input.category,
    price: input.price,
    stock: input.stock,
  });
  return {
    ...draft,
    connector: channel,
    published: false,
    live: false,
  };
}

function health() {
  const connectors = classifyConnectors();
  return {
    codeReady: true,
    liveReady: false,
    liveVerified: false,
    connectors,
    anyLive: false,
  };
}

module.exports = {
  CONNECTORS,
  classifyConnectors,
  classify,
  draftListing,
  health,
};
