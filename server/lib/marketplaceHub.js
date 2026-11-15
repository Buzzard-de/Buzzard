const { db } = require("./db");

const CHANNELS = [
  ["amazon", "Amazon"],
  ["ebay", "eBay"],
  ["google_shopping", "Google Shopping"],
  ["tiktok_shop", "TikTok Shop"],
];

function isEnabled() {
  return process.env.BUZZARD_MARKETPLACE_HUB !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function notLive(code) {
  return {
    ok: false,
    code,
    published: false,
    listingCreated: false,
    orderImported: false,
    queued: 0,
    enabled: false,
    connected: false,
    live: false,
    stored: false,
  };
}

function listMarketplaces() {
  return db
    .prepare("SELECT * FROM marketplace_channels ORDER BY name")
    .all()
    .map((marketplace) => ({
      ...marketplace,
      listings: db
        .prepare("SELECT COUNT(*) n FROM marketplace_listings WHERE marketplace_id = ?")
        .get(marketplace.id).n,
      queuedJobs: db
        .prepare(
          "SELECT COUNT(*) n FROM marketplace_sync_jobs WHERE marketplace_id = ? AND status = 'queued'"
        )
        .get(marketplace.id).n,
    }));
}

function updateMarketplace() {
  return notLive("MARKETPLACE_NOT_LIVE");
}

function queueStockSync() {
  return notLive("MARKETPLACE_SYNC_NOT_LIVE");
}

function queuePriceSync() {
  return notLive("MARKETPLACE_SYNC_NOT_LIVE");
}

function queueOrderSync() {
  return notLive("MARKETPLACE_SYNC_NOT_LIVE");
}

function upsertListing() {
  return notLive("LISTING_NOT_LIVE");
}

function upsertSkuMapping() {
  return notLive("LISTING_NOT_LIVE");
}

function listSyncJobs() {
  return db
    .prepare(`
      SELECT j.*, m.code marketplace, m.name marketplace_name
      FROM marketplace_sync_jobs j
      LEFT JOIN marketplace_channels m ON m.id = j.marketplace_id
      ORDER BY j.id DESC
      LIMIT 200
    `)
    .all();
}

function updateSyncJobResult() {
  return notLive("MARKETPLACE_SYNC_NOT_LIVE");
}

function listChannelOrders() {
  return db
    .prepare(`
      SELECT o.*, m.code marketplace
      FROM marketplace_channel_orders o
      LEFT JOIN marketplace_channels m ON m.id = o.marketplace_id
      ORDER BY imported_at DESC
      LIMIT 200
    `)
    .all();
}

function importOrderWebhook() {
  return notLive("ORDER_IMPORT_NOT_LIVE");
}

function getMarketplaceHubStatus() {
  return {
    version: "1.5.0",
    enabled: isEnabled(),
    channels: CHANNELS.length,
    totals: {
      marketplaces: db.prepare("SELECT COUNT(*) n FROM marketplace_channels").get().n,
      listings: db.prepare("SELECT COUNT(*) n FROM marketplace_listings").get().n,
      syncJobs: db.prepare("SELECT COUNT(*) n FROM marketplace_sync_jobs").get().n,
      channelOrders: db.prepare("SELECT COUNT(*) n FROM marketplace_channel_orders").get().n,
      queuedJobs: db
        .prepare("SELECT COUNT(*) n FROM marketplace_sync_jobs WHERE status = 'queued'")
        .get().n,
    },
  };
}

module.exports = {
  isEnabled,
  CHANNELS,
  listMarketplaces,
  updateMarketplace,
  queueStockSync,
  queuePriceSync,
  queueOrderSync,
  upsertListing,
  upsertSkuMapping,
  listSyncJobs,
  updateSyncJobResult,
  listChannelOrders,
  importOrderWebhook,
  getMarketplaceHubStatus,
};
