/**
 * Canonical marketplace channel classification.
 * Classification-only rows are not live adapters. Publish stays blocked.
 */

const MARKETPLACE_CHANNELS = Object.freeze([
  { id: "amazon", name: "Amazon", status: "mock_connector", existingModule: "marketplaceHub + pusat.integrations" },
  { id: "ebay", name: "eBay", status: "mock_connector", existingModule: "marketplaceHub" },
  { id: "google_shopping", name: "Google Shopping", status: "connector_draft", existingModule: "marketplaceHub" },
  { id: "tiktok_shop", name: "TikTok Shop", status: "connector_draft", existingModule: "marketplaceHub" },
  { id: "kaufland", name: "Kaufland", status: "connector_draft", existingModule: "marketplaceV35" },
  { id: "allegro", name: "Allegro", status: "connector_draft", existingModule: "marketplaceV35" },
  { id: "bol", name: "bol.com", status: "connector_draft", existingModule: null },
  { id: "cdiscount", name: "Cdiscount", status: "connector_draft", existingModule: null },
  { id: "otto", name: "OTTO", status: "connector_draft", existingModule: null },
  { id: "emag", name: "eMAG", status: "connector_draft", existingModule: null },
  { id: "skroutz", name: "Skroutz", status: "connector_draft", existingModule: null },
]);

const CLASSIFICATION_ONLY_IDS = Object.freeze(
  MARKETPLACE_CHANNELS.filter((channel) => !channel.existingModule).map((channel) => channel.id)
);

function isClassificationOnly(channelId) {
  return CLASSIFICATION_ONLY_IDS.includes(String(channelId || "").toLowerCase());
}

module.exports = {
  MARKETPLACE_CHANNELS,
  CLASSIFICATION_ONLY_IDS,
  isClassificationOnly,
};
